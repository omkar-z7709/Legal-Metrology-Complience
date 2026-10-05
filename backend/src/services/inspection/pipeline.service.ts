import { DBRepo } from "../../db/repo.js";
import { OcrService } from "../ocr/ocr.service.js";
import { StorageService } from "../storage.service.js";
import { GeminiExtractor } from "../extraction/gemini.extractor.js";
import { ProductClassifier } from "../classification/classifier.service.js";
import {
  ComplianceDecisionEngine,
  ComplianceDecision,
  ComplianceStageTiming,
} from "../engine/decision.engine.js";
import { OcrResult } from "../ocr/ocr.interface.js";
import { PreprocessService } from "../preprocess.service.js";
import fs from "fs/promises";
import path from "path";
import { globalTimings, ms } from "../../utils/timing.js";
import { performance } from "perf_hooks";

export class InspectionPipelineService {
  /**
   * Runs the complete end-to-end inspection pipeline on a registered scan.
   */
  static async processScan(
    scanId: string,
  ): Promise<ComplianceDecision & { scanId: string; scanNumber: string }> {
    console.log(`[PIPELINE] START scanId=${scanId}`);

    // TEMP TIMING: start the clock BEFORE the first DB read. Previously `totalStart`
    // was assigned after getScan(), so pipeline_db_fetch was excluded from its own span.
    const totalStart = performance.now();
    const timing = globalTimings.get(scanId) || { stages: {} };

    // 1. Fetch Scan & Images
    const dbFetchStart = performance.now();
    const scan = await DBRepo.getScan(scanId);
    const dbFetchEnd = performance.now();
    if (!scan) throw new Error(`Scan with ID '${scanId}' not found.`);

    // Idempotency check: if scan is already COMPLETED with valid analysis, return persisted analysis immediately
    if (scan.status === "COMPLETED" && scan.analysis && (scan.analysis as any).declarations) {
      console.log(`[PIPELINE] Idempotent hit: Scan ${scan.scanNumber} is already COMPLETED. Returning persisted analysis.`);
      return {
        scanId: scan.id,
        scanNumber: scan.scanNumber,
        ...(scan.analysis as any),
      };
    }

    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "PREPROCESSING" });

    const scanImages = await DBRepo.getScanImages(scanId);
    const preprocessedImages = scanImages.filter(
      (img) => img.imageType === "PREPROCESSED",
    );
    const originalImages = scanImages.filter(
      (img) => img.imageType === "ORIGINAL",
    );

    const targetImages =
      preprocessedImages.length > 0 ? preprocessedImages : originalImages;

    if (targetImages.length === 0) {
      await DBRepo.updateScan(scanId, { status: "FAILED", currentStage: "FAILED" });
      throw new Error("No package images found for this scan.");
    }

    console.log(
      `[OCR] Processing ${targetImages.length} package image(s) (${preprocessedImages.length} preprocessed, ${originalImages.length} original) for scan ${scan.scanNumber}`,
    );

    // 2. OCR Stage
    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "OCR" });

    timing.stages['pipeline_db_fetch'] = { start: dbFetchStart, end: dbFetchEnd, concurrency: 'Sequential' };
    const ocrStart = performance.now();
    timing.stages['ocr_total'] = { start: ocrStart, concurrency: 'Parallel', images: [] };

    const ocrResults = await Promise.all(
      targetImages.map(async (image, idx) => {
        console.log(
          `[OCR] Processing image ${idx + 1}/${targetImages.length} (${image.imageType}): ${image.fileName}`,
        );
        
        const reqStart = performance.now();
        const imageBuffer = await StorageService.downloadFile(image.storagePath);
        const reqEnd = performance.now();
        const prepImageStart = performance.now();

        let bufferToOcr = imageBuffer;
        if (image.imageType === "ORIGINAL" && preprocessedImages.length === 0) {
          const prep = await PreprocessService.preprocess(imageBuffer);
          bufferToOcr = prep.processedBuffer;
        }
        
        const prepImageEnd = performance.now();
        const ocrExtractStart = performance.now();
        const res = await OcrService.extract(bufferToOcr);
        const ocrExtractEnd = performance.now();
        timing.stages['ocr_total'].images.push({
           imageName: image.fileName,
           storageReadMs: reqEnd - reqStart,
           prepMs: prepImageEnd - prepImageStart,
           ocrMs: ocrExtractEnd - ocrExtractStart
        });
        return res;

      }),
    );

    // Combine OCR results into single inspection text
    const combinedOcrText = ocrResults
      .map(
        (result, index) =>
          `--- PACKAGE IMAGE ${index + 1} ---\n${result.rawText}`,
      )
      .join("\n\n");

    const provider: OcrResult["provider"] = ocrResults.every(
      (r) => r.provider === "google-cloud-vision",
    )
      ? "google-cloud-vision"
      : ocrResults.every((r) => r.provider === "tesseract")
        ? "tesseract"
        : "synthetic";

    const ocrResult: OcrResult = {
      rawText: combinedOcrText,
      averageConfidence:
        ocrResults.reduce((sum, r) => sum + r.averageConfidence, 0) /
        ocrResults.length,
      lines: ocrResults.flatMap((r) => r.lines),
      provider,
      processingTimeMs: ocrResults.reduce(
        (sum, r) => sum + r.processingTimeMs,
        0,
      ),
    };
    const ocrDurationMs = performance.now() - ocrStart;
    timing.stages['ocr_total'].end = performance.now();

    console.log(
      `[OCR] Completed OCR across all ${ocrResults.length} image(s). Combined text length: ${combinedOcrText.length} chars.`,
    );
    console.log(`[PERF] OCR: ${ocrDurationMs} ms`);

    // 3. Gemini Structured Extraction Stage
    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "EXTRACTION" });
    console.log(
      `[GEMINI] Invoking Gemini structured extraction on combined package text...`,
    );
    const geminiStart = performance.now();
    timing.stages['gemini_extraction'] = { start: geminiStart };
    const declarations = await GeminiExtractor.extractDeclarations(ocrResult);
    const geminiDurationMs = performance.now() - geminiStart;
    timing.stages['gemini_extraction'].end = performance.now();
    console.log(`[PERF] Gemini: ${geminiDurationMs} ms`);

    // 4. Product Classification Stage
    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "CLASSIFICATION" });
    console.log(`[CLASSIFICATION] Determining commodity classification...`);
    const classStart = performance.now();
    timing.stages['classification'] = { start: classStart };
    const classification = ProductClassifier.classify(
      declarations,
      ocrResult.rawText,
    );
    const classDurationMs = performance.now() - classStart;
    timing.stages['classification'].end = performance.now();
    console.log(`[PERF] Classification: ${classDurationMs} ms`);

    // 5. Compliance & RAG Stage
    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "COMPLIANCE" });
    console.log(
      `[COMPLIANCE] Executing deterministic rule validation and RAG grounding for '${classification.category}'...`,
    );
    
    timing.stages['rule_evaluation'] = { start: performance.now() };
    const complianceTiming: ComplianceStageTiming = {};
    const decision = await ComplianceDecisionEngine.evaluate(
      declarations,
      classification,
      ocrResult.rawText,
      complianceTiming,
      {
        provider: ocrResult.provider,
        averageConfidence: ocrResult.averageConfidence,
        textLength: ocrResult.rawText.length,
        imageCount: targetImages.length,
      },
    );

    // 6. Update Product Category in DB
    
    timing.stages['rule_evaluation'].end = performance.now();
    const dbStart = performance.now();
    timing.stages['database_writes'] = { start: dbStart };

    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "SAVING" });
    if (scan.productId) {
      await DBRepo.updateProduct(scan.productId, {
        category: classification.category,
        commodityType: classification.commodityType,
      });
    }

    // 7. Persist Extracted Fields to Database concurrently
    console.log(`[DATABASE] Persisting extracted declarations and compliance checks...`);
    const fieldRecords = [
      { name: "generic_name", data: declarations.generic_name },
      { name: "manufacturer", data: declarations.manufacturer },
      { name: "packer", data: declarations.packer },
      { name: "net_quantity", data: declarations.net_quantity },
      { name: "mrp", data: declarations.mrp },
      { name: "date_of_manufacture", data: declarations.date_of_manufacture },
      { name: "date_of_expiry", data: declarations.date_of_expiry },
      { name: "consumer_care", data: declarations.consumer_care },
      { name: "country_of_origin", data: declarations.country_of_origin },
    ];

    await Promise.all(
      fieldRecords
        .filter((field) => field.data)
        .map((field) =>
          DBRepo.insertExtractedField({
            scanId,
            fieldName: field.name,
            fieldValue: field.data.value,
            rawText: field.data.source_text,
            confidence: field.data.confidence.toFixed(4),
            boundingBox: field.data.bbox,
            rawData: field.data,
            isPresent: field.data.value !== null,
            validationStatus: field.data.value !== null ? "VALID" : "INVALID",
          }),
        ),
    );

    // 8. Persist Compliance Checks and Violations concurrently
    const allChecksToPersist = [
      ...decision.passedChecks,
      ...decision.violations,
      ...decision.reviewChecks,
    ];

    await Promise.all(
      allChecksToPersist.map(async (check) => {
        const createdCheck = await DBRepo.insertComplianceCheck({
          scanId,
          ruleId: check.ruleId,
          fieldName: check.fieldName,
          status: check.status,
          reason: check.reason,
          confidence: check.confidence.toFixed(4),
          evidenceText: check.evidence,
        });

        // If check failed, save as violation record
        if (check.status === "FAIL") {
          await DBRepo.insertViolation({
            scanId,
            checkId: createdCheck.id,
            ruleId: check.ruleId,
            violationType: check.title,
            severity: check.severity,
            title: check.title,
            description: check.reason,
            extractedEvidence: check.evidence,
            boundingBox: check.boundingBox,
            suggestedAction: check.suggestedAction,
          });
        }
      }),
    );

    // 9. Update Scan Record with final status & score
    const existingListingText = (scan.analysis as any)?.listingText;
    await DBRepo.updateScan(scanId, {
      status: "COMPLETED",
      currentStage: "COMPLETED",
      complianceStatus: decision.complianceStatus,
      complianceScore: decision.complianceScore.toFixed(2),
      analysis: {
        ...(existingListingText ? { listingText: existingListingText } : {}),
        declarations,
        ...decision,
      },
    });
    
    const dbDurationMs = performance.now() - dbStart;
    timing.stages['database_writes'].end = performance.now();

    console.log(`[PERF] Persistence: ${dbDurationMs} ms`);

    
    const totalDurationMs = performance.now() - totalStart;
    timing.pipelineTotalEnd = performance.now();

    // TEMP TIMING: serializable pipeline report consumed by the frontend debug view.
    const s = timing.stages;
    const ocrStage = s['ocr_total'];
    timing.pipelineReport = {
      imageCount: targetImages.length,
      ocrConcurrency: 'Parallel',
      stages: {
        pipelineDbFetchMs: ms(s['pipeline_db_fetch'].start, s['pipeline_db_fetch'].end),
        statusUpdateToOcrMs: ms(s['pipeline_db_fetch'].end, ocrStart),
        ocrMs: ms(ocrStart, ocrStage.end),
        statusUpdateToExtractionMs: ms(ocrStage.end, geminiStart),
        geminiMs: ms(geminiStart, s['gemini_extraction'].end),
        statusUpdateToClassificationMs: ms(s['gemini_extraction'].end, classStart),
        classificationMs: ms(classStart, s['classification'].end),
        statusUpdateToComplianceMs: ms(s['classification'].end, s['rule_evaluation'].start),
        complianceStageTotalMs: ms(s['rule_evaluation'].start, s['rule_evaluation'].end),
        ragMs: complianceTiming.ragMs ?? 0,
        complianceRulesMs: complianceTiming.complianceMs ?? 0,
        statusUpdateToSavingMs: ms(s['rule_evaluation'].end, dbStart),
        databaseWritesMs: ms(dbStart, s['database_writes'].end),
      },
      ocrImages: ocrStage.images.map((img: any) => ({
        imageName: img.imageName,
        storageReadMs: Math.round(img.storageReadMs),
        preprocessMs: Math.round(img.prepMs),
        ocrExtractorMs: Math.round(img.ocrMs),
      })),
      // Pipeline entry is measured from processScan(), which is entered AFTER the
      // upload response was sent. The gap between the two is reported by the frontend.
      pipelineTotalMs: Math.round(totalDurationMs),
      uploadToPipelineEndMs: timing.requestStart ? Math.round(performance.now() - timing.requestStart) : null,
    };
    globalTimings.set(scanId, timing);

    // Print Timing Summary!
    console.log("\n\n=========================================");
    console.log("          INSPECTION TIMING (scan: "+ scan.scanNumber + ")");
    console.log("=========================================");
    const t = globalTimings.get(scanId) || timing;
    const reqStart = t.requestStart || performance.now();
    
    console.log(`Total Time (Upload to end of Pipeline): ${((performance.now() - reqStart) / 1000).toFixed(2)}s`);
    console.log(`Upload/Parse Time: ${((t.uploadEnd - t.uploadStart) / 1000).toFixed(2)}s`);
    
    if (t.stages['ocr_total']) {
      const ocrData = t.stages['ocr_total'];
      console.log(`Pipeline DB read: ${((t.stages['pipeline_db_fetch'].end - t.stages['pipeline_db_fetch'].start) / 1000).toFixed(2)}s`);
      console.log(`OCR Total (Parallel): ${((ocrData.end - ocrData.start) / 1000).toFixed(2)}s`);
      ocrData.images.forEach((img: any, i: number) => {
         console.log(`  Image ${i+1} (${img.imageName}):`);
         console.log(`    Storage read: ${(img.storageReadMs / 1000).toFixed(2)}s`);
         if (img.prepMs > 1) console.log(`    Preprocessing: ${(img.prepMs / 1000).toFixed(2)}s`);
         console.log(`    OCR Extractor (Google Vision / fallback): ${(img.ocrMs / 1000).toFixed(2)}s`);
      });
    }

    if (t.stages['gemini_extraction']) {
      console.log(`Extraction (Gemini): ${((t.stages['gemini_extraction'].end - t.stages['gemini_extraction'].start) / 1000).toFixed(2)}s`);
    }
    if (t.stages['classification']) {
      console.log(`Classification: ${((t.stages['classification'].end - t.stages['classification'].start) / 1000).toFixed(2)}s`);
    }
    if (t.stages['rule_evaluation']) {
      console.log(`Rule evaluation (DB reads + logic): ${((t.stages['rule_evaluation'].end - t.stages['rule_evaluation'].start) / 1000).toFixed(2)}s`);
    }
    if (t.stages['database_writes']) {
      console.log(`Database Writes (results): ${((t.stages['database_writes'].end - t.stages['database_writes'].start) / 1000).toFixed(2)}s`);
    }
    
    // Concurrency Diagram (pseudo)
    console.log("\nConcurrency:");
    if (t.stages['ocr_total'] && t.stages['ocr_total'].images.length > 1) {
       console.log("Parallel:");
       t.stages['ocr_total'].images.forEach((img: any, i: number) => {
          if (i === 0) console.log(`image${i+1} ─┐`);
          else if (i === t.stages['ocr_total'].images.length -1 ) console.log(`image${i+1} ─┘  => Combine`);
          else console.log(`image${i+1} ─┤`);
       });
    } else {
       console.log("Sequential: image1 => processing");
    }

    console.log("=========================================\n\n");

    console.log(`[PERF] TOTAL: ${totalDurationMs} ms`);

    console.log(
      `[ANALYSIS] Inspection complete for scan ${scan.scanNumber}. Status: ${decision.complianceStatus}, Score: ${decision.complianceScore}%`,
    );

    return {
      scanId: scan.id,
      scanNumber: scan.scanNumber,
      ...decision,
    };
  }
}

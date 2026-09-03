import { DBRepo } from "../../db/repo.js";
import { OcrService } from "../ocr/ocr.service.js";
import { StorageService } from "../storage.service.js";
import { GeminiExtractor } from "../extraction/gemini.extractor.js";
import { ProductClassifier } from "../classification/classifier.service.js";
import {
  ComplianceDecisionEngine,
  ComplianceDecision,
} from "../engine/decision.engine.js";
import { OcrResult } from "../ocr/ocr.interface.js";
import { PreprocessService } from "../preprocess.service.js";
import fs from "fs/promises";
import path from "path";

export class InspectionPipelineService {
  /**
   * Runs the complete end-to-end inspection pipeline on a registered scan.
   */
  static async processScan(
    scanId: string,
  ): Promise<ComplianceDecision & { scanId: string; scanNumber: string }> {
    console.log(`[PIPELINE] START scanId=${scanId}`);

    // 1. Fetch Scan & Images
    const scan = await DBRepo.getScan(scanId);
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

    const totalStart = Date.now();
    console.log(
      `[OCR] Processing ${targetImages.length} package image(s) (${preprocessedImages.length} preprocessed, ${originalImages.length} original) for scan ${scan.scanNumber}`,
    );

    // 2. OCR Stage
    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "OCR" });
    const ocrStart = Date.now();
    const ocrResults = await Promise.all(
      targetImages.map(async (image, idx) => {
        console.log(
          `[OCR] Processing image ${idx + 1}/${targetImages.length} (${image.imageType}): ${image.fileName}`,
        );
        const imageBuffer = await StorageService.downloadFile(image.storagePath);
        let bufferToOcr = imageBuffer;
        if (image.imageType === "ORIGINAL" && preprocessedImages.length === 0) {
          const prep = await PreprocessService.preprocess(imageBuffer);
          bufferToOcr = prep.processedBuffer;
        }
        return OcrService.extract(bufferToOcr);
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
    const ocrDurationMs = Date.now() - ocrStart;

    console.log(
      `[OCR] Completed OCR across all ${ocrResults.length} image(s). Combined text length: ${combinedOcrText.length} chars.`,
    );
    console.log(`[PERF] OCR: ${ocrDurationMs} ms`);

    // 3. Gemini Structured Extraction Stage
    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "EXTRACTION" });
    console.log(
      `[GEMINI] Invoking Gemini structured extraction on combined package text...`,
    );
    const geminiStart = Date.now();
    const declarations = await GeminiExtractor.extractDeclarations(ocrResult);
    const geminiDurationMs = Date.now() - geminiStart;
    console.log(`[PERF] Gemini: ${geminiDurationMs} ms`);

    // 4. Product Classification Stage
    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "CLASSIFICATION" });
    console.log(`[CLASSIFICATION] Determining commodity classification...`);
    const classStart = Date.now();
    const classification = ProductClassifier.classify(
      declarations,
      ocrResult.rawText,
    );
    const classDurationMs = Date.now() - classStart;
    console.log(`[PERF] Classification: ${classDurationMs} ms`);

    // 5. Compliance & RAG Stage
    await DBRepo.updateScan(scanId, { status: "PROCESSING", currentStage: "COMPLIANCE" });
    console.log(
      `[COMPLIANCE] Executing deterministic rule validation and RAG grounding for '${classification.category}'...`,
    );
    const decision = await ComplianceDecisionEngine.evaluate(
      declarations,
      classification,
      ocrResult.rawText,
    );

    // 6. Update Product Category in DB
    const dbStart = Date.now();
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
    const dbDurationMs = Date.now() - dbStart;
    console.log(`[PERF] Persistence: ${dbDurationMs} ms`);

    const totalDurationMs = Date.now() - totalStart;
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

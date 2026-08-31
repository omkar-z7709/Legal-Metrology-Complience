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
import fs from "fs/promises";
import path from "path";

export class InspectionPipelineService {
  /**
   * Runs the complete end-to-end inspection pipeline on a registered scan.
   */
  static async processScan(
    scanId: string,
  ): Promise<ComplianceDecision & { scanId: string; scanNumber: string }> {
    // 1. Fetch Scan & Images
    const scan = await DBRepo.getScan(scanId);
    if (!scan) throw new Error(`Scan with ID '${scanId}' not found.`);

    const scanImages = await DBRepo.getScanImages(scanId);
    const processedImages = scanImages.filter(
      (img) => img.imageType === "PREPROCESSED",
    );

    if (processedImages.length === 0) {
      throw new Error("No preprocessed images found for this scan.");
    }

    const ocrResults = [];

    for (const image of processedImages) {
      const imageBuffer = await StorageService.downloadFile(image.storagePath);

      const result = await OcrService.extract(imageBuffer);

      ocrResults.push(result);
    }

    const combinedOcrText = ocrResults
      .map(
        (result, index) =>
          `--- PACKAGE IMAGE ${index + 1} ---\n${result.rawText}`,
      )
      .join("\n\n");

    // Load Image Buffer
    // let imageBuffer: Buffer;
    // if (processedImage?.storagePath?.startsWith("local://")) {
    //   const filePath = path.join(
    //     process.cwd(),
    //     "uploads",
    //     processedImage.storagePath.replace("local://", ""),
    //   );
    //   imageBuffer = await fs
    //     .readFile(filePath)
    //     .catch(() => Buffer.from("image placeholder"));
    // } else {
    //   imageBuffer = Buffer.from("image placeholder");
    // }

    // 2. Execute OCR Pipeline (Module 5)
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

    // 3. Gemini Structured Extraction (Module 6)
    const declarations = await GeminiExtractor.extractDeclarations(ocrResult);

    // 4. Product Classification (Module 7)
    const classification = ProductClassifier.classify(
      declarations,
      ocrResult.rawText,
    );

    // 5. Rule Engine & Decision Engine (Modules 8, 9, 10, 11, 12)
    const decision = await ComplianceDecisionEngine.evaluate(
      declarations,
      classification,
      ocrResult.rawText,
    );

    // 6. Update Product Category in DB
    if (scan.productId) {
      await DBRepo.updateProduct(scan.productId, {
        category: classification.category,
        commodityType: classification.commodityType,
      });
    }

    // 7. Persist Extracted Fields to Database
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

    for (const field of fieldRecords) {
      if (field.data) {
        await DBRepo.insertExtractedField({
          scanId,
          fieldName: field.name,
          fieldValue: field.data.value,
          rawText: field.data.source_text,
          confidence: field.data.confidence.toFixed(4),
          boundingBox: field.data.bbox,
          rawData: field.data,
          isPresent: field.data.value !== null,
          validationStatus: field.data.value !== null ? "VALID" : "INVALID",
        });
      }
    }

    // 8. Persist Compliance Checks and Violations
    for (const check of [
      ...decision.passedChecks,
      ...decision.violations,
      ...decision.reviewChecks,
    ]) {
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
    }

    // 9. Update Scan Record with final status & score
    await DBRepo.updateScan(scanId, {
      status: "COMPLETED",
      complianceStatus: decision.complianceStatus,
      complianceScore: decision.complianceScore.toFixed(2),
      analysis: {
        declarations,
        ...decision,
      },
    });

    return {
      scanId: scan.id,
      scanNumber: scan.scanNumber,
      ...decision,
    };
  }
}

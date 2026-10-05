import { StructuredDeclarations } from "../extraction/extraction.schema.js";
import { ClassificationResult } from "../classification/classifier.service.js";
import { IValidator, ValidationCheckResult } from "./validators/validator.interface.js";
import { PresenceValidator } from "./validators/presence.validator.js";
import { MRPValidator } from "./validators/mrp.validator.js";
import { QuantityValidator } from "./validators/quantity.validator.js";
import { DateValidator } from "./validators/date.validator.js";
import { VisionQualityValidator } from "./validators/vision.validator.js";
import { PlacementValidator } from "./validators/placement.validator.js";
import { RagLegalService, LegalContextChunk } from "../rag/rag.service.js";
import {
  ExtractionReliabilityReport,
  OcrTrustContext,
  assessExtractionReliability,
} from "./extraction-reliability.js";

export interface EnrichedViolation extends ValidationCheckResult {
  legalContext?: LegalContextChunk[];
}

export interface ComplianceDecision {
  complianceStatus: "COMPLIANT" | "NON_COMPLIANT" | "REQUIRES_REVIEW";
  complianceScore: number; // 0 - 100
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    requiresReview: number;
    /** FAILs softened to REVIEW because the text layer could not be trusted. */
    absenceChecksDowngraded: number;
  };
  violations: EnrichedViolation[];
  passedChecks: ValidationCheckResult[];
  reviewChecks: ValidationCheckResult[];
  classification: ClassificationResult;
  retrievedContext: LegalContextChunk[];
  disclaimer: string;
  /**
   * Grade of the text layer this decision was derived from. Consumers MUST NOT
   * present a NON_COMPLIANT verdict as settled while this is not "RELIABLE".
   */
  extractionReliability: ExtractionReliabilityReport;
}

/**
 * TEMP TIMING: optional sink so callers can attribute the combined compliance
 * stage to RAG retrieval vs. deterministic validators. Additive — existing
 * callers that omit it are unaffected.
 */
export interface ComplianceStageTiming {
  ragMs?: number;
  complianceMs?: number;
}

/**
 * Facts about the text layer the decision is derived from. Callers that omit
 * this get a conservative UNRELIABLE grade rather than an implicit pass.
 */
export interface ComplianceOcrContext extends OcrTrustContext {}

export class ComplianceDecisionEngine {
  private static validators: IValidator[] = [
    new PresenceValidator(),
    new MRPValidator(),
    new QuantityValidator(),
    new DateValidator(),
    new VisionQualityValidator(),
    new PlacementValidator(),
  ];

  /**
   * Evaluates extracted declarations against deterministic Legal Metrology rules
   * and enriches violations with RAG legal citations.
   */
  static async evaluate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawOcrText: string,
    timingOut?: ComplianceStageTiming,
    ocrContext?: ComplianceOcrContext
  ): Promise<ComplianceDecision> {
    // 1. Construct dynamic compliance search query from actual inspection data
    const queryParts: string[] = [];
    if (classification.category) queryParts.push(`Category: ${classification.category}`);
    if (classification.commodityType) queryParts.push(`Commodity Type: ${classification.commodityType}`);
    if (declarations.generic_name?.value) queryParts.push(`Commodity: ${declarations.generic_name.value}`);
    if (declarations.net_quantity?.value) queryParts.push(`Net quantity: ${declarations.net_quantity.value}`);
    if (declarations.mrp?.value) queryParts.push(`MRP: ${declarations.mrp.value}`);
    if (declarations.consumer_care?.value) queryParts.push(`Consumer Care: ${declarations.consumer_care.value}`);
    if (declarations.country_of_origin?.value) queryParts.push(`Country of Origin: ${declarations.country_of_origin.value}`);

    const dynamicQuery = queryParts.length > 0
      ? `Packaged commodity statutory compliance requirements for ${queryParts.join(", ")}. Mandatory declarations under Rule 6, MRP, net quantity, consumer care, and origin.`
      : `Mandatory declarations for packaged commodities under Legal Metrology Rules, 2011 Rule 6.`;

    console.log(`[RAG] Constructed dynamic inspection query: "${dynamicQuery}"`);

    // 2. Retrieve authoritative Legal Metrology context chunks for this commodity
    const ragStart = Date.now();
    const retrievedContext = await RagLegalService.retrieveLegalContext(
      dynamicQuery,
      classification.category,
      4
    );

    // 3. Run each deterministic validator
    const compStart = Date.now();
    const allChecks: ValidationCheckResult[] = [];
    for (const validator of this.validators) {
      const results = validator.validate(declarations, classification, rawOcrText);
      allChecks.push(...results);
    }
    const compTime = Date.now() - compStart;

    // --- Extraction reliability gate -------------------------------------
    // "Not detected" only means "not printed" when the text layer is sound.
    // Without a caller-supplied OCR context we cannot claim otherwise, so the
    // run is graded UNRELIABLE and no absence-based FAIL is allowed to stand.
    const reliability = assessExtractionReliability(
      declarations,
      ocrContext ?? {
        provider: "unknown",
        averageConfidence: 0,
        textLength: rawOcrText?.length ?? 0,
        imageCount: 0,
      },
    );

    let absenceChecksDowngraded = 0;
    if (reliability.verdict !== "RELIABLE") {
      for (const check of allChecks) {
        if (check.status !== "FAIL" || !check.absenceBased) continue;
        check.status = "REVIEW";
        check.title = `[Unverified] ${check.title}`;
        check.reason =
          `${check.reason} This finding rests on text that could not be read reliably ` +
          `(extraction graded ${reliability.verdict}), so it must be confirmed by physical inspection.`;
        check.suggestedAction =
          "Do not issue notice on this check alone. Re-image the package or verify manually.";
        check.confidence = Math.min(check.confidence, 0.4);
        absenceChecksDowngraded++;
      }
    }
    reliability.absenceChecksDowngraded = absenceChecksDowngraded;

    const passedChecks = allChecks.filter((c) => c.status === "PASS");
    const failedChecks = allChecks.filter((c) => c.status === "FAIL");
    const reviewChecks = allChecks.filter((c) => c.status === "REVIEW");

    // 4. Enrich failed checks with RAG statutory citations.
    //    Reuses the single retrieval above (cheap exact/similar ruleNumb matching)
    //    instead of issuing a separate Gemini embedding + RAG call per violation.
    const violations: EnrichedViolation[] = failedChecks.map((check) => {
      const checkNumber = check.ruleNumber;
      const checkTitle = (check.title || "").toLowerCase();
      const legalContext = retrievedContext.filter(
        (c) =>
          (checkNumber && c.ruleNumber === checkNumber) ||
          (checkTitle && (c.text || "").toLowerCase().includes(checkTitle)),
      );
      return {
        ...check,
        legalContext: legalContext.slice(0, 2),
      };
    });
    const totalRagTime = (Date.now() - ragStart) - compTime;

    if (timingOut) {
      timingOut.ragMs = totalRagTime;
      timingOut.complianceMs = compTime;
    }

    console.log(`[PERF] RAG: ${totalRagTime} ms`);
    console.log(`[PERF] Compliance: ${compTime} ms`);

    // Calculate deterministic compliance score
    // Critical failure: heavy penalty (-25%), High: (-15%), Medium: (-8%), Review: (-5%)
    let score = 100;
    for (const v of failedChecks) {
      if (v.severity === "CRITICAL") score -= 25;
      else if (v.severity === "HIGH") score -= 15;
      else if (v.severity === "MEDIUM") score -= 8;
      else score -= 5;
    }
    for (const r of reviewChecks) {
      score -= 5;
    }
    score = Math.max(0, Math.min(100, score));

    // Determine overall compliance status.
    // A run whose text layer could not be trusted can never assert a settled
    // NON_COMPLIANT verdict, because the only evidence available was absence.
    let complianceStatus: "COMPLIANT" | "NON_COMPLIANT" | "REQUIRES_REVIEW";
    if (failedChecks.length > 0 && reliability.verdict === "RELIABLE") {
      complianceStatus = "NON_COMPLIANT";
    } else if (failedChecks.length > 0 || reviewChecks.length > 0) {
      complianceStatus = "REQUIRES_REVIEW";
    } else {
      complianceStatus = "COMPLIANT";
    }

    return {
      complianceStatus,
      complianceScore: score,
      summary: {
        totalChecks: allChecks.length,
        passed: passedChecks.length,
        failed: failedChecks.length,
        requiresReview: reviewChecks.length,
        absenceChecksDowngraded,
      },
      violations,
      passedChecks,
      reviewChecks,
      classification,
      retrievedContext,
      extractionReliability: reliability,
      disclaimer:
        "Automated screening assists enforcement officers by extracting declarations and identifying potential compliance issues under Legal Metrology (Packaged Commodities) Rules, 2011. Final regulatory determination remains subject to authorized officer review.",
    };
  }
}

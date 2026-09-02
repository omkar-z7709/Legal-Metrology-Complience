import { StructuredDeclarations } from "../extraction/extraction.schema.js";
import { ClassificationResult } from "../classification/classifier.service.js";
import { IValidator, ValidationCheckResult } from "./validators/validator.interface.js";
import { PresenceValidator } from "./validators/presence.validator.js";
import { MRPValidator } from "./validators/mrp.validator.js";
import { QuantityValidator } from "./validators/quantity.validator.js";
import { DateValidator } from "./validators/date.validator.js";
import { VisionQualityValidator } from "./validators/vision.validator.js";
import { RagLegalService, LegalContextChunk } from "../rag/rag.service.js";

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
  };
  violations: EnrichedViolation[];
  passedChecks: ValidationCheckResult[];
  reviewChecks: ValidationCheckResult[];
  classification: ClassificationResult;
  retrievedContext: LegalContextChunk[];
  disclaimer: string;
}

export class ComplianceDecisionEngine {
  private static validators: IValidator[] = [
    new PresenceValidator(),
    new MRPValidator(),
    new QuantityValidator(),
    new DateValidator(),
    new VisionQualityValidator(),
  ];

  /**
   * Evaluates extracted declarations against deterministic Legal Metrology rules
   * and enriches violations with RAG legal citations.
   */
  static async evaluate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawOcrText: string
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
    const retrievedContext = await RagLegalService.retrieveLegalContext(
      dynamicQuery,
      classification.category,
      4
    );

    // 3. Run each deterministic validator
    const allChecks: ValidationCheckResult[] = [];
    for (const validator of this.validators) {
      const results = validator.validate(declarations, classification, rawOcrText);
      allChecks.push(...results);
    }

    const passedChecks = allChecks.filter((c) => c.status === "PASS");
    const failedChecks = allChecks.filter((c) => c.status === "FAIL");
    const reviewChecks = allChecks.filter((c) => c.status === "REVIEW");

    // 4. Enrich failed checks with specific RAG statutory citations
    const violations: EnrichedViolation[] = await Promise.all(
      failedChecks.map(async (check) => {
        const specificLegalContext = await RagLegalService.retrieveLegalContext(
          `${check.ruleNumber} ${check.title} ${check.fieldName} ${check.reason}`,
          classification.category,
          2
        );
        return {
          ...check,
          legalContext: specificLegalContext,
        };
      })
    );

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

    // Determine overall compliance status
    let complianceStatus: "COMPLIANT" | "NON_COMPLIANT" | "REQUIRES_REVIEW";
    if (failedChecks.length > 0) {
      complianceStatus = "NON_COMPLIANT";
    } else if (reviewChecks.length > 0) {
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
      },
      violations,
      passedChecks,
      reviewChecks,
      classification,
      retrievedContext,
      disclaimer:
        "Automated screening assists enforcement officers by extracting declarations and identifying potential compliance issues under Legal Metrology (Packaged Commodities) Rules, 2011. Final regulatory determination remains subject to authorized officer review.",
    };
  }
}

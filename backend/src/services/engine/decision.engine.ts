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
    const allChecks: ValidationCheckResult[] = [];

    // Run each deterministic validator
    for (const validator of this.validators) {
      const results = validator.validate(declarations, classification, rawOcrText);
      allChecks.push(...results);
    }

    const passedChecks = allChecks.filter((c) => c.status === "PASS");
    const failedChecks = allChecks.filter((c) => c.status === "FAIL");
    const reviewChecks = allChecks.filter((c) => c.status === "REVIEW");

    // Enrich failed checks with RAG statutory citations
    const violations: EnrichedViolation[] = await Promise.all(
      failedChecks.map(async (check) => {
        const legalContext = await RagLegalService.retrieveLegalContext(
          `${check.ruleNumber} ${check.title} ${check.fieldName}`,
          classification.category
        );
        return {
          ...check,
          legalContext,
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
      disclaimer:
        "Automated screening assists enforcement officers by extracting declarations and identifying potential compliance issues under Legal Metrology (Packaged Commodities) Rules, 2011. Final regulatory determination remains subject to authorized officer review.",
    };
  }
}

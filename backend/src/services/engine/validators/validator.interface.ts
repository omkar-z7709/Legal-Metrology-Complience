import { StructuredDeclarations } from "../../extraction/extraction.schema.js";
import { ClassificationResult } from "../../classification/classifier.service.js";

export type CheckStatus = "PASS" | "FAIL" | "REVIEW";
export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ValidationCheckResult {
  ruleId: string;
  ruleNumber: string;
  fieldName: string;
  status: CheckStatus;
  severity: SeverityLevel;
  title: string;
  reason: string;
  evidence: string;
  confidence: number;
  boundingBox?: { x1: number; y1: number; x2: number; y2: number } | null;
  suggestedAction?: string;
  isEstimatedMeasurement?: boolean;
  /**
   * True when the conclusion rests on a declaration NOT being present in the
   * text layer. Such checks are only sound when OCR is trustworthy, so the
   * reliability gate may soften them to REVIEW. Checks that found a present
   * but malformed value must leave this false.
   */
  absenceBased?: boolean;
}

export interface IValidator {
  name: string;
  validate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawText: string
  ): ValidationCheckResult[];
}

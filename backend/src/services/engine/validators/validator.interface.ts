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
}

export interface IValidator {
  name: string;
  validate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawText: string
  ): ValidationCheckResult[];
}

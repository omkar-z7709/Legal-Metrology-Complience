/**
 * Extraction reliability gate.
 *
 * Legal Metrology checks decide COMPLIANCE from whether a declaration was
 * extracted. That inference is only sound when the text layer is trustworthy:
 * "not extracted" means "not on the package" only if OCR actually read the
 * package. When OCR degrades, absence-based FAILs become fabricated violations,
 * so this module grades the text layer and the engine downgrades any
 * "absence => violation" inference it cannot support.
 *
 * Signals are deliberately drawn from observable facts (provider identity, mean
 * word confidence, text volume, declaration coverage) rather than from the
 * per-field `confidence` values, which are model self-reports on the Gemini
 * path and hardcoded literals on the deterministic fallback path.
 */

import { StructuredDeclarations } from "../extraction/extraction.schema.js";

export type ExtractionReliability = "RELIABLE" | "DEGRADED" | "UNRELIABLE";

export interface ExtractionReliabilityReport {
  verdict: ExtractionReliability;
  ocrProvider: string;
  ocrAverageConfidence: number;
  ocrTextLength: number;
  imageCount: number;
  mandatoryFieldsDetected: number;
  mandatoryFieldsTotal: number;
  missingMandatoryFields: string[];
  /** Human-readable justification, surfaced in the UI. */
  reasons: string[];
  /** Absence-based checks moved from FAIL to REVIEW because of this gate. */
  absenceChecksDowngraded: number;
}

/** Rule 6 declarations expected on any genuinely compliant packaged commodity. */
const MANDATORY_FIELDS: { key: keyof StructuredDeclarations; label: string }[] = [
  { key: "generic_name", label: "Generic name" },
  { key: "manufacturer", label: "Manufacturer / packer" },
  { key: "net_quantity", label: "Net quantity" },
  { key: "mrp", label: "MRP" },
  { key: "date_of_manufacture", label: "Date of manufacture" },
  { key: "consumer_care", label: "Consumer care" },
  { key: "country_of_origin", label: "Country of origin" },
];

const rank: Record<ExtractionReliability, number> = {
  RELIABLE: 0,
  DEGRADED: 1,
  UNRELIABLE: 2,
};

export interface OcrTrustContext {
  provider: string;
  averageConfidence: number;
  textLength: number;
  imageCount: number;
}

export function assessExtractionReliability(
  declarations: StructuredDeclarations,
  ocr: OcrTrustContext,
): ExtractionReliabilityReport {
  const reasons: string[] = [];
  let verdict: ExtractionReliability = "RELIABLE";

  const escalate = (next: ExtractionReliability, reason: string) => {
    if (rank[next] > rank[verdict]) verdict = next;
    reasons.push(reason);
  };

  // 1. Provider identity. `synthetic` is fabricated demo text, never a reading.
  if (ocr.provider === "synthetic") {
    escalate(
      "UNRELIABLE",
      "OCR returned synthetic placeholder text instead of reading the package. No compliance conclusion can be drawn from this run.",
    );
  } else if (ocr.provider === "tesseract") {
    escalate(
      "DEGRADED",
      "OCR fell back to Tesseract because the primary provider (Google Cloud Vision) was unavailable.",
    );
  }

  // 2. Mean word confidence. Tesseract can be confidently wrong, so this is a
  //    supporting signal only, never the sole basis for grading.
  if (ocr.averageConfidence < 0.55) {
    escalate(
      "UNRELIABLE",
      `Mean OCR word confidence ${(ocr.averageConfidence * 100).toFixed(0)}% is too low to treat missing text as missing declarations.`,
    );
  } else if (ocr.averageConfidence < 0.75) {
    escalate(
      "DEGRADED",
      `Mean OCR word confidence ${(ocr.averageConfidence * 100).toFixed(0)}% is below the threshold for automatic compliance decisions.`,
    );
  }

  // 3. Text volume.
  if (ocr.textLength < 150) {
    escalate(
      "UNRELIABLE",
      `Only ${ocr.textLength} characters of text were recovered; a packaged commodity label yields substantially more.`,
    );
  }

  // 4. Declaration coverage. The strongest signal available: a real package
  //    declares most Rule 6 fields, so widespread absence indicates failed
  //    extraction rather than widespread non-compliance.
  const missing: string[] = [];
  let detected = 0;
  for (const field of MANDATORY_FIELDS) {
    const value = (declarations as any)[field.key]?.value;
    if (typeof value === "string" && value.trim().length > 0) detected++;
    else missing.push(field.label);
  }

  const coverage = detected / MANDATORY_FIELDS.length;
  if (coverage < 0.3) {
    escalate(
      "UNRELIABLE",
      `Only ${detected} of ${MANDATORY_FIELDS.length} mandatory declarations were recovered. This pattern indicates failed text extraction, not a package missing most of its legally required declarations.`,
    );
  } else if (coverage < 0.6) {
    escalate(
      "DEGRADED",
      `${detected} of ${MANDATORY_FIELDS.length} mandatory declarations were recovered; absence-based findings need officer confirmation.`,
    );
  }

  if (ocr.imageCount < 1) {
    escalate("UNRELIABLE", "No images were processed.");
  }

  return {
    verdict,
    ocrProvider: ocr.provider,
    ocrAverageConfidence: Number(ocr.averageConfidence.toFixed(4)),
    ocrTextLength: ocr.textLength,
    imageCount: ocr.imageCount,
    mandatoryFieldsDetected: detected,
    mandatoryFieldsTotal: MANDATORY_FIELDS.length,
    missingMandatoryFields: missing,
    reasons,
    absenceChecksDowngraded: 0,
  };
}
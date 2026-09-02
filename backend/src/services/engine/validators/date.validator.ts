import { IValidator, ValidationCheckResult } from "./validator.interface.js";
import { StructuredDeclarations } from "../../extraction/extraction.schema.js";
import { ClassificationResult } from "../../classification/classifier.service.js";

export class DateValidator implements IValidator {
  name = "DateValidator";

  validate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawText: string
  ): ValidationCheckResult[] {
    const results: ValidationCheckResult[] = [];
    const date = declarations.date_of_manufacture;

    if (!date.value) {
      results.push({
        ruleId: "RULE-6-1-D-DATE-MANUFACTURE",
        ruleNumber: "Rule 6(1)(d)",
        fieldName: "date_of_manufacture",
        status: "FAIL",
        severity: "HIGH",
        title: "Missing Month / Year of Manufacture",
        reason: "Mandatory Month and Year of Manufacture/Packing is absent on the label.",
        evidence: "No Mfg or Packing date found in text extraction.",
        confidence: 0.94,
        suggestedAction: "Flag violation under Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules.",
      });
      return results;
    }

    // Format validation: MM/YYYY or Month YYYY
    const hasMonthYear = /(?:0[1-9]|1[0-2]|[a-zA-Z]{3,9})[\s\/-]20\d{2}/.test(date.value);
    if (hasMonthYear) {
      results.push({
        ruleId: "RULE-6-1-D-DATE-MANUFACTURE",
        ruleNumber: "Rule 6(1)(d)",
        fieldName: "date_of_manufacture",
        status: "PASS",
        severity: "HIGH",
        title: "Manufacture Date Declaration Compliant",
        reason: `Valid month and year declared as '${date.value}'.`,
        evidence: date.source_text || date.value,
        confidence: date.confidence || 0.93,
        boundingBox: date.bbox,
      });
    } else {
      results.push({
        ruleId: "RULE-6-1-D-DATE-MANUFACTURE",
        ruleNumber: "Rule 6(1)(d)",
        fieldName: "date_of_manufacture",
        status: "REVIEW",
        severity: "MEDIUM",
        title: "Non-Standard Date Format",
        reason: `Date declaration '${date.value}' does not adhere strictly to MM/YYYY or Month YYYY standard.`,
        evidence: date.source_text || date.value,
        confidence: 0.82,
        suggestedAction: "Officer review required to verify date clarity.",
      });
    }

    return results;
  }
}

import { IValidator, ValidationCheckResult } from "./validator.interface.js";
import { StructuredDeclarations } from "../../extraction/extraction.schema.js";
import { ClassificationResult } from "../../classification/classifier.service.js";

const VALID_METRIC_UNITS = ["g", "kg", "ml", "l", "litre", "liter", "n", "u", "unit", "units", "tablets", "capsules"];

export class QuantityValidator implements IValidator {
  name = "QuantityValidator";

  validate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawText: string
  ): ValidationCheckResult[] {
    const results: ValidationCheckResult[] = [];
    const qty = declarations.net_quantity;

    if (!qty.value || !qty.numeric_value) {
      results.push({
        ruleId: "RULE-6-1-C-NET-QUANTITY",
        ruleNumber: "Rule 6(1)(c)",
        fieldName: "net_quantity",
        status: "FAIL",
        severity: "CRITICAL",
        title: "Missing Net Quantity Declaration",
        reason: "Package lacks mandatory Net Quantity declaration.",
        evidence: "No valid metric net quantity detected on label.",
        confidence: 0.98,
        suggestedAction: "Prohibit dispatch of non-standard quantity packages under Section 36.",
      });
      return results;
    }

    const unit = qty.unit?.toLowerCase() || "";
    const isValidUnit = VALID_METRIC_UNITS.includes(unit);

    if (isValidUnit) {
      results.push({
        ruleId: "RULE-6-1-C-NET-QUANTITY",
        ruleNumber: "Rule 6(1)(c)",
        fieldName: "net_quantity",
        status: "PASS",
        severity: "CRITICAL",
        title: "Standard Net Quantity Declaration",
        reason: `Declared in standard metric unit: ${qty.numeric_value} ${unit.toUpperCase()}.`,
        evidence: qty.source_text || `${qty.numeric_value} ${unit}`,
        confidence: qty.confidence || 0.98,
        boundingBox: qty.bbox,
      });
    } else {
      results.push({
        ruleId: "RULE-6-1-C-NET-QUANTITY",
        ruleNumber: "Rule 6(1)(c)",
        fieldName: "net_quantity",
        status: "FAIL",
        severity: "HIGH",
        title: "Non-Standard Measurement Unit",
        reason: `Unit '${unit}' violates the standard international metric system mandated by Legal Metrology Act.`,
        evidence: qty.source_text || `Unit: ${unit}`,
        confidence: 0.95,
        suggestedAction: "Mandate use of standard SI symbols (g, kg, ml, l) on commodity packaging.",
      });
    }

    return results;
  }
}

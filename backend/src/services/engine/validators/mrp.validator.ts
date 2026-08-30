import { IValidator, ValidationCheckResult } from "./validator.interface.js";
import { StructuredDeclarations } from "../../extraction/extraction.schema.js";
import { ClassificationResult } from "../../classification/classifier.service.js";

export class MRPValidator implements IValidator {
  name = "MRPValidator";

  validate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawText: string
  ): ValidationCheckResult[] {
    const results: ValidationCheckResult[] = [];
    const mrp = declarations.mrp;

    if (!mrp.value || mrp.numeric_value === null || mrp.numeric_value === undefined) {
      results.push({
        ruleId: "RULE-6-1-E-MRP",
        ruleNumber: "Rule 6(1)(e)",
        fieldName: "mrp",
        status: "FAIL",
        severity: "CRITICAL",
        title: "Missing Maximum Retail Price (MRP)",
        reason: "Package lacks mandatory Maximum Retail Price (MRP) declaration.",
        evidence: "No valid retail price in Rs. / ₹ detected on package.",
        confidence: 0.98,
        suggestedAction: "Statutory violation under Rule 6(1)(e) - Package cannot be offered for retail sale without MRP.",
      });
      return results;
    }

    // 1. Valid MRP Present
    if (mrp.numeric_value > 0) {
      results.push({
        ruleId: "RULE-6-1-E-MRP",
        ruleNumber: "Rule 6(1)(e)",
        fieldName: "mrp",
        status: "PASS",
        severity: "CRITICAL",
        title: "Maximum Retail Price Declared",
        reason: `Valid MRP declared as ₹${mrp.numeric_value}.`,
        evidence: mrp.source_text || `MRP ₹${mrp.numeric_value}`,
        confidence: mrp.confidence || 0.97,
        boundingBox: mrp.bbox,
      });
    }

    // 2. 'Inclusive of all taxes' check
    const hasTaxStatement = mrp.is_inclusive_of_taxes || /(?:incl|inclusive).*taxes/i.test(rawText);
    if (!hasTaxStatement) {
      results.push({
        ruleId: "RULE-6-1-E-MRP",
        ruleNumber: "Rule 6(1)(e)",
        fieldName: "mrp_taxes",
        status: "FAIL",
        severity: "HIGH",
        title: "Deficient Tax Inclusive Statement",
        reason: "Retail sale price must explicitly state 'Inclusive of all taxes' or 'incl. of all taxes'.",
        evidence: mrp.source_text || "Found price without explicit tax inclusion wording.",
        confidence: 0.92,
        suggestedAction: "Require label correction to mandate '(Incl. of all taxes)' following MRP.",
      });
    }

    return results;
  }
}

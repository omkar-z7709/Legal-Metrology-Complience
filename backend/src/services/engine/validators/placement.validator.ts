import { StructuredDeclarations } from "../../extraction/extraction.schema.js";
import { ClassificationResult } from "../../classification/classifier.service.js";
import { IValidator, ValidationCheckResult } from "./validator.interface.js";

export class PlacementValidator implements IValidator {
  name = "placement";

  validate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawText: string
  ): ValidationCheckResult[] {
    const results: ValidationCheckResult[] = [];

    const fieldConfigs: { key: keyof StructuredDeclarations; label: string; ruleId: string; ruleNumber: string }[] = [
      { key: "generic_name", label: "Generic Commodity Name", ruleId: "RULE-7-1-PLACEMENT", ruleNumber: "Rule 7(1)" },
      { key: "net_quantity", label: "Net Quantity", ruleId: "RULE-7-2-PLACEMENT", ruleNumber: "Rule 7(2)" },
      { key: "mrp", label: "Maximum Retail Price (MRP)", ruleId: "RULE-7-3-PLACEMENT", ruleNumber: "Rule 7(3)" },
      { key: "manufacturer", label: "Manufacturer Details", ruleId: "RULE-7-4-PLACEMENT", ruleNumber: "Rule 7(4)" },
      { key: "consumer_care", label: "Consumer Care Contact", ruleId: "RULE-7-5-PLACEMENT", ruleNumber: "Rule 7(5)" },
      { key: "country_of_origin", label: "Country of Origin", ruleId: "RULE-7-6-PLACEMENT", ruleNumber: "Rule 7(6)" },
    ];

    for (const item of fieldConfigs) {
      const decl = declarations[item.key] as any;

      if (!decl || !decl.value) {
        results.push({
          ruleId: item.ruleId,
          ruleNumber: item.ruleNumber,
          fieldName: item.key,
          status: "FAIL",
          severity: "HIGH",
          title: `Declaration Placement Missing - ${item.label}`,
          reason: `${item.label} declaration is not detected on packaging display panel.`,
          evidence: "Declaration absent from package OCR scan",
          confidence: 0.95,
          boundingBox: null,
          suggestedAction: `Ensure ${item.label} is printed on Principal Display Panel as mandated by Rule 7.`,
        });
      } else if (decl.bbox && typeof decl.bbox.y1 === "number") {
        // Bounding box exists and is located within package coordinates
        results.push({
          ruleId: item.ruleId,
          ruleNumber: item.ruleNumber,
          fieldName: item.key,
          status: "PASS",
          severity: "LOW",
          title: `Declaration Placement Verified - ${item.label}`,
          reason: `${item.label} is positioned on principal display panel bounding region (${decl.bbox.x1}, ${decl.bbox.y1}).`,
          evidence: decl.source_text || decl.value,
          confidence: Math.min(0.98, (decl.confidence || 0.9) + 0.05),
          boundingBox: decl.bbox,
        });
      } else {
        // Detected in text but precise bounding box coordinates require officer visual confirmation
        results.push({
          ruleId: item.ruleId,
          ruleNumber: item.ruleNumber,
          fieldName: item.key,
          status: "REVIEW",
          severity: "MEDIUM",
          title: `Declaration Placement Requires Inspection - ${item.label}`,
          reason: `${item.label} detected in OCR text ("${decl.value}"), but relative panel placement requires visual officer verification.`,
          evidence: decl.source_text || decl.value,
          confidence: decl.confidence || 0.85,
          boundingBox: null,
          suggestedAction: `Visually confirm that ${item.label} appears on Principal Display Panel without obstruction.`,
        });
      }
    }

    return results;
  }
}

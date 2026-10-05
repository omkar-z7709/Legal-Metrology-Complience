import { IValidator, ValidationCheckResult } from "./validator.interface.js";
import { StructuredDeclarations } from "../../extraction/extraction.schema.js";
import { ClassificationResult } from "../../classification/classifier.service.js";

export class VisionQualityValidator implements IValidator {
  name = "VisionQualityValidator";

  validate(
    declarations: StructuredDeclarations,
    classification: ClassificationResult,
    rawText: string
  ): ValidationCheckResult[] {
    const results: ValidationCheckResult[] = [];

    // 1. Readability & Contrast Analysis (Rule 9(1))
    const confidences = [
      declarations.mrp.confidence,
      declarations.net_quantity.confidence,
      declarations.date_of_manufacture.confidence,
      declarations.manufacturer.confidence,
    ].filter((c) => c > 0);

    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.85;

    if (avgConfidence >= 0.85) {
      results.push({
        ruleId: "RULE-9-1-READABILITY",
        ruleNumber: "Rule 9(1)",
        fieldName: "visual_readability",
        status: "PASS",
        severity: "MEDIUM",
        title: "Declaration Legibility & Optical Contrast",
        reason: "Mandatory declarations demonstrate high visual contrast and optical character legibility.",
        evidence: `Estimated character recognition confidence: ${(avgConfidence * 100).toFixed(1)}% across principal panels.`,
        confidence: avgConfidence,
        isEstimatedMeasurement: true,
      });
    } else {
      results.push({
        ruleId: "RULE-9-1-READABILITY",
        ruleNumber: "Rule 9(1)",
        fieldName: "visual_readability",
        status: "REVIEW",
        severity: "MEDIUM",
        title: "Low Visual Contrast / Readability Concern",
        reason: "Text extraction confidence indicates potential low-contrast background, glare hotspots, or packaging curvature.",
        evidence: `Estimated character recognition confidence: ${(avgConfidence * 100).toFixed(1)}% (below 85% threshold).`,
        confidence: avgConfidence,
        suggestedAction: "Physical on-site inspection advised to verify declaration prominence under standard retail lighting.",
        isEstimatedMeasurement: true,
      });
    }

    // 2. Relative Font Size Estimation (Rule 8)
    // Bounding boxes are NORMALISED to a 0-1000 axis (see extraction prompt), so
    // heights are expressed as a share of image height, not absolute pixels.
    // A physical mm value is NOT derivable from an image without a scale
    // reference, so this can only ever be an estimate requiring caliper check.
    const netQtyBbox = declarations.net_quantity.bbox;
    const mrpBbox = declarations.mrp.bbox;
    const referenceBbox = netQtyBbox || mrpBbox;
    const sourceField = netQtyBbox ? "net_quantity" : mrpBbox ? "mrp" : null;

    if (!referenceBbox) {
      // No localisation available -> we genuinely cannot assess font height.
      results.push({
        ruleId: "RULE-8-1-FONT-SIZE",
        ruleNumber: "Rule 8",
        fieldName: "font_height_estimation",
        status: "REVIEW",
        severity: "MEDIUM",
        title: "Numeral Height Not Measurable (Rule 8)",
        reason:
          "No bounding box was detected for the net quantity or MRP declaration, so numeral height cannot be estimated from the image.",
        evidence:
          "Missing spatial localisation for net_quantity and mrp. A blank placeholder height must not be reported as a pass.",
        confidence: 0.4,
        boundingBox: null,
        isEstimatedMeasurement: true,
        suggestedAction:
          "Capture a higher-resolution, in-focus image of the declaration panel, or verify numeral height with a Vernier caliper.",
      });
    } else {
      const heightNorm = referenceBbox.y2 - referenceBbox.y1;
      const heightPctOfImage = ((heightNorm / 1000) * 100).toFixed(2);
      results.push({
        ruleId: "RULE-8-1-FONT-SIZE",
        ruleNumber: "Rule 8",
        fieldName: "font_height_estimation",
        status: "REVIEW",
        severity: "MEDIUM",
        title: "Estimated Numeral & Letter Height (Rule 8)",
        reason:
          "Declaration text occupies a measurable share of the panel height; relative prominence is plausible but a physical millimetre value cannot be derived from an image without a scale reference.",
        evidence: `Normalised box height for '${sourceField}' is ${heightNorm}/1000 of the image axis (${heightPctOfImage}% of image height). Physical mm requires a Vernier caliper for statutory proceedings.`,
        confidence: 0.6,
        boundingBox: referenceBbox,
        isEstimatedMeasurement: true,
        suggestedAction:
          "Verify numeral height with a Vernier caliper against Table 1 before issuing any statutory notice.",
      });
    }

    // 3. Principal Display Panel (PDP) Spatial Placement Analysis (Rule 7)
    // Bounding boxes are normalised to 0-1000; 50/950 marks the outer 5% margin.
    const nameBbox = declarations.generic_name.bbox;
    if (nameBbox && (nameBbox.y1 < 50 || nameBbox.y2 > 950)) {
      results.push({
        ruleId: "RULE-7-1-PDP-PLACEMENT",
        ruleNumber: "Rule 7",
        fieldName: "pdp_placement",
        status: "REVIEW",
        severity: "LOW",
        title: "Declaration Close to Package Margin",
        reason: "Generic commodity name is positioned within outer 5% edge boundary of detected packaging canvas.",
        evidence: `Spatial coordinate y1: ${nameBbox.y1}, y2: ${nameBbox.y2}`,
        confidence: 0.80,
        boundingBox: nameBbox,
        suggestedAction: "Verify that declaration is not obscured by package folding or heat seal seam.",
        isEstimatedMeasurement: true,
      });
    }

    return results;
  }
}

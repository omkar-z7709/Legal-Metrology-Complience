import { VisionQualityValidator } from "../services/engine/validators/vision.validator.js";
import { StructuredDeclarations } from "../services/extraction/extraction.schema.js";
import { ClassificationResult } from "../services/classification/classifier.service.js";

async function runVisionAnalysisTests() {
  console.log("==================================================");
  console.log("🧪 MODULE 11: Computer Vision Analysis Test");
  console.log("==================================================");

  const validator = new VisionQualityValidator();
  const classification: ClassificationResult = {
    category: "FOOD",
    commodityType: "LIQUID",
    isImported: false,
    confidence: 0.96,
    reason: "Matched edible oil",
    applicableSpecificRules: [],
  };

  // 1. High-Contrast Clear Commodity Image
  console.log("1️⃣ Testing High-Contrast Clear Packaging (Rule 9 & Rule 8)...");
  const clearDeclarations: StructuredDeclarations = {
    generic_name: { value: "Mustard Oil", source_text: "Mustard Oil", confidence: 0.96, bbox: { x1: 80, y1: 120, x2: 600, y2: 160 } },
    manufacturer: { value: "SunPure Edibles", source_text: "Mfd by: SunPure", confidence: 0.95, bbox: { x1: 80, y1: 500, x2: 600, y2: 540 } },
    packer: { value: null, source_text: null, confidence: 0, bbox: null },
    importer: { value: null, source_text: null, confidence: 0, bbox: null },
    net_quantity: { value: "1 L", numeric_value: 1, unit: "l", source_text: "1 L", confidence: 0.98, bbox: { x1: 80, y1: 240, x2: 300, y2: 280 } },
    mrp: { value: "₹185.00", numeric_value: 185, currency: "INR", is_inclusive_of_taxes: true, unit_sale_price: null, source_text: "MRP Rs. 185", confidence: 0.97, bbox: { x1: 80, y1: 300, x2: 450, y2: 340 } },
    date_of_manufacture: { value: "08/2026", raw_format: "08/2026", source_text: "08/2026", confidence: 0.94, bbox: null },
    consumer_care: { value: "1800-425-8899", phone: "1800-425-8899", email: null, address: null, source_text: "1800-425-8899", confidence: 0.93, bbox: null },
    country_of_origin: { value: "India", source_text: "India", confidence: 0.95, bbox: null },
    other_declarations: [],
  };

  const clearResults = validator.validate(clearDeclarations, classification, "");
  console.log(`   ✓ Total Vision Checks Run: ${clearResults.length}`);
  for (const r of clearResults) {
    console.log(`   • [${r.ruleNumber}] ${r.title} | Status: ${r.status} | Estimated: ${r.isEstimatedMeasurement}`);
    console.log(`     Evidence: "${r.evidence}"`);
    if (!r.isEstimatedMeasurement) {
      throw new Error(`Rule ${r.ruleNumber} must be explicitly marked as an estimated measurement.`);
    }
  }

  // 2. Low-Contrast / Poor Lighting Image (Low Confidence -> REVIEW)
  console.log("\n2️⃣ Testing Degraded Contrast / Glare Reflection (Rule 9(1) REVIEW)...");
  const lowContrastDeclarations: StructuredDeclarations = {
    ...clearDeclarations,
    mrp: { ...clearDeclarations.mrp, confidence: 0.62 },
    net_quantity: { ...clearDeclarations.net_quantity, confidence: 0.68 },
    manufacturer: { ...clearDeclarations.manufacturer, confidence: 0.70 },
  };

  const degradedResults = validator.validate(lowContrastDeclarations, classification, "");
  const readabilityReview = degradedResults.find((r) => r.ruleId === "RULE-9-1-READABILITY");
  if (!readabilityReview || readabilityReview.status !== "REVIEW") {
    throw new Error("Expected Rule 9(1) to return REVIEW status for degraded contrast image");
  }
  console.log(`   ✓ Correctly Flagged: [${readabilityReview.ruleNumber}] ${readabilityReview.title} (Status: ${readabilityReview.status})`);
  console.log(`     Evidence: "${readabilityReview.evidence}"`);

  // 3. Margin Boundary Placement (Rule 7 PDP Edge Warning)
  console.log("\n3️⃣ Testing PDP Margin Edge Detection (Rule 7 REVIEW)...");
  const edgeDeclarations: StructuredDeclarations = {
    ...clearDeclarations,
    generic_name: {
      ...clearDeclarations.generic_name,
      bbox: { x1: 80, y1: 5, x2: 600, y2: 35 }, // y1 = 5 (< 20 margin)
    },
  };

  const edgeResults = validator.validate(edgeDeclarations, classification, "");
  const placementReview = edgeResults.find((r) => r.ruleId === "RULE-7-1-PDP-PLACEMENT");
  if (!placementReview || placementReview.status !== "REVIEW") {
    throw new Error("Expected Rule 7 PDP placement check for edge margin");
  }
  console.log(`   ✓ Correctly Flagged: [${placementReview.ruleNumber}] ${placementReview.title} (Status: ${placementReview.status})`);
  console.log(`     Evidence: "${placementReview.evidence}"`);

  console.log("\n==================================================");
  console.log("✅ MODULE 11: Computer Vision Analysis Verified!");
  console.log("==================================================");
}

runVisionAnalysisTests().catch((err) => {
  console.error("❌ Vision Analysis test failed:", err);
  process.exit(1);
});

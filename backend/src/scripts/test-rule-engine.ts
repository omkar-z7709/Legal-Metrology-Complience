import { PresenceValidator } from "../services/engine/validators/presence.validator.js";
import { MRPValidator } from "../services/engine/validators/mrp.validator.js";
import { QuantityValidator } from "../services/engine/validators/quantity.validator.js";
import { DateValidator } from "../services/engine/validators/date.validator.js";
import { VisionQualityValidator } from "../services/engine/validators/vision.validator.js";
import { StructuredDeclarations } from "../services/extraction/extraction.schema.js";
import { ClassificationResult } from "../services/classification/classifier.service.js";

async function runRuleEngineTest() {
  console.log("==================================================");
  console.log("🧪 MODULE 10: Deterministic Rule Engine Test");
  console.log("==================================================");

  const defaultClassification: ClassificationResult = {
    category: "FOOD",
    commodityType: "LIQUID",
    isImported: false,
    confidence: 0.96,
    reason: "Matched edible oil product",
    applicableSpecificRules: [],
  };

  const presenceValidator = new PresenceValidator();
  const mrpValidator = new MRPValidator();
  const qtyValidator = new QuantityValidator();
  const dateValidator = new DateValidator();
  const visionValidator = new VisionQualityValidator();

  // Test Case 1: Fully Compliant Mustard Oil
  console.log("1️⃣ Test Case 1: Fully Compliant Packaged Commodity (All Pass)...");
  const compliantDeclarations: StructuredDeclarations = {
    generic_name: { value: "SunPure Mustard Oil", source_text: "SunPure Mustard Oil", confidence: 0.96, bbox: null },
    manufacturer: { value: "SunPure Edibles Pvt. Ltd., Alwar, Rajasthan", source_text: "Mfd by: SunPure", confidence: 0.95, bbox: null },
    packer: { value: null, source_text: null, confidence: 0, bbox: null },
    importer: { value: null, source_text: null, confidence: 0, bbox: null },
    net_quantity: { value: "1 L", numeric_value: 1, unit: "l", source_text: "Net Quantity: 1 L (910 g)", confidence: 0.98, bbox: null },
    mrp: { value: "₹185.00", numeric_value: 185, currency: "INR", is_inclusive_of_taxes: true, unit_sale_price: null, source_text: "MRP Rs. 185 (Incl. of all taxes)", confidence: 0.97, bbox: null },
    date_of_manufacture: { value: "08/2026", raw_format: "08/2026", source_text: "Mfg Date: 08/2026", confidence: 0.94, bbox: null },
    consumer_care: { value: "1800-425-8899 care@sunpure.in", phone: "1800-425-8899", email: "care@sunpure.in", address: null, source_text: "Helpline: 1800-425-8899", confidence: 0.95, bbox: null },
    country_of_origin: { value: "India", source_text: "Country of Origin: India", confidence: 0.98, bbox: null },
    other_declarations: [],
  };

  const cPresence = presenceValidator.validate(compliantDeclarations, defaultClassification, "");
  const cMrp = mrpValidator.validate(compliantDeclarations, defaultClassification, "MRP Rs. 185.00 Incl. of all taxes");
  const cQty = qtyValidator.validate(compliantDeclarations, defaultClassification, "");
  const cDate = dateValidator.validate(compliantDeclarations, defaultClassification, "");
  const cVision = visionValidator.validate(compliantDeclarations, defaultClassification, "");

  const allCompliantChecks = [...cPresence, ...cMrp, ...cQty, ...cDate, ...cVision];
  console.log(`   ✓ Total checks executed: ${allCompliantChecks.length}`);
  const failedChecks = allCompliantChecks.filter((c) => c.status === "FAIL");
  if (failedChecks.length > 0) {
    throw new Error(`Expected 0 failed checks, got ${failedChecks.length}: ${JSON.stringify(failedChecks)}`);
  }
  console.log(`   ✓ All ${allCompliantChecks.length} checks PASSED / REVIEW cleanly.`);

  // Test Case 2: Missing Consumer Care (Rule 6(1)(f) FAIL)
  console.log("\n2️⃣ Test Case 2: Missing Consumer Care Declaration (Rule 6(1)(f))...");
  const noCareDeclarations: StructuredDeclarations = {
    ...compliantDeclarations,
    consumer_care: { value: null, phone: null, email: null, address: null, source_text: null, confidence: 0, bbox: null },
  };

  const careChecks = presenceValidator.validate(noCareDeclarations, defaultClassification, "");
  const careFail = careChecks.find((c) => c.ruleId === "RULE-6-1-F-CONSUMER-CARE");
  if (!careFail || careFail.status !== "FAIL") {
    throw new Error("Expected Rule 6(1)(f) FAIL for missing consumer care");
  }
  console.log(`   ✓ Correctly Flagged: [${careFail.ruleNumber}] ${careFail.title} (Status: ${careFail.status}, Severity: ${careFail.severity})`);
  console.log(`     Reason: "${careFail.reason}"`);

  // Test Case 3: Missing Tax Statement on MRP (Rule 6(1)(e) FAIL)
  console.log("\n3️⃣ Test Case 3: Missing 'Incl. of all taxes' Statement (Rule 6(1)(e))...");
  const noTaxDeclarations: StructuredDeclarations = {
    ...compliantDeclarations,
    mrp: { ...compliantDeclarations.mrp, is_inclusive_of_taxes: false },
  };

  const taxChecks = mrpValidator.validate(noTaxDeclarations, defaultClassification, "MRP Rs. 185.00");
  const taxFail = taxChecks.find((c) => c.fieldName === "mrp_taxes");
  if (!taxFail || taxFail.status !== "FAIL") {
    throw new Error("Expected mrp_taxes FAIL for missing tax statement");
  }
  console.log(`   ✓ Correctly Flagged: [${taxFail.ruleNumber}] ${taxFail.title} (Status: ${taxFail.status})`);

  // Test Case 4: Non-Standard Measurement Unit (Rule 6(1)(c) FAIL)
  console.log("\n4️⃣ Test Case 4: Non-Standard Measurement Unit e.g. 'lbs' (Rule 6(1)(c))...");
  const invalidUnitDeclarations: StructuredDeclarations = {
    ...compliantDeclarations,
    net_quantity: { value: "2 lbs", numeric_value: 2, unit: "lbs", source_text: "2 lbs", confidence: 0.95, bbox: null },
  };

  const unitChecks = qtyValidator.validate(invalidUnitDeclarations, defaultClassification, "");
  const unitFail = unitChecks.find((c) => c.title.includes("Non-Standard"));
  if (!unitFail || unitFail.status !== "FAIL") {
    throw new Error("Expected Non-Standard Measurement Unit FAIL");
  }
  console.log(`   ✓ Correctly Flagged: [${unitFail.ruleNumber}] ${unitFail.title} (Status: ${unitFail.status})`);

  // Test Case 5: Ambiguous Date Format (Rule 6(1)(d) REVIEW status - not binary fail)
  console.log("\n5️⃣ Test Case 5: Ambiguous Date Format '2026/08' (Rule 6(1)(d) REVIEW)...");
  const ambiguousDateDeclarations: StructuredDeclarations = {
    ...compliantDeclarations,
    date_of_manufacture: { value: "2026/08/15", raw_format: "2026/08/15", source_text: "2026/08/15", confidence: 0.82, bbox: null },
  };

  const dateChecks = dateValidator.validate(ambiguousDateDeclarations, defaultClassification, "");
  const dateReview = dateChecks.find((c) => c.status === "REVIEW");
  if (!dateReview) {
    throw new Error("Expected Date check to return REVIEW status for non-standard format");
  }
  console.log(`   ✓ Correctly Handled: [${dateReview.ruleNumber}] ${dateReview.title} (Status: ${dateReview.status})`);
  console.log(`     Reason: "${dateReview.reason}"`);

  console.log("\n==================================================");
  console.log("✅ MODULE 10: Deterministic Rule Engine Verified!");
  console.log("==================================================");
}

runRuleEngineTest().catch((err) => {
  console.error("❌ Rule Engine test failed:", err);
  process.exit(1);
});

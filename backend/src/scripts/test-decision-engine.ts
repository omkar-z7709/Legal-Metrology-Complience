import { ComplianceDecisionEngine } from "../services/engine/decision.engine.js";
import { StructuredDeclarations } from "../services/extraction/extraction.schema.js";
import { ClassificationResult } from "../services/classification/classifier.service.js";

async function runDecisionEngineTests() {
  console.log("==================================================");
  console.log("🧪 MODULE 12: End-to-End Compliance Decision Engine");
  console.log("==================================================");

  const defaultClassification: ClassificationResult = {
    category: "FOOD",
    commodityType: "LIQUID",
    isImported: false,
    confidence: 0.96,
    reason: "Matched edible oil commodity",
    applicableSpecificRules: ["Rule 6(1)(c) dual unit"],
  };

  // Test Case 1: Fully Compliant Product (Mustard Oil)
  console.log("1️⃣ Evaluating Fully Compliant Commodity Package...");
  const compliantDeclarations: StructuredDeclarations = {
    generic_name: { value: "SunPure Kachi Ghani Mustard Oil", source_text: "SunPure Mustard Oil", confidence: 0.96, bbox: { x1: 80, y1: 100, x2: 600, y2: 140 } },
    manufacturer: { value: "SunPure Edibles Pvt. Ltd., Alwar, Rajasthan", source_text: "Mfd by: SunPure", confidence: 0.95, bbox: { x1: 80, y1: 460, x2: 600, y2: 500 } },
    packer: { value: null, source_text: null, confidence: 0, bbox: null },
    importer: { value: null, source_text: null, confidence: 0, bbox: null },
    net_quantity: { value: "1 L", numeric_value: 1, unit: "l", source_text: "Net Quantity: 1 L (910 g)", confidence: 0.98, bbox: { x1: 80, y1: 220, x2: 600, y2: 260 } },
    mrp: { value: "₹185.00", numeric_value: 185, currency: "INR", is_inclusive_of_taxes: true, unit_sale_price: null, source_text: "MRP Rs. 185 (Incl. of all taxes)", confidence: 0.97, bbox: { x1: 80, y1: 280, x2: 600, y2: 320 } },
    date_of_manufacture: { value: "08/2026", raw_format: "08/2026", source_text: "Mfg Date: 08/2026", confidence: 0.94, bbox: { x1: 80, y1: 340, x2: 600, y2: 380 } },
    consumer_care: { value: "1800-425-8899 customercare@sunpure.in", phone: "1800-425-8899", email: "customercare@sunpure.in", address: null, source_text: "Helpline: 1800-425-8899", confidence: 0.95, bbox: { x1: 80, y1: 520, x2: 600, y2: 560 } },
    country_of_origin: { value: "India", source_text: "Country of Origin: India", confidence: 0.98, bbox: { x1: 80, y1: 580, x2: 600, y2: 620 } },
    other_declarations: [],
  };

  const decision1 = await ComplianceDecisionEngine.evaluate(
    compliantDeclarations,
    defaultClassification,
    "SUNPURE MUSTARD OIL MRP Rs. 185.00 Incl. of all taxes"
  );

  console.log(`   • Compliance Status : [${decision1.complianceStatus}]`);
  console.log(`   • Compliance Score  : ${decision1.complianceScore}%`);
  console.log(`   • Total Checks Run  : ${decision1.summary.totalChecks}`);
  console.log(`   • Passed Checks     : ${decision1.summary.passed}`);
  console.log(`   • Flagged Violations: ${decision1.summary.failed}`);

  if (decision1.complianceStatus !== "COMPLIANT" || decision1.complianceScore !== 100 || decision1.violations.length !== 0) {
    throw new Error("Compliant package evaluation failed");
  }
  console.log("   ✓ Compliant package evaluation verified!");

  // Test Case 2: Non-Compliant Product (Missing Consumer Care & Tax Statement)
  console.log("\n2️⃣ Evaluating Non-Compliant Commodity Package (Deficient)...");
  const deficientDeclarations: StructuredDeclarations = {
    ...compliantDeclarations,
    consumer_care: { value: null, phone: null, email: null, address: null, source_text: null, confidence: 0, bbox: null },
    mrp: { ...compliantDeclarations.mrp, is_inclusive_of_taxes: false },
  };

  const decision2 = await ComplianceDecisionEngine.evaluate(
    deficientDeclarations,
    defaultClassification,
    "DEFICIENT COMMODITY MRP Rs. 140.00"
  );

  console.log(`   • Compliance Status : [${decision2.complianceStatus}]`);
  console.log(`   • Compliance Score  : ${decision2.complianceScore}%`);
  console.log(`   • Total Violations  : ${decision2.violations.length}`);

  if (decision2.complianceStatus !== "NON_COMPLIANT" || decision2.violations.length < 2) {
    throw new Error("Non-compliant package evaluation failed");
  }

  console.log("\n3️⃣ Inspecting Enriched Violations with RAG Legal Citations:");
  for (const v of decision2.violations) {
    console.log(`   ❌ [${v.ruleNumber}] ${v.title} (${v.severity})`);
    console.log(`      Reason : "${v.reason}"`);
    console.log(`      Action : "${v.suggestedAction}"`);
    if (v.legalContext && v.legalContext.length > 0) {
      console.log(`      Statutory Clause: ${v.legalContext[0].sourceAct} (${v.legalContext[0].clause})`);
    }
  }

  // Test Case 3: Ambiguous Date Format (Requires Review)
  console.log("\n4️⃣ Evaluating Ambiguous Date Commodity (Requires Review)...");
  const reviewDeclarations: StructuredDeclarations = {
    ...compliantDeclarations,
    date_of_manufacture: { value: "2026/08/15", raw_format: "2026/08/15", source_text: "2026/08/15", confidence: 0.82, bbox: null },
  };

  const decision3 = await ComplianceDecisionEngine.evaluate(
    reviewDeclarations,
    defaultClassification,
    "SUNPURE MUSTARD OIL MRP Rs. 185.00 Incl. of all taxes"
  );

  console.log(`   • Compliance Status : [${decision3.complianceStatus}]`);
  console.log(`   • Compliance Score  : ${decision3.complianceScore}%`);
  console.log(`   • Review Checks     : ${decision3.summary.requiresReview}`);

  if (decision3.complianceStatus !== "REQUIRES_REVIEW" || decision3.reviewChecks.length === 0) {
    throw new Error("Review status evaluation failed");
  }
  console.log("   ✓ Review status handling verified!");

  console.log("\n==================================================");
  console.log("✅ MODULE 12: Compliance Decision Engine Verified!");
  console.log("==================================================");
}

runDecisionEngineTests().catch((err) => {
  console.error("❌ Decision Engine test failed:", err);
  process.exit(1);
});

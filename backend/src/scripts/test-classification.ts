import { ProductClassifier } from "../services/classification/classifier.service.js";
import { StructuredDeclarations } from "../services/extraction/extraction.schema.js";

async function runClassificationTests() {
  console.log("==================================================");
  console.log("🧪 MODULE 7: Product & Commodity Classification Test");
  console.log("==================================================");

  // Test Case 1: Domestic Food Product (Mustard Oil)
  console.log("1️⃣ Testing Classification: Domestic Edible Oil (Food)...");
  const foodDeclarations: StructuredDeclarations = {
    generic_name: { value: "Kachi Ghani Mustard Oil", source_text: "Kachi Ghani Mustard Oil", confidence: 0.95, bbox: null },
    manufacturer: { value: "SunPure Edibles Ltd.", source_text: "Mfd by: SunPure", confidence: 0.96, bbox: null },
    packer: { value: null, source_text: null, confidence: 0, bbox: null },
    importer: { value: null, source_text: null, confidence: 0, bbox: null },
    net_quantity: { value: "1 L (910 g)", numeric_value: 1, unit: "l", source_text: "1 L (910 g)", confidence: 0.98, bbox: null },
    mrp: { value: "₹185.00", numeric_value: 185, currency: "INR", is_inclusive_of_taxes: true, unit_sale_price: null, source_text: "MRP Rs. 185", confidence: 0.97, bbox: null },
    date_of_manufacture: { value: "08/2026", raw_format: "08/2026", source_text: "08/2026", confidence: 0.94, bbox: null },
    consumer_care: { value: "1800-425-8899", phone: "1800-425-8899", email: "care@sunpure.in", address: null, source_text: "1800-425-8899", confidence: 0.95, bbox: null },
    country_of_origin: { value: "India", source_text: "Country of Origin: India", confidence: 0.98, bbox: null },
    other_declarations: [],
  };

  const foodResult = ProductClassifier.classify(foodDeclarations, "SUNPURE MUSTARD OIL FSSAI Lic 10019021004123 Net 1 L");
  console.log(`   • Category        : ${foodResult.category}`);
  console.log(`   • Commodity Type  : ${foodResult.commodityType}`);
  console.log(`   • Is Imported     : ${foodResult.isImported}`);
  console.log(`   • Confidence      : ${(foodResult.confidence * 100).toFixed(1)}%`);
  console.log(`   • Statutory Reason: ${foodResult.reason}`);
  console.log(`   • Applicable Rules: ${foodResult.applicableSpecificRules.join("; ")}`);

  if (foodResult.category !== "FOOD" || foodResult.commodityType !== "LIQUID" || foodResult.isImported !== false) {
    throw new Error("Food product classification failed");
  }
  console.log("   ✓ Food classification verified!");

  // Test Case 2: Cosmetic Product (Soap / Skin Cream)
  console.log("\n2️⃣ Testing Classification: Personal Care / Cosmetic...");
  const cosmeticDeclarations: StructuredDeclarations = {
    ...foodDeclarations,
    generic_name: { value: "Moisturizing Skin Cream 100g", source_text: "Moisturizing Skin Cream", confidence: 0.94, bbox: null },
    net_quantity: { value: "100 g", numeric_value: 100, unit: "g", source_text: "100 g", confidence: 0.97, bbox: null },
  };

  const cosmeticResult = ProductClassifier.classify(cosmeticDeclarations, "GLOW MOISTURIZING SKIN CREAM BEAUTY CARE");
  console.log(`   • Category        : ${cosmeticResult.category}`);
  console.log(`   • Commodity Type  : ${cosmeticResult.commodityType}`);
  console.log(`   • Confidence      : ${(cosmeticResult.confidence * 100).toFixed(1)}%`);
  console.log(`   • Statutory Reason: ${cosmeticResult.reason}`);

  if (cosmeticResult.category !== "COSMETIC" || cosmeticResult.commodityType !== "SOLID") {
    throw new Error("Cosmetic classification failed");
  }
  console.log("   ✓ Cosmetic classification verified!");

  // Test Case 3: Household Product (Detergent / Cleaner)
  console.log("\n3️⃣ Testing Classification: Household Commodity...");
  const householdDeclarations: StructuredDeclarations = {
    ...foodDeclarations,
    generic_name: { value: "Disinfectant Surface Floor Cleaner 500ml", source_text: "Disinfectant Surface Cleaner", confidence: 0.95, bbox: null },
    net_quantity: { value: "500 ml", numeric_value: 500, unit: "ml", source_text: "500 ml", confidence: 0.98, bbox: null },
  };

  const householdResult = ProductClassifier.classify(householdDeclarations, "SHINE DISINFECTANT FLOOR CLEANER 500ML");
  console.log(`   • Category        : ${householdResult.category}`);
  console.log(`   • Commodity Type  : ${householdResult.commodityType}`);
  console.log(`   • Statutory Reason: ${householdResult.reason}`);

  if (householdResult.category !== "HOUSEHOLD" || householdResult.commodityType !== "LIQUID") {
    throw new Error("Household classification failed");
  }
  console.log("   ✓ Household classification verified!");

  // Test Case 4: Imported Product (Imported Olive Oil)
  console.log("\n4️⃣ Testing Classification: Imported Packaged Commodity...");
  const importedDeclarations: StructuredDeclarations = {
    ...foodDeclarations,
    generic_name: { value: "Extra Virgin Olive Oil 500ml", source_text: "Extra Virgin Olive Oil", confidence: 0.96, bbox: null },
    country_of_origin: { value: "Spain", source_text: "Country of Origin: Spain", confidence: 0.99, bbox: null },
    importer: { value: "Euro Imports India Pvt. Ltd., Mumbai", source_text: "Imported by: Euro Imports India", confidence: 0.95, bbox: null },
  };

  const importedResult = ProductClassifier.classify(importedDeclarations, "MEDITERRANEAN EXTRA VIRGIN OLIVE OIL IMPORTED FROM SPAIN");
  console.log(`   • Category        : ${importedResult.category}`);
  console.log(`   • Is Imported     : ${importedResult.isImported}`);
  console.log(`   • Origin Country  : ${importedDeclarations.country_of_origin.value}`);

  if (importedResult.isImported !== true) {
    throw new Error("Imported status detection failed");
  }
  console.log("   ✓ Imported commodity classification verified!");

  console.log("\n==================================================");
  console.log("✅ MODULE 7: Product Classification Verified!");
  console.log("==================================================");
}

runClassificationTests().catch((err) => {
  console.error("❌ Classification test failure:", err);
  process.exit(1);
});

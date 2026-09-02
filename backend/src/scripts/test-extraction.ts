import { GeminiExtractor } from "../services/extraction/gemini.extractor.js";
import { structuredDeclarationsSchema } from "../services/extraction/extraction.schema.js";
import { OcrResult } from "../services/ocr/ocr.interface.js";
import { DBRepo } from "../db/repo.js";

async function runExtractionTests() {
  console.log("==================================================");
  console.log("🧪 MODULE 6: Gemini Structured Extraction & Zod Validation");
  console.log("==================================================");

  // 1. Prepare Standard OCR Input for Compliant Commodity
  console.log("1️⃣ Testing Structured Extraction on Full Mustard Oil OCR Input...");
  const compliantOcr: OcrResult = {
    rawText: `SUNPURE KACHI GHANI MUSTARD OIL
100% PURE & NATURAL • FORTIFIED WITH VITAMIN A & D
Net Quantity: 1 L (910 g)
MRP Rs. 185.00 (Incl. of all taxes)
Month & Year of Mfg: 08/2026
Batch No: SG-88210 | FSSAI Lic No: 10019021004123
Manufactured & Packed by:
SunPure Edibles Pvt. Ltd., Plot 14, Industrial Estate, Alwar, Rajasthan - 301001
Consumer Care Cell:
Toll Free: 1800-425-8899 | Email: customercare@sunpureedibles.in
Country of Origin: India`,
    averageConfidence: 0.96,
    lines: [
      { text: "SUNPURE KACHI GHANI MUSTARD OIL", confidence: 0.96, bbox: { x1: 80, y1: 100, x2: 600, y2: 140 }, words: [] },
      { text: "Net Quantity: 1 L (910 g)", confidence: 0.98, bbox: { x1: 80, y1: 220, x2: 600, y2: 260 }, words: [] },
      { text: "MRP Rs. 185.00 (Incl. of all taxes)", confidence: 0.97, bbox: { x1: 80, y1: 280, x2: 600, y2: 320 }, words: [] },
      { text: "Month & Year of Mfg: 08/2026", confidence: 0.94, bbox: { x1: 80, y1: 340, x2: 600, y2: 380 }, words: [] },
      { text: "Manufactured & Packed by: SunPure Edibles Pvt. Ltd.", confidence: 0.95, bbox: { x1: 80, y1: 460, x2: 600, y2: 500 }, words: [] },
      { text: "Consumer Care Cell: 1800-425-8899 | customercare@sunpureedibles.in", confidence: 0.93, bbox: { x1: 80, y1: 520, x2: 600, y2: 560 }, words: [] },
      { text: "Country of Origin: India", confidence: 0.95, bbox: { x1: 80, y1: 580, x2: 600, y2: 620 }, words: [] },
    ],
    provider: "google-cloud-vision",
    processingTimeMs: 250,
  };

  const extracted = await GeminiExtractor.extractDeclarations(compliantOcr);

  // Validate with Zod
  const validated = structuredDeclarationsSchema.parse(extracted);
  console.log("   ✓ Zod Schema Validation Succeeded!");

  console.log("\n2️⃣ Verifying Extracted Declarations & Bounding Boxes:");
  console.log(`   • Generic Name    : "${validated.generic_name.value}" (BBox: ${JSON.stringify(validated.generic_name.bbox)})`);
  console.log(`   • Net Quantity    : "${validated.net_quantity.value}" [${validated.net_quantity.numeric_value} ${validated.net_quantity.unit}] (BBox: ${JSON.stringify(validated.net_quantity.bbox)})`);
  console.log(`   • MRP             : "${validated.mrp.value}" [₹${validated.mrp.numeric_value}, Taxes: ${validated.mrp.is_inclusive_of_taxes}] (BBox: ${JSON.stringify(validated.mrp.bbox)})`);
  console.log(`   • Mfg Date        : "${validated.date_of_manufacture.value}" (BBox: ${JSON.stringify(validated.date_of_manufacture.bbox)})`);
  console.log(`   • Manufacturer    : "${validated.manufacturer.value}" (BBox: ${JSON.stringify(validated.manufacturer.bbox)})`);
  console.log(`   • Consumer Care   : "${validated.consumer_care.value}" [Phone: ${validated.consumer_care.phone}, Email: ${validated.consumer_care.email}]`);
  console.log(`   • Origin Country  : "${validated.country_of_origin.value}"`);

  // Assertions for Compliant Package
  if (!validated.net_quantity.value || validated.net_quantity.numeric_value !== 1) {
    throw new Error("Net quantity numeric value mismatch");
  }
  if (!validated.mrp.value || validated.mrp.numeric_value !== 185 || !validated.mrp.is_inclusive_of_taxes) {
    throw new Error("MRP extraction mismatch");
  }
  if (!validated.consumer_care.phone || !validated.consumer_care.email) {
    throw new Error("Consumer care extraction mismatch");
  }

  // 3. Test Zero-Hallucination & Absent Field Handling (Missing Consumer Care & Date)
  console.log("\n3️⃣ Testing Zero-Hallucination on Deficient OCR Input (No Consumer Care, No Taxes)...");
  const deficientOcr: OcrResult = {
    rawText: `SPICE POWDER 500g
Net Quantity: 500 g
MRP Rs. 99.00
Mfd by: Local Spice Pack Co.
Country of Origin: India`,
    averageConfidence: 0.94,
    lines: [
      { text: "SPICE POWDER 500g", confidence: 0.95, words: [] },
      { text: "Net Quantity: 500 g", confidence: 0.96, words: [] },
      { text: "MRP Rs. 99.00", confidence: 0.94, words: [] },
      { text: "Mfd by: Local Spice Pack Co.", confidence: 0.92, words: [] },
      { text: "Country of Origin: India", confidence: 0.95, words: [] },
    ],
    provider: "google-cloud-vision",
    processingTimeMs: 180,
  };

  const deficientExtracted = await GeminiExtractor.extractDeclarations(deficientOcr);
  const validatedDeficient = structuredDeclarationsSchema.parse(deficientExtracted);

  console.log(`   • Consumer Care Value  : ${validatedDeficient.consumer_care.value} (Expected: null)`);
  console.log(`   • Mfg Date Value       : ${validatedDeficient.date_of_manufacture.value} (Expected: null)`);
  console.log(`   • MRP Tax Inclusion    : ${validatedDeficient.mrp.is_inclusive_of_taxes} (Expected: false)`);

  if (validatedDeficient.consumer_care.value !== null) {
    throw new Error("Hallucination detected: consumer_care should be null when missing from OCR");
  }
  if (validatedDeficient.date_of_manufacture.value !== null) {
    throw new Error("Hallucination detected: date_of_manufacture should be null when missing from OCR");
  }
  if (validatedDeficient.mrp.is_inclusive_of_taxes === true) {
    throw new Error("Tax inclusion should be false when 'incl. of taxes' is absent");
  }
  console.log("   ✓ Zero-hallucination guarantee verified (Absent fields strictly null).");

  // 4. Test Database Extracted Fields Insertion Smoke Test
  console.log("\n4️⃣ Testing Database Persistence in extracted_fields table...");
  const dummyScanId = "e9999999-9999-9999-9999-999999999999";
  await DBRepo.insertExtractedField({
    scanId: dummyScanId,
    fieldName: "mrp",
    fieldValue: validated.mrp.value,
    rawText: validated.mrp.source_text,
    confidence: validated.mrp.confidence.toFixed(4),
    boundingBox: validated.mrp.bbox,
    isPresent: true,
    validationStatus: "VALID",
  });

  const storedFields = await DBRepo.getScanExtractedFields(dummyScanId);
  console.log(`   ✓ Retrieved ${storedFields.length} stored extracted field(s) from database repository.`);

  console.log("\n==================================================");
  console.log("✅ MODULE 6: Gemini Structured Extraction & Zod Verified!");
  console.log("==================================================");
}

runExtractionTests().catch((err) => {
  console.error("❌ Extraction test failed:", err);
  process.exit(1);
});

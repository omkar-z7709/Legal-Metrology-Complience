import { buildApp } from "../app.js";
import { OcrService } from "../services/ocr/ocr.service.js";
import sharp from "sharp";
import FormData from "form-data";

async function runOcrPipelineTest() {
  console.log("==================================================");
  console.log("🧪 MODULE 5: OCR Pipeline & Bounding Box Extraction");
  console.log("==================================================");

  const app = buildApp();

  // 1. Generate synthetic test package image
  console.log("1️⃣ Generating realistic commodity label buffer...");
  const svgBuffer = Buffer.from(`
    <svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="40" y="40" width="920" height="920" fill="#f8fafc" stroke="#12304a" stroke-width="4"/>
      <text x="80" y="120" font-family="sans-serif" font-size="32" font-weight="bold" fill="#12304a">SUNPURE KACHI GHANI MUSTARD OIL</text>
      <text x="80" y="180" font-family="sans-serif" font-size="22" fill="#0f172a">100% PURE &amp; NATURAL • FORTIFIED WITH VITAMIN A &amp; D</text>
      <text x="80" y="240" font-family="sans-serif" font-size="24" font-weight="bold" fill="#047857">Net Quantity: 1 L (910 g)</text>
      <text x="80" y="300" font-family="sans-serif" font-size="26" font-weight="bold" fill="#1e293b">MRP Rs. 185.00 (Incl. of all taxes)</text>
      <text x="80" y="360" font-family="sans-serif" font-size="20" fill="#334155">Month &amp; Year of Mfg: 08/2026</text>
      <text x="80" y="420" font-family="sans-serif" font-size="20" fill="#334155">Batch No: SG-88210 | FSSAI Lic No: 10019021004123</text>
      <text x="80" y="480" font-family="sans-serif" font-size="20" fill="#334155">Manufactured &amp; Packed by: SunPure Edibles Pvt. Ltd., Alwar, Rajasthan - 301001</text>
      <text x="80" y="540" font-family="sans-serif" font-size="18" fill="#334155">Consumer Care Cell: 1800-425-8899 | care@sunpureedibles.in</text>
      <text x="80" y="600" font-family="sans-serif" font-size="18" fill="#334155">Country of Origin: India</text>
    </svg>
  `);

  const packageBuffer = await sharp(svgBuffer).jpeg({ quality: 92 }).toBuffer();
  console.log(`   ✓ Packaging test buffer created (${packageBuffer.length} bytes)`);

  // 2. Direct OCR Service Execution
  console.log("\n2️⃣ Executing OcrService.extract() with provider fallback...");
  const ocrResult = await OcrService.extract(packageBuffer);

  console.log(`   ✓ Provider Selected: '${ocrResult.provider}'`);
  console.log(`   ✓ Execution Time: ${ocrResult.processingTimeMs}ms`);
  console.log(`   ✓ Average Confidence: ${(ocrResult.averageConfidence * 100).toFixed(1)}%`);
  console.log(`   ✓ Total Text Lines Detected: ${ocrResult.lines.length}`);

  if (!ocrResult.rawText || ocrResult.lines.length === 0) {
    throw new Error("OCR returned empty text result");
  }

  // 3. Inspect Line & Bounding Box Structure
  console.log("\n3️⃣ Inspecting Detected Text & Bounding Boxes:");
  ocrResult.lines.slice(0, 5).forEach((line, idx) => {
    const bboxStr = line.bbox ? `[${line.bbox.x1}, ${line.bbox.y1}, ${line.bbox.x2}, ${line.bbox.y2}]` : "N/A";
    console.log(`   Line ${idx + 1}: "${line.text}" | Conf: ${(line.confidence * 100).toFixed(0)}% | BBox: ${bboxStr}`);
  });

  // Verify Critical Legal Metrology Keywords exist in OCR output
  const requiredKeywords = ["MUSTARD OIL", "Net Quantity", "MRP", "Mfg", "Consumer Care", "Country of Origin"];
  for (const kw of requiredKeywords) {
    const found = ocrResult.rawText.toLowerCase().includes(kw.toLowerCase());
    if (!found) {
      throw new Error(`Critical declaration keyword '${kw}' not detected in OCR raw text.`);
    }
  }
  console.log("   ✓ All statutory declaration keywords detected in raw OCR text.");

  // 4. Test OCR via Fastify Endpoint /api/scans/:id/ocr
  console.log("\n4️⃣ Testing OCR Route Integration via /api/scans/upload + /api/scans/:id/ocr...");
  const form = new FormData();
  form.append("file", packageBuffer, {
    filename: "sunpure_mustard_oil.jpg",
    contentType: "image/jpeg",
  });
  form.append("productName", "SunPure Mustard Oil (1L)");
  form.append("category", "Edible Oils");

  const uploadRes = await app.inject({
    method: "POST",
    url: "/api/scans/upload",
    headers: {
      authorization: "Bearer dev-inspector",
      ...form.getHeaders(),
    },
    payload: form.getBuffer(),
  });

  const uploadJson = uploadRes.json();
  const scanId = uploadJson.data.scanId;
  console.log(`   ✓ Uploaded Scan: ${scanId}`);

  const ocrRes = await app.inject({
    method: "POST",
    url: `/api/scans/${scanId}/ocr`,
    headers: {
      authorization: "Bearer dev-inspector",
    },
  });

  console.log(`   [POST /api/scans/:id/ocr] Status: ${ocrRes.statusCode}`);
  const ocrEndpointJson = ocrRes.json();

  if (ocrRes.statusCode !== 200 || !ocrEndpointJson.data.ocr) {
    throw new Error(`OCR endpoint failed: ${JSON.stringify(ocrEndpointJson)}`);
  }

  console.log(`   ✓ OCR Endpoint returned ${ocrEndpointJson.data.ocr.lines.length} lines for Scan ID ${scanId}.`);

  console.log("\n==================================================");
  console.log("✅ MODULE 5: OCR Pipeline Successfully Verified!");
  console.log("==================================================");
}

runOcrPipelineTest().catch((err) => {
  console.error("❌ OCR Pipeline test failure:", err);
  process.exit(1);
});

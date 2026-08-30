import { buildApp } from "../app.js";
import sharp from "sharp";
import FormData from "form-data";

async function runUploadAndPreprocessTest() {
  console.log("==================================================");
  console.log("🧪 MODULE 3 & 4: Image Upload & Preprocessing Test");
  console.log("==================================================");

  const app = buildApp();

  // 1. Generate a synthetic test image using Sharp SVG rendering
  console.log("1️⃣ Generating synthetic packaged commodity image...");
  const svgBuffer = Buffer.from(`
    <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="50" y="50" width="700" height="700" fill="#f8fafc" stroke="#12304a" stroke-width="4"/>
      <text x="80" y="120" font-family="sans-serif" font-size="28" font-weight="bold" fill="#12304a">ABC PURE MUSTARD OIL</text>
      <text x="80" y="200" font-family="sans-serif" font-size="20" fill="#0f172a">Net Quantity: 1 Litre (910g)</text>
      <text x="80" y="260" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0f172a">MRP Rs. 195.00 (Incl. of all taxes)</text>
      <text x="80" y="320" font-family="sans-serif" font-size="18" fill="#0f172a">Mfg Date: 08/2026 | Batch: B-9941</text>
      <text x="80" y="380" font-family="sans-serif" font-size="18" fill="#0f172a">Mfd by: ABC Agro Foods Ltd, Sector 5, Haridwar</text>
      <text x="80" y="440" font-family="sans-serif" font-size="16" fill="#0f172a">Consumer Care: 1800-111-2222 | care@abcagro.in</text>
      <text x="80" y="500" font-family="sans-serif" font-size="16" fill="#0f172a">Country of Origin: India</text>
    </svg>
  `);

  const sampleImageBuffer = await sharp(svgBuffer).jpeg({ quality: 90 }).toBuffer();
  console.log(`   ✓ Test image created (${sampleImageBuffer.length} bytes, 800x800)`);

  // 2. Prepare Multipart Form Data
  console.log("\n2️⃣ Uploading image via /api/scans/upload...");
  const form = new FormData();
  form.append("file", sampleImageBuffer, {
    filename: "mustard_oil_pouch.jpg",
    contentType: "image/jpeg",
  });
  form.append("productName", "ABC Pure Mustard Oil (1L)");
  form.append("category", "Edible Oils");
  form.append("brand", "ABC Agro");
  form.append("location", "Central Food Hub");

  const formHeaders = form.getHeaders();
  const formBuffer = form.getBuffer();

  const uploadRes = await app.inject({
    method: "POST",
    url: "/api/scans/upload",
    headers: {
      authorization: "Bearer dev-inspector",
      ...formHeaders,
    },
    payload: formBuffer,
  });

  console.log(`   Upload Status: ${uploadRes.statusCode}`);
  const result = uploadRes.json();

  if (uploadRes.statusCode !== 201) {
    throw new Error(`Upload failed: ${JSON.stringify(result)}`);
  }

  console.log("   ✓ Upload Successful!");
  console.log(`   ✓ Scan ID: ${result.data.scanId} (${result.data.scanNumber})`);
  console.log(`   ✓ Product: ${result.data.productName}`);
  console.log(`   ✓ Original URL: ${result.data.images.original.url.slice(0, 45)}...`);
  console.log(`   ✓ Preprocessed Dimensions: ${result.data.images.preprocessed.width}x${result.data.images.preprocessed.height}`);
  console.log("   ✓ Applied Transformations:");
  for (const t of result.data.images.preprocessed.transformations) {
    console.log(`      - ${t.name}: ${t.rationale}`);
  }

  // 3. Test Retrieval via /api/scans/:id
  console.log("\n3️⃣ Retrieving scan record via /api/scans/:id...");
  const getRes = await app.inject({
    method: "GET",
    url: `/api/scans/${result.data.scanId}`,
    headers: {
      authorization: "Bearer dev-inspector",
    },
  });

  console.log(`   Fetch Status: ${getRes.statusCode}`);
  const getResult = getRes.json();
  if (getRes.statusCode !== 200 || !getResult.data.scan) {
    throw new Error(`Failed to fetch scan by ID: ${JSON.stringify(getResult)}`);
  }
  console.log(`   ✓ Scan Record verified in database with ${getResult.data.images.length} linked images.`);

  console.log("\n==================================================");
  console.log("✅ MODULE 3 & 4: Upload & Preprocessing Verified!");
  console.log("==================================================");
}

runUploadAndPreprocessTest().catch((err) => {
  console.error("❌ Upload test failure:", err);
  process.exit(1);
});

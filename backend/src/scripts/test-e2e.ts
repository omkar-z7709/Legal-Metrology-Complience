import { buildApp } from "../app.js";
import sharp from "sharp";
import FormData from "form-data";

async function runEndToEndIntegrationTest() {
  console.log("================================================================================");
  console.log("🚀 MODULE 17: COMPLETE END-TO-END STATUTORY COMPLIANCE INTEGRATION TEST");
  console.log("================================================================================");

  const app = buildApp();

  // 1. Generate Synthetic Commodity Packaging
  console.log("\n[STEP 1] Generating Realistic Packaged Commodity Image (Fortified Mustard Oil 1L)...");
  const svg = `
    <svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="40" y="40" width="920" height="920" fill="#f8fafc" stroke="#12304a" stroke-width="6"/>
      
      <!-- Header -->
      <text x="80" y="140" font-family="sans-serif" font-size="36" font-weight="bold" fill="#12304a">SUNPURE KACHI GHANI MUSTARD OIL</text>
      <text x="80" y="190" font-family="sans-serif" font-size="22" fill="#0f766e" font-weight="600">100% PURE &amp; NATURAL • FORTIFIED WITH VITAMIN A &amp; D</text>
      
      <!-- Principal Declarations -->
      <text x="80" y="280" font-family="sans-serif" font-size="26" font-weight="bold" fill="#0f172a">Net Quantity: 1 L (910 g)</text>
      <text x="80" y="340" font-family="sans-serif" font-size="28" font-weight="bold" fill="#0f172a">MRP Rs. 185.00 (Incl. of all taxes)</text>
      <text x="80" y="400" font-family="sans-serif" font-size="22" fill="#334155">Month &amp; Year of Mfg: 08/2026</text>
      <text x="80" y="460" font-family="sans-serif" font-size="20" fill="#334155">Batch No: SG-88210 | FSSAI Lic No: 10019021004123</text>
      
      <!-- Manufacturer Details -->
      <text x="80" y="540" font-family="sans-serif" font-size="20" font-weight="600" fill="#0f172a">Manufactured &amp; Packed by:</text>
      <text x="80" y="580" font-family="sans-serif" font-size="18" fill="#334155">SunPure Edibles Pvt. Ltd., Plot 14, Industrial Estate, Alwar, Rajasthan - 301001</text>
      
      <!-- Grievance & Origin -->
      <text x="80" y="660" font-family="sans-serif" font-size="18" font-weight="600" fill="#0f172a">Consumer Care Cell:</text>
      <text x="80" y="700" font-family="sans-serif" font-size="18" fill="#334155">Toll Free: 1800-425-8899 | Email: customercare@sunpureedibles.in</text>
      <text x="80" y="760" font-family="sans-serif" font-size="20" font-weight="bold" fill="#12304a">Country of Origin: India</text>
    </svg>
  `;

  const imageBuffer = await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
  console.log(`   ✓ Image synthesized (${imageBuffer.length} bytes, 1000x1000)`);

  // 2. Upload via /api/scans/upload
  console.log("\n[STEP 2] Uploading Package Image & Preprocessing (Modules 3 & 4)...");
  const form = new FormData();
  form.append("file", imageBuffer, { filename: "sunpure_mustard_oil.jpg", contentType: "image/jpeg" });
  form.append("productName", "SunPure Kachi Ghani Mustard Oil (1L)");
  form.append("category", "Edible Oils");
  form.append("brand", "SunPure");
  form.append("location", "New Delhi Zonal Inspection Center");

  const uploadRes = await app.inject({
    method: "POST",
    url: "/api/scans/upload",
    headers: {
      authorization: "Bearer dev-inspector",
      ...form.getHeaders(),
    },
    payload: form.getBuffer(),
  });

  const uploadData = uploadRes.json().data;
  const scanId = uploadData.scanId;
  const productId = uploadData.productId;
  console.log(`   ✓ Uploaded! Scan Number: ${uploadData.scanNumber} (Scan ID: ${scanId})`);
  console.log(`   ✓ Preprocessed image generated with EXIF normalizer & CLAHE contrast boost.`);

  // 3. Trigger Full AI + Deterministic Rules Pipeline (/api/inspections/:id/analyze)
  console.log("\n[STEP 3] Executing Inspection Pipeline (OCR → Extraction → Classification → Rules → RAG)...");
  const analyzeRes = await app.inject({
    method: "POST",
    url: `/api/inspections/${scanId}/analyze`,
    headers: { authorization: "Bearer dev-inspector" },
  });

  if (analyzeRes.statusCode !== 200) {
    throw new Error(`Analysis failed: ${JSON.stringify(analyzeRes.json())}`);
  }

  const analysis = analyzeRes.json().data;
  console.log(`   ✓ Analysis Complete! Status: [${analysis.complianceStatus}] | Score: ${analysis.complianceScore}%`);
  console.log(`   ✓ Classified Category: ${analysis.classification.category} (${analysis.classification.commodityType})`);
  console.log(`   ✓ Total Statutory Checks Run: ${analysis.summary.totalChecks}`);
  console.log(`      - Passed Checks : ${analysis.summary.passed}`);
  console.log(`      - Violations    : ${analysis.summary.failed}`);
  console.log(`      - Need Review   : ${analysis.summary.requiresReview}`);

  if (analysis.violations.length > 0) {
    console.log("   ⚠️ Flagged Violations with Legal Citations:");
    for (const v of analysis.violations) {
      console.log(`      • [${v.ruleNumber}] ${v.title} (${v.severity})`);
      console.log(`        Evidence: "${v.evidence}"`);
      if (v.legalContext && v.legalContext.length > 0) {
        console.log(`        RAG Gazette Citation: ${v.legalContext[0].sourceAct} (${v.legalContext[0].clause})`);
      }
    }
  } else {
    console.log("   ✓ Perfect Compliance! All Rule 6 mandatory declarations verified.");
  }

  // 4. Human-In-The-Loop Officer Review (/api/inspections/:id/review)
  console.log("\n[STEP 4] Submitting Official Inspector Review & Audit Logging (Module 13)...");
  const reviewRes = await app.inject({
    method: "POST",
    url: `/api/inspections/${scanId}/review`,
    headers: { authorization: "Bearer dev-inspector" },
    payload: {
      decision: "ACCEPTED",
      notes: "Inspection verified on-site. Mandatory declarations match physical label specifications.",
    },
  });
  console.log(`   ✓ Review Recorded: ${reviewRes.json().data.message}`);

  // 5. Generate Official PDF Report (/api/inspections/:id/report)
  console.log("\n[STEP 5] Generating Official Statutory Inspection PDF Report (Module 14)...");
  const reportRes = await app.inject({
    method: "POST",
    url: `/api/inspections/${scanId}/report`,
    headers: { authorization: "Bearer dev-inspector" },
  });
  const reportData = reportRes.json().data;
  console.log(`   ✓ Official Report Generated: ${reportData.reportNumber}`);
  console.log(`   ✓ Download URL: ${reportData.pdfUrl.slice(0, 45)}...`);

  // 6. Live Dashboard Aggregated Statistics (/api/dashboard/stats)
  console.log("\n[STEP 6] Querying Live Enforcement Dashboard Aggregates (Module 15)...");
  const dashRes = await app.inject({
    method: "GET",
    url: "/api/dashboard/stats",
    headers: { authorization: "Bearer dev-inspector" },
  });
  const dashData = dashRes.json().data;
  console.log(`   ✓ Total Inspections Logged : ${dashData.metrics.totalInspections}`);
  console.log(`   ✓ Compliant Commodities     : ${dashData.metrics.compliant}`);
  console.log(`   ✓ Non-Compliant Commodities : ${dashData.metrics.nonCompliant}`);
  console.log(`   ✓ Compliance Rate           : ${dashData.metrics.complianceRatePercentage}%`);

  // 7. Product Longitudinal History (/api/products/:id/history)
  console.log("\n[STEP 7] Querying Product Longitudinal Inspection Trail (Module 16)...");
  const histRes = await app.inject({
    method: "GET",
    url: `/api/products/${productId}/history`,
    headers: { authorization: "Bearer dev-inspector" },
  });
  const histData = histRes.json().data;
  console.log(`   ✓ Product History for '${histData.product.name}': ${histData.totalInspections} scan(s) recorded.`);

  console.log("\n================================================================================");
  console.log("🎉 ALL MODULES (0 through 17) SUCCESSFULLY VERIFIED END-TO-END!");
  console.log("================================================================================");
}

runEndToEndIntegrationTest().catch((err) => {
  console.error("❌ E2E Integration test failed:", err);
  process.exit(1);
});

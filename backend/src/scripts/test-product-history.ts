import { buildApp } from "../app.js";
import { DBRepo } from "../db/repo.js";

async function runProductHistoryTest() {
  console.log("================================================================================");
  console.log("🕰️ MODULE 16: LONGITUDINAL PRODUCT INSPECTION HISTORY TEST");
  console.log("================================================================================");

  const app = buildApp();

  // 1. Create a single product with multiple sequential inspection scans (Inspection 1 -> Fail, Inspection 2 -> Pass)
  console.log("\n[STEP 1] Seeding Longitudinal Inspection Trail for 'Aura Pure Virgin Olive Oil'...");
  const product = await DBRepo.insertProduct({
    name: "Aura Pure Extra Virgin Olive Oil (500ml)",
    brand: "Aura Naturals",
    category: "Edible Oils",
    commodityType: "Liquid",
    manufacturerName: "Aura Agro Foods Pvt. Ltd., Jaipur, Rajasthan",
  });

  // Inspection Scan 1: Initial screening - Non-Compliant (MRP format missing tax statement)
  const scan1 = await DBRepo.insertScan({
    productId: product.id,
    scanNumber: "INS-2026-1001",
    location: "Jaipur Wholesale Mandi",
    status: "COMPLETED",
    complianceStatus: "NON_COMPLIANT",
    complianceScore: "65.00",
  });

  await DBRepo.updateScan(scan1.id, {
    reviewStatus: "REJECTED",
    reviewerNotes: "Notice issued: MRP lacked '(Incl. of all taxes)' mandatory declaration under Rule 6(1)(e).",
  });

  // Inspection Scan 2: Re-inspection after packager rectified label - Compliant
  const scan2 = await DBRepo.insertScan({
    productId: product.id,
    scanNumber: "INS-2026-1002",
    location: "Jaipur Central Enforcement Office",
    status: "COMPLETED",
    complianceStatus: "COMPLIANT",
    complianceScore: "100.00",
  });

  await DBRepo.updateScan(scan2.id, {
    reviewStatus: "ACCEPTED",
    reviewerNotes: "Verified corrected physical label. Complies fully with Rule 6.",
  });

  console.log(`   ✓ Product created with ID: ${product.id}`);
  console.log(`   ✓ Seeded 2 chronological inspections: INS-2026-1001 (NON_COMPLIANT) -> INS-2026-1002 (COMPLIANT)`);

  // 2. Query Longitudinal Product History API (/api/products/:id/history)
  console.log("\n[STEP 2] Querying Longitudinal History Endpoint via Fastify API...");
  const response = await app.inject({
    method: "GET",
    url: `/api/products/${product.id}/history`,
    headers: { authorization: "Bearer dev-inspector" },
  });

  if (response.statusCode !== 200) {
    throw new Error(`Product history query failed: ${response.body}`);
  }

  const result = response.json().data;
  console.log("   ✓ Product History API returned HTTP 200 OK!");
  console.log(`   • Product Name       : ${result.product.name}`);
  console.log(`   • Total Scans Logged : ${result.totalInspections}`);
  console.log("\n   • Inspection Trail Timeline:");
  for (let i = 0; i < result.history.length; i++) {
    const s = result.history[i];
    console.log(`      [Scan ${i + 1}] Number: ${s.scanNumber} | Status: [${s.complianceStatus}] | Score: ${s.complianceScore}% | Decision: ${s.reviewStatus}`);
    console.log(`             Officer Note: "${s.reviewerNotes}"`);
  }

  console.log("\n================================================================================");
  console.log("✅ MODULE 16: PRODUCT LONGITUDINAL HISTORY VERIFIED!");
  console.log("================================================================================");
}

runProductHistoryTest().catch((err) => {
  console.error("❌ Module 16 product history test failed:", err);
  process.exit(1);
});

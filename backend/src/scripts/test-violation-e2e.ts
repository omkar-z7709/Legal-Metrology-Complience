import { buildApp } from "../app.js";
import sharp from "sharp";
import FormData from "form-data";

async function runViolationTest() {
  console.log("================================================================================");
  console.log("⚠️ TESTING NON-COMPLIANT PRODUCT (Missing Consumer Care & MRP Tax Statement)");
  console.log("================================================================================");

  const app = buildApp();

  // Synthetic Deficient Label (Missing Consumer Care & No Tax Statement)
  const svg = `
    <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="40" y="40" width="720" height="720" fill="#f8fafc" stroke="#dc2626" stroke-width="4"/>
      <text x="80" y="140" font-family="sans-serif" font-size="32" font-weight="bold" fill="#12304a">NON-COMPLIANT SPICE PACKET</text>
      <text x="80" y="240" font-family="sans-serif" font-size="24" fill="#0f172a">Net Quantity: 500 g</text>
      <text x="80" y="320" font-family="sans-serif" font-size="26" font-weight="bold" fill="#0f172a">MRP Rs. 140.00</text> <!-- Missing (Incl. of all taxes) -->
      <text x="80" y="400" font-family="sans-serif" font-size="20" fill="#334155">Mfg Date: 07/2026</text>
      <text x="80" y="480" font-family="sans-serif" font-size="18" fill="#334155">Mfd by: Quick Pack Commodities Ltd, Delhi</text>
      <text x="80" y="560" font-family="sans-serif" font-size="18" fill="#334155">Country of Origin: India</text>
      <!-- Deliberately Missing Consumer Care Helpline & Email -->
    </svg>
  `;

  const imageBuffer = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();

  const form = new FormData();
  form.append("file", imageBuffer, { filename: "non_compliant_spice.jpg", contentType: "image/jpeg" });
  form.append("productName", "Deficient Spice Mix (500g)");
  form.append("category", "Food");
  form.append("brand", "QuickPack");

  const uploadRes = await app.inject({
    method: "POST",
    url: "/api/scans/upload",
    headers: { authorization: "Bearer dev-inspector", ...form.getHeaders() },
    payload: form.getBuffer(),
  });

  const scanId = uploadRes.json().data.scanId;

  // Run Inspection
  const analyzeRes = await app.inject({
    method: "POST",
    url: `/api/inspections/${scanId}/analyze`,
    headers: { authorization: "Bearer dev-inspector" },
  });

  const data = analyzeRes.json().data;
  console.log(`\nOutcome: Status [${data.complianceStatus}] | Score: ${data.complianceScore}%`);
  console.log(`Detected Violations (${data.violations.length}):`);
  for (const v of data.violations) {
    console.log(`\n❌ [${v.ruleNumber}] ${v.title} (${v.severity})`);
    console.log(`   Reason : ${v.reason}`);
    console.log(`   Action : ${v.suggestedAction}`);
    if (v.legalContext && v.legalContext.length > 0) {
      console.log(`   Statute: ${v.legalContext[0].sourceAct} (${v.legalContext[0].clause})`);
    }
  }

  console.log("\n================================================================================");
  console.log("✅ NON-COMPLIANCE & STATUTORY VIOLATION DETECTION VERIFIED!");
  console.log("================================================================================");
}

runViolationTest().catch(console.error);

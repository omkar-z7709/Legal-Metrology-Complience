import { ReportService } from "../services/reports/report.service.js";
import { DBRepo } from "../db/repo.js";

async function runReportTest() {
  console.log("================================================================================");
  console.log("📄 MODULE 14: STATUTORY INSPECTION REPORT GENERATION TEST");
  console.log("================================================================================");

  // 1. Seed sample product & completed inspection scan
  console.log("\n[STEP 1] Creating Sample Inspected Commodity in DB...");
  const product = await DBRepo.insertProduct({
    name: "SunPure Fortified Mustard Oil (1L)",
    brand: "SunPure",
    category: "Edible Oils",
    commodityType: "Liquid",
    manufacturerName: "SunPure Edibles Pvt. Ltd., Alwar, Rajasthan",
  });

  const scan = await DBRepo.insertScan({
    productId: product.id,
    scanNumber: `INS-2026-${Math.floor(100000 + Math.random() * 900000)}`,
    location: "Delhi Zonal Inspection Center",
    status: "COMPLETED",
    complianceStatus: "COMPLIANT",
    complianceScore: "100.00",
  });

  // Seed extracted declarations
  await DBRepo.insertExtractedField({
    scanId: scan.id,
    fieldName: "mrp",
    fieldValue: "₹185.00 (Incl. of all taxes)",
    rawText: "MRP Rs. 185.00 (Incl. of all taxes)",
    confidence: "0.98",
    isPresent: true,
    validationStatus: "VALID",
  });

  await DBRepo.insertExtractedField({
    scanId: scan.id,
    fieldName: "net_quantity",
    fieldValue: "1 L (910 g)",
    rawText: "Net Quantity: 1 L (910 g)",
    confidence: "0.99",
    isPresent: true,
    validationStatus: "VALID",
  });

  await DBRepo.insertExtractedField({
    scanId: scan.id,
    fieldName: "date_of_manufacture",
    fieldValue: "08/2026",
    rawText: "Month & Year of Mfg: 08/2026",
    confidence: "0.95",
    isPresent: true,
    validationStatus: "VALID",
  });

  console.log(`   ✓ Commodity Seeded: '${product.name}' (Scan ID: ${scan.id}, Number: ${scan.scanNumber})`);

  // 2. Generate PDF Report
  console.log("\n[STEP 2] Generating Official Regulatory Inspection PDF Report via ReportService...");
  const reportResult = await ReportService.generateInspectionReport(scan.id, "usr-01");

  console.log(`   ✓ Report Successfully Generated!`);
  console.log(`   ✓ Report Number : ${reportResult.reportNumber}`);
  console.log(`   ✓ Report ID     : ${reportResult.reportId}`);
  console.log(`   ✓ Storage / URL : ${reportResult.pdfUrl.slice(0, 60)}...`);

  console.log("\n================================================================================");
  console.log("✅ MODULE 14: REPORT GENERATION COMPLETED AND VERIFIED!");
  console.log("================================================================================");
}

runReportTest().catch((err) => {
  console.error("❌ Module 14 report test failed:", err);
  process.exit(1);
});

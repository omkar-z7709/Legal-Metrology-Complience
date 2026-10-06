import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import { DBRepo } from "../db/repo.js";

async function auditDatabaseApis() {
  console.log("=========================================");
  console.log("       AUDITING ALL DATABASE APIS        ");
  console.log("=========================================\n");

  const results: { api: string; status: "PASS" | "FAIL"; latencyMs: number; details?: string }[] = [];

  async function testApi(name: string, fn: () => Promise<any>) {
    const start = performance.now();
    try {
      const res = await fn();
      const latencyMs = Math.round(performance.now() - start);
      results.push({
        api: name,
        status: "PASS",
        latencyMs,
        details: Array.isArray(res) ? `Returned ${res.length} item(s)` : typeof res === "object" && res !== null ? "Object retrieved" : String(res),
      });
      console.log(`✅ [PASS] ${name.padEnd(35)} (${latencyMs}ms)`);
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      results.push({
        api: name,
        status: "FAIL",
        latencyMs,
        details: err.message,
      });
      console.log(`❌ [FAIL] ${name.padEnd(35)} (${latencyMs}ms) - Error: ${err.message}`);
    }
  }

  // 1. User APIs
  await testApi("DBRepo.getAllUsers()", () => DBRepo.getAllUsers());
  await testApi("DBRepo.getUserByEmail()", () => DBRepo.getUserByEmail("inspector.sarthak@lm.gov.in"));

  // 2. Product APIs
  let createdProductId: string | undefined;
  await testApi("DBRepo.insertProduct()", async () => {
    const p = await DBRepo.insertProduct({
      name: "Audit Test Commodity Oil 1L",
      brand: "Audit Brand",
      category: "Edible Oils",
      commodityType: "Liquid",
    });
    createdProductId = p.id;
    return p;
  });
  await testApi("DBRepo.getAllProducts()", () => DBRepo.getAllProducts());
  if (createdProductId) {
    await testApi("DBRepo.getProduct()", () => DBRepo.getProduct(createdProductId!));
  }

  // 3. Scan APIs
  let createdScanId: string | undefined;
  await testApi("DBRepo.insertScan()", async () => {
    const s = await DBRepo.insertScan({
      productId: createdProductId,
      scanNumber: `AUDIT-${Date.now()}`,
      status: "PROCESSING",
      complianceStatus: "REQUIRES_REVIEW",
      complianceScore: "0.00",
    });
    createdScanId = s.id;
    return s;
  });
  await testApi("DBRepo.getAllScans()", () => DBRepo.getAllScans());
  if (createdScanId) {
    await testApi("DBRepo.getScan()", () => DBRepo.getScan(createdScanId!));
    await testApi("DBRepo.updateScan()", () => DBRepo.updateScan(createdScanId!, { complianceStatus: "COMPLIANT", complianceScore: "100.00" }));
  }

  // 4. Image APIs
  if (createdScanId) {
    await testApi("DBRepo.insertImage()", () => DBRepo.insertImage({
      scanId: createdScanId!,
      imageType: "ORIGINAL",
      storagePath: "test/path.jpg",
      fileName: "test.jpg",
      contentType: "image/jpeg",
      fileSizeBytes: 1024,
    }));
    await testApi("DBRepo.getScanImages()", () => DBRepo.getScanImages(createdScanId!));
  }

  // 5. Extracted Field APIs
  if (createdScanId) {
    await testApi("DBRepo.insertExtractedField()", () => DBRepo.insertExtractedField({
      scanId: createdScanId!,
      fieldName: "mrp",
      fieldValue: "₹100",
      confidence: "0.95",
      isPresent: true,
      validationStatus: "VALID",
    }));
    await testApi("DBRepo.getScanExtractedFields()", () => DBRepo.getScanExtractedFields(createdScanId!));
  }

  // 6. Compliance Check & Violation APIs
  let createdCheckId: string | undefined;
  if (createdScanId) {
    await testApi("DBRepo.insertComplianceCheck()", async () => {
      const c = await DBRepo.insertComplianceCheck({
        scanId: createdScanId!,
        ruleId: "RULE-6-1-E-MRP",
        fieldName: "mrp",
        status: "PASS",
        reason: "MRP declaration conforms strictly to Rule 6(1)(e).",
        confidence: "0.95",
      });
      createdCheckId = c.id;
      return c;
    });
    await testApi("DBRepo.getScanComplianceChecks()", () => DBRepo.getScanComplianceChecks(createdScanId!));

    if (createdCheckId) {
      await testApi("DBRepo.insertViolation()", () => DBRepo.insertViolation({
        scanId: createdScanId!,
        checkId: createdCheckId!,
        ruleId: "RULE-6-1-E-MRP",
        violationType: "MRP",
        severity: "HIGH",
        title: "Test Violation",
        description: "Test description",
      }));
      await testApi("DBRepo.getScanViolations()", () => DBRepo.getScanViolations(createdScanId!));
    }
  }

  // 7. Audit Log APIs
  if (createdScanId) {
    await testApi("DBRepo.insertAuditLog()", () => DBRepo.insertAuditLog({
      userEmail: "officer@lm.gov.in",
      action: "AUDIT_ACCEPT",
      resourceType: "SCAN",
      resourceId: createdScanId!,
      details: { test: true },
    }));
    await testApi("DBRepo.getScanAuditHistory()", () => DBRepo.getScanAuditHistory(createdScanId!));
    await testApi("DBRepo.getAllAuditLogs()", () => DBRepo.getAllAuditLogs());
  }

  // 8. Aggregate Stats APIs
  await testApi("DBRepo.getScanStats()", () => DBRepo.getScanStats());
  await testApi("DBRepo.getRecentScans()", () => DBRepo.getRecentScans(5));

  console.log("\n=========================================");
  console.log(`SUMMARY: ${results.filter((r) => r.status === "PASS").length}/${results.length} DB APIs PASSED`);
  console.log("=========================================\n");
}

auditDatabaseApis()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Audit crashed:", err);
    process.exit(1);
  });

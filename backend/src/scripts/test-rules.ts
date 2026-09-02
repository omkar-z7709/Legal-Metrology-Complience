import { buildApp } from "../app.js";
import { RulesService } from "../services/rules/rules.service.js";

async function runRulesKnowledgeBaseTest() {
  console.log("==================================================");
  console.log("🧪 MODULE 8: Statutory Rule Knowledge Base Test");
  console.log("==================================================");

  const app = buildApp();

  // 1. Verify Rules Service Retrieval
  console.log("1️⃣ Querying Active Statutory Rules from Knowledge Base...");
  const allRules = await RulesService.getAllActiveRules();
  console.log(`   ✓ Total Verified Legal Metrology Rules: ${allRules.length}`);

  if (allRules.length < 8) {
    throw new Error(`Expected at least 8 official rules, got ${allRules.length}`);
  }

  // 2. Validate Structured Rule Metadata Format
  console.log("\n2️⃣ Validating Structured Statutory Rule Metadata Attributes:");
  const mandatoryAttributes = [
    "id",
    "ruleNumber",
    "title",
    "category",
    "requirement",
    "validationType",
    "severity",
    "effectiveFrom",
    "sourceAct",
    "sourceClause",
  ];

  for (const rule of allRules) {
    for (const attr of mandatoryAttributes) {
      if (!(attr in rule) || (rule as any)[attr] === undefined) {
        throw new Error(`Rule ${rule.id} is missing mandatory attribute '${attr}'`);
      }
    }
    console.log(`   • [${rule.ruleNumber}] ${rule.title} | Severity: ${rule.severity} | Type: ${rule.validationType}`);
  }

  // 3. Test Retrieval by Statutory ID (MRP Rule)
  console.log("\n3️⃣ Testing Specific Rule Lookup (Rule 6(1)(e) - MRP)...");
  const mrpRule = await RulesService.getRuleById("RULE-6-1-E-MRP");
  if (!mrpRule) {
    throw new Error("Failed to find Rule 6(1)(e) by ID");
  }
  console.log(`   ✓ Found: ${mrpRule.title}`);
  console.log(`   ✓ Requirement : "${mrpRule.requirement}"`);
  console.log(`   ✓ Statute     : ${mrpRule.sourceAct} (${mrpRule.sourceClause})`);

  // 4. Test API Integration via Fastify Endpoints (/api/rules & /api/rules/:id)
  console.log("\n4️⃣ Testing REST API Endpoints (/api/rules & /api/rules/:id)...");
  
  // List Endpoint
  const listRes = await app.inject({
    method: "GET",
    url: "/api/rules",
  });
  console.log(`   [GET /api/rules] Status: ${listRes.statusCode}`);
  const listJson = listRes.json();
  if (listRes.statusCode !== 200 || listJson.data.rules.length === 0) {
    throw new Error("Failed to list rules via API endpoint");
  }
  console.log(`   ✓ API returned ${listJson.data.rules.length} official rules.`);

  // Single Rule Endpoint
  const singleRes = await app.inject({
    method: "GET",
    url: "/api/rules/RULE-6-1-C-NET-QUANTITY",
  });
  console.log(`   [GET /api/rules/RULE-6-1-C-NET-QUANTITY] Status: ${singleRes.statusCode}`);
  const singleJson = singleRes.json();
  if (singleRes.statusCode !== 200 || !singleJson.data.rule) {
    throw new Error("Failed to fetch single rule via API endpoint");
  }
  console.log(`   ✓ Rule 6(1)(c) Net Quantity verified via API endpoint.`);

  console.log("\n==================================================");
  console.log("✅ MODULE 8: Legal Rule Knowledge Base Verified!");
  console.log("==================================================");
}

runRulesKnowledgeBaseTest().catch((err) => {
  console.error("❌ Rules Knowledge Base test failed:", err);
  process.exit(1);
});

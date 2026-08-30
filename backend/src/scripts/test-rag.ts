import { buildApp } from "../app.js";
import { RagLegalService } from "../services/rag/rag.service.js";

async function runRagServiceTest() {
  console.log("==================================================");
  console.log("🧪 MODULE 9: RAG Legal Knowledge Retrieval Test");
  console.log("==================================================");

  const app = buildApp();

  // 1. Query 1: MRP and Taxes
  console.log("1️⃣ Query: 'What rule mandates inclusive of all taxes on Maximum Retail Price?'");
  const mrpQuery = "What rule mandates inclusive of all taxes on Maximum Retail Price?";
  const mrpChunks = await RagLegalService.retrieveLegalContext(mrpQuery);

  if (mrpChunks.length === 0 || mrpChunks[0].ruleId !== "RULE-6-1-E-MRP") {
    throw new Error(`Expected top match RULE-6-1-E-MRP, got ${mrpChunks[0]?.ruleId}`);
  }

  const topMrp = mrpChunks[0];
  console.log(`   ✓ Top Matched Rule : [${topMrp.ruleNumber}] ${topMrp.ruleId}`);
  console.log(`   ✓ Relevance Score  : ${(topMrp.similarityScore * 100).toFixed(0)}%`);
  console.log(`   ✓ Act Citation     : ${topMrp.sourceAct} (${topMrp.clause})`);
  console.log(`   ✓ Effective Date   : ${topMrp.effectiveDate}`);
  console.log(`   ✓ Legal Mandate    : "${topMrp.statutoryObligation}"`);

  // 2. Query 2: Consumer Care Details
  console.log("\n2️⃣ Query: 'What rule governs mandatory phone number and email for consumer complaints?'");
  const careQuery = "What rule governs mandatory phone number and email for consumer complaints?";
  const careChunks = await RagLegalService.retrieveLegalContext(careQuery);

  if (careChunks.length === 0 || careChunks[0].ruleId !== "RULE-6-1-F-CONSUMER-CARE") {
    throw new Error(`Expected top match RULE-6-1-F-CONSUMER-CARE, got ${careChunks[0]?.ruleId}`);
  }

  const topCare = careChunks[0];
  console.log(`   ✓ Top Matched Rule : [${topCare.ruleNumber}] ${topCare.ruleId}`);
  console.log(`   ✓ Act Citation     : ${topCare.sourceAct} (${topCare.clause})`);
  console.log(`   ✓ Legal Mandate    : "${topCare.statutoryObligation}"`);

  // 3. Query 3: Font Size on PDP
  console.log("\n3️⃣ Query: 'What rule specifies minimum font size on Principal Display Panel?'");
  const fontQuery = "What rule specifies minimum font size on Principal Display Panel?";
  const fontChunks = await RagLegalService.retrieveLegalContext(fontQuery);

  if (fontChunks.length === 0 || fontChunks[0].ruleId !== "RULE-8-1-FONT-SIZE") {
    throw new Error(`Expected top match RULE-8-1-FONT-SIZE, got ${fontChunks[0]?.ruleId}`);
  }
  console.log(`   ✓ Top Matched Rule : [${fontChunks[0].ruleNumber}] ${fontChunks[0].ruleId}`);

  // 4. Test Fastify REST API Integration (/api/rag/query)
  console.log("\n4️⃣ Testing RAG REST API Endpoint (POST /api/rag/query)...");
  const apiRes = await app.inject({
    method: "POST",
    url: "/api/rag/query",
    payload: {
      query: "Country of origin declaration requirement on imported products",
      category: "GENERAL",
    },
  });

  console.log(`   [POST /api/rag/query] Status: ${apiRes.statusCode}`);
  const apiJson = apiRes.json();

  if (apiRes.statusCode !== 200 || !apiJson.data.retrievedContext || apiJson.data.retrievedContext.length === 0) {
    throw new Error("RAG API endpoint returned invalid response");
  }

  const originRule = apiJson.data.retrievedContext.find((c: any) => c.ruleId === "RULE-6-1-G-COUNTRY-ORIGIN");
  if (!originRule) {
    throw new Error("Country of origin rule not found in RAG API response");
  }
  console.log(`   ✓ RAG API successfully retrieved ${apiJson.data.retrievedContext.length} legal context chunks.`);
  console.log(`   ✓ Verified [${originRule.ruleNumber}] ${originRule.clause}`);

  console.log("\n==================================================");
  console.log("✅ MODULE 9: RAG Legal Knowledge Retrieval Verified!");
  console.log("==================================================");
}

runRagServiceTest().catch((err) => {
  console.error("❌ RAG Service test failed:", err);
  process.exit(1);
});

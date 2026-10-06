import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import { NewVectorIngestionService } from "../services/rag/new-vector-ingestion.service.js";
import { NewVectorRetrievalService } from "../services/rag/new-vector-retrieval.service.js";

async function main() {
  console.log("=================================================");
  console.log("  BUILDING NEW LEGAL METROLOGY VECTOR DATABASE   ");
  console.log("=================================================\n");

  // Step 1: Run Idempotent Ingestion
  const result = await NewVectorIngestionService.ingestRulebook();

  console.log("\n=================================================");
  console.log("          NEW VECTOR DB INGESTION REPORT         ");
  console.log("=================================================");
  console.log(`• Documents Processed:       ${result.documentsProcessed}`);
  console.log(`• Sections/Rules Detected:   ${result.sectionsDetected}`);
  console.log(`• Total Chunks Created:      ${result.totalChunks}`);
  console.log(`• Regulatory Tables Chunked: ${result.tablesCount}`);
  console.log(`• Exceptions / Provisos:    ${result.exceptionsCount}`);
  console.log(`• Embeddings Generated:      ${result.embeddingsGenerated}`);
  console.log(`• Embedding Model:           ${result.embeddingModel}`);
  console.log(`• Vector Store Table:        ${result.vectorStoreTable}`);
  console.log(`• Metadata Fields Count:     ${result.metadataFieldsCount}`);
  console.log(`• Failed Chunks:             ${result.failedChunks}`);
  console.log(`• Duplicate Chunks:          ${result.duplicateChunks}`);
  console.log("=================================================\n");

  // Step 2: Verification Retrieval Test Suite
  const testQueries = [
    "MRP requirements",
    "net quantity",
    "maximum permissible error",
    "rounding rules",
    "consumer complaint details",
    "exemptions",
    "deceptive packages",
    "wholesale packages",
    "advertisement requirements",
    "e-commerce requirements",
    "penalties",
    "sampling procedures",
  ];

  console.log("=================================================");
  console.log("  VERIFYING RETRIEVAL AGAINST NEW VECTOR DB      ");
  console.log("=================================================\n");

  for (let i = 0; i < testQueries.length; i++) {
    const q = testQueries[i];
    console.log(`\n🔍 QUERY #${i + 1}: "${q}"`);
    const hits = await NewVectorRetrievalService.searchNewVectorDb(q, 2);

    if (hits.length === 0) {
      console.log("   ❌ NO CHUNKS RETRIEVED");
    } else {
      hits.forEach((hit, idx) => {
        console.log(`   [Hit #${idx + 1}] Similarity: ${(hit.similarityScore * 100).toFixed(1)}%`);
        console.log(`        Rule/Section: ${hit.ruleNumber} (${hit.ruleId}) - ${hit.section}`);
        console.log(`        Topic: ${hit.topic}`);
        console.log(`        Source: ${hit.source}`);
        console.log(`        Chunk Type: ${hit.chunkType} | Req: ${hit.relevantMetadata.requirementType}`);
        console.log(`        Excerpt: "${hit.content.slice(0, 160)}..."`);
      });
    }
  }

  console.log("\n=================================================");
  console.log("  NEW LEGAL METROLOGY VECTOR DB BUILD COMPLETE   ");
  console.log("=================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Vector DB Build Failed:", err);
    process.exit(1);
  });

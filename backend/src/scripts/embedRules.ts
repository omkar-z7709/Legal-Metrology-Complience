/**
 * embedRules.ts — One-shot script to embed all seeded rules and store in rule_embeddings table.
 *
 * Run with:  npx tsx src/scripts/embedRules.ts
 *
 * Prerequisites:
 *   - GEMINI_API_KEY set in your .env
 *   - Postgres running with pgvector extension enabled
 *   - rule_embeddings table migrated (0002_rule_embeddings.sql)
 */

import { randomUUID } from "crypto";
import { embedTexts } from "../services/rag/embedding.service.js";
import { officialLegalMetrologyRules } from "../db/seed.js";
import { db, checkPostgresConnection } from "../db/index.js";
import { ruleEmbeddings, rules } from "../db/schema.js";
import { RagLegalService } from "../services/rag/rag.service.js";
import { eq } from "drizzle-orm";

const BATCH_SIZE = 10;

export async function ingestAndEmbedRules(): Promise<{ totalChunks: number; embedded: number }> {
  console.log(`[RAG] Starting statutory rules embedding ingestion...`);

  const chunks = officialLegalMetrologyRules.map((r) => ({
    ruleId: r.id,
    chunkIndex: 0,
    text: `${r.ruleNumber}: ${r.title}. ${r.requirement} ${r.description}`.trim(),
  }));

  const dbStatus = await checkPostgresConnection();
  const isDbLive = dbStatus.connected;

  if (isDbLive) {
    console.log(`[RAG] Ensuring base rules are present in postgres rules table...`);
    for (const r of officialLegalMetrologyRules) {
      await db.insert(rules).values(r).onConflictDoUpdate({
        target: rules.id,
        set: r,
      });
    }
  }

  let totalEmbedded = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    console.log(
      `[RAG] Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        chunks.length / BATCH_SIZE
      )} (${batch.length} items)...`
    );

    const vectors = await embedTexts(texts, "RETRIEVAL_DOCUMENT");

    for (let j = 0; j < batch.length; j++) {
      const { ruleId, chunkIndex, text } = batch[j];
      const embedding = vectors[j];

      // Register in memory vector store
      RagLegalService.registerInMemoryVector(ruleId, chunkIndex, text, embedding);

      // If Postgres is live, persist to rule_embeddings table
      if (isDbLive) {
        try {
          await db.delete(ruleEmbeddings).where(eq(ruleEmbeddings.ruleId, ruleId));
          await db.insert(ruleEmbeddings).values({
            id: randomUUID(),
            ruleId,
            chunkIndex,
            content: text,
            embedding: embedding as any,
          });
        } catch (dbErr: any) {
          console.warn(`[RAG] Notice: could not persist embedding for ${ruleId} to DB: ${dbErr.message}`);
        }
      }

      totalEmbedded++;
    }
  }

  console.log(`[RAG] ✅ Ingestion complete! ${totalEmbedded} rule chunk embeddings ready.`);
  return { totalChunks: chunks.length, embedded: totalEmbedded };
}

// Allow direct CLI execution: node --experimental-strip-types src/scripts/embedRules.ts
if (process.argv[1]?.endsWith("embedRules.ts")) {
  ingestAndEmbedRules()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[embedRules] ❌ Failed:", err);
      process.exit(1);
    });
}

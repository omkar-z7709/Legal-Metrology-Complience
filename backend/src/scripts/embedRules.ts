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
import { eq } from "drizzle-orm";

const BATCH_SIZE = 10; // Keep small to respect Gemini rate limits

async function run() {
  console.log(`[embedRules] Checking database connection...`);
  const status = await checkPostgresConnection();
  if (!status.connected) {
    console.error(`[embedRules] ❌ Database not connected: ${status.error}`);
    process.exit(1);
  }

  console.log(`[embedRules] Ensuring base rules are present in rules table...`);
  for (const r of officialLegalMetrologyRules) {
    await db.insert(rules).values(r).onConflictDoUpdate({
      target: rules.id,
      set: r,
    });
  }

  console.log(`[embedRules] Embedding ${officialLegalMetrologyRules.length} rules...`);

  const chunks = officialLegalMetrologyRules.map((r) => ({
    ruleId: r.id,
    chunkIndex: 0,
    text: `${r.ruleNumber}: ${r.title}. ${r.requirement} ${r.description}`.trim(),
  }));

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    console.log(
      `[embedRules] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        chunks.length / BATCH_SIZE
      )} (${batch.length} items)...`
    );

    const vectors = await embedTexts(texts, "RETRIEVAL_DOCUMENT");

    for (let j = 0; j < batch.length; j++) {
      const { ruleId, chunkIndex, text } = batch[j];
      const embedding = vectors[j];

      // Delete stale embedding then insert fresh
      await db.delete(ruleEmbeddings).where(eq(ruleEmbeddings.ruleId, ruleId));

      await db.insert(ruleEmbeddings).values({
        id: randomUUID(),
        ruleId: ruleId,
        chunkIndex,
        content: text,
        embedding: embedding as any,
      });
    }
  }

  console.log(`[embedRules] ✅ Done! ${chunks.length} embeddings stored in rule_embeddings table.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("[embedRules] ❌ Failed:", err);
  process.exit(1);
});

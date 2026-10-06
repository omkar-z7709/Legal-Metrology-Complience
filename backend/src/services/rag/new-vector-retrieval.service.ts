import { embedTexts } from "./embedding.service.js";
import { db } from "../../db/index.js";
import { newLegalRulebookEmbeddings } from "../../db/schema.js";
import { sql } from "drizzle-orm";
import { STRUCTURED_RULEBOOK_DATASET } from "./rulebook-dataset.js";

export interface NewTraceableLegalChunk {
  chunkId: string;
  ruleId: string;
  ruleNumber: string;
  section: string;
  schedule?: string | null;
  table?: string | null;
  topic: string;
  chunkType: string;
  content: string;
  similarityScore: number;
  source: string;
  relevantMetadata: {
    sourceType: string;
    authority: string;
    documentName: string;
    documentVersion: string;
    effectiveFrom: string | null;
    parentRuleId?: string | null;
    requirementType: string;
    commodityScope: string | null;
    applicability: string | null;
    amendmentReference?: string | null;
  };
}

export class NewVectorRetrievalService {
  /**
   * Performs traceable semantic retrieval against the new legal vector database.
   */
  static async searchNewVectorDb(
    query: string,
    topK: number = 3
  ): Promise<NewTraceableLegalChunk[]> {
    console.log(`[NewVectorRetrieval] Querying: "${query}" (topK: ${topK})`);

    // 1. Embed query once
    let queryVec: number[];
    try {
      [queryVec] = await embedTexts([query], "RETRIEVAL_QUERY");
    } catch (err: any) {
      console.warn(`[NewVectorRetrieval] Query embedding error: ${err.message}`);
      return this._fallbackKeywordSearch(query, topK);
    }

    // 2. Perform pgvector cosine similarity search on new_legal_rulebook_embeddings
    try {
      const queryVecStr = `[${queryVec.join(",")}]`;

      const rows = await db.execute(sql`
        SELECT
          id,
          chunk_id,
          rule_id,
          rule_number,
          section,
          schedule,
          "table",
          topic,
          chunk_type,
          content,
          metadata_json,
          1 - (embedding <=> ${queryVecStr}::vector) AS similarity
        FROM new_legal_rulebook_embeddings
        ORDER BY embedding <=> ${queryVecStr}::vector
        LIMIT ${topK}
      `);

      if (rows && (rows as any[]).length > 0) {
        return (rows as any[]).map((row) => {
          const meta = row.metadata_json || {};
          const sim = Math.max(0, Math.round(parseFloat(row.similarity || "0") * 1000) / 1000);
          return {
            chunkId: row.chunk_id,
            ruleId: row.rule_id,
            ruleNumber: row.rule_number,
            section: row.section,
            schedule: row.schedule,
            table: row.table,
            topic: row.topic,
            chunkType: row.chunk_type,
            content: row.content,
            similarityScore: sim,
            source: `${meta.document_name || "Legal Metrology Rules"} (${row.rule_number})`,
            relevantMetadata: {
              sourceType: meta.source_type || "regulatory_text",
              authority: meta.authority || "Department of Consumer Affairs",
              documentName: meta.document_name || "Legal Metrology Rules",
              documentVersion: meta.document_version || "2026.1-GAZETTE-UPDATED",
              effectiveFrom: meta.effective_from || null,
              parentRuleId: meta.parent_rule_id || null,
              requirementType: meta.requirement_type || "MANDATORY",
              commodityScope: meta.commodity_scope || null,
              applicability: meta.applicability || null,
              amendmentReference: meta.amendment_reference || null,
            },
          };
        });
      }
    } catch (err: any) {
      console.warn(`[NewVectorRetrieval] pgvector query notice: ${err.message}. Using dataset cosine fallback.`);
    }

    // 3. Dataset Cosine Fallback (re-uses queryVec)
    return this._datasetCosineSearch(queryVec, topK);
  }

  private static async _datasetCosineSearch(
    queryVec: number[],
    topK: number
  ): Promise<NewTraceableLegalChunk[]> {
    const dataset = STRUCTURED_RULEBOOK_DATASET;
    const texts = dataset.map(
      (c) => `[${c.ruleNumber}] ${c.topic}: ${c.content}`
    );
    const vectors = await embedTexts(texts, "RETRIEVAL_DOCUMENT");

    const scored = dataset.map((c, i) => {
      const sim = this._cosineSimilarity(queryVec, vectors[i]);
      return {
        chunkId: c.chunkId,
        ruleId: c.ruleId,
        ruleNumber: c.ruleNumber,
        section: c.section,
        schedule: c.schedule || null,
        table: c.table || null,
        topic: c.topic,
        chunkType: c.chunkType,
        content: texts[i],
        similarityScore: Math.round(sim * 1000) / 1000,
        source: `${c.documentName} (${c.ruleNumber})`,
        relevantMetadata: {
          sourceType: c.sourceType,
          authority: c.authority,
          documentName: c.documentName,
          documentVersion: c.documentVersion,
          effectiveFrom: c.effectiveFrom,
          parentRuleId: c.parentRuleId || null,
          requirementType: c.requirementType,
          commodityScope: c.commodityScope,
          applicability: c.applicability,
          amendmentReference: c.amendmentReference || null,
        },
      };
    });

    return scored.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, topK);
  }

  private static _fallbackKeywordSearch(
    query: string,
    topK: number
  ): NewTraceableLegalChunk[] {
    const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const dataset = STRUCTURED_RULEBOOK_DATASET;

    const scored = dataset.map((c) => {
      const text = `${c.ruleNumber} ${c.topic} ${c.content} ${c.section} ${c.schedule || ""}`.toLowerCase();
      const matches = tokens.filter((t) => text.includes(t)).length;
      const sim = tokens.length > 0 ? Math.min(0.98, 0.4 + (matches / tokens.length) * 0.55) : 0;

      return {
        chunkId: c.chunkId,
        ruleId: c.ruleId,
        ruleNumber: c.ruleNumber,
        section: c.section,
        schedule: c.schedule || null,
        table: c.table || null,
        topic: c.topic,
        chunkType: c.chunkType,
        content: c.content,
        similarityScore: Math.round(sim * 1000) / 1000,
        source: `${c.documentName} (${c.ruleNumber})`,
        relevantMetadata: {
          sourceType: c.sourceType,
          authority: c.authority,
          documentName: c.documentName,
          documentVersion: c.documentVersion,
          effectiveFrom: c.effectiveFrom,
          parentRuleId: c.parentRuleId || null,
          requirementType: c.requirementType,
          commodityScope: c.commodityScope,
          applicability: c.applicability,
          amendmentReference: c.amendmentReference || null,
        },
      };
    });

    return scored.filter((s) => s.similarityScore > 0).sort((a, b) => b.similarityScore - a.similarityScore).slice(0, topK);
  }

  private static _cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

import { embedTexts } from "./embedding.service.js";
import { RulesService, LegalRuleMetadata } from "../rules/rules.service.js";
import { db } from "../../db/index.js";
import { ruleEmbeddings, rules } from "../../db/schema.js";
import { sql, eq } from "drizzle-orm";

export interface LegalContextChunk {
  ruleId: string;
  ruleNumber: string;
  sourceAct: string;
  clause: string;
  text: string;
  similarityScore: number;
  effectiveDate: string;
  statutoryObligation: string;
}

export class RagLegalService {
  private static inMemoryEmbeddings: Map<
    string,
    { ruleId: string; chunkIndex: number; content: string; embedding: number[] }
  > = new Map();
  private static isInitialized = false;

  /**
   * Registers a rule embedding into the in-memory vector store
   */
  static registerInMemoryVector(
    ruleId: string,
    chunkIndex: number,
    content: string,
    embedding: number[]
  ) {
    this.inMemoryEmbeddings.set(`${ruleId}-${chunkIndex}`, {
      ruleId,
      chunkIndex,
      content,
      embedding,
    });
  }

  /**
   * Ensures knowledge base rules are embedded and cached in-memory.
   */
  static async ensureInitialized() {
    if (this.isInitialized && this.inMemoryEmbeddings.size > 0) return;

    const allRules = await RulesService.getAllActiveRules();
    const textsToEmbed = allRules.map(
      (r) => `${r.ruleNumber}: ${r.title}. ${r.requirement} ${r.description}`.trim()
    );

    console.log(`[RAG] Initializing knowledge base embeddings for ${allRules.length} statutory rules...`);
    const vectors = await embedTexts(textsToEmbed, "RETRIEVAL_DOCUMENT");

    for (let i = 0; i < allRules.length; i++) {
      this.registerInMemoryVector(
        allRules[i].id,
        0,
        textsToEmbed[i],
        vectors[i]
      );
    }
    this.isInitialized = true;
    console.log(`[RAG] Knowledge base initialized with ${this.inMemoryEmbeddings.size} vector embeddings.`);
  }

  /**
   * Retrieves relevant legal context using pgvector or in-memory cosine similarity.
   * Falls back to keyword scoring if embeddings are missing.
   * The query is embedded exactly ONCE and the vector is reused across the
   * pgvector and in-memory paths (previously each embed query called Gemini).
   */
  static async retrieveLegalContext(
    query: string,
    category: string = "GENERAL",
    topK: number = 3
  ): Promise<LegalContextChunk[]> {
    console.log(`[RAG] Query received: "${query}" (category: ${category})`);

    // 1. Embed the query once. If embedding is unavailable (no API key), skip
    //    straight to the keyword fallback which needs no embeddings.
    let queryVec: number[] | null = null;
    try {
      [queryVec] = await embedTexts([query], "RETRIEVAL_QUERY");
    } catch (err: any) {
      console.warn(`[RAG] Query embedding notice: ${err.message}. Using keyword fallback.`);
      return RagLegalService._keywordFallback(query, category, topK);
    }

    // 2. Try real pgvector search (no live connection ping - errors fall back silently)
    try {
      const vectorResults = await RagLegalService._pgvectorSearch(queryVec, topK);
      if (vectorResults && vectorResults.length > 0) {
        return vectorResults;
      }
    } catch (err: any) {
      console.warn(`[RAG] pgvector search notice: ${err.message}. Using in-memory vector search.`);
    }

    // 3. In-Memory Vector Search using Cosine Similarity (reuses the query vector)
    try {
      await this.ensureInitialized();
      const inMemoryResults = await this._inMemoryVectorSearch(queryVec, category, topK);
      if (inMemoryResults.length > 0) return inMemoryResults;
    } catch (err: any) {
      console.warn(`[RAG] In-memory vector search notice: ${err.message}. Using keyword fallback.`);
    }

    // 4. Keyword fallback
    const keywordResults = await RagLegalService._keywordFallback(query, category, topK);
    console.log(`[RAG] Keyword fallback retrieved ${keywordResults.length} chunks.`);
    return keywordResults;
  }

  /** Real vector search using PostgreSQL pgvector <=> (cosine distance) */
  private static async _pgvectorSearch(
    queryVec: number[],
    topK: number
  ): Promise<LegalContextChunk[]> {
    const queryVecStr = `[${queryVec.join(",")}]`;

    const rows = await db.execute(sql`
      SELECT
        re.id,
        re.rule_id,
        re.chunk_index,
        re.content,
        1 - (re.embedding <=> ${queryVecStr}::vector) AS similarity,
        r.rule_number,
        r.source_act,
        r.source_clause,
        r.description,
        r.effective_from,
        r.requirement
      FROM rule_embeddings re
      JOIN rules r ON r.id = re.rule_id
      ORDER BY re.embedding <=> ${queryVecStr}::vector
      LIMIT ${topK}
    `);

    return (rows as any[]).map((row) => ({
      ruleId: row.rule_id,
      ruleNumber: row.rule_number,
      sourceAct: row.source_act,
      clause: row.source_clause,
      text: row.content,
      similarityScore: Math.max(0, Math.round(parseFloat(row.similarity || "0") * 100) / 100),
      effectiveDate: row.effective_from,
      statutoryObligation: row.requirement,
    }));
  }

  /** In-memory cosine similarity search over cached embeddings */
  private static async _inMemoryVectorSearch(
    queryVec: number[],
    category: string,
    topK: number
  ): Promise<LegalContextChunk[]> {
    const allRules = await RulesService.getAllActiveRules();
    const ruleMap = new Map(allRules.map((r) => [r.id, r]));

    const scoredChunks: LegalContextChunk[] = [];

    for (const item of this.inMemoryEmbeddings.values()) {
      const rule = ruleMap.get(item.ruleId);
      if (!rule) continue;

      const sim = this._cosineSimilarity(queryVec, item.embedding);

      scoredChunks.push({
        ruleId: rule.id,
        ruleNumber: rule.ruleNumber,
        sourceAct: rule.sourceAct,
        clause: rule.sourceClause,
        text: item.content,
        similarityScore: Math.round(sim * 100) / 100,
        effectiveDate: rule.effectiveFrom,
        statutoryObligation: rule.requirement,
      });
    }

    return scoredChunks
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, topK);
  }

  /** Computes standard vector cosine similarity between two float arrays */
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

  /** Keyword fallback: token overlap scoring */
  private static async _keywordFallback(
    query: string,
    category: string,
    topK: number
  ): Promise<LegalContextChunk[]> {
    const allRules = await RulesService.getApplicableRules(category);
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    const scored = allRules.map((r: LegalRuleMetadata) => {
      const target = `${r.ruleNumber} ${r.title} ${r.requirement} ${r.description} ${r.sourceClause}`.toLowerCase();
      const matchCount = queryTokens.filter((t) => target.includes(t)).length;
      const score = queryTokens.length > 0 && matchCount > 0
        ? Math.min(0.95, 0.45 + (matchCount / queryTokens.length) * 0.5)
        : 0;

      return {
        ruleId: r.id,
        ruleNumber: r.ruleNumber,
        sourceAct: r.sourceAct,
        clause: r.sourceClause,
        text: r.description,
        similarityScore: Math.round(score * 100) / 100,
        effectiveDate: r.effectiveFrom,
        statutoryObligation: r.requirement,
      } satisfies LegalContextChunk;
    });

    return scored
      .filter((s) => s.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, topK);
  }
}

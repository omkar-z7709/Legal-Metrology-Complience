import { embedTexts } from "./embedding.service.js";
import { RulesService, LegalRuleMetadata } from "../rules/rules.service.js";
import { db, checkPostgresConnection } from "../../db/index.js";
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
  /**
   * Retrieves relevant legal context using pgvector cosine similarity.
   * Falls back to keyword scoring if DB is down or embeddings are missing.
   */
  static async retrieveLegalContext(
    query: string,
    category: string = "GENERAL",
    topK: number = 3
  ): Promise<LegalContextChunk[]> {
    // --- Try real vector search first ---
    try {
      const dbStatus = await checkPostgresConnection();
      if (dbStatus.connected) {
        const vectorResults = await RagLegalService._vectorSearch(query, topK);
        if (vectorResults.length > 0) return vectorResults;
      }
    } catch (err) {
      console.warn("[RAG] Vector search failed, falling back to keyword:", (err as Error).message);
    }

    // --- Keyword fallback (always works, no DB needed) ---
    return RagLegalService._keywordFallback(query, category, topK);
  }

  /** Real vector search using pgvector <=> (cosine distance) */
  private static async _vectorSearch(
    query: string,
    topK: number
  ): Promise<LegalContextChunk[]> {
    // Embed the query with RETRIEVAL_QUERY task type
    const [queryVec] = await embedTexts([query], "RETRIEVAL_QUERY");

    // pgvector cosine distance via raw SQL — drizzle supports sql`` tagged template
    const rows = await db.execute(sql`
      SELECT
        re.id,
        re.rule_id,
        re.chunk_index,
        re.content,
        1 - (re.embedding <=> ${JSON.stringify(queryVec)}::vector) AS similarity,
        r.rule_number,
        r.source_act,
        r.source_clause,
        r.description,
        r.effective_from,
        r.requirement
      FROM rule_embeddings re
      JOIN rules r ON r.id = re.rule_id
      ORDER BY re.embedding <=> ${JSON.stringify(queryVec)}::vector
      LIMIT ${topK}
    `);

    return (rows as any[]).map((row) => ({
      ruleId: row.rule_id,
      ruleNumber: row.rule_number,
      sourceAct: row.source_act,
      clause: row.source_clause,
      text: row.content,
      similarityScore: Math.round(parseFloat(row.similarity) * 100) / 100,
      effectiveDate: row.effective_from,
      statutoryObligation: row.requirement,
    }));
  }

  /** Keyword fallback: token overlap scoring (no DB, no API needed) */
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
      const score = queryTokens.length > 0
        ? Math.min(0.75, 0.35 + (matchCount / queryTokens.length) * 0.4)
        : 0.35;

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
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, topK);
  }
}

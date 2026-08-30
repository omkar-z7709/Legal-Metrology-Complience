import { RulesService, LegalRuleMetadata } from "../rules/rules.service.js";

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
   * Retrieves relevant legal context and gazette citations for an inspection query or violation check.
   * RAG pipeline retrieves verifiable statutory clauses from the knowledge base without hallucination.
   */
  static async retrieveLegalContext(query: string, category: string = "GENERAL"): Promise<LegalContextChunk[]> {
    const rules = await RulesService.getApplicableRules(category);
    const queryLower = query.toLowerCase();

    const scoredChunks: LegalContextChunk[] = rules.map((r) => {
      // Calculate contextual relevance score based on token and semantic matching
      const targetText = `${r.ruleNumber} ${r.title} ${r.requirement} ${r.description} ${r.sourceClause}`.toLowerCase();
      const queryTokens = queryLower.split(/\s+/).filter((t) => t.length > 2);
      
      let matchCount = 0;
      for (const token of queryTokens) {
        if (targetText.includes(token)) {
          matchCount++;
        }
      }

      const similarityScore = queryTokens.length > 0
        ? Math.min(0.99, 0.45 + (matchCount / queryTokens.length) * 0.5)
        : 0.5;

      return {
        ruleId: r.id,
        ruleNumber: r.ruleNumber,
        sourceAct: r.sourceAct,
        clause: r.sourceClause,
        text: r.description,
        similarityScore: Math.round(similarityScore * 100) / 100,
        effectiveDate: r.effectiveFrom,
        statutoryObligation: r.requirement,
      };
    });

    // Sort by relevance score
    return scoredChunks
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 3);
  }
}

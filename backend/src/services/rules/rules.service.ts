import { officialLegalMetrologyRules } from "../../db/seed.js";

export interface LegalRuleMetadata {
  id: string;
  ruleNumber: string;
  title: string;
  description: string;
  category: string;
  requirement: string;
  validationType: string;
  severity: string;
  effectiveFrom: string;
  sourceAct: string;
  sourceClause: string;
}

export class RulesService {
  /**
   * Retrieves all active statutory rules from the knowledge base.
   */
  static async getAllActiveRules(): Promise<LegalRuleMetadata[]> {
    return officialLegalMetrologyRules.map((r) => ({
      ...r,
      effectiveFrom: r.effectiveFrom || "2011-11-01",
      sourceAct: r.sourceAct || "Legal Metrology (Packaged Commodities) Rules, 2011",
      sourceClause: r.sourceClause || "",
    }));
  }

  /**
   * Retrieves rules applicable for a specific product category
   */
  static async getApplicableRules(category: string): Promise<LegalRuleMetadata[]> {
    const all = await this.getAllActiveRules();
    return all.filter((r) => r.category !== "DEPRECATED");
  }

  /**
   * Retrieves rule by statutory ID
   */
  static async getRuleById(ruleId: string): Promise<LegalRuleMetadata | null> {
    const all = await this.getAllActiveRules();
    return all.find((r) => r.id === ruleId) || null;
  }
}

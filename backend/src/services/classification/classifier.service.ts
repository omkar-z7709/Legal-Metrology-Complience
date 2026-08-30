import { StructuredDeclarations } from "../extraction/extraction.schema.js";

export interface ClassificationResult {
  category: "FOOD" | "COSMETIC" | "HOUSEHOLD" | "PHARMACEUTICAL" | "GENERAL_COMMODITY";
  commodityType: "LIQUID" | "SOLID" | "SEMI_SOLID" | "UNIT_COUNT";
  isImported: boolean;
  confidence: number;
  reason: string;
  applicableSpecificRules: string[];
}

export class ProductClassifier {
  /**
   * Classifies product category and commodity type deterministically based on
   * extracted declarations and domain keyword heuristics.
   */
  static classify(declarations: StructuredDeclarations, rawOcrText: string): ClassificationResult {
    const textLower = (rawOcrText + " " + (declarations.generic_name.value || "")).toLowerCase();
    const netQtyUnit = declarations.net_quantity.unit?.toLowerCase() || "";

    // 1. Check Origin
    const isImported =
      declarations.country_of_origin.value?.toLowerCase() !== "india" &&
      declarations.importer.value !== null;

    // 2. Food & Edible Products Heuristics
    const foodKeywords = [
      "oil", "mustard", "sunflower", "rice", "flour", "atta", "honey", "tea", "coffee",
      "spice", "turmeric", "masala", "salt", "sugar", "biscuit", "juice", "milk", "butter",
      "fssai", "nutritional", "ingredients", "vegetarian", "non-vegetarian"
    ];
    if (foodKeywords.some(kw => textLower.includes(kw))) {
      const isLiquid = ["l", "litre", "liter", "ml"].includes(netQtyUnit) || textLower.includes("oil") || textLower.includes("juice");
      return {
        category: "FOOD",
        commodityType: isLiquid ? "LIQUID" : "SOLID",
        isImported,
        confidence: 0.96,
        reason: "Matched food/edible commodity indicators (keywords/FSSAI regulatory context).",
        applicableSpecificRules: [
          "Rule 6(1)(c) - Dual unit declaration for edible oils",
          "Rule 11 - Net quantity standard packing",
          "FSSAI Labelling Regulations alignment",
        ],
      };
    }

    // 3. Cosmetics & Personal Care Heuristics
    const cosmeticKeywords = [
      "soap", "shampoo", "cream", "lotion", "serum", "perfume", "deodorant", "moisturizer",
      "hair", "skin", "cosmetic", "beauty", "dermatologically"
    ];
    if (cosmeticKeywords.some(kw => textLower.includes(kw))) {
      return {
        category: "COSMETIC",
        commodityType: ["ml", "l"].includes(netQtyUnit) ? "LIQUID" : "SOLID",
        isImported,
        confidence: 0.94,
        reason: "Matched personal care and cosmetic product characteristics.",
        applicableSpecificRules: [
          "Drugs and Cosmetics Act read with Legal Metrology Rule 6",
          "Rule 8 - PDP area font height specifications",
        ],
      };
    }

    // 4. Household Products Heuristics
    const householdKeywords = ["detergent", "cleaner", "dishwash", "floor", "disinfectant", "battery", "bulb"];
    if (householdKeywords.some(kw => textLower.includes(kw))) {
      return {
        category: "HOUSEHOLD",
        commodityType: ["ml", "l"].includes(netQtyUnit) ? "LIQUID" : "SOLID",
        isImported,
        confidence: 0.92,
        reason: "Matched household commodity indicators.",
        applicableSpecificRules: ["Legal Metrology General Rules 2011"],
      };
    }

    // 5. Default General Commodity
    const isLiquid = ["l", "litre", "liter", "ml"].includes(netQtyUnit);
    return {
      category: "GENERAL_COMMODITY",
      commodityType: isLiquid ? "LIQUID" : "SOLID",
      isImported,
      confidence: 0.88,
      reason: "Standard packaged commodity under General Provisions of Legal Metrology Rules, 2011.",
      applicableSpecificRules: ["Rule 6 (Mandatory Declarations)"],
    };
  }
}

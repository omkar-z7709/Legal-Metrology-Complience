import { createHash } from "crypto";

export interface StructureAwareRuleChunk {
  chunkId: string;
  sourceType: "regulatory_text" | "derived_validation_rule";
  authority: string;
  documentName: string;
  documentVersion: string;
  ruleId: string;
  ruleNumber: string;
  section: string;
  subsection?: string;
  schedule?: string;
  table?: string;
  topic: string;
  chunkType:
    | "RULE"
    | "SUB_RULE"
    | "DEFINITION"
    | "TABLE"
    | "SCHEDULE"
    | "EXEMPTION"
    | "EXCEPTION"
    | "PROVISO"
    | "PENALTY"
    | "PROCEDURE"
    | "APPLICABILITY"
    | "AMENDMENT"
    | "NOTE";
  requirementType: "MANDATORY" | "CONDITIONAL" | "PROHIBITION" | "EXEMPTION" | "TECHNICAL_SPEC";
  commodityScope: string;
  applicability: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  amendmentReference?: string;
  sourcePage?: number;
  parentRuleId?: string;
  content: string;
}

const BASE_AUTHORITY = "Ministry of Consumer Affairs, Food and Public Distribution (Department of Consumer Affairs)";
const BASE_DOC_NAME = "Legal Metrology (Packaged Commodities) Rules, 2011 & Gazette Amendments";
const BASE_DOC_VER = "2026.1-GAZETTE-UPDATED";

export const STRUCTURED_RULEBOOK_DATASET: StructureAwareRuleChunk[] = [
  // ── DEFINITIONS & PRELIMINARY ─────────────────────────────────────────────
  {
    chunkId: "CHUNK-DEF-RULE-2-F-MRP",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-2-F",
    ruleNumber: "Rule 2(f)",
    section: "Chapter I - Preliminary",
    subsection: "Clause (f)",
    topic: "Definition of Maximum Retail Price (MRP)",
    chunkType: "DEFINITION",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged commodities for retail sale",
    applicability: "Nationwide retail packaging",
    effectiveFrom: "2011-11-01",
    sourcePage: 3,
    parentRuleId: "RULE-2",
    content:
      "Rule 2(f) — Maximum Retail Price (MRP): 'retail sale price' or 'maximum retail price' in relation to a package means the maximum price at which the commodity in packaged form may be sold to the ultimate consumer of such package, inclusive of all taxes, local or otherwise, freight, transport charges, commission payable to dealers, and all charges towards advertising, delivery, packing, forwarding and any other incidental charges.",
  },
  {
    chunkId: "CHUNK-DEF-RULE-2-H-NET-QUANTITY",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-2-H",
    ruleNumber: "Rule 2(h)",
    section: "Chapter I - Preliminary",
    subsection: "Clause (h)",
    topic: "Definition of Net Quantity",
    chunkType: "DEFINITION",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged commodities",
    applicability: "Retail and wholesale packaging",
    effectiveFrom: "2011-11-01",
    sourcePage: 4,
    parentRuleId: "RULE-2",
    content:
      "Rule 2(h) — Net Quantity: 'net quantity' in relation to commodity contained in a package means the quantity by weight, measure or number of such commodity, contained in a package, excluding the weight of wrapper, container or any other packaging material.",
  },
  {
    chunkId: "CHUNK-DEF-RULE-2-R-UNIT-SALE-PRICE",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-2-R",
    ruleNumber: "Rule 2(r)",
    section: "Chapter I - Preliminary",
    subsection: "Clause (r)",
    topic: "Definition of Unit Sale Price (USP)",
    chunkType: "DEFINITION",
    requirementType: "MANDATORY",
    commodityScope: "Pre-packaged commodities exceeding 1 kg or 1 L or multi-count packages",
    applicability: "Retail packaging introduced via 2021/2022 Gazette Amendment",
    effectiveFrom: "2022-07-01",
    amendmentReference: "G.S.R. 779(E) dated 2nd November 2021",
    sourcePage: 5,
    parentRuleId: "RULE-2",
    content:
      "Rule 2(r) — Unit Sale Price: 'unit sale price' means the price per unit of measurement of a commodity, calculated as price per gram or per kilogram if weight is declared, per millilitre or per litre if volume is declared, or per piece/number if quantity is declared by number. Must be rounded off to nearest two decimal places.",
  },
  {
    chunkId: "CHUNK-DEF-RULE-2-BC-ECOMMERCE",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-2-BC",
    ruleNumber: "Rule 2(bc)",
    section: "Chapter I - Preliminary",
    subsection: "Clause (bc)",
    topic: "Definition of E-Commerce Entity",
    chunkType: "DEFINITION",
    requirementType: "MANDATORY",
    commodityScope: "Digital marketplace listings and online retail portals",
    applicability: "E-Commerce platforms selling pre-packaged commodities",
    effectiveFrom: "2018-01-01",
    amendmentReference: "Legal Metrology (Packaged Commodities) Amendment Rules, 2017",
    sourcePage: 4,
    parentRuleId: "RULE-2",
    content:
      "Rule 2(bc) — E-Commerce Entity: 'e-commerce entity' means a company incorporated under the Companies Act or a foreign company conducting e-commerce business through inventory-based model or marketplace model of e-commerce.",
  },

  // ── RULE 6 MANDATORY DECLARATIONS ─────────────────────────────────────────
  {
    chunkId: "CHUNK-RULE-6-1-A-MANUFACTURER",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-6-1-A",
    ruleNumber: "Rule 6(1)(a)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (1), Clause (a)",
    topic: "Manufacturer / Packer / Importer Identity & Address",
    chunkType: "SUB_RULE",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged retail commodities",
    applicability: "Retail packages",
    effectiveFrom: "2011-11-01",
    sourcePage: 8,
    parentRuleId: "RULE-6-1",
    content:
      "Rule 6(1)(a) — Manufacturer / Packer / Importer Name & Address: Every package shall bear the name and complete physical address of the manufacturer, or where the manufacturer is not the packer, the name and complete address of the manufacturer and packer, or in case of imported packages, the name and address of the importer. Proviso: P.O. Box address alone is invalid; complete street name, city, state and PIN code must be conspicuously stated.",
  },
  {
    chunkId: "CHUNK-RULE-6-1-B-GENERIC-NAME",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-6-1-B",
    ruleNumber: "Rule 6(1)(b)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (1), Clause (b)",
    topic: "Generic or Common Commodity Name Declaration",
    chunkType: "SUB_RULE",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged retail commodities",
    applicability: "Principal Display Panel (PDP)",
    effectiveFrom: "2011-11-01",
    sourcePage: 9,
    parentRuleId: "RULE-6-1",
    content:
      "Rule 6(1)(b) — Generic or Common Commodity Name: The common or generic names of the commodity contained in the package shall be clearly indicated on the Principal Display Panel. Fantasy or brand names alone are insufficient unless accompanied by the true statutory generic description.",
  },
  {
    chunkId: "CHUNK-RULE-6-1-C-NET-QUANTITY",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-6-1-C",
    ruleNumber: "Rule 6(1)(c)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (1), Clause (c)",
    topic: "Net Quantity Declaration & Standard SI Units",
    chunkType: "SUB_RULE",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged commodities",
    applicability: "Retail packages",
    effectiveFrom: "2011-11-01",
    sourcePage: 9,
    parentRuleId: "RULE-6-1",
    content:
      "Rule 6(1)(c) — Net Quantity Declaration: The net quantity, in terms of standard units of weight, measure or number, contained in the package shall be declared. Standard SI units must be used: grams (g) or kilograms (kg) for weight; millilitres (ml) or litres (l or L) for liquid volume; metres (m), centimetres (cm) or millimetres (mm) for length; and numbers (N or U) for count. Non-standard symbols (such as gms, kgs, ltr, grm) are strictly prohibited.",
  },
  {
    chunkId: "CHUNK-RULE-6-1-D-DATE",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-6-1-D",
    ruleNumber: "Rule 6(1)(d)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (1), Clause (d)",
    topic: "Month and Year of Manufacture / Pre-packing / Import",
    chunkType: "SUB_RULE",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged retail commodities",
    applicability: "Retail packages",
    effectiveFrom: "2011-11-01",
    sourcePage: 10,
    parentRuleId: "RULE-6-1",
    content:
      "Rule 6(1)(d) — Date of Manufacture / Packing: The month and year in which the commodity is manufactured or pre-packed or imported shall be declared on the package in the format MM/YYYY or Month YYYY (e.g. '08/2026' or 'August 2026'). For commodities with limited shelf-life, Best Before / Expiry date must also be clearly stated.",
  },
  {
    chunkId: "CHUNK-RULE-6-1-E-MRP",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-6-1-E",
    ruleNumber: "Rule 6(1)(e)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (1), Clause (e)",
    topic: "Maximum Retail Price (MRP) & Inclusive of All Taxes",
    chunkType: "SUB_RULE",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged retail commodities",
    applicability: "Retail packages",
    effectiveFrom: "2011-11-01",
    sourcePage: 11,
    parentRuleId: "RULE-6-1",
    content:
      "Rule 6(1)(e) — Maximum Retail Price (MRP): The retail sale price of the package shall be expressed as: 'Maximum Retail Price Rs. ... / ₹ ... (inclusive of all taxes)' or 'MRP Rs. / ₹ ... incl. of all taxes'. Pricing stickers overlaying original MRP or charging above declared MRP is an offence under Section 36 of the Legal Metrology Act.",
  },
  {
    chunkId: "CHUNK-RULE-6-1-E-USP-2022",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-6-1-E-USP",
    ruleNumber: "Rule 6(1)(e) sub-clause (xi)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (1), Clause (e), sub-clause (xi)",
    topic: "Unit Sale Price (USP) Mandatory Declaration",
    chunkType: "AMENDMENT",
    requirementType: "MANDATORY",
    commodityScope: "Packages containing net quantity > 1 kg or > 1 L or multi-count packages",
    applicability: "Mandatory on all retail packages from 1st July 2022",
    effectiveFrom: "2022-07-01",
    amendmentReference: "G.S.R. 779(E) dated 2nd November 2021",
    sourcePage: 12,
    parentRuleId: "RULE-6-1-E",
    content:
      "Rule 6(1)(e)(xi) — Unit Sale Price Declaration (2022 Gazette Amendment): On and from 1st July 2022, every package containing more than 1 kg / 1 L shall bear the Unit Sale Price declared as '₹ ... per g' or '₹ ... per kg' (for weight) or '₹ ... per ml' or '₹ ... per L' (for volume), rounded to 2 decimal places. Unit sale price must be displayed alongside MRP in clear font.",
  },
  {
    chunkId: "CHUNK-RULE-6-1-F-CONSUMER-CARE",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-6-1-F",
    ruleNumber: "Rule 6(1)(f)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (1), Clause (f)",
    topic: "Consumer Care & Grievance Contact Details",
    chunkType: "SUB_RULE",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged retail commodities",
    applicability: "Retail packages",
    effectiveFrom: "2011-11-01",
    sourcePage: 12,
    parentRuleId: "RULE-6-1",
    content:
      "Rule 6(1)(f) — Consumer Care Contact Details: Every package shall bear the name, complete postal address, telephone/helpline number, and email address of the person or officer who can be contacted in case of consumer complaints or grievances. Omission of any of these four elements constitutes non-compliance.",
  },
  {
    chunkId: "CHUNK-RULE-6-1-G-COUNTRY-ORIGIN",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-6-1-G",
    ruleNumber: "Rule 6(1)(g)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (1), Clause (g)",
    topic: "Country of Origin Declaration",
    chunkType: "AMENDMENT",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged commodities including imported products",
    applicability: "Mandatory declaration on retail packages",
    effectiveFrom: "2017-06-23",
    amendmentReference: "Legal Metrology (Packaged Commodities) Amendment Rules, 2017",
    sourcePage: 13,
    parentRuleId: "RULE-6-1",
    content:
      "Rule 6(1)(g) — Country of Origin: The name of the country of origin or manufacture shall be mentioned on every package (e.g., 'Country of Origin: India' or 'Made in India'). For imported commodities, country of origin must be stated alongside importer details.",
  },
  {
    chunkId: "CHUNK-RULE-6-10-ECOMMERCE",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-6-10",
    ruleNumber: "Rule 6(10)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (10)",
    topic: "E-Commerce Platform Mandatory Listing Declarations",
    chunkType: "AMENDMENT",
    requirementType: "MANDATORY",
    commodityScope: "Pre-packaged commodities offered for sale on e-commerce platforms",
    applicability: "Digital marketplaces and online seller listings",
    effectiveFrom: "2018-01-01",
    amendmentReference: "Legal Metrology (Packaged Commodities) Amendment Rules, 2017",
    sourcePage: 14,
    parentRuleId: "RULE-6",
    content:
      "Rule 6(10) — E-Commerce Mandatory Declarations: An e-commerce entity shall ensure that mandatory declarations required under Rule 6(1)—including manufacturer name/address, generic commodity name, net quantity, MRP (inclusive of all taxes), Unit Sale Price, country of origin, and consumer care details—are prominently displayed on the digital marketplace listing prior to purchase. Date of manufacture/expiry is exempt from digital listing unless applicable by food safety laws.",
  },

  // ── VISUAL & STRUCTURAL PACKAGING STANDARDS ───────────────────────────────
  {
    chunkId: "CHUNK-RULE-8-FONT-SIZE-TABLE",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-8",
    ruleNumber: "Rule 8",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    schedule: "Third Schedule",
    table: "Table 1 & Table 2",
    topic: "Minimum Height of Numerals and Letters",
    chunkType: "TABLE",
    requirementType: "TECHNICAL_SPEC",
    commodityScope: "All pre-packaged commodities",
    applicability: "Principal Display Panel (PDP) lettering",
    effectiveFrom: "2011-11-01",
    sourcePage: 18,
    parentRuleId: "RULE-8",
    content:
      "Rule 8 & Third Schedule — Height of Numerals and Letters: The height of any numeral or letter in mandatory declarations shall adhere to: (a) Net quantity declaration height (Table 1): Net Qty <= 50g/ml -> minimum 1.0mm (blown/moulded 2.0mm); > 50g/ml to 200g/ml -> minimum 2.0mm (blown/moulded 4.0mm); > 200g/ml to 1kg/1L -> minimum 4.0mm (blown/moulded 6.0mm); > 1kg/1L -> minimum 6.0mm (blown/moulded 8.0mm). (b) Ratio of height to width shall not exceed 3:1.",
  },
  {
    chunkId: "CHUNK-RULE-9-READABILITY-CONTRAST",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-9",
    ruleNumber: "Rule 9(1)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (1)",
    topic: "Manner of Declaration & Contrast Readability",
    chunkType: "SUB_RULE",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged retail commodities",
    applicability: "Packaging labels and PDP background",
    effectiveFrom: "2011-11-01",
    sourcePage: 19,
    parentRuleId: "RULE-9",
    content:
      "Rule 9(1) — Legibility and Visual Contrast: Every declaration required to be made on a package shall be legible, prominent, and conspicuous. Declarations must be printed in a color that sharply contrasts with the background of the label or package. Transparent packages must ensure background content does not obscure text.",
  },
  {
    chunkId: "CHUNK-RULE-10-DECEPTIVE-PACKAGING",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-10",
    ruleNumber: "Rule 10",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    topic: "Prohibition of Deceptive Packaging & Void Space",
    chunkType: "PROHIBITION",
    requirementType: "PROHIBITION",
    commodityScope: "All pre-packaged commodities",
    applicability: "Physical package design and container fill ratio",
    effectiveFrom: "2011-11-01",
    sourcePage: 20,
    parentRuleId: "RULE-10",
    content:
      "Rule 10 — Prohibition of Deceptive Packages: A package shall be so designed that its shape or size does not give a false or misleading impression as to the actual quantity of commodity contained therein. Internal void space or non-functional slack fill exceeding 30% of total container volume is prohibited unless required for product protection (e.g. potato chips nitrogen flush).",
  },

  // ── FIRST SCHEDULE: MAXIMUM PERMISSIBLE ERROR (MPE) ──────────────────────
  {
    chunkId: "CHUNK-SCHEDULE-1-TABLE-1-MPE-WEIGHT-VOLUME",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-18-SCHEDULE-1",
    ruleNumber: "Rule 18 & First Schedule",
    section: "Schedules",
    schedule: "First Schedule",
    table: "Table I",
    topic: "Maximum Permissible Error (MPE) for Weight and Volume",
    chunkType: "TABLE",
    requirementType: "TECHNICAL_SPEC",
    commodityScope: "Pre-packaged commodities specified by weight or volume",
    applicability: "Net quantity accuracy tolerance testing",
    effectiveFrom: "2011-11-01",
    sourcePage: 35,
    parentRuleId: "RULE-18",
    content:
      "First Schedule Table I — Maximum Permissible Error (MPE) in Net Quantity for Mass & Volume: (1) Declared quantity <= 50 g/ml -> MPE is 9.0% of declared quantity. (2) 50 g/ml to 100 g/ml -> MPE is 4.5 g/ml. (3) 100 g/ml to 200 g/ml -> MPE is 4.5%. (4) 200 g/ml to 300 g/ml -> MPE is 9.0 g/ml. (5) 300 g/ml to 500 g/ml -> MPE is 3.0%. (6) 500 g/ml to 1000 g/ml (1 kg/L) -> MPE is 15.0 g/ml. (7) > 1000 g/ml to 10000 g/ml (10 kg/L) -> MPE is 1.5%. (8) > 10000 g/ml to 15000 g/ml -> MPE is 150.0 g/ml. (9) > 15000 g/ml -> MPE is 1.0%. Minimum accuracy sample size must conform to Sixth Schedule.",
  },
  {
    chunkId: "CHUNK-SCHEDULE-1-TABLE-2-MPE-UNITS-COUNT",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-18-SCHEDULE-1-T2",
    ruleNumber: "Rule 18 & First Schedule",
    section: "Schedules",
    schedule: "First Schedule",
    table: "Table II",
    topic: "Maximum Permissible Error (MPE) for Length, Area and Count",
    chunkType: "TABLE",
    requirementType: "TECHNICAL_SPEC",
    commodityScope: "Pre-packaged commodities declared by length, area or number",
    applicability: "Net quantity tolerance testing",
    effectiveFrom: "2011-11-01",
    sourcePage: 36,
    parentRuleId: "RULE-18",
    content:
      "First Schedule Table II — MPE for Length, Area and Count: (a) Length: 2% of declared length for items <= 5m; 1.5% for > 5m. (b) Area: 3% of declared area. (c) Count: If declared count <= 50 -> 0 error permitted (exact count required); > 50 -> 1% of declared count rounded up to nearest integer.",
  },

  // ── EXEMPTIONS & SPECIAL PROVISIONS ───────────────────────────────────────
  {
    chunkId: "CHUNK-RULE-26-EXEMPTIONS",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-26",
    ruleNumber: "Rule 26",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    topic: "Statutory Exemptions for Small, Bulk, and Institutional Packages",
    chunkType: "EXEMPTION",
    requirementType: "EXEMPTION",
    commodityScope: "Small commodities <= 10g/ml, agricultural bulk > 50kg, institutional supplies",
    applicability: "Exemption from Rule 6 retail declarations",
    effectiveFrom: "2011-11-01",
    sourcePage: 28,
    parentRuleId: "RULE-26",
    content:
      "Rule 26 — Exemptions from Package Declarations: Nothing contained in Rule 6 shall apply to: (a) Packages containing quantity of 10 g or 10 ml or less, if sold by weight or volume. (b) Packages containing agricultural produce packed in bulk exceeding 50 kg. (c) Packages containing fast food items packed by restaurant or hotel. (d) Packages containing industrial or institutional supplies intended directly for use by institutions (e.g. railways, defense, hospitals) and not for retail resale.",
  },
  {
    chunkId: "CHUNK-RULE-31-ADVERTISEMENTS",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-31",
    ruleNumber: "Rule 31",
    section: "Chapter IV - Miscellaneous",
    topic: "Mandatory Pricing & Quantity Declarations in Advertisements",
    chunkType: "RULE",
    requirementType: "MANDATORY",
    commodityScope: "All print, TV, digital and billboard advertisements featuring pre-packaged products",
    applicability: "Commercial advertising media",
    effectiveFrom: "2011-11-01",
    sourcePage: 32,
    parentRuleId: "RULE-31",
    content:
      "Rule 31 — Advertisements of Pre-packaged Commodities: Wherever any retail price of a pre-packaged commodity is mentioned in any advertisement (print, broadcast, e-commerce or digital media), the net quantity and Unit Sale Price (USP) of the package shall also be declared along with the retail price in clear, legible font.",
  },

  // ── PENALTIES & ENFORCEMENT ───────────────────────────────────────────────
  {
    chunkId: "CHUNK-RULE-32-PENALTIES",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-32",
    ruleNumber: "Rule 32 & Act Sec 36",
    section: "Chapter IV - Miscellaneous & Penalties",
    topic: "Penalties for Violation of Packaging & Labeling Rules",
    chunkType: "PENALTY",
    requirementType: "MANDATORY",
    commodityScope: "Manufacturers, packers, importers, dealers, and e-commerce platforms",
    applicability: "Statutory enforcement under Legal Metrology Act, 2009 Section 36",
    effectiveFrom: "2011-11-01",
    sourcePage: 34,
    parentRuleId: "RULE-32",
    content:
      "Rule 32 & Section 36 of Legal Metrology Act, 2009 — Penalties for Non-compliance: (1) First Offence: Fine extending up to ₹25,000 per violation. (2) Second Offence: Fine extending up to ₹50,000. (3) Subsequent Offences: Fine up to ₹1,000,000 or imprisonment for a term up to 1 year, or both. Failure to declare mandatory information under Rule 6 or selling above MRP renders the package liable to seizure by Legal Metrology Inspectors.",
  },
  {
    chunkId: "CHUNK-RULE-33-SAMPLING-PROCEDURE",
    sourceType: "regulatory_text",
    authority: BASE_AUTHORITY,
    documentName: BASE_DOC_NAME,
    documentVersion: BASE_DOC_VER,
    ruleId: "RULE-33",
    ruleNumber: "Rule 33 & Sixth Schedule",
    section: "Chapter IV - Miscellaneous",
    schedule: "Sixth Schedule",
    topic: "Inspector Sampling Procedures & Verification Guidelines",
    chunkType: "PROCEDURE",
    requirementType: "MANDATORY",
    commodityScope: "Inspection lot size selection",
    applicability: "Enforcement officers during market inspections",
    effectiveFrom: "2011-11-01",
    sourcePage: 38,
    parentRuleId: "RULE-33",
    content:
      "Rule 33 & Sixth Schedule — Inspection Sampling Procedures: Inspection lot size determination: (a) Lot size 100 to 500 packages -> sample size 30 packages. (b) Lot size 501 to 3200 packages -> sample size 80 packages. (c) Lot size > 3200 -> sample size 125 packages. Out of sample, no individual package shortfall shall exceed twice the Maximum Permissible Error (2 x MPE). If more than 2 packages exceed MPE in sample, the entire lot is declared non-compliant.",
  }
];

export function computeChunkHash(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}

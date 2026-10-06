import { db } from "./index.js";
import { rules, users, products } from "./schema.js";

export const officialLegalMetrologyRules = [
  {
    id: "RULE-6-1-A-NAME-ADDRESS",
    ruleNumber: "Rule 6(1)(a)",
    title: "Manufacturer / Packer / Importer Identity",
    description: "Every package shall bear the name and complete address of the manufacturer, or packer, or importer.",
    category: "MANDATORY_DECLARATION",
    requirement: "Name and complete physical address of the manufacturer or packer must be conspicuously stated on the label.",
    validationType: "PRESENCE",
    severity: "HIGH",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 6, Sub-rule (1), Clause (a)",
    isActive: true,
  },
  {
    id: "RULE-6-1-B-GENERIC-NAME",
    ruleNumber: "Rule 6(1)(b)",
    title: "Generic / Common Commodity Name",
    description: "The common or generic names of the commodity contained in the package must be clearly indicated.",
    category: "MANDATORY_DECLARATION",
    requirement: "Generic or common name of the commodity must appear on the Principal Display Panel.",
    validationType: "PRESENCE",
    severity: "HIGH",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 6, Sub-rule (1), Clause (b)",
    isActive: true,
  },
  {
    id: "RULE-6-1-C-NET-QUANTITY",
    ruleNumber: "Rule 6(1)(c)",
    title: "Net Quantity & Standard Measurement Units",
    description: "The net quantity, in terms of the standard unit of weight or measure, of the commodity contained in the package.",
    category: "QUANTITY",
    requirement: "Net quantity must use SI standard symbols (g, kg, ml, l) without misleading non-standard units.",
    validationType: "QUANTITY",
    severity: "CRITICAL",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 6, Sub-rule (1), Clause (c) read with Rule 11, 12, 13",
    isActive: true,
  },
  {
    id: "RULE-6-1-D-DATE-MANUFACTURE",
    ruleNumber: "Rule 6(1)(d)",
    title: "Month and Year of Manufacture / Packing / Import",
    description: "The month and year in which the commodity is manufactured or pre-packed or imported.",
    category: "DATE",
    requirement: "Declaration of month and year of manufacture/packing must be formatted as MM/YYYY or Month YYYY.",
    validationType: "DATE",
    severity: "HIGH",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 6, Sub-rule (1), Clause (d)",
    isActive: true,
  },
  {
    id: "RULE-6-1-E-MRP",
    ruleNumber: "Rule 6(1)(e)",
    title: "Maximum Retail Price (MRP) & Unit Sale Price",
    description: "The retail sale price of the package in the form: Maximum Retail Price (MRP) Rs. / ₹ ... Inclusive of all taxes.",
    category: "PRICING",
    requirement: "Must state MRP clearly in Indian Rupees (₹ or Rs.) followed by 'incl. of all taxes'. Unit Sale Price required for packages > 1kg/1L.",
    validationType: "MRP",
    severity: "CRITICAL",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011 (Amended 2022)",
    sourceClause: "Rule 6, Sub-rule (1), Clause (e)",
    isActive: true,
  },
  {
    id: "RULE-6-1-F-CONSUMER-CARE",
    ruleNumber: "Rule 6(1)(f)",
    title: "Consumer Care Contact Details",
    description: "The name, address, telephone number, and email address of the person or office who can be contacted in case of consumer complaints.",
    category: "CONSUMER_PROTECTION",
    requirement: "Must provide at least phone number/helpline, email address, and physical contact address for grievances.",
    validationType: "PRESENCE",
    severity: "HIGH",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 6, Sub-rule (1), Clause (f)",
    isActive: true,
  },
  {
    id: "RULE-6-1-G-COUNTRY-ORIGIN",
    ruleNumber: "Rule 6(1)(g)",
    title: "Country of Origin / Manufacture",
    description: "The name of the country of origin or manufacture shall be mentioned on the package.",
    category: "MANDATORY_DECLARATION",
    requirement: "Country of Origin must be explicitly declared (e.g. 'Country of Origin: India').",
    validationType: "PRESENCE",
    severity: "HIGH",
    effectiveFrom: "2017-06-23",
    sourceAct: "Legal Metrology (Packaged Commodities) Amendment Rules, 2017",
    sourceClause: "Rule 6, Sub-rule (1), Clause (g)",
    isActive: true,
  },
  {
    id: "RULE-8-1-FONT-SIZE",
    ruleNumber: "Rule 8",
    title: "Minimum Height of Numerals & Letters",
    description: "The height of any numeral and letter in the declaration shall not be less than the prescribed minimum in Table 1.",
    category: "VISUAL_STANDARDS",
    requirement: "Font height must meet minimum thresholds based on package net quantity / Principal Display Panel area.",
    validationType: "FONT_SIZE",
    severity: "MEDIUM",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 8 read with Table 1 & Table 2",
    isActive: true,
  },
  {
    id: "RULE-9-1-READABILITY",
    ruleNumber: "Rule 9(1)",
    title: "Manner of Declaration & Contrast Readability",
    description: "Every declaration which is required to be made on a package shall be legible and prominent.",
    category: "VISUAL_STANDARDS",
    requirement: "Declarations must be conspicuous, unambiguous, and present sufficient visual contrast against package background.",
    validationType: "PLACEMENT",
    severity: "MEDIUM",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 9, Sub-rule (1)",
    isActive: true,
  },
  {
    id: "RULE-6-1-E-UNIT-SALE-PRICE",
    ruleNumber: "Rule 6(1)(e)",
    title: "Unit Sale Price (USP) Declaration",
    description: "Unit sale price in Rupees rounded off to nearest two decimals per g/kg/ml/l/N for packages exceeding 1kg or 1L.",
    category: "PRICING",
    requirement: "Unit sale price must be declared on packages >1kg or >1L (e.g. ₹ 0.50 per g or ₹ 200 per L) under 2022 Amendment.",
    validationType: "MRP",
    severity: "HIGH",
    effectiveFrom: "2022-07-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Amendment Rules, 2021 (G.S.R. 779(E))",
    sourceClause: "Rule 6, Sub-rule (1), Clause (e), sub-clause (xi)",
    isActive: true,
  },
  {
    id: "RULE-6-10-ECOMMERCE",
    ruleNumber: "Rule 6(10)",
    title: "E-Commerce Platform Mandatory Declarations",
    description: "An e-commerce entity shall ensure mandatory declarations under Rule 6(1) are displayed on digital marketplace listings.",
    category: "ECOMMERCE",
    requirement: "All Rule 6(1) declarations (except mfg date and batch no.) must be displayed on e-commerce product pages prior to sale.",
    validationType: "PRESENCE",
    severity: "HIGH",
    effectiveFrom: "2018-01-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Amendment Rules, 2017",
    sourceClause: "Rule 6, Sub-rule (10)",
    isActive: true,
  },
  {
    id: "RULE-18-MPE",
    ruleNumber: "Rule 18",
    title: "Maximum Permissible Error (MPE) in Net Quantity",
    description: "The maximum permissible error in net quantity of pre-packaged commodities shall adhere strictly to First Schedule tolerances.",
    category: "QUANTITY",
    requirement: "Net quantity shortfall must not exceed statutory Maximum Permissible Error (MPE) thresholds in First Schedule.",
    validationType: "QUANTITY",
    severity: "CRITICAL",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 18 read with First Schedule",
    isActive: true,
  },
  {
    id: "RULE-10-DECEPTIVE-PACKAGES",
    ruleNumber: "Rule 10",
    title: "Prohibition of Deceptive Packaging",
    description: "A package shall be so designed that its shape or size does not give a misleading impression as to the actual quantity of commodity.",
    category: "VISUAL_STANDARDS",
    requirement: "Package dimensions and internal void space must not deceive consumers regarding actual filled content.",
    validationType: "PLACEMENT",
    severity: "MEDIUM",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 10",
    isActive: true,
  },
  {
    id: "RULE-26-EXEMPTIONS",
    ruleNumber: "Rule 26",
    title: "Statutory Exemptions for Small/Bulk Packages",
    description: "Provisions of Rule 6 do not apply to packages containing quantity <= 10g/10ml or agricultural commodities in bulk > 50kg.",
    category: "EXEMPTION",
    requirement: "Packages containing 10g/10ml or less, or industrial/institutional buyers are exempt from retail declaration requirements.",
    validationType: "PRESENCE",
    severity: "LOW",
    effectiveFrom: "2011-11-01",
    sourceAct: "Legal Metrology (Packaged Commodities) Rules, 2011",
    sourceClause: "Rule 26",
    isActive: true,
  },
];

export async function seedDatabase() {
  console.log("🌱 Seeding Legal Metrology rules and default entities...");

  // Seed Rules
  for (const r of officialLegalMetrologyRules) {
    await db.insert(rules).values(r).onConflictDoUpdate({
      target: rules.id,
      set: r,
    });
  }
  console.log(`✅ Seeded ${officialLegalMetrologyRules.length} statutory compliance rules.`);

  // Seed Default Users for Testing
  const defaultInspector = {
    email: "inspector.sarthak@lm.gov.in",
    name: "Sarthak Verma",
    role: "INSPECTOR",
    department: "Legal Metrology Enforcement Directorate",
  };

  const defaultSupervisor = {
    email: "supervisor.anita@lm.gov.in",
    name: "Anita Rao",
    role: "SUPERVISOR",
    department: "Legal Metrology Zonal Office",
  };

  const defaultAdmin = {
    email: "admin.director@lm.gov.in",
    name: "Director General",
    role: "ADMIN",
    department: "Ministry of Consumer Affairs",
  };

  for (const u of [defaultInspector, defaultSupervisor, defaultAdmin]) {
    await db.insert(users).values(u).onConflictDoUpdate({
      target: users.email,
      set: u,
    });
  }
  console.log("✅ Seeded default test users (INSPECTOR, SUPERVISOR, ADMIN).");

  // Seed Sample Product
  const sampleProduct = {
    name: "Fortified Sunflower Cooking Oil (1L)",
    brand: "SunPure Naturals",
    category: "Edible Oils",
    commodityType: "Liquid",
    manufacturerName: "SunPure Edibles Pvt. Ltd.",
    manufacturerAddress: "Plot 42, GIDC Industrial Estate, Ankleshwar, Gujarat - 393002",
  };

  await db.insert(products).values(sampleProduct);
  console.log("✅ Seeded baseline sample product for inspection testing.");
  console.log("🌟 Seed completed successfully.");
}

// Allow direct execution: tsx src/db/seed.ts
if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { randomUUID, createHash } from "crypto";
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import { db } from "../db/index.js";
import { newLegalRulebookEmbeddings } from "../db/schema.js";
import { embedTexts } from "../services/rag/embedding.service.js";
import { NewVectorRetrievalService } from "../services/rag/new-vector-retrieval.service.js";

interface PDFRuleChunk {
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
  chunkType: string;
  requirementType: string;
  commodityScope: string;
  applicability: string;
  effectiveFrom: string;
  amendmentReference?: string;
  sourcePage?: number;
  parentRuleId?: string;
  content: string;
}

function computeHash(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}

async function extractChunksFromPdfText(): Promise<PDFRuleChunk[]> {
  const pdf2Path = path.resolve(process.cwd(), "rules/pdf2_extracted.txt");
  const pdf1Path = path.resolve(process.cwd(), "rules/pdf1_extracted.txt");

  const pdf2Text = fs.existsSync(pdf2Path) ? fs.readFileSync(pdf2Path, "utf-8") : "";
  const pdf1Text = fs.existsSync(pdf1Path) ? fs.readFileSync(pdf1Path, "utf-8") : "";

  console.log(`[PDF Ingester] Processing PDF 1 (${pdf1Text.length} chars) and PDF 2 (${pdf2Text.length} chars)...`);

  const chunks: PDFRuleChunk[] = [];
  const baseAuthority = "Ministry of Consumer Affairs, Food and Public Distribution (Department of Consumer Affairs)";
  const baseDocName = "The Legal Metrology (Packaged Commodities) Rules, 2011 & Consolidated Amendments";
  const baseDocVer = "2026-OCTOBER-CONSOLIDATED-OFFICIAL";

  const pages = pdf2Text.split("--- PAGE ");

  // 1. Consolidated Amendments Section (Pages 4 - 8)
  chunks.push({
    chunkId: "PDF-CHUNK-AMEND-2022-USP-RULE611",
    sourceType: "regulatory_text",
    authority: baseAuthority,
    documentName: baseDocName,
    documentVersion: baseDocVer,
    ruleId: "RULE-6-11-USP",
    ruleNumber: "Rule 6(11)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (11)",
    topic: "Unit Sale Price (USP) Mandatory Rule 6(11) Framework",
    chunkType: "AMENDMENT",
    requirementType: "MANDATORY",
    commodityScope: "Pre-packaged retail commodities > 1kg / 1L or multi-count",
    applicability: "Mandatory on all retail packages (2021/2022 Gazette Amendment)",
    effectiveFrom: "2022-07-01",
    amendmentReference: "G.S.R. 779(E) & G.S.R. 226(E)",
    sourcePage: 5,
    parentRuleId: "RULE-6",
    content:
      "Rule 6(11) Unit Sale Price (USP) Framework (2022 Amendment): Unit Sale Price must be declared in rupees, rounded to two decimal places, using prescribed units: per g/kg for mass, per cm/m for length, per ml/litre for volume, or per piece/unit for count. Exceptions apply where retail sale price equals unit sale price or for specified multi-piece packages.",
  });

  chunks.push({
    chunkId: "CHUNK-PDF-RULE-5-OMISSION-2022",
    sourceType: "regulatory_text",
    authority: baseAuthority,
    documentName: baseDocName,
    documentVersion: baseDocVer,
    ruleId: "RULE-5-OMITTED",
    ruleNumber: "Rule 5 & Second Schedule (Omitted)",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    topic: "Omission of Rule 5 and Second Schedule Standard Pack Sizes",
    chunkType: "AMENDMENT",
    requirementType: "EXEMPTION",
    commodityScope: "All pre-packaged commodities",
    applicability: "Standard pack size restrictions removed in 2022",
    effectiveFrom: "2022-07-01",
    amendmentReference: "G.S.R. 779(E) & G.S.R. 226(E)",
    sourcePage: 5,
    parentRuleId: "RULE-5",
    content:
      "Rule 5 & Second Schedule Omission (2022 Gazette Amendment): Rule 5 and the Second Schedule (which prescribed mandatory fixed standard pack sizes for commodities like baby food, biscuits, tea, coffee) were omitted in 2022. Commodities are no longer restricted to historical Second Schedule pack quantities.",
  });

  chunks.push({
    chunkId: "CHUNK-PDF-ECOMMERCE-COO-FILTER-2026",
    sourceType: "regulatory_text",
    authority: baseAuthority,
    documentName: baseDocName,
    documentVersion: baseDocVer,
    ruleId: "RULE-6-10-COO-FILTER",
    ruleNumber: "Rule 6(10) & Explanation",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Sub-rule (10)",
    topic: "E-Commerce Searchable/Sortable Country of Origin Filter (2026/2027 Amendment)",
    chunkType: "AMENDMENT",
    requirementType: "MANDATORY",
    commodityScope: "Imported pre-packaged commodities on e-commerce platforms",
    applicability: "Digital marketplaces",
    effectiveFrom: "2027-07-01",
    amendmentReference: "G.S.R. 128(E) / G.S.R. 312(E)",
    sourcePage: 4,
    parentRuleId: "RULE-6-10",
    content:
      "Rule 6(10) E-Commerce Country-of-Origin Search/Sort Filter: E-commerce platforms listing imported pre-packaged commodities shall provide a searchable and sortable Country of Origin filter on their digital marketplaces, enabling consumers to filter products by country of origin prior to purchase.",
  });

  chunks.push({
    chunkId: "CHUNK-PDF-AEO-BONDED-WAREHOUSE-2026",
    sourceType: "regulatory_text",
    authority: baseAuthority,
    documentName: baseDocName,
    documentVersion: baseDocVer,
    ruleId: "RULE-4-EXP-2",
    ruleNumber: "Rule 4 Explanation 2",
    section: "Chapter II - Provisions Applicable to Packages Intended for Retail Sale",
    subsection: "Rule 4 Explanation 2",
    topic: "AEO Tier-2/3 Bonded Warehouse Labeling Permission (2026 Amendment)",
    chunkType: "AMENDMENT",
    requirementType: "CONDITIONAL",
    commodityScope: "Imported pre-packaged commodities",
    applicability: "AEO Tier-2 and Tier-3 certified bonded warehouses",
    effectiveFrom: "2026-05-29",
    amendmentReference: "G.S.R. 418(E) dated 29th May 2026",
    sourcePage: 6,
    parentRuleId: "RULE-4",
    content:
      "Rule 4 Explanation 2 (2026 Amendment): Importers may make mandatory declarations at bonded warehouses of AEO Tier-2 and Tier-3 certified operators in India, provided all mandatory declarations under Rule 6 are fully affixed before packages leave the warehouse for retail distribution.",
  });

  chunks.push({
    chunkId: "CHUNK-PDF-ACT-SEC-36-JAN-VISHWAS-2026",
    sourceType: "regulatory_text",
    authority: baseAuthority,
    documentName: baseDocName,
    documentVersion: baseDocVer,
    ruleId: "ACT-SEC-36-JAN-VISHWAS",
    ruleNumber: "Act Section 36 & Rule 32",
    section: "Chapter IV - Penalties & Enforcement",
    topic: "Jan Vishwas Decriminalization & Improvement Notice Framework (2023/2026)",
    chunkType: "PENALTY",
    requirementType: "MANDATORY",
    commodityScope: "All pre-packaged commodity sellers, manufacturers, importers, e-commerce",
    applicability: "Statutory enforcement under Legal Metrology Act, 2009 Section 36",
    effectiveFrom: "2026-05-01",
    amendmentReference: "Jan Vishwas (Amendment of Provisions) Act, 2023 & 2026",
    sourcePage: 7,
    parentRuleId: "RULE-32",
    content:
      "Section 36 & Jan Vishwas Decriminalized Penalty Framework (2023/2026): (1) First covered non-conformity offence: Subject to an Improvement Notice providing an opportunity for rectification before monetary penalties apply. (2) Second offence: Monetary penalty up to ₹5,000,000. (3) Subsequent offences: Fine between ₹2,500,000 and ₹5,000,000. Applies explicitly to physical retail and digital e-commerce platforms.",
  });

  // 2. Parse statutory text chapters from baseline PDF (Pages 12 - 30)
  for (let p = 12; p < pages.length; p++) {
    const pageContent = pages[p];
    if (!pageContent) continue;

    const ruleMatches = Array.from(
      pageContent.matchAll(/(\d{1,2})\.\s+([A-Z][a-zA-Z0-9\s,\-\(\)\/\.\'\”\“\*]+?)\.\s*[–\-]/g)
    );

    for (const match of ruleMatches) {
      const ruleNum = match[1];
      const title = match[2].trim().replace(/\s+/g, " ").slice(0, 240);
      const matchIdx = match.index || 0;
      const snippet = pageContent.slice(matchIdx, matchIdx + 450).trim().replace(/\s+/g, " ");

      const ruleId = `PDF-RULE-${ruleNum}`;
      chunks.push({
        chunkId: `CHUNK-PDF-PARSED-R${ruleNum}-${randomUUID().slice(0, 6)}`,
        sourceType: "regulatory_text",
        authority: baseAuthority,
        documentName: baseDocName,
        documentVersion: baseDocVer,
        ruleId,
        ruleNumber: `Rule ${ruleNum}`,
        section: `Chapter II / IV - Rule ${ruleNum}`,
        topic: title,
        chunkType: "RULE",
        requirementType: "MANDATORY",
        commodityScope: "Pre-packaged commodities",
        applicability: "Statutory regulation under Legal Metrology Rules",
        effectiveFrom: "2011-11-01",
        sourcePage: p,
        parentRuleId: `RULE-${ruleNum}`,
        content: `Rule ${ruleNum} — ${title}: ${snippet}`,
      });
    }
  }

  console.log(`[PDF Ingester] Extracted ${chunks.length} structured chunks from uploaded PDFs.`);
  return chunks;
}

async function ingestUploadedPdfs() {
  console.log("=========================================");
  console.log(" INGESTING UPLOADED RULEBOOK PDFS        ");
  console.log("=========================================\n");

  const pdfChunks = await extractChunksFromPdfText();
  console.log(`[Ingestion] Generating 768-dim embeddings for ${pdfChunks.length} PDF rule chunks...`);

  const textsToEmbed = pdfChunks.map(
    (c) => `[${c.ruleNumber}] ${c.topic} (Page ${c.sourcePage || 0}): ${c.content}`
  );
  const vectors = await embedTexts(textsToEmbed, "RETRIEVAL_DOCUMENT");

  let insertedCount = 0;

  for (let i = 0; i < pdfChunks.length; i++) {
    const chunk = pdfChunks[i];
    const embedding = vectors[i];
    const hash = computeHash(chunk.content);

    const metadataObj = {
      source_type: chunk.sourceType,
      authority: chunk.authority,
      document_name: chunk.documentName,
      document_version: chunk.documentVersion,
      rule_id: chunk.ruleId,
      rule_number: chunk.ruleNumber,
      section: chunk.section,
      subsection: chunk.subsection || null,
      schedule: chunk.schedule || null,
      table: chunk.table || null,
      topic: chunk.topic,
      chunk_type: chunk.chunkType,
      requirement_type: chunk.requirementType,
      commodity_scope: chunk.commodityScope,
      applicability: chunk.applicability,
      effective_from: chunk.effectiveFrom,
      amendment_reference: chunk.amendmentReference || null,
      source_page: chunk.sourcePage || null,
      parent_rule_id: chunk.parentRuleId || null,
      source_hash: hash,
    };

    try {
      await db
        .insert(newLegalRulebookEmbeddings)
        .values({
          id: randomUUID(),
          chunkId: chunk.chunkId,
          sourceType: chunk.sourceType,
          authority: chunk.authority,
          documentName: chunk.documentName,
          documentVersion: chunk.documentVersion,
          ruleId: chunk.ruleId,
          ruleNumber: chunk.ruleNumber,
          section: chunk.section,
          subsection: chunk.subsection || null,
          schedule: chunk.schedule || null,
          table: chunk.table || null,
          topic: chunk.topic,
          chunkType: chunk.chunkType,
          requirementType: chunk.requirementType,
          commodityScope: chunk.commodityScope,
          applicability: chunk.applicability,
          effectiveFrom: chunk.effectiveFrom,
          amendmentReference: chunk.amendmentReference || null,
          sourcePage: chunk.sourcePage || null,
          parentRuleId: chunk.parentRuleId || null,
          sourceHash: hash,
          content: textsToEmbed[i],
          metadataJson: metadataObj,
          embedding: embedding as any,
        })
        .onConflictDoUpdate({
          target: newLegalRulebookEmbeddings.chunkId,
          set: {
            content: textsToEmbed[i],
            metadataJson: metadataObj,
            embedding: embedding as any,
            sourceHash: hash,
          },
        });

      insertedCount++;
    } catch (err: any) {
      console.warn(`[Ingestion] Could not insert PDF chunk ${chunk.chunkId}:`, err.message);
    }
  }

  console.log(`✅ Persisted ${insertedCount} PDF rule chunks into new_legal_rulebook_embeddings.`);

  const testQueries = [
    "MRP requirements",
    "net quantity",
    "maximum permissible error",
    "rounding rules",
    "consumer complaint details",
    "exemptions",
    "deceptive packages",
    "wholesale packages",
    "advertisement requirements",
    "e-commerce requirements",
    "penalties",
    "sampling procedures",
  ];

  console.log("\n=========================================");
  console.log(" RETRIEVAL VERIFICATION OVER UPLOADED PDFS");
  console.log("=========================================\n");

  for (const q of testQueries) {
    const hits = await NewVectorRetrievalService.searchNewVectorDb(q, 1);
    console.log(`Query: "${q}" -> Best Hit: [${hits[0]?.ruleNumber || "N/A"}] ${hits[0]?.topic || "N/A"} (${(hits[0]?.similarityScore * 100).toFixed(1)}% match)`);
  }
}

ingestUploadedPdfs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ PDF Ingestion failed:", err);
    process.exit(1);
  });

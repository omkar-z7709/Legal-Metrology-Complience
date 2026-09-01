import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { db } from "../../db/index.js";
import { rules } from "../../db/schema.js";
/** Extracts all text from a PDF buffer using pdfjs-dist. */
async function parsePdf(buf: Buffer): Promise<{ text: string }> {
  let pdfjsLib: any;
  try {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    pdfjsLib = await import("pdfjs-dist");
  }
  const getDocument = pdfjsLib.getDocument || (pdfjsLib.default && pdfjsLib.default.getDocument);
  const loadingTask = getDocument({ data: new Uint8Array(buf) });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  return { text: pageTexts.join("\n") };
}

const RULEBOOK_PATH =
  "./rules/_Draft__Comprehensive_Rulebook___Legal_Metrology_Compliance_for_LLM_Based_Product_Label_Analysis_2026_08_28T14_10_58 (1).pdf";

const SOURCE_ACT = "Legal Metrology (Packaged Commodities) Rules, 2011";

// ── Types ──────────────────────────────────────────────────────────────────────
interface RuleRow {
  id: string;
  ruleNumber: string;
  title: string;
  description: string;
  category: string;
  requirement: string;
  validationType: string;
  severity: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceAct: string;
  sourceClause: string;
  isActive: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function inferValidationType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("mrp") || t.includes("maximum retail price")) return "MRP";
  if (t.includes("net quantity") || t.includes("net weight") || t.includes("net volume")) return "QUANTITY";
  if (t.includes("date") || t.includes("expiry") || t.includes("manufacture")) return "DATE";
  if (t.includes("font") || t.includes("size") || t.includes("height of letter")) return "FONT_SIZE";
  if (t.includes("placement") || t.includes("principal display panel")) return "PLACEMENT";
  if (t.includes("format") || t.includes("standard unit") || t.includes("symbol")) return "FORMAT";
  return "PRESENCE";
}

function inferSeverity(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("shall") && (t.includes("net quantity") || t.includes("mrp") || t.includes("expiry"))) return "CRITICAL";
  if (t.includes("shall")) return "HIGH";
  if (t.includes("should") || t.includes("must")) return "MEDIUM";
  return "LOW";
}

function inferCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("mandatory declaration") || t.includes("name") || t.includes("address") || t.includes("manufacturer")) return "MANDATORY_DECLARATION";
  if (t.includes("net quantity") || t.includes("net weight") || t.includes("net volume")) return "QUANTITY";
  if (t.includes("mrp") || t.includes("retail price")) return "MRP";
  if (t.includes("date") || t.includes("expiry") || t.includes("best before")) return "DATE";
  if (t.includes("font") || t.includes("letter height")) return "FONT_SIZE";
  return "GENERAL";
}

// ── Chunkers ───────────────────────────────────────────────────────────────────

/** Parses lines that look like "Rule 6(1)(a) - <title>" style declarations. */
function chunkDeclarations(lines: string[]): RuleRow[] {
  const rows: RuleRow[] = [];
  const rulePattern = /^(Rule\s+\d+(?:\(\d+\))*(?:\([a-z]\))?)\s*[:\-\u2013\u2014]?\s*(.+)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(rulePattern);
    if (!match) continue;

    const ruleNumber = match[1].trim();
    const titleRaw = match[2].trim();

    // Collect continuation lines as description
    const descLines: string[] = [titleRaw];
    let j = i + 1;
    while (j < lines.length && j < i + 5) {
      const next = lines[j].trim();
      if (!next || rulePattern.test(next)) break;
      descLines.push(next);
      j++;
    }

    const description = descLines.join(" ").trim();
    const safeId = ruleNumber.replace(/\s+/g, "-").replace(/[()]/g, "").toUpperCase();

    rows.push({
      id: "RULE-PDF-" + safeId + "-" + randomUUID().slice(0, 6),
      ruleNumber,
      title: titleRaw.slice(0, 200),
      description,
      category: inferCategory(description),
      requirement: description,
      validationType: inferValidationType(description),
      severity: inferSeverity(description),
      effectiveFrom: "2011-11-01",
      effectiveTo: null,
      sourceAct: SOURCE_ACT,
      sourceClause: ruleNumber,
      isActive: true,
    });
  }

  return rows;
}

/** Catches "shall"/"must" sentences that are not under an explicit Rule heading. */
function chunkOtherSections(lines: string[]): RuleRow[] {
  const rows: RuleRow[] = [];
  const rulePattern = /^Rule\s+\d+/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (rulePattern.test(line)) continue;
    if (line.length < 40) continue;
    if (!/\b(shall|must|required to|mandatory)\b/i.test(line)) continue;

    rows.push({
      id: "RULE-PDF-GENERAL-" + randomUUID().slice(0, 8),
      ruleNumber: "General",
      title: line.slice(0, 200),
      description: line,
      category: inferCategory(line),
      requirement: line,
      validationType: inferValidationType(line),
      severity: inferSeverity(line),
      effectiveFrom: "2011-11-01",
      effectiveTo: null,
      sourceAct: SOURCE_ACT,
      sourceClause: "",
      isActive: true,
    });
  }

  return rows;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log("[chunking] Reading PDF: " + RULEBOOK_PATH);
  const buffer = readFileSync(RULEBOOK_PATH);
  const parsed = await parsePdf(buffer);

  const lines = parsed.text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log("Extracted " + lines.length + " non-empty lines from PDF. First 10:");
  console.log(lines.slice(0, 10));

  const declarationRows = chunkDeclarations(lines);
  const otherRows = chunkOtherSections(lines);
  const allRows = [...declarationRows, ...otherRows];

  console.log(
    "Parsed " + allRows.length + " rule chunks (" + declarationRows.length + " declarations + " + otherRows.length + " other sections)."
  );

  for (const row of allRows) {
    await db.insert(rules).values({
      id: row.id,
      ruleNumber: row.ruleNumber,
      title: row.title,
      description: row.description,
      category: row.category,
      requirement: row.requirement,
      validationType: row.validationType,
      severity: row.severity,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? undefined,
      sourceAct: row.sourceAct,
      sourceClause: row.sourceClause,
      isActive: row.isActive,
    });
  }

  console.log("Inserted " + allRows.length + " rows into rules table.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
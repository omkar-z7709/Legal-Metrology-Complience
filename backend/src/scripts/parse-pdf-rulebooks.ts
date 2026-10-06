import fs from "fs";
import path from "path";

async function parsePdf(filePath: string): Promise<{ text: string; pages: number }> {
  let pdfjsLib: any;
  try {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    pdfjsLib = await import("pdfjs-dist");
  }
  const getDocument = pdfjsLib.getDocument || (pdfjsLib.default && pdfjsLib.default.getDocument);
  const buf = fs.readFileSync(filePath);
  const loadingTask = getDocument({ data: new Uint8Array(buf) });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(`--- PAGE ${i} ---\n` + pageText);
  }

  return { text: pageTexts.join("\n\n"), pages: pdf.numPages };
}

async function main() {
  const file1 = path.resolve(process.cwd(), "rules/The_Legal_Metrology_Packaged_Commodities_Rules_2011.PDF");
  const file2 = path.resolve(process.cwd(), "rules/legal_metrology_consolidated_update_2026 (1).pdf");

  console.log("Parsing PDF 1:", file1);
  if (fs.existsSync(file1)) {
    const res1 = await parsePdf(file1);
    console.log(`PDF 1 Pages: ${res1.pages}, Total Length: ${res1.text.length} chars`);
    fs.writeFileSync("rules/pdf1_extracted.txt", res1.text, "utf-8");
  } else {
    console.log("PDF 1 not found!");
  }

  console.log("Parsing PDF 2:", file2);
  if (fs.existsSync(file2)) {
    const res2 = await parsePdf(file2);
    console.log(`PDF 2 Pages: ${res2.pages}, Total Length: ${res2.text.length} chars`);
    fs.writeFileSync("rules/pdf2_extracted.txt", res2.text, "utf-8");
  } else {
    console.log("PDF 2 not found!");
  }

  console.log("PDF Extraction Complete!");
}

main().catch(console.error);

import fs from "fs";

function scanLines(filename: string) {
  const content = fs.readFileSync(filename, "utf-8");
  const lines = content.split("\n");
  console.log(`=== SCANNING ${filename} (${lines.length} lines) ===`);

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d{1,2})\.\s+([A-Z][a-zA-Z0-9\s,\-\(\)\/\.\'\”\“\*]+)/);
    if (match) {
      console.log(`Line ${i + 1} [Rule ${match[1]}]: ${match[2].slice(0, 80)}`);
    }
  });
}

scanLines("rules/pdf1_extracted.txt");
scanLines("rules/pdf2_extracted.txt");

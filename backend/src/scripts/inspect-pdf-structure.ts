import fs from "fs";

function inspectFile(filename: string) {
  const content = fs.readFileSync(filename, "utf-8");
  const lines = content.split("\n");
  console.log(`=== INSPECTING ${filename} (${lines.length} lines) ===`);

  const ruleMatches: string[] = [];
  const scheduleMatches: string[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/^(CHAPTER|CHAPTER\s+[I|V|X]+)/i.test(trimmed)) {
      console.log(`Line ${idx + 1} [Chapter]: ${trimmed}`);
    }
    if (/^Rule\s+\d+/i.test(trimmed)) {
      ruleMatches.push(`Line ${idx + 1}: ${trimmed.slice(0, 100)}`);
    }
    if (/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH)\s+SCHEDULE/i.test(trimmed)) {
      scheduleMatches.push(`Line ${idx + 1}: ${trimmed.slice(0, 100)}`);
    }
  });

  console.log(`Found ${ruleMatches.length} Rule headings.`);
  console.log("Sample Rule headings:", ruleMatches.slice(0, 10));
  console.log(`Found ${scheduleMatches.length} Schedule headings:`, scheduleMatches);
}

inspectFile("rules/pdf1_extracted.txt");
inspectFile("rules/pdf2_extracted.txt");

import fs from "fs";

function parseRulesFromText(filename: string) {
  const text = fs.readFileSync(filename, "utf-8");
  console.log(`\n=========================================` );
  console.log(`  PARSING RULES FROM: ${filename}`);
  console.log(`=========================================\n`);

  // Match pattern like " 6. Declarations to be made on every package." or "18. Maximum Permissible Error"
  const regex = /(?:^|\s)(\d{1,2})\.\s+([A-Z0-9\s,\-\(\)\/\.\'\”\“\*]+?)(?=\.\s*–|\.\s*-|\.\s*\n)/g;

  const matches: { ruleNum: number; title: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1]);
    const title = match[2].trim().replace(/\s+/g, " ");
    if (num > 0 && num <= 40 && title.length > 3) {
      matches.push({ ruleNum: num, title, index: match.index });
    }
  }

  console.log(`Found ${matches.length} Rule Section candidates:`);
  matches.forEach((m) => {
    console.log(`  - Rule ${m.ruleNum}: ${m.title.slice(0, 70)}`);
  });
}

parseRulesFromText("rules/pdf1_extracted.txt");
parseRulesFromText("rules/pdf2_extracted.txt");

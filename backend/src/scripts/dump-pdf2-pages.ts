import fs from "fs";

const text = fs.readFileSync("rules/pdf2_extracted.txt", "utf-8");
const pages = text.split("--- PAGE ");
console.log(`Total Pages in pdf2: ${pages.length - 1}`);

for (let p = 4; p <= 15; p++) {
  if (pages[p]) {
    console.log(`\n=== PAGE ${p} ===`);
    console.log(pages[p].slice(0, 1500));
  }
}

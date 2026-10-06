import fs from "fs";

const text = fs.readFileSync("rules/pdf2_extracted.txt", "utf-8");
console.log(text.slice(0, 4000));

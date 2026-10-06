import { STRUCTURED_RULEBOOK_DATASET } from "../services/rag/rulebook-dataset.js";

console.log("=========================================");
console.log(" STRUCTURED LEGAL RULEBOOK DATASET AUDIT ");
console.log("=========================================");
console.log(`Total Structure-Aware Rule Chunks: ${STRUCTURED_RULEBOOK_DATASET.length}`);

const chunkTypes = new Set(STRUCTURED_RULEBOOK_DATASET.map((c) => c.chunkType));
console.log("Chunk Types detected:", Array.from(chunkTypes));

const tablesCount = STRUCTURED_RULEBOOK_DATASET.filter((c) => c.chunkType === "TABLE").length;
const exemptionsCount = STRUCTURED_RULEBOOK_DATASET.filter((c) => c.chunkType === "EXEMPTION").length;
const amendmentsCount = STRUCTURED_RULEBOOK_DATASET.filter((c) => c.chunkType === "AMENDMENT").length;

console.log(`Tables: ${tablesCount}`);
console.log(`Exemptions: ${exemptionsCount}`);
console.log(`Gazette Amendments: ${amendmentsCount}`);
console.log("=========================================");

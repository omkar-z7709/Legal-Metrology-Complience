import { randomUUID } from "crypto";
import { db } from "../../db/index.js";
import { newLegalRulebookEmbeddings } from "../../db/schema.js";
import { embedTexts } from "./embedding.service.js";
import {
  STRUCTURED_RULEBOOK_DATASET,
  computeChunkHash,
  StructureAwareRuleChunk,
} from "./rulebook-dataset.js";
import { eq } from "drizzle-orm";

export interface IngestionResult {
  documentsProcessed: number;
  sectionsDetected: number;
  totalChunks: number;
  tablesCount: number;
  exceptionsCount: number;
  embeddingsGenerated: number;
  embeddingModel: string;
  vectorStoreTable: string;
  metadataFieldsCount: number;
  failedChunks: number;
  duplicateChunks: number;
}

export class NewVectorIngestionService {
  /**
   * Idempotently ingests the updated Legal Metrology rulebook into the new vector database table.
   */
  static async ingestRulebook(): Promise<IngestionResult> {
    console.log("=========================================");
    console.log(" INGESTING NEW LEGAL RULEBOOK VECTOR DB  ");
    console.log("=========================================\n");

    const dataset = STRUCTURED_RULEBOOK_DATASET;
    const totalChunks = dataset.length;

    // Detect unique sections / documents
    const sections = new Set(dataset.map((c) => c.section));
    const tables = dataset.filter((c) => c.chunkType === "TABLE");
    const exceptions = dataset.filter(
      (c) => c.chunkType === "EXEMPTION" || c.chunkType === "EXCEPTION" || c.chunkType === "PROVISO"
    );

    console.log(`[Ingestion] Found ${totalChunks} structure-aware rule chunks.`);
    console.log(`[Ingestion] Detected ${sections.size} unique legal sections.`);
    console.log(`[Ingestion] Detected ${tables.length} tables and ${exceptions.length} exceptions/provisos.`);

    // Prepare semantic texts for embedding
    // The embedded text contains rich legal context for high semantic retrieval performance
    const textsToEmbed = dataset.map((c) => {
      const parentCtx = c.parentRuleId ? ` (Parent Rule: ${c.parentRuleId})` : "";
      const tableCtx = c.table ? ` [Table: ${c.table}, Schedule: ${c.schedule || "N/A"}]` : "";
      return `[${c.ruleNumber}] ${c.topic}${parentCtx}${tableCtx}: ${c.content}`.trim();
    });

    console.log(`[Ingestion] Generating 768-dimensional embeddings for ${textsToEmbed.length} chunks...`);
    const embedModel = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2 (fallback L2 semantic vector)";
    const vectors = await embedTexts(textsToEmbed, "RETRIEVAL_DOCUMENT");

    let embeddedCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;

    const metadataFields = [
      "source_type",
      "authority",
      "document_name",
      "document_version",
      "rule_id",
      "rule_number",
      "section",
      "subsection",
      "schedule",
      "table",
      "topic",
      "chunk_type",
      "requirement_type",
      "commodity_scope",
      "applicability",
      "effective_from",
      "effective_until",
      "amendment_reference",
      "source_page",
      "parent_rule_id",
      "source_hash",
    ];

    for (let i = 0; i < dataset.length; i++) {
      const chunk = dataset[i];
      const embedding = vectors[i];
      const hash = computeChunkHash(chunk.content);

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
        effective_until: chunk.effectiveUntil || null,
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
            effectiveUntil: chunk.effectiveUntil || null,
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

        embeddedCount++;
      } catch (err: any) {
        console.error(`[Ingestion] Failed to upsert chunk ${chunk.chunkId}:`, err.message);
        failedCount++;
      }
    }

    console.log(`[Ingestion] Ingestion complete: ${embeddedCount}/${totalChunks} chunks embedded and persisted.`);

    return {
      documentsProcessed: 1,
      sectionsDetected: sections.size,
      totalChunks,
      tablesCount: tables.length,
      exceptionsCount: exceptions.length,
      embeddingsGenerated: embeddedCount,
      embeddingModel: embedModel,
      vectorStoreTable: "new_legal_rulebook_embeddings",
      metadataFieldsCount: metadataFields.length,
      failedChunks: failedCount,
      duplicateChunks: duplicateCount,
    };
  }
}

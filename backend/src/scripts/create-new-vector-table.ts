import dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

async function createTable() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("No DATABASE_URL found!");
    process.exit(1);
  }

  const sql = postgres(url, { ssl: "require" });
  
  console.log("🚀 Creating new_legal_rulebook_embeddings table...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "new_legal_rulebook_embeddings" (
      "id" varchar(255) PRIMARY KEY NOT NULL,
      "chunk_id" varchar(255) UNIQUE NOT NULL,
      "source_type" varchar(50) DEFAULT 'regulatory_text' NOT NULL,
      "authority" text DEFAULT 'Ministry of Consumer Affairs, Food and Public Distribution' NOT NULL,
      "document_name" text DEFAULT 'Legal Metrology (Packaged Commodities) Rules, 2011 & Gazette Amendments' NOT NULL,
      "document_version" varchar(50) DEFAULT '2026.1-GAZETTE-UPDATED' NOT NULL,
      "rule_id" varchar(100) NOT NULL,
      "rule_number" varchar(100) NOT NULL,
      "section" varchar(255),
      "subsection" varchar(255),
      "schedule" varchar(100),
      "table" varchar(100),
      "topic" varchar(255) NOT NULL,
      "chunk_type" varchar(50) NOT NULL,
      "requirement_type" varchar(50) DEFAULT 'MANDATORY' NOT NULL,
      "commodity_scope" text,
      "applicability" text,
      "effective_from" varchar(50),
      "effective_until" varchar(50),
      "amendment_reference" text,
      "source_page" integer,
      "parent_rule_id" varchar(100),
      "source_hash" varchar(64) NOT NULL,
      "content" text NOT NULL,
      "metadata_json" jsonb NOT NULL,
      "embedding" vector(768),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  console.log("✅ Table new_legal_rulebook_embeddings created successfully!");
  await sql.end();
}

createTable()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to create table:", err);
    process.exit(1);
  });

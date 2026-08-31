-- Enable pgvector extension (run once per database, safe to run again)
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "rule_embeddings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rule_id" varchar(100) NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768)
);--> statement-breakpoint

ALTER TABLE "rule_embeddings" ADD CONSTRAINT "rule_embeddings_rule_id_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS rule_embeddings_embedding_idx ON rule_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

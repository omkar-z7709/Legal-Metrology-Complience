-- Performance indexes for hot scan query paths.
-- Every child table is filtered by `scan_id` and lists are ordered by
-- `created_at` / `timestamp`; Postgres does not auto-index FK columns.

CREATE INDEX IF NOT EXISTS "scans_created_at_idx" ON "scans" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "scans_product_id_idx" ON "scans" ("product_id");
CREATE INDEX IF NOT EXISTS "images_scan_id_idx" ON "images" ("scan_id");
CREATE INDEX IF NOT EXISTS "extracted_fields_scan_id_idx" ON "extracted_fields" ("scan_id");
CREATE INDEX IF NOT EXISTS "compliance_checks_scan_id_idx" ON "compliance_checks" ("scan_id");
CREATE INDEX IF NOT EXISTS "violations_scan_id_idx" ON "violations" ("scan_id");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_id_idx" ON "audit_logs" ("resource_id");
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" ("timestamp" DESC);
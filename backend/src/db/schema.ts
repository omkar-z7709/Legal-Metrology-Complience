import {
  pgTable,
  text,
  varchar,
  timestamp,
  numeric,
  boolean,
  integer,
  jsonb,
  uuid,
  pgEnum,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";




// Enums
export const roleEnum = pgEnum("user_role", ["INSPECTOR", "SUPERVISOR", "ADMIN"]);
export const scanStatusEnum = pgEnum("scan_status", ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);
export const complianceStatusEnum = pgEnum("compliance_status", ["COMPLIANT", "NON_COMPLIANT", "REQUIRES_REVIEW"]);
export const reviewStatusEnum = pgEnum("review_status", ["PENDING", "ACCEPTED", "REJECTED", "OVERRIDDEN"]);
export const imageTypeEnum = pgEnum("image_type", ["ORIGINAL", "PREPROCESSED", "CROPPED_REGION", "EVIDENCE"]);
export const checkStatusEnum = pgEnum("check_status", ["PASS", "FAIL", "REVIEW"]);
export const severityEnum = pgEnum("severity_level", ["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export const validationTypeEnum = pgEnum("validation_type", [
  "PRESENCE",
  "FORMAT",
  "QUANTITY",
  "MRP",
  "DATE",
  "FONT_SIZE",
  "PLACEMENT",
]);

// 1. Users Table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("INSPECTOR"), // 'INSPECTOR' | 'SUPERVISOR' | 'ADMIN'
  department: varchar("department", { length: 255 }).default("Legal Metrology Enforcement"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Products Table
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  category: varchar("category", { length: 100 }).notNull(), // 'Edible Oils', 'Packaged Food', 'Cosmetics', etc.
  commodityType: varchar("commodity_type", { length: 100 }), // 'Solid', 'Liquid', 'Semi-solid'
  manufacturerName: text("manufacturer_name"),
  manufacturerAddress: text("manufacturer_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Scans Table
export const scans = pgTable("scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  inspectorId: uuid("inspector_id").references(() => users.id, { onDelete: "set null" }),
  scanNumber: varchar("scan_number", { length: 100 }).notNull().unique(),
  location: varchar("location", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("PENDING"),
  complianceStatus: varchar("compliance_status", { length: 50 }).default("REQUIRES_REVIEW"),
  complianceScore: numeric("compliance_score", { precision: 5, scale: 2 }).default("0.00"),
  analysis: jsonb("analysis"),
  reviewStatus: varchar("review_status", { length: 50 }).default("PENDING"),
  reviewerNotes: text("reviewer_notes"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Images Table
export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id").references(() => scans.id, { onDelete: "cascade" }).notNull(),
  imageType: varchar("image_type", { length: 50 }).notNull().default("ORIGINAL"),
  storagePath: text("storage_path").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 100 }).notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Extracted Fields Table
export const extractedFields = pgTable("extracted_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id").references(() => scans.id, { onDelete: "cascade" }).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(), // 'mrp', 'net_quantity', 'manufacturer', etc.
  fieldValue: text("field_value"),
  rawText: text("raw_text"),
  confidence: numeric("confidence", { precision: 5, scale: 4 }), // 0.0000 - 1.0000
  boundingBox: jsonb("bounding_box"), // { x1, y1, x2, y2 }
  rawData: jsonb("raw_data"),
  isPresent: boolean("is_present").notNull().default(true),
  validationStatus: varchar("validation_status", { length: 50 }).default("UNCHECKED"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Rules Table
export const rules = pgTable("rules", {
  id: varchar("id", { length: 100 }).primaryKey(), // 'RULE-6-1-A', 'RULE-6-1-C', etc.
  ruleNumber: varchar("rule_number", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull().default("GENERAL"),
  requirement: text("requirement").notNull(),
  validationType: varchar("validation_type", { length: 50 }).notNull(), // 'PRESENCE', 'FORMAT', etc.
  severity: varchar("severity", { length: 50 }).notNull().default("HIGH"),
  effectiveFrom: varchar("effective_from", { length: 50 }).default("2011-11-01"),
  effectiveTo: varchar("effective_to", { length: 50 }),
  sourceAct: varchar("source_act", { length: 255 }).default("Legal Metrology (Packaged Commodities) Rules, 2011"),
  sourceClause: text("source_clause"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Compliance Checks Table
export const complianceChecks = pgTable("compliance_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id").references(() => scans.id, { onDelete: "cascade" }).notNull(),
  ruleId: varchar("rule_id", { length: 100 }).references(() => rules.id).notNull(),
  fieldName: varchar("field_name", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull(), // 'PASS' | 'FAIL' | 'REVIEW'
  reason: text("reason").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  evidenceText: text("evidence_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Violations Table
export const violations = pgTable("violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id").references(() => scans.id, { onDelete: "cascade" }).notNull(),
  checkId: uuid("check_id").references(() => complianceChecks.id, { onDelete: "cascade" }),
  ruleId: varchar("rule_id", { length: 100 }).references(() => rules.id).notNull(),
  violationType: varchar("violation_type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull().default("HIGH"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  extractedEvidence: text("extracted_evidence"),
  boundingBox: jsonb("bounding_box"),
  suggestedAction: text("suggested_action"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Reports Table
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id").references(() => scans.id, { onDelete: "cascade" }).notNull(),
  reportNumber: varchar("report_number", { length: 100 }).notNull().unique(),
  format: varchar("format", { length: 20 }).notNull().default("PDF"),
  storagePath: text("storage_path").notNull(),
  generatedBy: uuid("generated_by").references(() => users.id, { onDelete: "set null" }),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 10. Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  userEmail: varchar("user_email", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(), // 'SCAN_CREATED', 'SCAN_REVIEWED', 'REPORT_GENERATED'
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }).notNull(),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  scans: many(scans),
}));

export const scansRelations = relations(scans, ({ one, many }) => ({
  product: one(products, { fields: [scans.productId], references: [products.id] }),
  inspector: one(users, { fields: [scans.inspectorId], references: [users.id] }),
  reviewer: one(users, { fields: [scans.reviewedBy], references: [users.id] }),
  images: many(images),
  extractedFields: many(extractedFields),
  complianceChecks: many(complianceChecks),
  violations: many(violations),
  reports: many(reports),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  scan: one(scans, { fields: [images.scanId], references: [scans.id] }),
}));

export const extractedFieldsRelations = relations(extractedFields, ({ one }) => ({
  scan: one(scans, { fields: [extractedFields.scanId], references: [scans.id] }),
}));

export const complianceChecksRelations = relations(complianceChecks, ({ one }) => ({
  scan: one(scans, { fields: [complianceChecks.scanId], references: [scans.id] }),
  rule: one(rules, { fields: [complianceChecks.ruleId], references: [rules.id] }),
}));

export const violationsRelations = relations(violations, ({ one }) => ({
  scan: one(scans, { fields: [violations.scanId], references: [scans.id] }),
  check: one(complianceChecks, { fields: [violations.checkId], references: [complianceChecks.id] }),
  rule: one(rules, { fields: [violations.ruleId], references: [rules.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  scan: one(scans, { fields: [reports.scanId], references: [scans.id] }),
  generator: one(users, { fields: [reports.generatedBy], references: [users.id] }),
}));




export const ruleEmbeddings = pgTable("rule_embeddings", {
  id: uuid("id").primaryKey(),
  ruleId: varchar("rule_id", { length: 100 }).notNull().references(() => rules.id),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
});
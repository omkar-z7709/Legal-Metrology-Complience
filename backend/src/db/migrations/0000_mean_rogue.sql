CREATE TYPE "public"."check_status" AS ENUM('PASS', 'FAIL', 'REVIEW');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."image_type" AS ENUM('ORIGINAL', 'PREPROCESSED', 'CROPPED_REGION', 'EVIDENCE');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'OVERRIDDEN');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('INSPECTOR', 'SUPERVISOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."severity_level" AS ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."validation_type" AS ENUM('PRESENCE', 'FORMAT', 'QUANTITY', 'MRP', 'DATE', 'FONT_SIZE', 'PLACEMENT');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_email" varchar(255),
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" varchar(255) NOT NULL,
	"details" jsonb,
	"ip_address" varchar(45),
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"rule_id" varchar(100) NOT NULL,
	"field_name" varchar(100),
	"status" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"confidence" numeric(5, 4),
	"evidence_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"field_value" text,
	"raw_text" text,
	"confidence" numeric(5, 4),
	"bounding_box" jsonb,
	"is_present" boolean DEFAULT true NOT NULL,
	"validation_status" varchar(50) DEFAULT 'UNCHECKED',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"image_type" varchar(50) DEFAULT 'ORIGINAL' NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand" varchar(255),
	"category" varchar(100) NOT NULL,
	"commodity_type" varchar(100),
	"manufacturer_name" text,
	"manufacturer_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"report_number" varchar(100) NOT NULL,
	"format" varchar(20) DEFAULT 'PDF' NOT NULL,
	"storage_path" text NOT NULL,
	"generated_by" uuid,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_report_number_unique" UNIQUE("report_number")
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"rule_number" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) DEFAULT 'GENERAL' NOT NULL,
	"requirement" text NOT NULL,
	"validation_type" varchar(50) NOT NULL,
	"severity" varchar(50) DEFAULT 'HIGH' NOT NULL,
	"effective_from" varchar(50) DEFAULT '2011-11-01',
	"effective_to" varchar(50),
	"source_act" varchar(255) DEFAULT 'Legal Metrology (Packaged Commodities) Rules, 2011',
	"source_clause" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"inspector_id" uuid,
	"scan_number" varchar(100) NOT NULL,
	"location" varchar(255),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"compliance_status" varchar(50) DEFAULT 'REQUIRES_REVIEW',
	"compliance_score" numeric(5, 2) DEFAULT '0.00',
	"review_status" varchar(50) DEFAULT 'PENDING',
	"reviewer_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scans_scan_number_unique" UNIQUE("scan_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'INSPECTOR' NOT NULL,
	"department" varchar(255) DEFAULT 'Legal Metrology Enforcement',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"check_id" uuid,
	"rule_id" varchar(100) NOT NULL,
	"violation_type" varchar(100) NOT NULL,
	"severity" varchar(50) DEFAULT 'HIGH' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"extracted_evidence" text,
	"bounding_box" jsonb,
	"suggested_action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_checks" ADD CONSTRAINT "compliance_checks_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_checks" ADD CONSTRAINT "compliance_checks_rule_id_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_check_id_compliance_checks_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."compliance_checks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violations" ADD CONSTRAINT "violations_rule_id_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id") ON DELETE no action ON UPDATE no action;
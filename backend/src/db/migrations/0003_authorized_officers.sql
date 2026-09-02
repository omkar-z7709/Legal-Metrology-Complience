-- ==============================================================================
-- Migration: 0003_authorized_officers.sql
-- Description: Create authorized_officers table for whitelist-based official authentication
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "authorized_officers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL UNIQUE,
    "name" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'INSPECTOR' NOT NULL CHECK (role IN ('INSPECTOR', 'SUPERVISOR', 'ADMIN')),
    "department" varchar(255) DEFAULT 'Legal Metrology Enforcement' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for fast email & active status lookup during authentication
CREATE INDEX IF NOT EXISTS "idx_authorized_officers_email" ON "authorized_officers" ("email");
CREATE INDEX IF NOT EXISTS "idx_authorized_officers_active" ON "authorized_officers" ("is_active");

-- Enable Row Level Security (RLS)
ALTER TABLE "authorized_officers" ENABLE ROW LEVEL SECURITY;

-- Service role full access policy
CREATE POLICY "Service role full access on authorized_officers" 
ON "authorized_officers" 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Authenticated users can read authorized officer profiles
CREATE POLICY "Authenticated users can read authorized_officers" 
ON "authorized_officers" 
FOR SELECT 
TO authenticated 
USING (true);

-- ==============================================================================
-- Seed Data: Development / Testing Accounts (Clearly marked test accounts)
-- Note: Passwords for these users must be created in Supabase Auth (auth.users)
-- ==============================================================================

INSERT INTO "authorized_officers" ("id", "email", "name", "role", "department", "is_active")
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'test.inspector@lm.gov.in', 'Sarthak Verma (Test Inspector)', 'INSPECTOR', 'Legal Metrology Enforcement Directorate', true),
    ('a2222222-2222-2222-2222-222222222222', 'test.supervisor@lm.gov.in', 'Anita Rao (Test Supervisor)', 'SUPERVISOR', 'Legal Metrology Zonal Office', true),
    ('a3333333-3333-3333-3333-333333333333', 'test.admin@lm.gov.in', 'Director General (Test Admin)', 'ADMIN', 'Ministry of Consumer Affairs', true),
    ('a4444444-4444-4444-4444-444444444444', 'inactive.officer@lm.gov.in', 'Suspended Officer (Test Inactive)', 'INSPECTOR', 'Legal Metrology Field Unit', false)
ON CONFLICT ("email") DO UPDATE SET
    "name" = EXCLUDED."name",
    "role" = EXCLUDED."role",
    "department" = EXCLUDED."department",
    "is_active" = EXCLUDED."is_active",
    "updated_at" = now();

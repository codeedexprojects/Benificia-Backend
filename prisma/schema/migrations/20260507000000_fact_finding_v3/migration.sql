-- ============================================================
-- Fact-Finding V3
-- Splits income into sources + amounts, extracts dependents/
-- liabilities/insurance into a separate finance_profiles table,
-- removes financial_goals, updates ProfileStage enum.
-- Safe: truncates fact-finding rows only (dev data).
-- ============================================================

-- ── 0. Clear existing fact-finding data ──────────────────────
TRUNCATE TABLE
  "risk_profiles",
  "asset_liability_profiles",
  "expense_profiles",
  "income_profiles"
CASCADE;

-- Drop financial_goals if it still exists
DROP TABLE IF EXISTS "financial_goals" CASCADE;

-- ── 1. Update ProfileStage enum ──────────────────────────────
-- Rename old type, create new one, migrate column, drop old.

ALTER TYPE "ProfileStage" RENAME TO "ProfileStage_old";

CREATE TYPE "ProfileStage" AS ENUM (
  'auth_complete',
  'personal_complete',
  'fact_finding_income_sources',
  'fact_finding_dependents',
  'fact_finding_liabilities',
  'fact_finding_insurance',
  'fact_finding_income_amount',
  'fact_finding_expenses',
  'fact_finding_assets',
  'fact_finding_complete',
  'recommendations_ready'
);

-- Migrate users: map old stages that no longer exist to nearest equivalent
ALTER TABLE "users"
  ALTER COLUMN "profile_stage" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "profile_stage" TYPE "ProfileStage"
  USING (
    CASE "profile_stage"::text
      WHEN 'auth_complete'          THEN 'auth_complete'
      WHEN 'personal_complete'      THEN 'personal_complete'
      WHEN 'fact_finding_income'    THEN 'personal_complete'
      WHEN 'fact_finding_expenses'  THEN 'fact_finding_income_sources'
      WHEN 'fact_finding_assets'    THEN 'fact_finding_dependents'
      WHEN 'fact_finding_goals'     THEN 'fact_finding_income_amount'
      WHEN 'fact_finding_risk'      THEN 'fact_finding_assets'
      WHEN 'fact_finding_complete'  THEN 'fact_finding_complete'
      WHEN 'recommendations_ready'  THEN 'recommendations_ready'
      ELSE 'personal_complete'
    END
  )::"ProfileStage";

ALTER TABLE "users"
  ALTER COLUMN "profile_stage" SET DEFAULT 'auth_complete'::"ProfileStage";

DROP TYPE "ProfileStage_old";

-- ── 2. Create income_sources_profiles table ───────────────────
-- Stores Finance 1: which income sources the user selected.

CREATE TABLE "income_sources_profiles" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"        UUID        NOT NULL,
  "income_sources" "IncomeSource"[]     NOT NULL DEFAULT '{}',
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "income_sources_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "income_sources_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "income_sources_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "income_sources_profiles_user_id_idx" ON "income_sources_profiles"("user_id");

-- ── 3. Create finance_profiles table ─────────────────────────
-- Stores Finance 2: dependents, liabilities, insurance.

CREATE TABLE "finance_profiles" (
  "id"                      UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                 UUID        NOT NULL,
  "number_of_dependents"    INT         NOT NULL DEFAULT 0,
  "liability_types"         "LiabilityType"[]       NOT NULL DEFAULT '{}',
  "insurance_coverage_types" "InsuranceCoverageType"[] NOT NULL DEFAULT '{}',
  "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "finance_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "finance_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "finance_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "finance_profiles_user_id_idx" ON "finance_profiles"("user_id");

-- ── 4. Update income_profiles ─────────────────────────────────
-- Remove income_sources column (moved to income_sources_profiles).

ALTER TABLE "income_profiles"
  DROP COLUMN IF EXISTS "income_sources";

-- ── 5. Update asset_liability_profiles ───────────────────────
-- Remove liability_types and insurance_coverage_types columns
-- (moved to finance_profiles).

ALTER TABLE "asset_liability_profiles"
  DROP COLUMN IF EXISTS "liability_types",
  DROP COLUMN IF EXISTS "insurance_coverage_types",
  DROP COLUMN IF EXISTS "total_liabilities";

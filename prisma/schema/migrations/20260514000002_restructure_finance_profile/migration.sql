-- Drop old columns from finance_profiles
ALTER TABLE "finance_profiles"
  DROP COLUMN IF EXISTS "liability_types",
  DROP COLUMN IF EXISTS "insurance_coverage_types";

-- Add new flat columns to finance_profiles
ALTER TABLE "finance_profiles"
  ADD COLUMN IF NOT EXISTS "household_expenses"          FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rent_and_emi"               FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "education_expenses"          FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "other_expenses"              FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "insurance_monthly"           FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "credit_card_dues"            FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "personal_loan"               FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "medical_expenses"            FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "other_short_term_expenses"   FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "home_loan"                   FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vehicle_loan"                FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "education_loan"              FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "business_loan"               FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "other_long_term_expenses"    FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_monthly_expenses"      FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_short_term_liabilities" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_long_term_liabilities"  FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "monthly_surplus"             FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "savings_ratio_pct"           FLOAT NOT NULL DEFAULT 0;

-- Drop expense_profiles table (data now lives in finance_profiles)
DROP TABLE IF EXISTS "expense_profiles";

-- Drop old enum types no longer used
DROP TYPE IF EXISTS "LiabilityType";
DROP TYPE IF EXISTS "InsuranceCoverageType";

-- ============================================================
-- Fact-Finding V2
-- Restructures income, expense, assets, risk, and user profile
-- tables to match the new simplified question flow.
-- Safe: only truncates fact-finding rows, not users/auth/health.
-- ============================================================

-- ── 0. Clear all fact-finding data (dev test data only) ──────
-- Preserves: users, auth_sessions, otp_logs, health_centres,
--            user_profiles (partial), ai_recommendations
TRUNCATE TABLE
  "risk_profiles",
  "financial_goals",
  "asset_liability_profiles",
  "expense_profiles",
  "income_profiles"
CASCADE;

-- ── 1. New enums ─────────────────────────────────────────────

-- Income sources
CREATE TYPE "IncomeSource" AS ENUM (
  'full_time_salary',
  'freelance_contract',
  'business_owner',
  'passive_income',
  'other'
);

-- Asset types
CREATE TYPE "AssetType" AS ENUM (
  'cash_savings',
  'fixed_deposit',
  'mutual_funds_stocks',
  'gold',
  'real_estate',
  'epf_ppf',
  'other'
);

-- Liability types
CREATE TYPE "LiabilityType" AS ENUM (
  'credit_card_debt',
  'personal_loan',
  'mortgage'
);

-- Insurance coverage types
CREATE TYPE "InsuranceCoverageType" AS ENUM (
  'health_insurance',
  'life_insurance',
  'property_insurance'
);

-- Risk: portfolio drop response
CREATE TYPE "PortfolioDrop" AS ENUM (
  'sell_everything',
  'wait_it_out',
  'buy_more'
);

-- Risk: investment style
CREATE TYPE "InvestmentStyle" AS ENUM (
  'conservative',
  'moderate',
  'aggressive'
);

-- Risk: financial aims (multi-select, stored as array)
CREATE TYPE "FinancialAim" AS ENUM (
  'retirement',
  'home_ownership',
  'education',
  'wealth_building',
  'repay_debts'
);

-- Risk: time horizon
CREATE TYPE "TimeHorizon" AS ENUM (
  'short_1_3',
  'medium_3_7',
  'long_7_plus'
);

-- Risk: market feeling
CREATE TYPE "MarketFeeling" AS ENUM (
  'very_anxious',
  'neutral',
  'excited'
);

-- ── 2. income_profiles ────────────────────────────────────────

-- Drop old columns no longer needed
ALTER TABLE "income_profiles"
  DROP COLUMN IF EXISTS "annual_bonus",
  DROP COLUMN IF EXISTS "expected_growth_pct",
  DROP COLUMN IF EXISTS "salary_monthly";

-- Add new columns
ALTER TABLE "income_profiles"
  ADD COLUMN "income_sources"    "IncomeSource"[]  NOT NULL DEFAULT '{}',
  ADD COLUMN "salary_monthly"    DOUBLE PRECISION  NOT NULL DEFAULT 0,
  ADD COLUMN "freelance_monthly" DOUBLE PRECISION  NOT NULL DEFAULT 0;

-- ── 3. expense_profiles ──────────────────────────────────────

-- Drop old breakdown columns
ALTER TABLE "expense_profiles"
  DROP COLUMN IF EXISTS "rent_or_home_loan_emi",
  DROP COLUMN IF EXISTS "vehicle_loan_emi",
  DROP COLUMN IF EXISTS "other_loan_emis",
  DROP COLUMN IF EXISTS "existing_premiums",
  DROP COLUMN IF EXISTS "groceries_food",
  DROP COLUMN IF EXISTS "utilities",
  DROP COLUMN IF EXISTS "transport",
  DROP COLUMN IF EXISTS "medical_healthcare",
  DROP COLUMN IF EXISTS "dining_entertainment",
  DROP COLUMN IF EXISTS "shopping",
  DROP COLUMN IF EXISTS "children_education",
  DROP COLUMN IF EXISTS "other_expenses";

-- total_monthly, monthly_surplus, savings_ratio_pct already exist — keep them

-- ── 4. asset_liability_profiles ──────────────────────────────

-- Drop old fixed asset/liability columns
ALTER TABLE "asset_liability_profiles"
  DROP COLUMN IF EXISTS "cash_savings",
  DROP COLUMN IF EXISTS "fixed_deposits",
  DROP COLUMN IF EXISTS "mutual_funds_stocks",
  DROP COLUMN IF EXISTS "gold_value",
  DROP COLUMN IF EXISTS "real_estate_value",
  DROP COLUMN IF EXISTS "epf_ppf_balance",
  DROP COLUMN IF EXISTS "other_assets",
  DROP COLUMN IF EXISTS "home_loan_outstanding",
  DROP COLUMN IF EXISTS "vehicle_loan_outstanding",
  DROP COLUMN IF EXISTS "personal_loan_outstanding",
  DROP COLUMN IF EXISTS "credit_card_outstanding",
  DROP COLUMN IF EXISTS "other_loans",
  DROP COLUMN IF EXISTS "existing_life_cover",
  DROP COLUMN IF EXISTS "existing_health_cover";

-- Add new enum-array columns
ALTER TABLE "asset_liability_profiles"
  ADD COLUMN "liability_types"          "LiabilityType"[]          NOT NULL DEFAULT '{}',
  ADD COLUMN "insurance_coverage_types" "InsuranceCoverageType"[]  NOT NULL DEFAULT '{}';

-- total_assets, total_liabilities, net_worth already exist — keep them

-- ── 5. user_assets (new table) ────────────────────────────────

CREATE TABLE "user_assets" (
  "id"                           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "asset_liability_profile_id"   UUID         NOT NULL,
  "asset_type"                   "AssetType"  NOT NULL,
  "amount"                       DOUBLE PRECISION NOT NULL,
  "created_at"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_assets_asset_liability_profile_id_fkey"
    FOREIGN KEY ("asset_liability_profile_id")
    REFERENCES "asset_liability_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_assets_asset_liability_profile_id_idx"
  ON "user_assets"("asset_liability_profile_id");

-- ── 6. risk_profiles ─────────────────────────────────────────

-- Drop old score-based columns
ALTER TABLE "risk_profiles"
  DROP COLUMN IF EXISTS "answers",
  DROP COLUMN IF EXISTS "total_score";

-- Add new named question columns
ALTER TABLE "risk_profiles"
  ADD COLUMN "portfolio_drop"    "PortfolioDrop"   NOT NULL DEFAULT 'wait_it_out',
  ADD COLUMN "investment_style"  "InvestmentStyle" NOT NULL DEFAULT 'moderate',
  ADD COLUMN "financial_aims"    "FinancialAim"[]  NOT NULL DEFAULT '{}',
  ADD COLUMN "time_horizon"      "TimeHorizon"     NOT NULL DEFAULT 'medium_3_7',
  ADD COLUMN "market_feeling"    "MarketFeeling"   NOT NULL DEFAULT 'neutral';

-- Remove the defaults now that the column exists (new rows must always provide values)
ALTER TABLE "risk_profiles"
  ALTER COLUMN "portfolio_drop"   DROP DEFAULT,
  ALTER COLUMN "investment_style" DROP DEFAULT,
  ALTER COLUMN "time_horizon"     DROP DEFAULT,
  ALTER COLUMN "market_feeling"   DROP DEFAULT;

-- ── 7. user_profiles ─────────────────────────────────────────

-- Drop old detailed personal columns
ALTER TABLE "user_profiles"
  DROP COLUMN IF EXISTS "date_of_birth",
  DROP COLUMN IF EXISTS "children_ages",
  DROP COLUMN IF EXISTS "occupation",
  DROP COLUMN IF EXISTS "employer",
  DROP COLUMN IF EXISTS "income_type",
  DROP COLUMN IF EXISTS "retirement_age",
  DROP COLUMN IF EXISTS "is_primary_earner",
  DROP COLUMN IF EXISTS "dependents_rely_on_income";

-- Add new simplified columns
ALTER TABLE "user_profiles"
  ADD COLUMN "year_of_birth"       INTEGER,
  ADD COLUMN "number_of_members"   INTEGER NOT NULL DEFAULT 1;

-- gender already exists — keep it
-- marital_status already exists — keep it
-- number_of_dependents already exists — keep it

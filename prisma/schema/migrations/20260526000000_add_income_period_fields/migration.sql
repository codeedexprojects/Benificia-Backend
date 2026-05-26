-- AlterTable: add period metadata columns to income_profiles
-- These store which unit (monthly/yearly) the user originally entered,
-- so the frontend can restore the toggle state when editing.
ALTER TABLE "income_profiles"
  ADD COLUMN "salary_period"    TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN "freelance_period" TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN "business_period"  TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN "other_period"     TEXT NOT NULL DEFAULT 'monthly';

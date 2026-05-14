-- Drop old asset enum values and UserAsset table, add flat columns to asset_liability_profiles

-- Drop net_worth column and UserAsset table
ALTER TABLE "asset_liability_profiles" DROP COLUMN IF EXISTS "net_worth";
ALTER TABLE "asset_liability_profiles" DROP COLUMN IF EXISTS "investment" CASCADE;

DROP TABLE IF EXISTS "user_assets";

-- Add new flat asset columns
ALTER TABLE "asset_liability_profiles"
  ADD COLUMN IF NOT EXISTS "residential_property" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "investment" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "savings_bank" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "gold_jewelry" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "retirement_funds" FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "other_assets" FLOAT NOT NULL DEFAULT 0;

-- Drop old AssetType enum and replace with new values
DROP TYPE IF EXISTS "AssetType" CASCADE;
CREATE TYPE "AssetType" AS ENUM ('residential_property', 'investment', 'savings_bank', 'gold_jewelry', 'retirement_funds', 'other_assets');

-- Remove passive_monthly from income_profiles
ALTER TABLE "income_profiles" DROP COLUMN IF EXISTS "passive_monthly";

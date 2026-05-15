-- Add 'other' to FinancialAim enum
ALTER TYPE "FinancialAim" ADD VALUE IF NOT EXISTS 'other';

-- Create goals_profiles table
CREATE TABLE IF NOT EXISTS "goals_profiles" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"        UUID NOT NULL,
  "financial_aims" "FinancialAim"[] NOT NULL DEFAULT '{}',
  "time_horizon"   "TimeHorizon" NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "goals_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "goals_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "goals_profiles_user_id_key" UNIQUE ("user_id")
);

CREATE INDEX IF NOT EXISTS "goals_profiles_user_id_idx" ON "goals_profiles"("user_id");

-- Move existing financialAims + timeHorizon from risk_profiles into goals_profiles
INSERT INTO "goals_profiles" ("id", "user_id", "financial_aims", "time_horizon", "created_at", "updated_at")
SELECT gen_random_uuid(), "user_id", "financial_aims", "time_horizon", "created_at", "updated_at"
FROM "risk_profiles"
ON CONFLICT ("user_id") DO NOTHING;

-- Drop financialAims and timeHorizon from risk_profiles
ALTER TABLE "risk_profiles"
  DROP COLUMN IF EXISTS "financial_aims",
  DROP COLUMN IF EXISTS "time_horizon";

/*
  Warnings:

  - The values [_removed_aadhaar_kyc] on the enum `OtpPurpose` will be removed. If these variants are still used in the database, this will fail.
  - The values [fact_finding_dependents,fact_finding_insurance,fact_finding_income_amount,fact_finding_expenses,fact_finding_assets] on the enum `ProfileStage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OtpPurpose_new" AS ENUM ('registration', 'login', 'mfa', 'password_reset');
ALTER TABLE "otp_logs" ALTER COLUMN "purpose" TYPE "OtpPurpose_new" USING ("purpose"::text::"OtpPurpose_new");
ALTER TYPE "OtpPurpose" RENAME TO "OtpPurpose_old";
ALTER TYPE "OtpPurpose_new" RENAME TO "OtpPurpose";
DROP TYPE "public"."OtpPurpose_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ProfileStage_new" AS ENUM ('auth_complete', 'personal_complete', 'fact_finding_income_sources', 'fact_finding_liabilities', 'fact_finding_goals', 'fact_finding_complete', 'recommendations_ready');
ALTER TABLE "public"."users" ALTER COLUMN "profile_stage" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "profile_stage" TYPE "ProfileStage_new" USING ("profile_stage"::text::"ProfileStage_new");
ALTER TYPE "ProfileStage" RENAME TO "ProfileStage_old";
ALTER TYPE "ProfileStage_new" RENAME TO "ProfileStage";
DROP TYPE "public"."ProfileStage_old";
ALTER TABLE "users" ALTER COLUMN "profile_stage" SET DEFAULT 'auth_complete';
COMMIT;

-- DropForeignKey
ALTER TABLE "finance_profiles" DROP CONSTRAINT "finance_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "goals_profiles" DROP CONSTRAINT "goals_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "health_centres" DROP CONSTRAINT "health_centres_added_by_admin_fkey";

-- DropForeignKey
ALTER TABLE "income_sources_profiles" DROP CONSTRAINT "income_sources_profiles_user_id_fkey";

-- DropIndex
DROP INDEX "user_profiles_city_idx";

-- DropIndex
DROP INDEX "user_profiles_state_idx";

-- DropIndex
DROP INDEX "user_profiles_user_id_idx";

-- AlterTable
ALTER TABLE "finance_profiles" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "goals_profiles" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "financial_aims" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "health_centres" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deleted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "income_sources_profiles" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "income_sources" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "investment_schemes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "logo_s3_key" VARCHAR(500),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "website" VARCHAR(500),
    "scheme_type" VARCHAR(50) NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risk_level" VARCHAR(50),
    "expected_return_pct" DOUBLE PRECISION,
    "tenure_months_min" INTEGER,
    "tenure_months_max" INTEGER,
    "min_investment" DOUBLE PRECISION,
    "max_investment" DOUBLE PRECISION,
    "features" JSONB NOT NULL DEFAULT '[]',
    "is_tax_saving" BOOLEAN NOT NULL DEFAULT false,
    "tax_section_code" VARCHAR(20),
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "added_by_admin" UUID NOT NULL,
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "investment_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_schemes_is_active_idx" ON "investment_schemes"("is_active");

-- CreateIndex
CREATE INDEX "investment_schemes_scheme_type_idx" ON "investment_schemes"("scheme_type");

-- CreateIndex
CREATE INDEX "investment_schemes_risk_level_idx" ON "investment_schemes"("risk_level");

-- CreateIndex
CREATE INDEX "investment_schemes_is_tax_saving_idx" ON "investment_schemes"("is_tax_saving");

-- CreateIndex
CREATE INDEX "investment_schemes_is_verified_idx" ON "investment_schemes"("is_verified");

-- CreateIndex
CREATE INDEX "investment_schemes_created_at_idx" ON "investment_schemes"("created_at");

-- AddForeignKey
ALTER TABLE "income_sources_profiles" ADD CONSTRAINT "income_sources_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_profiles" ADD CONSTRAINT "finance_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals_profiles" ADD CONSTRAINT "goals_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_centres" ADD CONSTRAINT "health_centres_added_by_admin_fkey" FOREIGN KEY ("added_by_admin") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_schemes" ADD CONSTRAINT "investment_schemes_added_by_admin_fkey" FOREIGN KEY ("added_by_admin") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

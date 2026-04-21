-- CreateEnum
CREATE TYPE "ProfileStage" AS ENUM ('auth_complete', 'kyc_in_progress', 'kyc_complete', 'personal_complete', 'fact_finding_income', 'fact_finding_expenses', 'fact_finding_assets', 'fact_finding_goals', 'fact_finding_risk', 'fact_finding_complete', 'recommendations_ready');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('pending', 'verified', 'failed');

-- CreateEnum
CREATE TYPE "KycMethod" AS ENUM ('aadhaar_otp');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('single', 'married', 'divorced', 'widowed');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('fixed', 'business', 'freelance');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('conservative', 'moderate', 'aggressive');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('emergency_fund', 'child_education', 'house_purchase', 'retirement', 'wealth_creation', 'debt_repayment');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('term', 'health', 'ulip', 'endowment', 'vehicle');

-- CreateEnum
CREATE TYPE "ProductRiskLevel" AS ENUM ('low', 'moderate', 'high');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('pending', 'contacted', 'converted', 'dropped');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('generating', 'ready', 'stale', 'failed');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('registration', 'login', 'mfa', 'password_reset', 'aadhaar_kyc');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'product_admin', 'support_agent', 'analytics_viewer');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'support_agent',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(64) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" VARCHAR(200) NOT NULL,
    "target_table" VARCHAR(100),
    "target_id" VARCHAR(255),
    "ip_address" INET,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_configs" (
    "id" UUID NOT NULL,
    "savings_ratio_weight" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "debt_ratio_weight" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "emergency_fund_weight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "poor_threshold" INTEGER NOT NULL DEFAULT 40,
    "average_threshold" INTEGER NOT NULL DEFAULT 60,
    "good_threshold" INTEGER NOT NULL DEFAULT 80,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "subject" VARCHAR(255),
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "profile_stage" "ProfileStage" NOT NULL DEFAULT 'auth_complete',
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'pending',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "device_id" VARCHAR(255),
    "ip_address" INET,
    "user_agent" VARCHAR(500),
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "otp_code_hash" VARCHAR(255) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "salary_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "business_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passive_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annual_bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expected_growth_pct" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rent_or_home_loan_emi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vehicle_loan_emi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_loan_emis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "existing_premiums" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "groceries_food" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilities" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transport" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medical_healthcare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dining_entertainment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shopping" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "children_education" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthly_surplus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "savings_ratio_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_liability_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cash_savings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixed_deposits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mutual_funds_stocks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gold_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "real_estate_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "epf_ppf_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_assets" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_assets" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "home_loan_outstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vehicle_loan_outstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "personal_loan_outstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit_card_outstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_loans" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_liabilities" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_worth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "existing_life_cover" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "existing_health_cover" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_liability_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "GoalType" NOT NULL,
    "target_amount" DOUBLE PRECISION NOT NULL,
    "target_years" INTEGER NOT NULL,
    "current_saved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_achieved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "answers" INTEGER[],
    "total_score" INTEGER NOT NULL,
    "risk_category" "RiskCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "logo_s3_key" VARCHAR(500),
    "website" VARCHAR(500),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(20),
    "agreement_ref" VARCHAR(100),
    "tieup_start_date" DATE NOT NULL,
    "tieup_end_date" DATE,
    "commission_pct" DOUBLE PRECISION,
    "priority_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(1000),
    "added_by_admin" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tieup_audit_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "changes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tieup_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_products" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "managed_by_admin" UUID,
    "external_id" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "type" "InsuranceType" NOT NULL,
    "premium_monthly" DOUBLE PRECISION,
    "premium_annual" DOUBLE PRECISION,
    "coverage_amount" DOUBLE PRECISION,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "policy_term_years" INTEGER,
    "claim_settlement_ratio" DOUBLE PRECISION,
    "risk_level" "ProductRiskLevel" NOT NULL DEFAULT 'moderate',
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "exclusions" JSONB NOT NULL DEFAULT '[]',
    "source_url" VARCHAR(1000),
    "is_tieup_product" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "scraped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_interests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'pending',
    "callback_time" VARCHAR(100),
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(255),
    "date_of_birth" DATE,
    "gender" "Gender",
    "photo_s3_key" VARCHAR(500),
    "address_line1" VARCHAR(500),
    "landmark" VARCHAR(255),
    "locality" VARCHAR(255),
    "city" VARCHAR(100),
    "district" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "country" VARCHAR(100) NOT NULL DEFAULT 'India',
    "aadhaar_last4" VARCHAR(4),
    "kyc_method" "KycMethod",
    "kyc_verified_at" TIMESTAMP(3),
    "marital_status" "MaritalStatus",
    "number_of_dependents" INTEGER NOT NULL DEFAULT 0,
    "children_ages" INTEGER[],
    "occupation" VARCHAR(100),
    "employer" VARCHAR(100),
    "income_type" "IncomeType",
    "retirement_age" INTEGER NOT NULL DEFAULT 60,
    "is_primary_earner" BOOLEAN NOT NULL DEFAULT true,
    "dependents_rely_on_income" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "consent_type" VARCHAR(100) NOT NULL,
    "consent_text" TEXT NOT NULL,
    "ip_address" INET,
    "user_agent" VARCHAR(500),
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "method" VARCHAR(50),
    "reference_id" VARCHAR(255),
    "ip_address" INET,
    "outcome" VARCHAR(50),
    "error_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "insurance_output" JSONB NOT NULL,
    "investment_output" JSONB NOT NULL,
    "full_payload_sent" JSONB NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'generating',
    "version" INTEGER NOT NULL DEFAULT 1,
    "tieup_company_count" INTEGER NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewed_at" TIMESTAMP(3),

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_products" (
    "id" UUID NOT NULL,
    "recommendation_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "match_reason" VARCHAR(500) NOT NULL,

    CONSTRAINT "recommendation_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_role_idx" ON "admin_users"("role");

-- CreateIndex
CREATE INDEX "admin_users_is_active_idx" ON "admin_users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_session_id_key" ON "admin_sessions"("session_id");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_sessions_session_id_idx" ON "admin_sessions"("session_id");

-- CreateIndex
CREATE INDEX "admin_sessions_is_revoked_idx" ON "admin_sessions"("is_revoked");

-- CreateIndex
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_target_table_idx" ON "admin_audit_logs"("target_table");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "scoring_configs_is_active_idx" ON "scoring_configs"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_key_key" ON "notification_templates"("key");

-- CreateIndex
CREATE INDEX "notification_templates_channel_idx" ON "notification_templates"("channel");

-- CreateIndex
CREATE INDEX "notification_templates_is_active_idx" ON "notification_templates"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_profile_stage_idx" ON "users"("profile_stage");

-- CreateIndex
CREATE INDEX "users_kyc_status_idx" ON "users"("kyc_status");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_refresh_token_hash_idx" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_is_revoked_idx" ON "auth_sessions"("is_revoked");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "otp_logs_email_idx" ON "otp_logs"("email");

-- CreateIndex
CREATE INDEX "otp_logs_user_id_idx" ON "otp_logs"("user_id");

-- CreateIndex
CREATE INDEX "otp_logs_expires_at_idx" ON "otp_logs"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "income_profiles_user_id_key" ON "income_profiles"("user_id");

-- CreateIndex
CREATE INDEX "income_profiles_user_id_idx" ON "income_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_profiles_user_id_key" ON "expense_profiles"("user_id");

-- CreateIndex
CREATE INDEX "expense_profiles_user_id_idx" ON "expense_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_liability_profiles_user_id_key" ON "asset_liability_profiles"("user_id");

-- CreateIndex
CREATE INDEX "asset_liability_profiles_user_id_idx" ON "asset_liability_profiles"("user_id");

-- CreateIndex
CREATE INDEX "financial_goals_user_id_idx" ON "financial_goals"("user_id");

-- CreateIndex
CREATE INDEX "financial_goals_type_idx" ON "financial_goals"("type");

-- CreateIndex
CREATE UNIQUE INDEX "risk_profiles_user_id_key" ON "risk_profiles"("user_id");

-- CreateIndex
CREATE INDEX "risk_profiles_user_id_idx" ON "risk_profiles"("user_id");

-- CreateIndex
CREATE INDEX "risk_profiles_risk_category_idx" ON "risk_profiles"("risk_category");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_companies_name_key" ON "insurance_companies"("name");

-- CreateIndex
CREATE INDEX "insurance_companies_is_active_idx" ON "insurance_companies"("is_active");

-- CreateIndex
CREATE INDEX "insurance_companies_priority_order_idx" ON "insurance_companies"("priority_order");

-- CreateIndex
CREATE INDEX "insurance_companies_tieup_end_date_idx" ON "insurance_companies"("tieup_end_date");

-- CreateIndex
CREATE INDEX "insurance_companies_tieup_start_date_idx" ON "insurance_companies"("tieup_start_date");

-- CreateIndex
CREATE INDEX "tieup_audit_logs_company_id_idx" ON "tieup_audit_logs"("company_id");

-- CreateIndex
CREATE INDEX "tieup_audit_logs_admin_id_idx" ON "tieup_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "tieup_audit_logs_created_at_idx" ON "tieup_audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_products_external_id_key" ON "insurance_products"("external_id");

-- CreateIndex
CREATE INDEX "insurance_products_company_id_idx" ON "insurance_products"("company_id");

-- CreateIndex
CREATE INDEX "insurance_products_type_idx" ON "insurance_products"("type");

-- CreateIndex
CREATE INDEX "insurance_products_is_active_idx" ON "insurance_products"("is_active");

-- CreateIndex
CREATE INDEX "insurance_products_is_tieup_product_idx" ON "insurance_products"("is_tieup_product");

-- CreateIndex
CREATE INDEX "insurance_products_risk_level_idx" ON "insurance_products"("risk_level");

-- CreateIndex
CREATE INDEX "insurance_products_min_age_max_age_idx" ON "insurance_products"("min_age", "max_age");

-- CreateIndex
CREATE INDEX "insurance_interests_user_id_idx" ON "insurance_interests"("user_id");

-- CreateIndex
CREATE INDEX "insurance_interests_product_id_idx" ON "insurance_interests"("product_id");

-- CreateIndex
CREATE INDEX "insurance_interests_status_idx" ON "insurance_interests"("status");

-- CreateIndex
CREATE INDEX "insurance_interests_created_at_idx" ON "insurance_interests"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_city_idx" ON "user_profiles"("city");

-- CreateIndex
CREATE INDEX "user_profiles_state_idx" ON "user_profiles"("state");

-- CreateIndex
CREATE INDEX "user_profiles_kyc_verified_at_idx" ON "user_profiles"("kyc_verified_at");

-- CreateIndex
CREATE INDEX "kyc_consents_user_id_idx" ON "kyc_consents"("user_id");

-- CreateIndex
CREATE INDEX "kyc_consents_consented_at_idx" ON "kyc_consents"("consented_at");

-- CreateIndex
CREATE INDEX "kyc_audit_logs_user_id_idx" ON "kyc_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "kyc_audit_logs_action_idx" ON "kyc_audit_logs"("action");

-- CreateIndex
CREATE INDEX "kyc_audit_logs_created_at_idx" ON "kyc_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_recommendations_user_id_idx" ON "ai_recommendations"("user_id");

-- CreateIndex
CREATE INDEX "ai_recommendations_status_idx" ON "ai_recommendations"("status");

-- CreateIndex
CREATE INDEX "ai_recommendations_generated_at_idx" ON "ai_recommendations"("generated_at");

-- CreateIndex
CREATE INDEX "recommendation_products_recommendation_id_idx" ON "recommendation_products"("recommendation_id");

-- CreateIndex
CREATE INDEX "recommendation_products_product_id_idx" ON "recommendation_products"("product_id");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_configs" ADD CONSTRAINT "scoring_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_logs" ADD CONSTRAINT "otp_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_profiles" ADD CONSTRAINT "income_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_profiles" ADD CONSTRAINT "expense_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_liability_profiles" ADD CONSTRAINT "asset_liability_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_profiles" ADD CONSTRAINT "risk_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_companies" ADD CONSTRAINT "insurance_companies_added_by_admin_fkey" FOREIGN KEY ("added_by_admin") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tieup_audit_logs" ADD CONSTRAINT "tieup_audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "insurance_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tieup_audit_logs" ADD CONSTRAINT "tieup_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_products" ADD CONSTRAINT "insurance_products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "insurance_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_products" ADD CONSTRAINT "insurance_products_managed_by_admin_fkey" FOREIGN KEY ("managed_by_admin") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_interests" ADD CONSTRAINT "insurance_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_interests" ADD CONSTRAINT "insurance_interests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "insurance_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_consents" ADD CONSTRAINT "kyc_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_audit_logs" ADD CONSTRAINT "kyc_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_products" ADD CONSTRAINT "recommendation_products_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "ai_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_products" ADD CONSTRAINT "recommendation_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "insurance_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

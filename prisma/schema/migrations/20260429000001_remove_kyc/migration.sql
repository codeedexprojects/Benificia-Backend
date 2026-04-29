-- Remove KYC/Aadhaar verification — Phase 1 does not require it

-- Drop KYC tables
DROP TABLE IF EXISTS "kyc_audit_logs";
DROP TABLE IF EXISTS "kyc_consents";

-- Drop KYC columns from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "kyc_status";

-- Drop KYC columns from user_profiles
ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "aadhaar_last4";
ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "kyc_method";
ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "kyc_verified_at";

-- Drop KYC-related indexes if they exist
DROP INDEX IF EXISTS "users_kyc_status_idx";

-- Remove aadhaar_kyc from OtpPurpose enum
-- PostgreSQL does not support removing enum values directly;
-- rename to a tombstone value so existing rows are unaffected.
-- (No rows should have this value, but this is safe either way.)
ALTER TYPE "OtpPurpose" RENAME VALUE 'aadhaar_kyc' TO '_removed_aadhaar_kyc';

-- Remove kyc_in_progress and kyc_complete from ProfileStage enum
ALTER TYPE "ProfileStage" RENAME VALUE 'kyc_in_progress' TO '_removed_kyc_in_progress';
ALTER TYPE "ProfileStage" RENAME VALUE 'kyc_complete' TO '_removed_kyc_complete';

-- Drop KycStatus and KycMethod enums (no columns reference them now)
DROP TYPE IF EXISTS "KycStatus";
DROP TYPE IF EXISTS "KycMethod";

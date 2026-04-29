-- Migration: phone
-- Adds phone + isPhoneVerified to users.
-- Renames otp_logs.email -> recipient and adds channel column.
-- The rename is done safely: add recipient with a default, backfill from
-- email, remove the default, then drop email.

-- ── 1. users table ─────────────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN "phone" VARCHAR(15),
  ADD COLUMN "is_phone_verified" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- ── 2. otp_logs table ──────────────────────────────────────────

-- 2a. Add recipient with a temporary default so existing rows are valid
ALTER TABLE "otp_logs"
  ADD COLUMN "recipient" VARCHAR(255) NOT NULL DEFAULT '';

-- 2b. Backfill recipient from the existing email column
UPDATE "otp_logs" SET "recipient" = "email";

-- 2c. Remove the temporary default — column stays NOT NULL
ALTER TABLE "otp_logs"
  ALTER COLUMN "recipient" DROP DEFAULT;

-- 2d. Add channel enum and column (default email keeps existing rows valid)
CREATE TYPE "OtpChannel" AS ENUM ('email', 'phone');

ALTER TABLE "otp_logs"
  ADD COLUMN "channel" "OtpChannel" NOT NULL DEFAULT 'email';

-- 2e. Drop the old email column
ALTER TABLE "otp_logs" DROP COLUMN "email";

-- 2f. Replace old email index with composite (recipient, channel) index
DROP INDEX IF EXISTS "otp_logs_email_idx";

CREATE INDEX "otp_logs_recipient_channel_idx" ON "otp_logs"("recipient", "channel");

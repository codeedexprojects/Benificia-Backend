-- Migration: nullable_user_email
-- Makes users.email nullable so phone-only users can register without an email.

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

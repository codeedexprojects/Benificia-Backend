-- Migration: replace yob with age, remove number_of_members and number_of_dependents from user_profiles

ALTER TABLE "user_profiles"
  ADD COLUMN "age" INTEGER;

ALTER TABLE "user_profiles"
  DROP COLUMN IF EXISTS "year_of_birth",
  DROP COLUMN IF EXISTS "number_of_members",
  DROP COLUMN IF EXISTS "number_of_dependents";

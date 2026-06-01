-- Enable pg_trgm for trigram-based ILIKE on text columns
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on user_profiles.full_name for fast case-insensitive search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_profiles_full_name_trgm_idx"
  ON "user_profiles" USING gin ("full_name" gin_trgm_ops);

-- Trigram indexes on users table for email/phone search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_email_trgm_idx"
  ON "users" USING gin ("email" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_phone_trgm_idx"
  ON "users" USING gin ("phone" gin_trgm_ops);

-- Composite index for the common admin list query (no search, ordered by created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_admin_list_idx"
  ON "users" ("deleted_at", "created_at" DESC)
  WHERE "deleted_at" IS NULL;

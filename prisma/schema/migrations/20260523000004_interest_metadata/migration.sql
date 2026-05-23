-- Store AI plan snapshot data (reasoning, match_tags, premium, coverage string, category)
-- so the admin can see full details of what the user expressed interest in.
ALTER TABLE "insurance_interests" ADD COLUMN "metadata" JSONB;

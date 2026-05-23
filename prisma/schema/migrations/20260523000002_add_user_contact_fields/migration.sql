ALTER TABLE "users"
  ADD COLUMN "is_contacted"  BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "contact_note"  TEXT,
  ADD COLUMN "contacted_at"  TIMESTAMP(3);

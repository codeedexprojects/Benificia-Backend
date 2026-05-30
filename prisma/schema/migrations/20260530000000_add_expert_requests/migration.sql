CREATE TYPE "ExpertRequestStatus" AS ENUM ('unread', 'read', 'resolved');

CREATE TABLE "expert_requests" (
  "id"         UUID                    NOT NULL DEFAULT gen_random_uuid(),
  "name"       VARCHAR(255)            NOT NULL,
  "phone"      VARCHAR(30),
  "message"    TEXT                    NOT NULL,
  "status"     "ExpertRequestStatus"   NOT NULL DEFAULT 'unread',
  "user_id"    UUID                    NOT NULL,
  "created_at" TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3)            NOT NULL,

  CONSTRAINT "expert_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expert_requests_status_idx"     ON "expert_requests"("status");
CREATE INDEX "expert_requests_user_id_idx"    ON "expert_requests"("user_id");
CREATE INDEX "expert_requests_created_at_idx" ON "expert_requests"("created_at");

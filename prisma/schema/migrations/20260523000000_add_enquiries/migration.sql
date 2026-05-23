CREATE TYPE "EnquiryStatus" AS ENUM ('unread', 'read', 'resolved');

CREATE TABLE "enquiries" (
  "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
  "name"       VARCHAR(255)  NOT NULL,
  "message"    TEXT          NOT NULL,
  "status"     "EnquiryStatus" NOT NULL DEFAULT 'unread',
  "created_at" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "enquiries_status_idx"     ON "enquiries"("status");
CREATE INDEX "enquiries_created_at_idx" ON "enquiries"("created_at");

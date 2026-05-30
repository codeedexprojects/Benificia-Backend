-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('contact_form', 'expert_request');

-- AlterTable
ALTER TABLE "enquiries"
  ADD COLUMN "source" "EnquirySource" NOT NULL DEFAULT 'contact_form',
  ADD COLUMN "user_id" UUID;

-- CreateIndex
CREATE INDEX "enquiries_source_idx" ON "enquiries"("source");

-- CreateIndex
CREATE INDEX "enquiries_user_id_idx" ON "enquiries"("user_id");

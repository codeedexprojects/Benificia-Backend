-- Add unique constraint on (user_id, product_id) to InsuranceInterest
-- Allows upsert when user re-clicks "Get Quotes" for the same product
ALTER TABLE "insurance_interests"
  ADD CONSTRAINT "insurance_interests_user_id_product_id_key" UNIQUE ("user_id", "product_id");

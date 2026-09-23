CREATE TABLE "commerce_orders" (
  "id" UUID PRIMARY KEY,
  "owner_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('pending','accepted','completed','cancelled')),
  "items" JSONB NOT NULL CHECK (jsonb_typeof("items") = 'array' AND jsonb_array_length("items") > 0),
  "total_cents" INTEGER NOT NULL CHECK ("total_cents" > 0),
  "currency" CHAR(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "commerce_orders_owner_id_created_at_idx" ON "commerce_orders"("owner_id", "created_at");
CREATE TABLE "manual_payments" (
  "id" UUID PRIMARY KEY,
  "order_id" UUID NOT NULL REFERENCES "commerce_orders"("id") ON DELETE RESTRICT,
  "method" VARCHAR(10) NOT NULL CHECK ("method" IN ('cash','yape','plin')),
  "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('pending','pending_review','verified','rejected')),
  "amount_cents" INTEGER NOT NULL CHECK ("amount_cents" > 0),
  "currency" CHAR(3) NOT NULL,
  "proof_file_id" UUID REFERENCES "stored_files"("id") ON DELETE RESTRICT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
  "rejection_reason" VARCHAR(300),
  CHECK (("method" = 'cash' AND "proof_file_id" IS NULL AND "status" <> 'pending_review') OR ("method" IN ('yape','plin') AND "proof_file_id" IS NOT NULL AND "status" <> 'pending')),
  CHECK (("status" IN ('verified','rejected') AND "reviewed_at" IS NOT NULL AND "reviewed_by" IS NOT NULL) OR ("status" IN ('pending','pending_review') AND "reviewed_at" IS NULL AND "reviewed_by" IS NULL)),
  CHECK ("status" <> 'rejected' OR length(trim("rejection_reason")) > 0 AND "rejection_reason" IS NOT NULL)
);
CREATE UNIQUE INDEX "manual_payments_proof_file_id_key" ON "manual_payments"("proof_file_id");
CREATE UNIQUE INDEX "manual_payments_one_active" ON "manual_payments"("order_id") WHERE "status" <> 'rejected';
CREATE INDEX "manual_payments_order_id_created_at_idx" ON "manual_payments"("order_id", "created_at");

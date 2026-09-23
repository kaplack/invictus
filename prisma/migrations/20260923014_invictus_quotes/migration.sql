CREATE TABLE "quote_requests" (
 "id" UUID NOT NULL PRIMARY KEY,
 "user_id" UUID,
 "contact_name" VARCHAR(120) NOT NULL,
 "email" VARCHAR(254) NOT NULL,
 "phone" VARCHAR(40) NOT NULL,
 "quantity" INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 100000),
 "required_date" DATE NOT NULL,
 "design" VARCHAR(5000) NOT NULL,
 "status" VARCHAR(20) NOT NULL DEFAULT 'RECEIVED' CHECK (status = 'RECEIVED'),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "quote_requests_created_at_idx" ON "quote_requests"("created_at");

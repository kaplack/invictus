CREATE TABLE "disciplines" (
 "id" UUID PRIMARY KEY, "code" VARCHAR(40) NOT NULL UNIQUE, "name" VARCHAR(120) NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "disciplines" ("id", "code", "name") VALUES
 ('d1000000-0000-4000-8000-000000000001', 'SWIMMING', 'Natación'),
 ('d1000000-0000-4000-8000-000000000002', 'RUNNING', 'Running'),
 ('d1000000-0000-4000-8000-000000000003', 'CYCLING', 'Ciclismo'),
 ('d1000000-0000-4000-8000-000000000004', 'TRIATHLON', 'Triatlón'),
 ('d1000000-0000-4000-8000-000000000005', 'TREKKING', 'Trekking');
ALTER TABLE "events" ADD COLUMN "discipline_id" UUID REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "events_id_team_id_key" ON "events"("id", "team_id");
ALTER TABLE "teams" ADD COLUMN "payment_recipient_id" UUID REFERENCES "payment_recipients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "teams_payment_recipient_id_key" ON "teams"("payment_recipient_id");

CREATE TABLE "event_categories" (
 "id" UUID PRIMARY KEY,
 "event_id" UUID NOT NULL REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "name" VARCHAR(160) NOT NULL CHECK (length(trim(name)) > 0),
 "description" VARCHAR(2000), "gender" VARCHAR(10), "min_age" INTEGER, "max_age" INTEGER,
 "modality" VARCHAR(100), "price_cents" INTEGER NOT NULL CHECK (price_cents >= 0),
 "currency" CHAR(3) NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN','USD')),
 "capacity" INTEGER CHECK (capacity > 0), "active" BOOLEAN NOT NULL DEFAULT true,
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
 CHECK (gender IS NULL OR gender IN ('FEMALE','MALE')),
 CHECK (min_age BETWEEN 0 AND 120), CHECK (max_age BETWEEN 0 AND 120),
 CHECK (min_age IS NULL OR max_age IS NULL OR min_age <= max_age)
);
CREATE UNIQUE INDEX "event_categories_event_id_name_key" ON "event_categories"("event_id", "name");
CREATE INDEX "event_categories_event_id_active_idx" ON "event_categories"("event_id", "active");

CREATE TYPE "TeamPaymentType" AS ENUM ('YAPE','PLIN','BANK_TRANSFER','CASH');
CREATE TABLE "team_payment_methods" (
 "id" UUID PRIMARY KEY,
 "team_id" UUID NOT NULL REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "type" "TeamPaymentType" NOT NULL, "label" VARCHAR(120) NOT NULL CHECK (length(trim(label)) > 0),
 "phone" VARCHAR(40), "holder_name" VARCHAR(120), "bank" VARCHAR(120), "account_number" VARCHAR(40), "cci" VARCHAR(20),
 "currency" CHAR(3) NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN','USD')), "instructions" VARCHAR(2000),
 "qr_file_id" UUID REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
 CHECK ("type" NOT IN ('YAPE','PLIN') OR (phone IS NOT NULL AND holder_name IS NOT NULL AND currency = 'PEN')),
 CHECK ("type" != 'BANK_TRANSFER' OR (bank IS NOT NULL AND account_number IS NOT NULL AND holder_name IS NOT NULL)),
 CHECK ("type" != 'CASH' OR instructions IS NOT NULL)
);
CREATE UNIQUE INDEX "team_payment_methods_id_team_id_key" ON "team_payment_methods"("id", "team_id");
CREATE INDEX "team_payment_methods_team_id_active_idx" ON "team_payment_methods"("team_id", "active");
CREATE TABLE "event_payment_methods" (
 "event_id" UUID NOT NULL, "method_id" UUID NOT NULL, "team_id" UUID NOT NULL,
 PRIMARY KEY ("event_id", "method_id"),
 FOREIGN KEY ("event_id", "team_id") REFERENCES "events"("id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION,
 FOREIGN KEY ("method_id", "team_id") REFERENCES "team_payment_methods"("id", "team_id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
-- EventRegistration's unique (event_id,user_id) remains: one category per participant/event.

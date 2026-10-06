CREATE TABLE "external_participations" (
 "id" UUID NOT NULL, "participant_profile_id" UUID NOT NULL, "discipline_id" UUID NOT NULL,
 "event_name" VARCHAR(160) NOT NULL, "year" INTEGER NOT NULL, "event_date" DATE,
 "location" VARCHAR(160), "event_test" VARCHAR(120), "category" VARCHAR(120), "result" VARCHAR(120), "position" INTEGER,
 "organizer" VARCHAR(160), "description" VARCHAR(2000), "official_url" VARCHAR(2048),
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "external_participations_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "external_participations_participant_profile_id_fkey" FOREIGN KEY ("participant_profile_id") REFERENCES "participant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "external_participations_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "external_participations_year_check" CHECK ("year" BETWEEN 1900 AND 9999),
 CONSTRAINT "external_participations_position_check" CHECK ("position" IS NULL OR "position">0),
 CONSTRAINT "external_participations_date_year_check" CHECK ("event_date" IS NULL OR EXTRACT(YEAR FROM "event_date")="year")
);
CREATE INDEX "external_participations_participant_profile_id_year_idx" ON "external_participations"("participant_profile_id","year");
CREATE INDEX "external_participations_discipline_id_idx" ON "external_participations"("discipline_id");

CREATE TABLE "participant_disciplines" (
 "participant_profile_id" UUID NOT NULL,
 "discipline_id" UUID NOT NULL,
 "is_primary" BOOLEAN NOT NULL DEFAULT false,
 CONSTRAINT "participant_disciplines_pkey" PRIMARY KEY ("participant_profile_id", "discipline_id"),
 CONSTRAINT "participant_disciplines_participant_profile_id_fkey" FOREIGN KEY ("participant_profile_id") REFERENCES "participant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "participant_disciplines_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "participant_disciplines_discipline_id_idx" ON "participant_disciplines"("discipline_id");
CREATE UNIQUE INDEX "participant_disciplines_one_primary" ON "participant_disciplines"("participant_profile_id") WHERE "is_primary" = true;
-- Preserve the legacy JSON. Match only strings with exactly one catalog candidate.
WITH candidates AS (
 SELECT p.id AS profile_id, item.value, d.id AS discipline_id,
 count(*) OVER (PARTITION BY p.id,item.value) AS matches
 FROM participant_profiles p
 CROSS JOIN LATERAL (SELECT DISTINCT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.disciplines)='array' THEN p.disciplines ELSE '[]'::jsonb END)) item
 JOIN disciplines d ON jsonb_typeof(item.value)='string' AND
 (lower(trim(item.value #>> '{}'))=lower(d.code) OR lower(trim(item.value #>> '{}'))=lower(d.name))
)
INSERT INTO participant_disciplines (participant_profile_id,discipline_id)
SELECT DISTINCT profile_id,discipline_id FROM candidates WHERE matches=1
ON CONFLICT DO NOTHING;

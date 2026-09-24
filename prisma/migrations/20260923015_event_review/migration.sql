ALTER TABLE "events" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'INVICTUS', ADD COLUMN "review_status" TEXT NOT NULL DEFAULT 'DRAFT', ADD COLUMN "review_note" TEXT;
UPDATE "events" e SET "source" = 'EXTERNAL', "review_status" = CASE WHEN e.status = 'PUBLISHED' THEN 'APPROVED' ELSE 'DRAFT' END FROM "users" u WHERE e.organizer_id = u.id AND u.role != 'ADMIN';

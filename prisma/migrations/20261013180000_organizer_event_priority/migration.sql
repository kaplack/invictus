ALTER TABLE "users" ADD COLUMN "preferred_event_id" UUID;
ALTER TABLE "users" ADD CONSTRAINT "users_preferred_event_id_fkey" FOREIGN KEY ("preferred_event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

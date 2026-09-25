-- Additive transition: historical ownership is mapped explicitly later.
ALTER TABLE "events"
  ADD COLUMN "team_id" UUID,
  ADD COLUMN "created_by_user_id" UUID,
  ADD CONSTRAINT "events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "events_team_status_idx" ON "events"("team_id", "status");

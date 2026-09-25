CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TABLE "teams" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(120) NOT NULL,
  "description" VARCHAR(2000) NOT NULL DEFAULT '',
  "logo_file_id" UUID REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "contact_name" VARCHAR(120),
  "phone" VARCHAR(40),
  "whatsapp" VARCHAR(40),
  "email" VARCHAR(254),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "teams_name_not_blank" CHECK (length(trim(name)) > 0)
);
CREATE TABLE "team_members" (
  "id" UUID PRIMARY KEY,
  "team_id" UUID NOT NULL REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
  "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");
CREATE INDEX "team_members_user_id_joined_at_idx" ON "team_members"("user_id", "joined_at");

ALTER TABLE "users" ADD COLUMN "username" VARCHAR(30);
-- Unique deterministic legacy usernames; preserves every existing account field.
WITH numbered AS (
  SELECT "id", row_number() OVER (ORDER BY "id") AS ordinal FROM "users"
)
UPDATE "users" SET "username" = 'user_' || numbered.ordinal::text
FROM numbered WHERE "users"."id" = numbered."id";
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "name" SET DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "last_name" SET DEFAULT '';
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
ALTER TABLE "users" ADD CONSTRAINT "users_username_format"
  CHECK ("username" ~ '^[a-z0-9._]{3,30}$');

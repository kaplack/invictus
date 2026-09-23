CREATE TABLE "stored_files" (
  "id" UUID NOT NULL PRIMARY KEY,
  "owner_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "key" VARCHAR(100) NOT NULL UNIQUE,
  "name" VARCHAR(180) NOT NULL,
  "content_type" VARCHAR(100) NOT NULL,
  "size" INTEGER NOT NULL CHECK ("size" > 0),
  "visibility" VARCHAR(10) NOT NULL CHECK ("visibility" IN ('public', 'private')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);
CREATE INDEX "stored_files_owner_id_created_at_idx" ON "stored_files"("owner_id", "created_at");

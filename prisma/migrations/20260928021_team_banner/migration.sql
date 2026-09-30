ALTER TABLE "teams" ADD COLUMN "banner_file_id" UUID;
ALTER TABLE "teams" ADD CONSTRAINT "teams_banner_file_id_fkey"
  FOREIGN KEY ("banner_file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

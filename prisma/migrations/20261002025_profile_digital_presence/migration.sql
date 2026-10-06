CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'YOUTUBE', 'LINKEDIN');
ALTER TABLE "participant_profiles" ADD COLUMN "website_url" VARCHAR(2048);
CREATE TABLE "participant_social_links" (
 "id" UUID NOT NULL,
 "participant_profile_id" UUID NOT NULL,
 "platform" "SocialPlatform" NOT NULL,
 "url" VARCHAR(2048) NOT NULL,
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "participant_social_links_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "participant_social_links_profile_fkey" FOREIGN KEY ("participant_profile_id") REFERENCES "participant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "participant_social_links_participant_profile_id_platform_key" ON "participant_social_links"("participant_profile_id", "platform");

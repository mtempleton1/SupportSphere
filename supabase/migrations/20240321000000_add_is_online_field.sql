-- Add isOnline column to UserProfiles
ALTER TABLE "UserProfiles"
ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;

-- Set existing records to false
UPDATE "UserProfiles"
SET "isOnline" = false
WHERE "isOnline" IS NULL; 
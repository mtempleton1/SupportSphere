-- Add new columns to UserProfiles table
ALTER TABLE "UserProfiles"
ADD COLUMN "title" TEXT,
ADD COLUMN "status" TEXT DEFAULT NULL
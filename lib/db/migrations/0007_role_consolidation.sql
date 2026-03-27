-- Migration: Consolidate roles from 6 → 2 (admin, user)
-- Maps: supersystemAdmin/systemAdmin → admin; owner/member/client/support → user
-- Team roles: manager/inspector → member (only owner + member remain)

-- Step 1: Drop the default on the role column
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

-- Step 2: Convert the columns to text temporarily
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text USING "role"::text;
ALTER TABLE "team_invitations" ALTER COLUMN "role" SET DATA TYPE text USING "role"::text;

-- Step 3: Migrate data — map old roles to new roles
UPDATE "users" SET "role" = 'admin' WHERE "role" IN ('supersystemAdmin', 'systemAdmin');
UPDATE "users" SET "role" = 'user' WHERE "role" IN ('owner', 'member', 'client', 'support');
UPDATE "team_invitations" SET "role" = 'admin' WHERE "role" IN ('supersystemAdmin', 'systemAdmin');
UPDATE "team_invitations" SET "role" = 'user' WHERE "role" IN ('owner', 'member', 'client', 'support');

-- Step 4: Drop the old enum type
DROP TYPE IF EXISTS "public"."UserRole";

-- Step 5: Create new enum with only 2 values
CREATE TYPE "public"."UserRole" AS ENUM('admin', 'user');

-- Step 6: Convert columns back to the new enum
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."UserRole" USING "role"::"public"."UserRole";
ALTER TABLE "team_invitations" ALTER COLUMN "role" SET DATA TYPE "public"."UserRole" USING "role"::"public"."UserRole";

-- Step 7: Set new default
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'::"public"."UserRole";

-- Step 8: Simplify team_members roles (varchar column, no enum)
UPDATE "team_members" SET "role" = 'member' WHERE "role" NOT IN ('owner', 'member');

ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "role" varchar(50);
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'member';

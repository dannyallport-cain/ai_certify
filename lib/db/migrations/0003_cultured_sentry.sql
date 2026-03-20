ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE varchar(50) USING "role"::varchar;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member';
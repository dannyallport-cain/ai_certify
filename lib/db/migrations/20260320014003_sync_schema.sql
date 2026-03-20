DO $$ BEGIN
 CREATE TYPE "public"."UserRole" AS ENUM('supersystemAdmin', 'systemAdmin', 'support', 'owner', 'member', 'client');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."UserStatus" AS ENUM('pending', 'active', 'inactive', 'suspended');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "name" SET DATA TYPE text USING "name"::text;
--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "plan_name" SET DATA TYPE text USING "plan_name"::text;
--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "subscription_status" SET DATA TYPE text USING "subscription_status"::text;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE text USING "name"::text;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE text USING "email"::text;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."UserRole";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."UserRole" USING "role"::text::"public"."UserRole";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'member';
--> statement-breakpoint
UPDATE "invitations" SET "role" = 'member' WHERE "role" IS NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "discount_percentage" integer;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "subscription_bypass" boolean;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "subscription_bypass_reason" text;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "subscription_bypass_removed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "subscription_bypass_set_at" timestamp;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "subscription_bypass_set_by" integer;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "trial_end_date" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "custom_email" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "custom_email_signature" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "team_id" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "UserStatus";
--> statement-breakpoint
UPDATE "users" SET "status" = 'active'::"public"."UserStatus" WHERE "status" IS NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."UserStatus";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_r2_key" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_updated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deactivated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signature_r2_key" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signature_updated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signature_url" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status_changed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "token" varchar(255);
--> statement-breakpoint
UPDATE "invitations"
SET "token" = CONCAT('invite-', "id")
WHERE "token" IS NULL OR "token" = '';
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "token" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "token" DROP DEFAULT;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_key" ON "invitations" ("token");
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates" ADD COLUMN IF NOT EXISTS "published_at" timestamp;
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates" ADD COLUMN IF NOT EXISTS "parent_template_id" integer;
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates" ADD COLUMN IF NOT EXISTS "final_artifact_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates" ADD COLUMN IF NOT EXISTS "final_artifact_mime_type" varchar(100);
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates" ADD COLUMN IF NOT EXISTS "final_artifact_base64" text;
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates" ADD COLUMN IF NOT EXISTS "storage_provider" varchar(50);
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates" ADD COLUMN IF NOT EXISTS "storage_key" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_disseminator_templates" ADD CONSTRAINT "report_disseminator_templates_parent_template_id_report_disseminator_templates_id_fk" FOREIGN KEY ("parent_template_id") REFERENCES "public"."report_disseminator_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

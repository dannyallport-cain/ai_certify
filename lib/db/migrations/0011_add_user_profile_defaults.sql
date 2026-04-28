ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "eicr_profile_defaults" json;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "eicr_inspector_history" json;

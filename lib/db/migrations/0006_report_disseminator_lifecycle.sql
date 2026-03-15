ALTER TABLE "report_disseminator_templates"
ADD COLUMN IF NOT EXISTS "published_at" timestamp;
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates"
ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates"
ADD COLUMN IF NOT EXISTS "parent_template_id" integer;
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates"
ADD COLUMN IF NOT EXISTS "final_artifact_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates"
ADD COLUMN IF NOT EXISTS "final_artifact_mime_type" varchar(100);
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates"
ADD COLUMN IF NOT EXISTS "final_artifact_base64" text;
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates"
ADD COLUMN IF NOT EXISTS "storage_provider" varchar(50);
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates"
ADD COLUMN IF NOT EXISTS "storage_key" text;
--> statement-breakpoint
ALTER TABLE "report_disseminator_templates"
ADD CONSTRAINT "report_disseminator_templates_parent_template_id_report_disseminator_templates_id_fk"
FOREIGN KEY ("parent_template_id")
REFERENCES "public"."report_disseminator_templates"("id")
ON DELETE set null
ON UPDATE no action;

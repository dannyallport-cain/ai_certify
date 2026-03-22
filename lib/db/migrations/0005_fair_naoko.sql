CREATE TABLE "report_disseminator_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"template_version" integer NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"source_file_name" varchar(255) NOT NULL,
	"source_mime_type" varchar(100) NOT NULL,
	"source_pdf_base64" text NOT NULL,
	"fields" json NOT NULL,
	"values" json NOT NULL,
	"notes" text,
	"completed_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_disseminator_reports" ADD CONSTRAINT "report_disseminator_reports_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_disseminator_reports" ADD CONSTRAINT "report_disseminator_reports_template_id_report_disseminator_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_disseminator_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_disseminator_reports" ADD CONSTRAINT "report_disseminator_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
-- Fire alarm surveys become first-class records in the dashboard.
--
-- A room capture used to be an anonymous scan: no name, no client and no job
-- link, so it could only ever be shown as "the latest one". These columns let a
-- survey be named, attached to a customer, and attached to a ServiceM8 job
-- (which is the diary entry the engineer already has) so the client details are
-- inherited from ServiceM8 instead of typed in again.
ALTER TABLE "fire_alarm_room_captures"
  ADD COLUMN IF NOT EXISTS "customer_id" integer REFERENCES "customers"("id") ON DELETE SET NULL;

ALTER TABLE "fire_alarm_room_captures"
  ADD COLUMN IF NOT EXISTS "survey_status" varchar(32) NOT NULL DEFAULT 'draft';

ALTER TABLE "fire_alarm_room_captures"
  ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

ALTER TABLE "fire_alarm_room_captures"
  ADD COLUMN IF NOT EXISTS "servicem8_company_uuid" varchar(255);

ALTER TABLE "fire_alarm_room_captures"
  ADD COLUMN IF NOT EXISTS "servicem8_company_name" varchar(255);

ALTER TABLE "fire_alarm_room_captures"
  ADD COLUMN IF NOT EXISTS "servicem8_job_uuid" varchar(255);

ALTER TABLE "fire_alarm_room_captures"
  ADD COLUMN IF NOT EXISTS "servicem8_job_number" varchar(100);

ALTER TABLE "fire_alarm_room_captures"
  ADD COLUMN IF NOT EXISTS "servicem8_job_date" varchar(40);

ALTER TABLE "fire_alarm_room_captures"
  ADD COLUMN IF NOT EXISTS "servicem8_job_address" text;

-- The dashboard lists surveys per team, newest first, and filters by job.
CREATE INDEX IF NOT EXISTS "fire_alarm_room_captures_team_updated_idx"
  ON "fire_alarm_room_captures" ("team_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "fire_alarm_room_captures_servicem8_job_idx"
  ON "fire_alarm_room_captures" ("servicem8_job_uuid");

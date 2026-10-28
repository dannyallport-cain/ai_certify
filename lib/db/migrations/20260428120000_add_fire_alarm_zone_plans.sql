CREATE TABLE IF NOT EXISTS "fire_alarm_zone_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" integer NOT NULL REFERENCES "teams"("id"),
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "capture_id" integer REFERENCES "fire_alarm_room_captures"("id") ON DELETE SET NULL,
  "external_session_id" varchar(255) NOT NULL,
  "share_token" varchar(64) NOT NULL,
  "title" varchar(255),
  "session" json NOT NULL,
  "zones" json NOT NULL,
  "legend" json NOT NULL,
  "edit_enabled" boolean NOT NULL DEFAULT true,
  "emailed_to" varchar(320),
  "emailed_at" timestamp,
  "last_viewed_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fire_alarm_zone_plans_share_token_idx"
  ON "fire_alarm_zone_plans" ("share_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_zone_plans_team_id_idx"
  ON "fire_alarm_zone_plans" ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_zone_plans_team_session_idx"
  ON "fire_alarm_zone_plans" ("team_id", "external_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_zone_plans_created_at_idx"
  ON "fire_alarm_zone_plans" ("created_at");

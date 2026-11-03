CREATE TABLE IF NOT EXISTS "fire_alarm_building_designs" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" integer NOT NULL REFERENCES "teams"("id"),
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "capture_id" integer REFERENCES "fire_alarm_room_captures"("id") ON DELETE SET NULL,
  "external_session_id" varchar(255),
  "name" varchar(255) NOT NULL,
  "site_name" varchar(255),
  "design" json NOT NULL,
  "floor_count" integer NOT NULL DEFAULT 0,
  "device_count" integer NOT NULL DEFAULT 0,
  "zone_count" integer NOT NULL DEFAULT 0,
  "status" varchar(32) NOT NULL DEFAULT 'draft',
  "share_token" varchar(64),
  "edit_enabled" boolean NOT NULL DEFAULT false,
  "published_at" timestamp,
  "last_viewed_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fire_alarm_building_designs_share_token_idx"
  ON "fire_alarm_building_designs" ("share_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_building_designs_team_id_idx"
  ON "fire_alarm_building_designs" ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_building_designs_team_session_idx"
  ON "fire_alarm_building_designs" ("team_id", "external_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_building_designs_updated_at_idx"
  ON "fire_alarm_building_designs" ("updated_at");

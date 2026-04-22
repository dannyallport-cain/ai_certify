CREATE TABLE IF NOT EXISTS "fire_alarm_room_captures" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" integer NOT NULL REFERENCES "teams"("id"),
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "external_session_id" varchar(255) NOT NULL,
  "session_name" varchar(255),
  "capture_status" varchar(50) NOT NULL DEFAULT 'completed',
  "units" varchar(20),
  "started_at" timestamp,
  "ended_at" timestamp,
  "device_count" integer NOT NULL DEFAULT 0,
  "metadata" json,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fire_alarm_room_captures_team_session_idx"
  ON "fire_alarm_room_captures" ("team_id", "external_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_room_captures_team_id_idx"
  ON "fire_alarm_room_captures" ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_room_captures_created_by_idx"
  ON "fire_alarm_room_captures" ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_room_captures_created_at_idx"
  ON "fire_alarm_room_captures" ("created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fire_alarm_capture_devices" (
  "id" serial PRIMARY KEY NOT NULL,
  "capture_id" integer NOT NULL REFERENCES "fire_alarm_room_captures"("id") ON DELETE CASCADE,
  "external_device_id" varchar(255),
  "device_type" varchar(50) NOT NULL,
  "label" varchar(255),
  "manufacturer_name" varchar(255),
  "manufacturer_confidence" real,
  "confidence" real,
  "location_x" real,
  "location_y" real,
  "location_z" real,
  "bounding_box" json,
  "notes" text,
  "source" varchar(50),
  "room_id" varchar(255),
  "wall_segment_id" varchar(255),
  "identified_by_user" boolean NOT NULL DEFAULT false,
  "metadata" json,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_capture_devices_capture_id_idx"
  ON "fire_alarm_capture_devices" ("capture_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_capture_devices_device_type_idx"
  ON "fire_alarm_capture_devices" ("device_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_capture_devices_external_device_id_idx"
  ON "fire_alarm_capture_devices" ("external_device_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_alarm_capture_devices_created_at_idx"
  ON "fire_alarm_capture_devices" ("created_at");

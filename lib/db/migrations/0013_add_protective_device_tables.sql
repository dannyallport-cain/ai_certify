CREATE TABLE IF NOT EXISTS "main_protective_device" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(100) NOT NULL,
  "label" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "main_protective_device_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "circuit_protective_device" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(100) NOT NULL,
  "label" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "circuit_protective_device_code_unique" UNIQUE("code")
);

INSERT INTO "main_protective_device" ("code", "label", "sort_order", "is_active")
VALUES
  ('BS_88', 'BS 88', 10, true),
  ('BS_1361_TYPE_I', 'BS 1361 Type I', 20, true),
  ('BS_1361_TYPE_II', 'BS 1361 Type II', 30, true),
  ('BS_3036', 'BS 3036', 40, true),
  ('MCCB', 'MCCB', 50, true),
  ('ACB', 'ACB', 60, true),
  ('SWITCH_FUSE', 'Switch Fuse', 70, true),
  ('OTHER', 'Other', 999, true)
ON CONFLICT ("code") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();

INSERT INTO "circuit_protective_device" ("code", "label", "sort_order", "is_active")
VALUES
  ('BS_60898_TYPE_B', 'BS 60898 Type B', 10, true),
  ('BS_60898_TYPE_C', 'BS 60898 Type C', 20, true),
  ('BS_60898_TYPE_D', 'BS 60898 Type D', 30, true),
  ('BS_EN_61009_RCBO_TYPE_B', 'BS EN 61009 RCBO Type B', 40, true),
  ('BS_EN_61009_RCBO_TYPE_C', 'BS EN 61009 RCBO Type C', 50, true),
  ('BS_EN_61008_RCCB_TYPE_AC', 'BS EN 61008 RCCB Type AC', 60, true),
  ('BS_EN_61008_RCCB_TYPE_A', 'BS EN 61008 RCCB Type A', 70, true),
  ('BS_1361_TYPE_II', 'BS 1361 Type II', 80, true),
  ('BS_3036', 'BS 3036', 90, true),
  ('OTHER', 'Other', 999, true)
ON CONFLICT ("code") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();

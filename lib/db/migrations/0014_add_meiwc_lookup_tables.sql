CREATE TABLE IF NOT EXISTS "cable_type" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(100) NOT NULL,
  "label" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "cable_type_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "rcd_rcbo_type" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(100) NOT NULL,
  "label" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "rcd_rcbo_type_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "protective_device_rating" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(100) NOT NULL,
  "label" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "protective_device_rating_code_unique" UNIQUE("code")
);

INSERT INTO "cable_type" ("code", "label", "sort_order", "is_active")
VALUES
  ('PVC_PVC_TWIN_EARTH', 'PVC/PVC twin & earth', 10, true),
  ('XLPE_SWA_PVC', 'XLPE/SWA/PVC', 20, true),
  ('MICC', 'MICC', 30, true),
  ('LSF', 'LSF cable', 40, true),
  ('LSZH', 'LSZH cable', 50, true),
  ('OTHER', 'Other', 999, true)
ON CONFLICT ("code") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();

INSERT INTO "rcd_rcbo_type" ("code", "label", "sort_order", "is_active")
VALUES
  ('TYPE_AC_30MA', 'Type AC, 30mA', 10, true),
  ('TYPE_A_30MA', 'Type A, 30mA', 20, true),
  ('TYPE_F_30MA', 'Type F, 30mA', 30, true),
  ('TYPE_B_30MA', 'Type B, 30mA', 40, true),
  ('RCBO_TYPE_B_30MA', 'RCBO Type B, 30mA', 50, true),
  ('RCBO_TYPE_C_30MA', 'RCBO Type C, 30mA', 60, true),
  ('OTHER', 'Other', 999, true)
ON CONFLICT ("code") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();

INSERT INTO "protective_device_rating" ("code", "label", "sort_order", "is_active")
VALUES
  ('6A', '6A', 10, true),
  ('10A', '10A', 20, true),
  ('16A', '16A', 30, true),
  ('20A', '20A', 40, true),
  ('25A', '25A', 50, true),
  ('32A', '32A', 60, true),
  ('40A', '40A', 70, true),
  ('50A', '50A', 80, true),
  ('63A', '63A', 90, true),
  ('80A', '80A', 100, true),
  ('100A', '100A', 110, true),
  ('OTHER', 'Other', 999, true)
ON CONFLICT ("code") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();

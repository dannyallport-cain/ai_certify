-- Repair ServiceM8 schema drift in tracked Drizzle migrations.
-- The runtime schema expects per-user ServiceM8 ownership, but the
-- original migration that introduced these columns was never added to
-- the Drizzle migration journal.

-- 1) servicem8_connections: add user ownership
ALTER TABLE "servicem8_connections"
  ADD COLUMN IF NOT EXISTS "user_id" integer;
--> statement-breakpoint

-- Backfill existing team-scoped connections to a concrete user.
-- Prefer the earliest team member; fall back to the earliest user whose users.team_id matches.
WITH preferred_team_members AS (
  SELECT DISTINCT ON (tm.team_id)
    tm.team_id,
    tm.user_id
  FROM "team_members" tm
  ORDER BY tm.team_id, tm.joined_at ASC, tm.id ASC
),
fallback_team_users AS (
  SELECT DISTINCT ON (u.team_id)
    u.team_id,
    u.id AS user_id
  FROM "users" u
  WHERE u.team_id IS NOT NULL
  ORDER BY u.team_id, u.created_at ASC, u.id ASC
),
resolved_connection_users AS (
  SELECT
    c.id,
    COALESCE(ptm.user_id, ftu.user_id) AS user_id
  FROM "servicem8_connections" c
  LEFT JOIN preferred_team_members ptm ON ptm.team_id = c.team_id
  LEFT JOIN fallback_team_users ftu ON ftu.team_id = c.team_id
)
UPDATE "servicem8_connections" c
SET "user_id" = rcu.user_id
FROM resolved_connection_users rcu
WHERE c.id = rcu.id
  AND c.user_id IS NULL
  AND rcu.user_id IS NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "servicem8_connections"
    WHERE "user_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate servicem8_connections: some rows could not be assigned to a user';
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'servicem8_connections_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "servicem8_connections"
      ADD CONSTRAINT "servicem8_connections_user_id_users_id_fk"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE;
  END IF;
END
$$;
--> statement-breakpoint

ALTER TABLE "servicem8_connections"
  ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'servicem8_connections_user_id_unique'
  ) THEN
    ALTER TABLE "servicem8_connections"
      ADD CONSTRAINT "servicem8_connections_user_id_unique" UNIQUE ("user_id");
  END IF;
END
$$;
--> statement-breakpoint

-- Drop the old one-connection-per-team unique constraint if it exists under common names.
ALTER TABLE "servicem8_connections" DROP CONSTRAINT IF EXISTS "servicem8_connections_team_id_key";
--> statement-breakpoint
ALTER TABLE "servicem8_connections" DROP CONSTRAINT IF EXISTS "servicem8_connections_team_id_unique";
--> statement-breakpoint

-- Preserve useful lookup indexes.
CREATE INDEX IF NOT EXISTS "idx_sm8_connections_user" ON "servicem8_connections"("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sm8_connections_team" ON "servicem8_connections"("team_id");
--> statement-breakpoint

-- 2) servicem8_job_mappings: track which user's connection owns the mapping
ALTER TABLE "servicem8_job_mappings"
  ADD COLUMN IF NOT EXISTS "servicem8_connection_user_id" integer;
--> statement-breakpoint

UPDATE "servicem8_job_mappings" jm
SET "servicem8_connection_user_id" = c.user_id
FROM "servicem8_connections" c
WHERE jm.team_id = c.team_id
  AND jm.servicem8_connection_user_id IS NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'servicem8_job_mappings_sm8_connection_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "servicem8_job_mappings"
      ADD CONSTRAINT "servicem8_job_mappings_sm8_connection_user_id_users_id_fk"
      FOREIGN KEY ("servicem8_connection_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL;
  END IF;
END
$$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_sm8_job_mappings_connection_user"
  ON "servicem8_job_mappings"("servicem8_connection_user_id");
--> statement-breakpoint

-- 3) servicem8_client_mappings: track which user's connection owns the mapping
ALTER TABLE "servicem8_client_mappings"
  ADD COLUMN IF NOT EXISTS "servicem8_connection_user_id" integer;
--> statement-breakpoint

UPDATE "servicem8_client_mappings" cm
SET "servicem8_connection_user_id" = c.user_id
FROM "servicem8_connections" c
WHERE cm.team_id = c.team_id
  AND cm.servicem8_connection_user_id IS NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'servicem8_client_mappings_sm8_connection_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "servicem8_client_mappings"
      ADD CONSTRAINT "servicem8_client_mappings_sm8_connection_user_id_users_id_fk"
      FOREIGN KEY ("servicem8_connection_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL;
  END IF;
END
$$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_sm8_client_mappings_connection_user"
  ON "servicem8_client_mappings"("servicem8_connection_user_id");

-- Team logos move from an inline base64 column to object storage.
-- The legacy column is kept so unmigrated rows keep rendering while
-- `scripts/migrate-team-logos-to-r2.ts` backfills them.
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "logo_r2_key" text;

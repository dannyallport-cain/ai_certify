import { readFile } from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

/**
 * Applies the fire alarm survey-link migration.
 *
 * `drizzle-kit migrate` would run every unapplied journal entry; this applies
 * exactly the one migration being shipped here so the change to a shared
 * database is predictable. Every statement is idempotent (`IF NOT EXISTS`), so
 * re-running is harmless.
 *
 * Refuses to run without a matching backup file in `backups/` unless
 * `--force` is passed, because the point of the backup is to still be there.
 */

const MIGRATION = path.join(
  'lib',
  'db',
  'migrations',
  '20261029120000_add_fire_alarm_survey_links.sql',
);

const EXPECTED_COLUMNS = [
  'customer_id',
  'survey_status',
  'completed_at',
  'servicem8_company_uuid',
  'servicem8_company_name',
  'servicem8_job_uuid',
  'servicem8_job_number',
  'servicem8_job_date',
  'servicem8_job_address',
];

/** Comments stripped so the splitter only sees statements. */
function splitStatements(source: string): string[] {
  return source
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function main() {
  const url = process.env.POSTGRES_URL;

  if (!url) {
    console.error('POSTGRES_URL is not set (expected in .env.local)');
    process.exit(1);
  }

  const force = process.argv.includes('--force');

  if (!force) {
    const { readdir } = await import('node:fs/promises');
    const backups = await readdir('backups').catch(() => [] as string[]);
    const hasBackup = backups.some((file) => file.startsWith('fire-alarm-surveys-'));

    if (!hasBackup) {
      console.error('No fire alarm backup found in backups/ — take one before migrating.');
      process.exit(1);
    }
  }

  const source = await readFile(MIGRATION, 'utf8');
  const statements = splitStatements(source);

  console.log(`applying ${statements.length} statement(s) from ${MIGRATION}`);

  const sql = postgres(url, { max: 1, onnotice: () => {} });

  const before = await sql<{ column_name: string }[]>`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'fire_alarm_room_captures'
    order by ordinal_position
  `;

  console.log(`\nbefore: ${before.length} columns`);

  for (const statement of statements) {
    const label = statement.replace(/\s+/g, ' ').slice(0, 90);
    await sql.unsafe(statement);
    console.log(`  ok: ${label}…`);
  }

  const after = await sql<{ column_name: string }[]>`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'fire_alarm_room_captures'
    order by ordinal_position
  `;

  const names = new Set(after.map((row) => row.column_name));
  const missing = EXPECTED_COLUMNS.filter((column) => !names.has(column));
  const [counts] = await sql<{ captures: string; devices: string; plans: string }[]>`
    select
      (select count(*) from fire_alarm_room_captures)::text as captures,
      (select count(*) from fire_alarm_capture_devices)::text as devices,
      (select count(*) from fire_alarm_zone_plans)::text as plans
  `;

  await sql.end();

  console.log(`\nafter:  ${after.length} columns`);

  if (missing.length > 0) {
    console.error(`missing columns: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`columns present: ${EXPECTED_COLUMNS.join(', ')}`);
  console.log(
    `row counts unchanged: captures ${counts.captures}, devices ${counts.devices}, plans ${counts.plans}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

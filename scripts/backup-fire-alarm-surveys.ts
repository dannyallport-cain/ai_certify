import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

/**
 * Backs up the fire alarm tables before the survey-link migration runs.
 *
 * `pg_dump` is not installed here, so this reads the schema and rows directly:
 * the column definitions, indexes and foreign keys needed to recreate each
 * table, plus every row as JSON. The migration only adds columns to
 * `fire_alarm_room_captures`, so these three tables are the whole blast radius —
 * the two children are included because they reference it.
 *
 * Writes to `backups/` and prints the row counts so the result can be checked
 * against the database after the migration.
 */

const TABLES = [
  'fire_alarm_room_captures',
  'fire_alarm_capture_devices',
  'fire_alarm_zone_plans',
] as const;

interface ColumnRow {
  column_name: string;
  data_type: string;
  udt_name: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
}

interface IndexRow {
  indexname: string;
  indexdef: string;
}

interface ConstraintRow {
  conname: string;
  definition: string;
}

function columnType(column: ColumnRow): string {
  switch (column.data_type) {
    case 'character varying':
      return column.character_maximum_length
        ? `varchar(${column.character_maximum_length})`
        : 'varchar';
    case 'character':
      return column.character_maximum_length
        ? `char(${column.character_maximum_length})`
        : 'char';
    case 'numeric':
      return column.numeric_precision
        ? `numeric(${column.numeric_precision},${column.numeric_scale ?? 0})`
        : 'numeric';
    case 'timestamp without time zone':
      return 'timestamp';
    case 'timestamp with time zone':
      return 'timestamptz';
    case 'double precision':
      return 'double precision';
    case 'USER-DEFINED':
      return column.udt_name;
    default:
      return column.data_type;
  }
}

async function main() {
  const url = process.env.POSTGRES_URL;

  if (!url) {
    console.error('POSTGRES_URL is not set (expected in .env.local)');
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.join('backups');
  const baseName = `fire-alarm-surveys-${stamp}`;

  const schemaParts: string[] = [
    `-- Backup of the fire alarm tables taken ${new Date().toISOString()}`,
    `-- Restore with: psql "$POSTGRES_URL" -f ${baseName}.schema.sql`,
    '-- Rows live in the matching .json file, one entry per table.',
    '',
  ];
  const data: Record<string, unknown[]> = {};

  for (const table of TABLES) {
    const columns = await sql<ColumnRow[]>`
      select column_name, data_type, udt_name, character_maximum_length,
             numeric_precision, numeric_scale, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public' and table_name = ${table}
      order by ordinal_position
    `;

    if (columns.length === 0) {
      console.warn(`  ${table}: not present, skipped`);
      continue;
    }

    const indexes = await sql<IndexRow[]>`
      select indexname, indexdef from pg_indexes
      where schemaname = 'public' and tablename = ${table}
      order by indexname
    `;

    const constraints = await sql<ConstraintRow[]>`
      select conname, pg_get_constraintdef(c.oid) as definition
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = ${table}
      order by conname
    `;

    const rows = await sql`
      select * from ${sql(table)}
      order by id
    `;

    schemaParts.push(`-- ${table} (${rows.length} row${rows.length === 1 ? '' : 's'})`);
    schemaParts.push(`CREATE TABLE IF NOT EXISTS "${table}" (`);

    const columnLines = columns.map((column) => {
      const parts = [`  "${column.column_name}" ${columnType(column)}`];

      if (column.column_default) {
        parts.push(`DEFAULT ${column.column_default}`);
      }

      if (column.is_nullable === 'NO') {
        parts.push('NOT NULL');
      }

      return parts.join(' ');
    });

    const constraintLines = constraints.map(
      (constraint) => `  CONSTRAINT "${constraint.conname}" ${constraint.definition}`,
    );

    schemaParts.push([...columnLines, ...constraintLines].join(',\n'));
    schemaParts.push(');');
    schemaParts.push('');

    for (const index of indexes) {
      // Primary-key and unique constraints are already recreated above; their
      // backing indexes would collide by name.
      if (constraints.some((constraint) => constraint.conname === index.indexname)) {
        continue;
      }

      schemaParts.push(`${index.indexdef};`);
    }

    schemaParts.push('');
    data[table] = rows;
    console.log(`  ${table}: ${rows.length} rows, ${columns.length} columns`);
  }

  await mkdir(directory, { recursive: true });

  const schemaPath = path.join(directory, `${baseName}.schema.sql`);
  const dataPath = path.join(directory, `${baseName}.json`);

  await writeFile(schemaPath, `${schemaParts.join('\n')}\n`, 'utf8');
  await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  await sql.end();

  console.log(`\nschema: ${schemaPath}`);
  console.log(`rows:   ${dataPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

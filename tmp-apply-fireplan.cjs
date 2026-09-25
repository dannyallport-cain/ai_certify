const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env.local', override: true });

const MIGRATION_FILE = 'lib/db/migrations/20260422005500_add_fire_alarm_room_capture_tables.sql';

const out = [];
const log = (m) => {
  out.push(m);
  fs.writeFileSync('tmp-apply-fireplan-out.txt', out.join('\n'));
};

function statementsFrom(sqlText) {
  return sqlText
    .split('--> statement-breakpoint')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

async function main() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  if (!url) {
    log('No DB url');
    return;
  }

  const postgres = require('postgres');
  const client = postgres(url, { max: 1, connect_timeout: 20 });

  const TABLES = ['fire_alarm_room_captures', 'fire_alarm_capture_devices'];

  const reportTables = async (label) => {
    for (const t of TABLES) {
      const rows = await client`select to_regclass(${t}) as tbl`;
      log(label + ' ' + t + ': ' + (rows[0] && rows[0].tbl ? 'EXISTS' : 'MISSING'));
    }
  };

  try {
    await reportTables('before');

    const sqlText = fs.readFileSync(MIGRATION_FILE, 'utf8');
    const statements = statementsFrom(sqlText);
    log('statements to apply: ' + statements.length);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const firstLine = stmt.split('\n')[0].slice(0, 90);
      try {
        await client.unsafe(stmt);
        log('  [' + (i + 1) + '/' + statements.length + '] OK   ' + firstLine);
      } catch (e) {
        log('  [' + (i + 1) + '/' + statements.length + '] FAIL ' + firstLine);
        log('      -> ' + (e && e.message));
      }
    }

    await reportTables('after');
  } catch (e) {
    log('ERR: ' + (e && e.message));
  }

  try {
    const applied = await client`select * from drizzle.__drizzle_migrations order by id asc limit 40`;
    log('drizzle.__drizzle_migrations rows: ' + applied.length);
    for (const row of applied) {
      log('  id=' + row.id + ' hash=' + String(row.hash).slice(0, 16) + ' created_at=' + row.created_at);
    }
  } catch (e) {
    log('migrations table read error: ' + (e && e.message));
  }

  await client.end();
}

main().catch((e) => log('FATAL: ' + (e && e.stack ? e.stack : e)));

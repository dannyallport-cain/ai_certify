const fs = require('fs');
const dotenv = require('dotenv');

const envPath = fs.existsSync('.env.production') ? '.env.production' : '.env.local';
dotenv.config({ path: envPath });

const outFile = process.argv[2] || 'tmp-check-fireplan-out.txt';
const lines = [];
const log = (msg) => {
  lines.push(msg);
  fs.writeFileSync(outFile, lines.join('\n'));
};

function schemaTables() {
  const src = fs.readFileSync('lib/db/schema.ts', 'utf8');
  const names = new Set();
  const re = /pgTable\(\s*['"`]([a-z0-9_]+)['"`]/g;
  let m;
  while ((m = re.exec(src))) names.add(m[1]);
  return [...names];
}

async function main() {
  log('envPath: ' + envPath);
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  if (!url) {
    log('No POSTGRES_URL/DATABASE_URL');
    return;
  }

  const postgres = require('postgres');
  const client = postgres(url, { max: 2, connect_timeout: 20 });

  try {
    const tables = schemaTables();
    log('schema declares ' + tables.length + ' tables');
    const missing = [];
    for (const t of tables) {
      const rows = await client`select to_regclass(${t}) as tbl`;
      const exists = Boolean(rows[0] && rows[0].tbl);
      if (!exists) missing.push(t);
    }
    log('MISSING TABLES (' + missing.length + '): ' + JSON.stringify(missing));
  } catch (e) {
    log('table scan error: ' + e.message);
  }

  try {
    const enums = await client`
      select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as labels
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      where t.typname in ('UserRole','UserStatus','PaymentType','PaymentMode','PaymentTransactionStatus','PurchaseEntitlementStatus')
      group by t.typname`;
    for (const row of enums) {
      log('enum ' + row.typname + ': ' + JSON.stringify(row.labels));
    }
  } catch (e) {
    log('enum scan error: ' + e.message);
  }

  await client.end();

  // Drizzle error-wrapping shape (using drizzle's own sql tag)
  const { drizzle } = require('drizzle-orm/postgres-js');
  const { sql } = require('drizzle-orm');
  const sqlClient = postgres(url, { max: 1, connect_timeout: 20 });
  const db = drizzle(sqlClient);
  try {
    const rows = await db.execute(
      sql`select * from fire_alarm_room_captures where team_id = 1 order by updated_at desc limit 1`
    );
    log('drizzle query on fire_alarm_room_captures: SUCCEEDED rows=' + rows.length);
  } catch (e) {
    log('--- drizzle error shape ---');
    log('constructor: ' + (e && e.constructor && e.constructor.name));
    log('error.name: ' + String(e && e.name));
    log('error.code: ' + String(e && e.code));
    log('error.cause.constructor: ' + (e && e.cause && e.cause.constructor && e.cause.constructor.name));
    log('error.cause.code: ' + String(e && e.cause && e.cause.code));
    log('message(first 300): ' + String(e && e.message).slice(0, 300).replace(/\s+/g, ' '));
    log('guard error.code === "42P01": ' + String((e && e.code) === '42P01'));
    log('guard error.cause.code === "42P01": ' + String((e && e.cause && e.cause.code) === '42P01'));
  } finally {
    await sqlClient.end();
  }
}

main().catch((e) => log('FATAL: ' + (e && e.stack ? e.stack : e)));

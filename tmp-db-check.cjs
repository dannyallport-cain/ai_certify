const postgres = require('postgres');
const fs = require('fs');

const envFile = process.argv[2] || '.env.local';
const outFile = process.argv[3] || 'tmp-db-check-out.txt';

require('dotenv').config({ path: envFile });

const TABLES = [
  'approval_scheme_types',
  'cable_type',
  'rcd_rcbo_type',
  'protective_device_rating',
  'main_protective_device',
  'circuit_protective_device',
  'servicem8_connections',
];

async function main() {
  const url = process.env.POSTGRES_URL || '';
  let output = 'envFile: ' + envFile + '\n';
  try {
    const hostMatch = url.match(/@([^:/]+)/);
    output += 'host: ' + (hostMatch ? hostMatch[1] : '(none)') + '\n';
  } catch {
    output += 'host: (parse failed)\n';
  }

  const client = postgres(url, { max: 1, connect_timeout: 15 });
  try {
    for (const table of TABLES) {
      const rows = await client`select to_regclass(${table}) as tbl`;
      output += table + ': ' + (rows[0]?.tbl ? 'EXISTS' : 'MISSING') + '\n';
    }
    const rows = await client`select to_regclass('approval_scheme_types') as tbl`;
    if (rows[0]?.tbl) {
      const schemes = await client`select code, logo_src, is_active from approval_scheme_types order by sort_order`;
      output += 'schemes: ' + JSON.stringify(schemes) + '\n';
    }
  } catch (err) {
    output += 'ERR: ' + err.message + '\n';
  } finally {
    await client.end();
  }
  fs.writeFileSync(outFile, output);
}

main();

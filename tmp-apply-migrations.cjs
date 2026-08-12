const postgres = require('postgres');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

const MIGRATION_FILES = [
  'lib/db/migrations/0014_add_meiwc_lookup_tables.sql',
  'lib/db/migrations/0015_add_approval_scheme_types.sql',
];

async function main() {
  const url = process.env.POSTGRES_URL || '';
  let output = 'host-db: ' + (url.match(/@([^/]+)\/(\w+)/) || [])[0] + '\n';

  const client = postgres(url, { max: 1, connect_timeout: 15 });
  try {
    for (const file of MIGRATION_FILES) {
      const sql = fs.readFileSync(file, 'utf8');
      output += 'Applying ' + file.split('/').pop() + '...\n';
      await client.unsafe(sql);
      output += '  OK\n';
    }
  } catch (err) {
    output += 'ERR: ' + err.message + '\n';
  } finally {
    await client.end();
  }
  fs.writeFileSync('tmp-apply-migrations-out.txt', output);
}

main();

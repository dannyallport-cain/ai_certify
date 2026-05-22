const dotenv = require('dotenv');
dotenv.config();

const postgres = require('postgres');

const url = process.env.POSTGRES_URL;
if (!url) {
  console.error('POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node tmp/query_user.cjs <email>');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

(async () => {
  const normalizedEmail = String(email).trim().toLowerCase();
  try {
    const rows = await sql`
      select
        id,
        email,
        status,
        activated_at,
        deleted_at,
        password_hash
      from users
      where lower(email) = ${normalizedEmail}
      limit 1
    `;

    const row = rows[0] || null;
    console.log(JSON.stringify(row, null, 2));
  } catch (err) {
    console.error('Query failed:', err);
    process.exitCode = 1;
  } finally {
    try {
      await sql.end();
    } catch {
      // ignore
    }
  }
})();

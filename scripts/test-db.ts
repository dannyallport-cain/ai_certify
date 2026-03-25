import { client } from '../lib/db/drizzle';

async function main() {
  try {
    const [{ ok }] = await client<{ ok: number }[]>`select 1 as ok`;
    console.log('Database test query result:', ok);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main()
  .then(() => {
    console.log('Database connection verified successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database connection test failed:', err);
    process.exit(1);
  });

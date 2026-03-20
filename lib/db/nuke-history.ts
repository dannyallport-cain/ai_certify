
import { db } from './drizzle';
import { sql } from 'drizzle-orm';

async function nukeHistory() {
    console.log('Dropping __drizzle_migrations table...');
    await db.execute(sql`DROP TABLE IF EXISTS "__drizzle_migrations"`);
    await db.execute(sql`DROP SCHEMA IF EXISTS "drizzle" CASCADE`); // older drizzle versions used a schema
    console.log('History nuked.');
    process.exit(0);
}

nukeHistory().catch(console.error);

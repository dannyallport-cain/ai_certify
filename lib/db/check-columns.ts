
import { db } from './drizzle';
import { sql } from 'drizzle-orm';

async function checkColumns() {
    console.log('Checking columns for table "teams"...');
    const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'teams';
  `);

    console.log('Columns found:', result);
    process.exit(0);
}

checkColumns().catch(console.error);

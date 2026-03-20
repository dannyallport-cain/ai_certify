
import { db } from './drizzle';
import { sql } from 'drizzle-orm';

async function checkPlans() {
    console.log('Checking subscription_plans...');
    try {
        const result = await db.execute(sql`
      SELECT * FROM subscription_plans LIMIT 10;
    `);

        console.log('Plans found:', result);
    } catch (e) {
        console.error('Error checking plans:', e);
    }
    process.exit(0);
}

checkPlans().catch(console.error);

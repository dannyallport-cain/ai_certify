import 'dotenv/config';
import { db, client } from '../lib/db/drizzle';
import { teams } from '../lib/db/schema';

async function main() {
  const rows = await db.select({
    id: teams.id,
    name: teams.name,
    planName: teams.planName,
    subscriptionStatus: teams.subscriptionStatus,
    stripeCustomerId: teams.stripeCustomerId,
    stripeSubscriptionId: teams.stripeSubscriptionId,
    subscriptionBypass: teams.subscriptionBypass,
    subscriptionBypassReason: teams.subscriptionBypassReason,
    trialEndDate: teams.trialEndDate,
    updatedAt: teams.updatedAt,
  }).from(teams);

  console.log(JSON.stringify(rows, null, 2));
  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end();
  process.exit(1);
});

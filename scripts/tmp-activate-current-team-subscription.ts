import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, client } from '../lib/db/drizzle';
import { teams } from '../lib/db/schema';

async function main() {
  const teamId = 124;

  const [updatedTeam] = await db
    .update(teams)
    .set({
      planName: 'Starter',
      subscriptionStatus: 'active',
      subscriptionBypass: true,
      subscriptionBypassReason: 'Manual activation from billing dashboard request',
      subscriptionBypassSetAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId))
    .returning({
      id: teams.id,
      name: teams.name,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      subscriptionBypass: teams.subscriptionBypass,
      subscriptionBypassReason: teams.subscriptionBypassReason,
      updatedAt: teams.updatedAt,
    });

  console.log(JSON.stringify(updatedTeam, null, 2));
  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end();
  process.exit(1);
});

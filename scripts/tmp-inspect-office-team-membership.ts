import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, client } from '../lib/db/drizzle';
import { teamMembers, teams, users } from '../lib/db/schema';

async function main() {
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      userTeamId: users.teamId,
      membershipTeamId: teamMembers.teamId,
      membershipRole: teamMembers.role,
      teamName: teams.name,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      subscriptionBypass: teams.subscriptionBypass,
      stripeCustomerId: teams.stripeCustomerId,
      stripeSubscriptionId: teams.stripeSubscriptionId,
    })
    .from(users)
    .leftJoin(teamMembers, eq(teamMembers.userId, users.id))
    .leftJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(eq(users.email, 'office@cain-group.com'));

  console.log(JSON.stringify(rows, null, 2));
  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end();
  process.exit(1);
});

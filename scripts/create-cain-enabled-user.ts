import { db, client } from '../lib/db/drizzle';
import { users, teams, teamMembers } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/session';
import { eq } from 'drizzle-orm';

async function main() {
  const email = 'info@cainenabled.com';
  const teamName = 'Cain Enabled Ltd';
  const password = 'Verify123!';
  const bypassReason = 'Manual complimentary unlimited subscription';

  const passwordHash = await hashPassword(password);

  let [team] = await db.select().from(teams).where(eq(teams.name, teamName)).limit(1);

  if (!team) {
    [team] = await db
      .insert(teams)
      .values({
        name: teamName,
        planName: 'Enterprise',
        subscriptionStatus: 'active',
        subscriptionBypass: true,
        subscriptionBypassReason: bypassReason,
        subscriptionBypassSetAt: new Date(),
      })
      .returning();
    console.log('Created team:', team.id, team.name);
  } else {
    [team] = await db
      .update(teams)
      .set({
        planName: 'Enterprise',
        subscriptionStatus: 'active',
        subscriptionBypass: true,
        subscriptionBypassReason: bypassReason,
        subscriptionBypassRemovedAt: null,
        subscriptionBypassSetAt: team.subscriptionBypassSetAt ?? new Date(),
      })
      .where(eq(teams.id, team.id))
      .returning();
    console.log('Updated team subscription settings:', team.id, team.name);
  }

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email,
        name: teamName,
        passwordHash,
        role: 'user',
        status: 'active',
        activatedAt: new Date(),
        teamId: team.id,
      })
      .returning();
    console.log('Created user:', user.id, user.email);
  } else {
    [user] = await db
      .update(users)
      .set({
        name: teamName,
        passwordHash,
        role: 'user',
        status: 'active',
        activatedAt: user.activatedAt ?? new Date(),
        teamId: team.id,
      })
      .where(eq(users.id, user.id))
      .returning();
    console.log('Updated user:', user.id, user.email);
  }

  const existingMembership = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (existingMembership.length === 0) {
    await db.insert(teamMembers).values({
      userId: user.id,
      teamId: team.id,
      role: 'owner',
    });
    console.log('Created team membership for user.');
  } else {
    await db
      .update(teamMembers)
      .set({
        teamId: team.id,
        role: 'owner',
      })
      .where(eq(teamMembers.userId, user.id));
    console.log('Updated existing team membership for user.');
  }

  console.log('Provisioning complete.');
  console.log(JSON.stringify({
    email,
    teamId: team.id,
    userId: user.id,
    planName: team.planName,
    subscriptionStatus: team.subscriptionStatus,
    subscriptionBypass: team.subscriptionBypass,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });

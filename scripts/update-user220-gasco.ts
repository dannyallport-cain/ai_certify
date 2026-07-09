import { eq } from 'drizzle-orm';
import { db, client } from '../lib/db/drizzle';
import { users, teams, teamMembers } from '../lib/db/schema';

async function main() {
  const userId = 220;

  const [existingTeam] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.name, 'Gasco Ltd'))
    .limit(1);

  const team =
    existingTeam ??
    (await db.transaction(async (tx) => {
      const [createdTeam] = await tx
        .insert(teams)
        .values({
          name: 'Gasco Ltd',
        })
        .returning({ id: teams.id, name: teams.name });

      if (!createdTeam) {
        throw new Error('TEAM_CREATE_FAILED');
      }

      return createdTeam;
    }));
  
  console.log(JSON.stringify({ team }, null, 2));

  await db.transaction(async (tx) => {
    await tx.update(users).set({ teamId: team.id, updatedAt: new Date() }).where(eq(users.id, userId));
    await tx.delete(teamMembers).where(eq(teamMembers.userId, userId));
    await tx.insert(teamMembers).values({ userId, teamId: team.id, role: 'member' });
  });

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, teamId: users.teamId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [membership] = await db
    .select({
      teamId: teamMembers.teamId,
      role: teamMembers.role,
      teamName: teams.name,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  console.log(JSON.stringify({ team, user, membership: membership ?? null }, null, 2));
  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await client.end();
  } catch {
    // Ignore cleanup errors while preserving original failure path.
  }
  process.exit(1);
});

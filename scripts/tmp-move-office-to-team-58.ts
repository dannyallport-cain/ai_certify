import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { db, client } from '../lib/db/drizzle';
import { teamMembers, users } from '../lib/db/schema';

async function main() {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, 'office@cain-group.com'))
    .limit(1);

  if (!user) {
    throw new Error('User office@cain-group.com not found');
  }

  await db
    .update(teamMembers)
    .set({
      teamId: 58,
      role: 'owner',
    })
    .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, 115)));

  console.log(
    JSON.stringify(
      {
        movedEmail: user.email,
        newTeamId: 58,
      },
      null,
      2
    )
  );

  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end();
  process.exit(1);
});

import { db } from './drizzle';
import { users, teamMembers } from './schema';
import { eq } from 'drizzle-orm';

async function checkUserTeam() {
  const email = 'owner@test.com';
  console.log(`Checking team for user: ${email}`);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.log('User not found!');
    process.exit(1);
  }

  console.log('User found:', user);

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (!member) {
    console.log('User has NO team membership in DB.');
  } else {
    console.log('User team membership:', member);
  }

  process.exit(0);
}

checkUserTeam().catch(console.error);

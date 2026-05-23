
import { db } from './drizzle';
import { users, teamMembers, teams } from './schema';
import { eq } from 'drizzle-orm';

async function checkUserTeam() {
    const email = 'owner@test.com';
    console.log(`Checking team for user: ${email}`);

    const user = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (!user) {
        console.log('User not found!');
        process.exit(1);
    }

    console.log('User found:', user);

    const member = await db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, user.id),
        with: {
            team: true
        }
    });

    if (!member) {
        console.log('User has NO team membership in DB.');
    } else {
        console.log('User team membership:', member);
    }

    process.exit(0);
}

checkUserTeam().catch(console.error);


import { db } from './drizzle';
import { users, teamMembers } from './schema';
import { eq } from 'drizzle-orm';

async function checkUser20() {
    console.log('Checking User ID 20...');

    const user = await db.query.users.findFirst({
        where: eq(users.id, 20),
    });

    if (!user) {
        console.log('User 20 NOT found in DB.');
    } else {
        console.log('User 20 found:', user);

        const member = await db.query.teamMembers.findFirst({
            where: eq(teamMembers.userId, 20),
            with: { team: true }
        });

        if (!member) {
            console.log('User 20 has NO team membership.');
        } else {
            console.log('User 20 team:', member.team);
        }
    }
    process.exit(0);
}

checkUser20().catch(console.error);

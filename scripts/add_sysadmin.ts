import { db } from '../lib/db/drizzle';
import { users, teams, teamMembers } from '../lib/db/schema';
import { type UserRole } from '../lib/auth/roles';
import { hashPassword } from '../lib/auth/session';
import { eq } from 'drizzle-orm';

async function addSysAdmin() {
  const email = 'sysadmin@riskassessorpro.com';
  const name = 'System Admin';
  const password = 'Verify123!!!';
  const role: UserRole = 'admin';

  // 1. Ensure System team exists
  const systemTeamName = 'System';
  let [systemTeam] = await db.select().from(teams).where(eq(teams.name, systemTeamName)).limit(1);
  if (!systemTeam) {
    [systemTeam] = await db.insert(teams).values({
      name: systemTeamName,
      planName: 'system',
      subscriptionStatus: 'bypass',
    }).returning();
    console.log('System team created.');
  } else {
    console.log('System team already exists.');
  }

  // 2. Ensure sysadmin user exists
  const passwordHash = await hashPassword(password);
  let [sysadminUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!sysadminUser) {
    [sysadminUser] = await db.insert(users).values({
      email,
      name,
      passwordHash,
      role,
    }).returning();
    console.log('Sysadmin user created.');
  } else {
    console.log('Sysadmin user already exists.');
  }

  // 3. Ensure sysadmin is a member of the System team
  const existingMembership = await db.select().from(teamMembers)
    .where(eq(teamMembers.userId, sysadminUser.id)).limit(1);
  if (existingMembership.length === 0) {
    await db.insert(teamMembers).values({
      userId: sysadminUser.id,
      teamId: systemTeam.id,
      role: 'admin',
    });
    console.log('Sysadmin added to System team.');
  } else {
    console.log('Sysadmin already a member of System team.');
  }
}

addSysAdmin().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

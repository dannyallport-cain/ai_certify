import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

export async function createAdminUser() {
  const adminEmail = 'dannyallport@icloud.com';
  const adminPassword = 'admin123123';
  
  try {
    // Check if admin user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    if (existingUser.length > 0) {
      console.log('Admin user already exists');
      return existingUser[0];
    }

    // Create admin user
    const [adminUser] = await db
      .insert(users)
      .values({
        email: adminEmail,
        name: 'Danny Allport',
        passwordHash: await hashPassword(adminPassword),
        role: 'admin',
      })
      .returning();

    console.log('Admin user created successfully:', adminUser.email);
    
    // Create admin team if it doesn't exist
    const adminTeamName = 'Admin Team';
    const existingTeam = await db.select().from(teams).where(eq(teams.name, adminTeamName)).limit(1);
    
    let adminTeam;
    if (existingTeam.length === 0) {
      [adminTeam] = await db
        .insert(teams)
        .values({
          name: adminTeamName,
          planName: 'Admin',
          subscriptionStatus: 'active',
        })
        .returning();
      
      console.log('Admin team created successfully:', adminTeam.name);
    } else {
      adminTeam = existingTeam[0];
    }

    // Add admin user to admin team
    await db
      .insert(teamMembers)
      .values({
        userId: adminUser.id,
        teamId: adminTeam.id,
        role: 'owner',
      });

    console.log('Admin user added to admin team');
    
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('Admin setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin setup failed:', error);
      process.exit(1);
    });
} 
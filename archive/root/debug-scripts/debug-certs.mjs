import { db } from './lib/db/drizzle';
import { certificates, customers, teams, users, teamMembers } from './lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function debugCertificates() {
  try {
    console.log('=== DEBUG CERTIFICATES ===');
    
    // Get all certificates
    const allCerts = await db.select().from(certificates).orderBy(desc(certificates.createdAt));
    console.log('Total certificates in database:', allCerts.length);
    
    if (allCerts.length > 0) {
      console.log('Recent certificates:');
      allCerts.slice(0, 5).forEach(cert => {
        console.log(`- ID: ${cert.id}, Number: ${cert.certificateNumber}, Team: ${cert.teamId}, Type: ${cert.certificateType}, Created: ${cert.createdAt}`);
      });
    }
    
    // Get all teams
    const allTeams = await db.select().from(teams);
    console.log('\nTotal teams:', allTeams.length);
    allTeams.forEach(team => {
      console.log(`- Team ID: ${team.id}, Name: ${team.name}`);
    });
    
    // Get all users and their teams
    const usersWithTeams = await db
      .select({
        user: users,
        teamId: teamMembers.teamId
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId));
    
    console.log('\nUsers and their teams:');
    usersWithTeams.forEach(ut => {
      console.log(`- User ID: ${ut.user.id}, Email: ${ut.user.email}, Team ID: ${ut.teamId}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCertificates();

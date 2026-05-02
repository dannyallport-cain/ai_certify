import { eq, ilike, sql } from 'drizzle-orm';
import { db } from './lib/db/drizzle';
import {
  activityLogs,
  certificateTemplates,
  fireAlarmRoomCaptures,
  invitations,
  paymentTransactions,
  reportDisseminatorReports,
  reportDisseminatorTemplates,
  servicem8ClientMappings,
  servicem8Connections,
  servicem8JobMappings,
  teamMembers,
  users,
} from './lib/db/schema';

async function main() {
  const targetEmail = 'davidc@total-firesolutions.com';

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      deletedAt: users.deletedAt,
      status: users.status,
    })
    .from(users)
    .where(ilike(users.email, targetEmail))
    .limit(1);

  console.log(JSON.stringify({ user }, null, 2));

  if (!user) {
    return;
  }

  const counts = {
    teamMembers: await db.select({ count: sql<number>`count(*)` }).from(teamMembers).where(eq(teamMembers.userId, user.id)),
    activityLogs: await db.select({ count: sql<number>`count(*)` }).from(activityLogs).where(eq(activityLogs.userId, user.id)),
    invitations: await db.select({ count: sql<number>`count(*)` }).from(invitations).where(eq(invitations.invitedBy, user.id)),
    paymentTransactions: await db.select({ count: sql<number>`count(*)` }).from(paymentTransactions).where(eq(paymentTransactions.userId, user.id)),
    certificateTemplates: await db.select({ count: sql<number>`count(*)` }).from(certificateTemplates).where(eq(certificateTemplates.createdBy, user.id)),
    fireAlarmRoomCaptures: await db.select({ count: sql<number>`count(*)` }).from(fireAlarmRoomCaptures).where(eq(fireAlarmRoomCaptures.createdBy, user.id)),
    reportDisseminatorTemplates: await db.select({ count: sql<number>`count(*)` }).from(reportDisseminatorTemplates).where(eq(reportDisseminatorTemplates.createdBy, user.id)),
    reportDisseminatorReports: await db.select({ count: sql<number>`count(*)` }).from(reportDisseminatorReports).where(eq(reportDisseminatorReports.createdBy, user.id)),
    servicem8Connections: await db.select({ count: sql<number>`count(*)` }).from(servicem8Connections).where(eq(servicem8Connections.userId, user.id)),
    servicem8JobMappings: await db.select({ count: sql<number>`count(*)` }).from(servicem8JobMappings).where(eq(servicem8JobMappings.servicem8ConnectionUserId, user.id)),
    servicem8ClientMappings: await db.select({ count: sql<number>`count(*)` }).from(servicem8ClientMappings).where(eq(servicem8ClientMappings.servicem8ConnectionUserId, user.id)),
  };

  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

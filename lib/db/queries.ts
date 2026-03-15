import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users, customers, certificates, certificateItems, ActivityType } from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { type UserRole } from '@/lib/auth/roles';
import { NewActivityLog } from './schema';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}

// Customer queries
export async function getCustomersForTeam() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const team = await getTeamForUser();
  if (!team) {
    throw new Error('User not part of a team');
  }

  return await db
    .select()
    .from(customers)
    .where(eq(customers.teamId, team.id))
    .orderBy(desc(customers.createdAt));
}

export async function getCustomerById(customerId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const team = await getTeamForUser();
  if (!team) {
    throw new Error('User not part of a team');
  }

  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.teamId, team.id)))
    .limit(1);

  return result[0] || null;
}

// Certificate queries
export async function getCertificatesForTeam() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const team = await getTeamForUser();
  if (!team) {
    throw new Error('User not part of a team');
  }

  return await db
    .select({
      certificate: certificates,
      customer: customers,
    })
    .from(certificates)
    .leftJoin(customers, eq(certificates.customerId, customers.id))
    .where(eq(certificates.teamId, team.id))
    .orderBy(desc(certificates.createdAt));
}

export async function getCertificateById(certificateId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const team = await getTeamForUser();
  if (!team) {
    throw new Error('User not part of a team');
  }

  const result = await db
    .select({
      certificate: certificates,
      customer: customers,
    })
    .from(certificates)
    .leftJoin(customers, eq(certificates.customerId, customers.id))
    .where(and(eq(certificates.id, certificateId), eq(certificates.teamId, team.id)))
    .limit(1);

  if (!result[0]) {
    return null;
  }

  const items = await db
    .select()
    .from(certificateItems)
    .where(eq(certificateItems.certificateId, certificateId))
    .orderBy(certificateItems.sortOrder);

  return {
    ...result[0].certificate,
    customer: result[0].customer,
    items,
  };
}

export async function getCertificatesByCustomer(customerId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const team = await getTeamForUser();
  if (!team) {
    throw new Error('User not part of a team');
  }

  return await db
    .select()
    .from(certificates)
    .where(and(eq(certificates.customerId, customerId), eq(certificates.teamId, team.id)))
    .orderBy(desc(certificates.createdAt));
}

export async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  await db.insert(activityLogs).values(newActivity);
}

/**
 * Fetch all non-deleted users for administrative management
 */
export async function getAllUsers() {
  return await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(isNull(users.deletedAt));
}

/**
 * Soft-delete a user by ID
 */
export async function deactivateUserById(userId: number) {
  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Fetch all activity logs across all teams for admin reporting
 */
export async function getAllActivityLogs() {
  return await db
    .select({
      id: activityLogs.id,
      teamId: activityLogs.teamId,
      userId: activityLogs.userId,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
      teamName: teams.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .leftJoin(teams, eq(activityLogs.teamId, teams.id))
    .orderBy(desc(activityLogs.timestamp));
}

/**
 * Create a new user
 */
export async function createUser(data: { name: string; email: string; role: UserRole; }) {
  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: '', // TODO: Set a proper initial password
    })
    .returning();
  return user;
}

/**
 * Update an existing user
 */
export async function updateUserById(userId: number, data: { name?: string; role?: UserRole; }) {
  const [user] = await db
    .update(users)
    .set({
      ...data,
    })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

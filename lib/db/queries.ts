import { asc, count, desc, and, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from './drizzle';
import {
  activityLogs,
  teamMembers,
  teams,
  users,
  customers,
  certificates,
  certificateItems,
  paymentTransactions,
  purchaseEntitlements,
  servicem8JobMappings,
  mainProtectiveDevice,
  circuitProtectiveDevice,
  ActivityType,
  teamRuntimeSafeColumns,
  type NewActivityLog,
  type NewPaymentTransaction,
  type NewPurchaseEntitlement,
} from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { type UserRole } from '@/lib/auth/roles';
import type { InferSelectModel } from 'drizzle-orm';

type UserRecord = InferSelectModel<typeof users>;

type AdminUserUpdateData = {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: 'active' | 'suspended' | 'inactive';
  teamId?: number | null;
};

function getFallbackTeamName(user: Pick<UserRecord, 'name' | 'email'>) {
  const trimmedName = user.name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = user.email.split('@')[0]?.trim();
  return emailPrefix || 'Team';
}

export async function ensureTeamForUser(user: Pick<UserRecord, 'id' | 'name' | 'email'>) {
  const existingTeam = await db
    .select(teamRuntimeSafeColumns)
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (existingTeam[0]) {
    return existingTeam[0];
  }

  const [createdTeam] = await db.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name: getFallbackTeamName(user),
      })
      .returning(teamRuntimeSafeColumns);

    if (!team) {
      throw new Error('TEAM_CREATE_FAILED');
    }

    await tx.insert(teamMembers).values({
      userId: user.id,
      teamId: team.id,
      role: 'owner',
    });

    return [team];
  });

  return createdTeam ?? null;
}

export async function getUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  let sessionData: Awaited<ReturnType<typeof verifyToken>>;
  try {
    sessionData = await verifyToken(sessionCookie.value);
  } catch {
    return null;
  }

  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  const expiresAt = new Date(sessionData.expires).getTime();
  if (!sessionData.expires || Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
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
    .select(teamRuntimeSafeColumns)
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
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));
}

export async function updateTeamSubscriptionBypass(
  teamId: number,
  enabled: boolean,
  reason?: string | null
) {
  await db
    .update(teams)
    .set({
      subscriptionBypass: enabled,
      subscriptionBypassReason: enabled ? (reason?.trim() || null) : null,
      subscriptionBypassSetAt: enabled ? new Date() : null,
      subscriptionBypassRemovedAt: enabled ? null : new Date(),
      updatedAt: new Date(),
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

  const team = await ensureTeamForUser(user);
  if (!team) {
    return null;
  }

  const members = await db
    .select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      teamId: teamMembers.teamId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, team.id))
    .orderBy(asc(teamMembers.joinedAt));

  return {
    ...team,
    teamMembers: members,
  };
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

  return getCertificatesForTeamId(team.id);
}

export async function getCertificatesForTeamId(teamId: number) {
  return await db
    .select({
      certificate: certificates,
      customer: customers,
    })
    .from(certificates)
    .leftJoin(customers, eq(certificates.customerId, customers.id))
    .where(eq(certificates.teamId, teamId))
    .orderBy(desc(certificates.createdAt));
}

export async function getCertificatesForTeamPage({
  search,
  certificateType,
  status,
  startDate,
  endDate,
  sortKey = 'createdAt',
  sortDir = 'desc',
  limit = 20,
  offset = 0,
}: {
  search?: string;
  certificateType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortKey?: 'createdAt' | 'inspectionDate' | 'certificateNumber' | 'certificateType';
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const team = await getTeamForUser();
  if (!team) {
    throw new Error('User not part of a team');
  }

  const conditions = [eq(certificates.teamId, team.id)];

  if (certificateType) {
    conditions.push(eq(certificates.certificateType, certificateType));
  }

  if (status) {
    conditions.push(eq(certificates.status, status));
  }

  if (startDate) {
    const start = new Date(startDate);
    if (!Number.isNaN(start.getTime())) {
      conditions.push(sql`${certificates.inspectionDate} >= ${start}`);
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime())) {
      conditions.push(sql`${certificates.inspectionDate} <= ${end}`);
    }
  }

  if (search?.trim()) {
    const normalized = `%${search.trim().toLowerCase()}%`;
    const searchCondition = or(
      sql`LOWER(${certificates.certificateNumber}) LIKE ${normalized}`,
      sql`LOWER(${certificates.siteName}) LIKE ${normalized}`,
      sql`LOWER(${customers.name}) LIKE ${normalized}`
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const sortColumns: Record<string, any> = {
    createdAt: certificates.createdAt,
    inspectionDate: certificates.inspectionDate,
    certificateNumber: certificates.certificateNumber,
    certificateType: certificates.certificateType,
  };

  const orderColumn = sortColumns[sortKey] || certificates.createdAt;
  const order = sortDir === 'asc' ? asc(orderColumn) : desc(orderColumn);
  const whereClause = and(...conditions);

  const [countResult] = await db
    .select({ count: count() })
    .from(certificates)
    .leftJoin(customers, eq(certificates.customerId, customers.id))
    .where(whereClause);

  const items = await db
    .select({
      certificate: certificates,
      customer: customers,
    })
    .from(certificates)
    .leftJoin(customers, eq(certificates.customerId, customers.id))
    .where(whereClause)
    .orderBy(order)
    .limit(limit)
    .offset(offset);

  return {
    items,
    total: Number(countResult?.count ?? 0),
  };
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

  const [servicem8JobMapping] = await db
    .select()
    .from(servicem8JobMappings)
    .where(
      and(
        eq(servicem8JobMappings.certificateId, certificateId),
        eq(servicem8JobMappings.teamId, team.id)
      )
    )
    .orderBy(desc(servicem8JobMappings.updatedAt))
    .limit(1);

  return {
    ...result[0].certificate,
    customer: result[0].customer,
    items,
    servicem8JobMapping: servicem8JobMapping ?? null,
  };
}

export async function getMainProtectiveDevices() {
  return await db
    .select()
    .from(mainProtectiveDevice)
    .where(eq(mainProtectiveDevice.isActive, true))
    .orderBy(asc(mainProtectiveDevice.sortOrder), asc(mainProtectiveDevice.label));
}

export async function getCircuitProtectiveDevices() {
  return await db
    .select()
    .from(circuitProtectiveDevice)
    .where(eq(circuitProtectiveDevice.isActive, true))
    .orderBy(asc(circuitProtectiveDevice.sortOrder), asc(circuitProtectiveDevice.label));
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

export async function getAllTeams() {
  return await db
    .select({
      id: teams.id,
      name: teams.name,
    })
    .from(teams)
    .orderBy(asc(teams.name));
}

export async function updateAdminUserById(userId: number, data: AdminUserUpdateData) {
  return await db.transaction(async (tx) => {
    const updateData: {
      name?: string;
      email?: string;
      role?: UserRole;
      teamId?: number | null;
      status?: 'active' | 'suspended' | 'inactive';
      deactivatedAt?: Date | null;
      statusChangedAt?: Date;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    if (data.teamId !== undefined) {
      updateData.teamId = data.teamId;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      updateData.deactivatedAt = data.status === 'active' ? null : new Date();
      updateData.statusChangedAt = new Date();
    }

    const [user] = await tx
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (data.teamId !== undefined) {
      await tx.delete(teamMembers).where(eq(teamMembers.userId, userId));

      if (data.teamId !== null) {
        await tx.insert(teamMembers).values({
          userId,
          teamId: data.teamId,
          role: 'member',
        });
      }
    }

    return user ?? null;
  });
}

/**
 * Fetch all non-deleted users for administrative management
 */
export async function getAllUsers() {
  const usersWithTeams = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      team: {
        id: teams.id,
        name: teams.name,
        planName: teams.planName,
        subscriptionStatus: teams.subscriptionStatus,
        subscriptionBypass: teams.subscriptionBypass,
        subscriptionBypassReason: teams.subscriptionBypassReason,
        subscriptionBypassSetAt: teams.subscriptionBypassSetAt,
        subscriptionBypassRemovedAt: teams.subscriptionBypassRemovedAt,
        trialEndDate: teams.trialEndDate,
      },
    })
    .from(users)
    .leftJoin(teams, eq(teams.id, users.teamId))
    .where(isNull(users.deletedAt));

  const lastSignInRows = await db
    .select({
      userId: activityLogs.userId,
      lastLoginAt: sql<Date | null>`max(${activityLogs.timestamp})`,
    })
    .from(activityLogs)
    .where(eq(activityLogs.action, ActivityType.SIGN_IN))
    .groupBy(activityLogs.userId);

  const lastSignInByUserId = new Map<number, Date | null>();

  for (const row of lastSignInRows) {
    if (typeof row.userId === 'number') {
      lastSignInByUserId.set(row.userId, row.lastLoginAt ?? null);
    }
  }

  return usersWithTeams.map((user) => ({
    ...user,
    lastLoginAt: user.lastLoginAt ?? lastSignInByUserId.get(user.id) ?? null,
  }));
}

/**
 * Soft-delete a user by ID
 */
export async function deactivateUserById(userId: number) {
  await db
    .update(users)
    .set({
      deletedAt: new Date(),
      deactivatedAt: new Date(),
      status: 'inactive',
      statusChangedAt: new Date(),
    })
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
export async function createUser(data: {
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  teamId?: number | null;
}) {
  return await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash: data.passwordHash,
        teamId: data.teamId ?? null,
        status: 'active',
        statusChangedAt: new Date(),
      })
      .returning();

    if (!user) {
      throw new Error('USER_CREATE_FAILED');
    }

    if (data.teamId) {
      await tx.insert(teamMembers).values({
        userId: user.id,
        teamId: data.teamId,
        role: data.role === 'admin' ? 'owner' : 'member',
      });
    }

    return user;
  });
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

export async function setUserStatusById(
  userId: number,
  status: 'active' | 'suspended' | 'inactive'
) {
  const deactivatedAt = status === 'active' ? null : new Date();

  const [user] = await db
    .update(users)
    .set({
      status,
      deactivatedAt,
      statusChangedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return user;
}

export async function setUserPasswordById(userId: number, passwordHash: string) {
  const [user] = await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return user;
}

export async function createPaymentTransaction(data: NewPaymentTransaction) {
  const [transaction] = await db
    .insert(paymentTransactions)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return transaction;
}

export async function updatePaymentTransactionById(
  transactionId: number,
  data: Partial<NewPaymentTransaction>
) {
  const [transaction] = await db
    .update(paymentTransactions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(paymentTransactions.id, transactionId))
    .returning();

  return transaction ?? null;
}

export async function upsertPaymentTransactionByStripeReference(
  data: NewPaymentTransaction & {
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    stripeInvoiceId?: string | null;
    stripeChargeId?: string | null;
  }
) {
  const references = [
    data.stripeCheckoutSessionId
      ? eq(paymentTransactions.stripeCheckoutSessionId, data.stripeCheckoutSessionId)
      : undefined,
    data.stripePaymentIntentId
      ? eq(paymentTransactions.stripePaymentIntentId, data.stripePaymentIntentId)
      : undefined,
    data.stripeInvoiceId
      ? eq(paymentTransactions.stripeInvoiceId, data.stripeInvoiceId)
      : undefined,
    data.stripeChargeId
      ? eq(paymentTransactions.stripeChargeId, data.stripeChargeId)
      : undefined,
  ].filter((reference): reference is NonNullable<typeof reference> => Boolean(reference));

  if (references.length === 0) {
    return createPaymentTransaction(data);
  }

  const existing = await db
    .select()
    .from(paymentTransactions)
    .where(or(...references))
    .orderBy(desc(paymentTransactions.updatedAt))
    .limit(1);

  if (existing[0]) {
    return updatePaymentTransactionById(existing[0].id, data);
  }

  return createPaymentTransaction(data);
}

export async function getPaymentTransactionByStripeCheckoutSessionId(sessionId: string) {
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripeCheckoutSessionId, sessionId))
    .limit(1);

  return transaction ?? null;
}

export async function getPaymentTransactionByStripePaymentIntentId(paymentIntentId: string) {
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  return transaction ?? null;
}

export async function getPaymentTransactionByStripeInvoiceId(invoiceId: string) {
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripeInvoiceId, invoiceId))
    .limit(1);

  return transaction ?? null;
}

export async function getPaymentTransactionByStripeSubscriptionId(subscriptionId: string) {
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripeSubscriptionId, subscriptionId))
    .orderBy(desc(paymentTransactions.updatedAt))
    .limit(1);

  return transaction ?? null;
}

export async function createPurchaseEntitlement(data: NewPurchaseEntitlement) {
  const [entitlement] = await db
    .insert(purchaseEntitlements)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return entitlement;
}

export async function updatePurchaseEntitlementById(
  entitlementId: number,
  data: Partial<NewPurchaseEntitlement>
) {
  const [entitlement] = await db
    .update(purchaseEntitlements)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(purchaseEntitlements.id, entitlementId))
    .returning();

  return entitlement ?? null;
}

export async function upsertPurchaseEntitlement(
  data: NewPurchaseEntitlement & {
    paymentTransactionId?: number | null;
  }
) {
  const conditions = [
    eq(purchaseEntitlements.teamId, data.teamId),
    eq(purchaseEntitlements.purchaseType, data.purchaseType),
  ];

  if (data.userId) {
    conditions.push(eq(purchaseEntitlements.userId, data.userId));
  }

  if (data.featureKey) {
    conditions.push(eq(purchaseEntitlements.featureKey, data.featureKey));
  }

  if (data.paymentTransactionId) {
    conditions.push(eq(purchaseEntitlements.paymentTransactionId, data.paymentTransactionId));
  }

  const [existing] = await db
    .select()
    .from(purchaseEntitlements)
    .where(and(...conditions))
    .orderBy(desc(purchaseEntitlements.updatedAt))
    .limit(1);

  if (existing) {
    return updatePurchaseEntitlementById(existing.id, data);
  }

  return createPurchaseEntitlement(data);
}

export async function listPurchaseEntitlementsForTeam(teamId: number) {
  return await db
    .select()
    .from(purchaseEntitlements)
    .where(eq(purchaseEntitlements.teamId, teamId))
    .orderBy(desc(purchaseEntitlements.createdAt));
}

export async function listTeamBillingHistory(teamId: number) {
  return await db
    .select({
      transaction: paymentTransactions,
      entitlement: purchaseEntitlements,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(paymentTransactions)
    .leftJoin(users, eq(paymentTransactions.userId, users.id))
    .leftJoin(
      purchaseEntitlements,
      eq(paymentTransactions.id, purchaseEntitlements.paymentTransactionId)
    )
    .where(eq(paymentTransactions.teamId, teamId))
    .orderBy(desc(paymentTransactions.createdAt));
}

export async function getBillingHistoryForCurrentTeam() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const team = await getTeamForUser();
  if (!team) {
    return [];
  }

  return listTeamBillingHistory(team.id);
}

export async function getTeamBillingHistory(teamId?: number) {
  if (typeof teamId === 'number') {
    return listTeamBillingHistory(teamId);
  }

  return getBillingHistoryForCurrentTeam();
}

export async function upsertStripePaymentTransaction(
  data: NewPaymentTransaction & {
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    stripeInvoiceId?: string | null;
    stripeChargeId?: string | null;
    amountTotal?: number | null;
    featureId?: string | null;
  }
) {
  const { amountTotal, featureId, metadata, ...rest } = data;

  return upsertPaymentTransactionByStripeReference({
    ...rest,
    amount: amountTotal ?? rest.amount ?? null,
    metadata: {
      ...(metadata ?? {}),
      ...(featureId ? { featureId } : {}),
    },
  });
}

export async function upsertStripeInvoiceRecord(data: {
  teamId?: number | null;
  userId?: number | null;
  stripeInvoiceId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePaymentIntentId?: string | null;
  amountDue?: number | null;
  amountPaid?: number | null;
  currency?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  if (data.teamId === null || data.teamId === undefined) {
    throw new Error('teamId is required to upsert a Stripe invoice record');
  }

  return upsertPaymentTransactionByStripeReference({
    teamId: data.teamId,
    userId: data.userId ?? null,
    paymentType: 'subscription',
    mode: 'subscription',
    purchaseType: 'subscription_invoice',
    stripeInvoiceId: data.stripeInvoiceId,
    stripeCustomerId: data.stripeCustomerId ?? null,
    stripeSubscriptionId: data.stripeSubscriptionId ?? null,
    stripePaymentIntentId: data.stripePaymentIntentId ?? null,
    amount: data.amountPaid ?? data.amountDue ?? null,
    amountSubtotal: data.amountDue ?? null,
    amountTax: null,
    amountDiscount: null,
    currency: data.currency ?? null,
    status:
      data.status === 'paid'
        ? 'paid'
        : data.status === 'open'
          ? 'pending'
          : data.status === 'void'
            ? 'cancelled'
            : data.status === 'uncollectible'
              ? 'failed'
              : (data.status as
                  | 'pending'
                  | 'requires_action'
                  | 'processing'
                  | 'succeeded'
                  | 'paid'
                  | 'failed'
                  | 'cancelled'
                  | 'refunded'
                  | 'expired'
                  | null) ?? 'pending',
    description: 'Stripe invoice',
    metadata: data.metadata ?? null,
    processedAt: new Date(),
  });
}

export async function upsertStripePurchaseEntitlement(data: {
  teamId: number;
  userId?: number | null;
  paymentType?: 'subscription' | 'one_time';
  purchaseType: string;
  featureId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCustomerId?: string | null;
  status?: 'pending' | 'active' | 'consumed' | 'expired' | 'revoked';
  metadata?: Record<string, unknown> | null;
}) {
  let paymentTransactionId: number | null = null;

  if (data.stripeCheckoutSessionId) {
    const transaction = await getPaymentTransactionByStripeCheckoutSessionId(
      data.stripeCheckoutSessionId
    );
    paymentTransactionId = transaction?.id ?? null;
  } else if (data.stripePaymentIntentId) {
    const transaction = await getPaymentTransactionByStripePaymentIntentId(
      data.stripePaymentIntentId
    );
    paymentTransactionId = transaction?.id ?? null;
  }

  return upsertPurchaseEntitlement({
    teamId: data.teamId,
    userId: data.userId ?? null,
    ...(paymentTransactionId ? { paymentTransactionId } : {}),
    paymentType: data.paymentType ?? 'one_time',
    purchaseType: data.purchaseType,
    featureKey: data.featureId ?? null,
    quantity: 1,
    status: data.status ?? 'active',
    startsAt: new Date(),
    endsAt: null,
    consumedAt: null,
    revokedAt: null,
    metadata: {
      ...(data.metadata ?? {}),
      stripeCustomerId: data.stripeCustomerId ?? null,
      stripeCheckoutSessionId: data.stripeCheckoutSessionId ?? null,
      stripePaymentIntentId: data.stripePaymentIntentId ?? null,
    },
  });
}

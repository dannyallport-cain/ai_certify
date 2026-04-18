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
  ActivityType,
  type NewActivityLog,
  type NewPaymentTransaction,
  type NewPurchaseEntitlement,
} from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { type UserRole } from '@/lib/auth/roles';

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

  const conditions = [eq(certificates.teamId, team.id)] as Array<unknown>;

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
    conditions.push(
      or(
        sql`LOWER(${certificates.certificateNumber}) LIKE ${normalized}`,
        sql`LOWER(${certificates.siteName}) LIKE ${normalized}`,
        sql`LOWER(${customers.name}) LIKE ${normalized}`
      )
    );
  }

  const sortColumns: Record<string, any> = {
    createdAt: certificates.createdAt,
    inspectionDate: certificates.inspectionDate,
    certificateNumber: certificates.certificateNumber,
    certificateType: certificates.certificateType,
  };

  const orderColumn = sortColumns[sortKey] || certificates.createdAt;
  const order = sortDir === 'asc' ? asc(orderColumn) : desc(orderColumn);
  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

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
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(isNull(users.deletedAt));
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
}) {
  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: data.passwordHash,
      status: 'active',
      statusChangedAt: new Date(),
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
    throw new Error('User not part of a team');
  }

  return listTeamBillingHistory(team.id);
}

export async function getTeamBillingHistory() {
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

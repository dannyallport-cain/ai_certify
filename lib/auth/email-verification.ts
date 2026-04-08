import { createHash, randomUUID } from 'crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  emailVerificationTokens,
  teamMembers,
  users,
  type User,
} from '@/lib/db/schema';

const VERIFICATION_TOKEN_TTL_HOURS = 24;

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BASE_URL ||
    'http://127.0.0.1:4000'
  );
}

function hashToken(token: string) {
  return createHash('sha256')
    .update(`${token}:${process.env.AUTH_SECRET || 'local-dev-secret'}`)
    .digest('hex');
}

export function isEmailVerificationRequired(user: Pick<User, 'status'>) {
  return user.status === 'pending';
}

function buildVerificationUrl({
  token,
  redirectTo,
  priceId,
  email,
}: {
  token: string;
  redirectTo?: string | null;
  priceId?: string | null;
  email: string;
}) {
  const url = new URL('/verify-email', getBaseUrl());
  url.searchParams.set('token', token);
  url.searchParams.set('email', email);

  if (redirectTo === 'checkout' && priceId) {
    url.searchParams.set('redirect', 'checkout');
    url.searchParams.set('priceId', priceId);
  }

  return url.toString();
}

async function deliverVerificationEmail({
  email,
  verificationUrl,
}: {
  email: string;
  verificationUrl: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (resendApiKey && emailFrom) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: 'Verify your email address',
        html: `
          <p>Verify your email address to activate your account.</p>
          <p><a href="${verificationUrl}">Verify email</a></p>
          <p>This link expires in 24 hours.</p>
        `,
        text: `Verify your email address: ${verificationUrl}\n\nThis link expires in 24 hours.`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to send verification email: ${body}`);
    }

    return;
  }

  console.log(`Email verification link for ${email}: ${verificationUrl}`);
}

export async function createAndSendEmailVerification({
  user,
  redirectTo,
  priceId,
}: {
  user: Pick<User, 'id' | 'email'>;
  redirectTo?: string | null;
  priceId?: string | null;
}) {
  const rawToken = `${randomUUID()}${randomUUID()}`;
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  await db.transaction(async (tx) => {
    await tx
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, user.id));

    await tx.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
  });

  const verificationUrl = buildVerificationUrl({
    token: rawToken,
    redirectTo,
    priceId,
    email: user.email,
  });

  await deliverVerificationEmail({
    email: user.email,
    verificationUrl,
  });

  return verificationUrl;
}

export async function verifyEmailAddress(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const tokenRows = await db
    .select({
      tokenId: emailVerificationTokens.id,
      userId: emailVerificationTokens.userId,
      expiresAt: emailVerificationTokens.expiresAt,
      email: users.email,
    })
    .from(emailVerificationTokens)
    .innerJoin(users, eq(emailVerificationTokens.userId, users.id))
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        gt(emailVerificationTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const match = tokenRows[0];
  if (!match) {
    return null;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        status: 'active',
        activatedAt: new Date(),
        updatedAt: new Date(),
        statusChangedAt: new Date(),
      })
      .where(eq(users.id, match.userId));

    await tx
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, match.userId));
  });

  return {
    userId: match.userId,
    email: match.email,
  };
}

export async function cleanupExpiredEmailVerificationTokens() {
  await db
    .delete(emailVerificationTokens)
    .where(lt(emailVerificationTokens.expiresAt, new Date()));
}

export async function getTeamIdForUser(userId: number) {
  const rows = await db
    .select({
      teamId: teamMembers.teamId,
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  return rows[0]?.teamId ?? null;
}

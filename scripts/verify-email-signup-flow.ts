import { count, eq } from 'drizzle-orm';
import { signIn, signUp } from '@/app/(login)/actions';
import { verifyEmailAddress } from '@/lib/auth/email-verification';
import { db } from '@/lib/db/drizzle';
import { emailVerificationTokens, teamMembers, users } from '@/lib/db/schema';

async function main() {
  const email = `codex-email-verify-${Date.now()}@example.com`;
  const password = 'Password123!';
  const priceId = process.env.STRIPE_VERIFICATION_PRICE_ID;

  if (!priceId) {
    throw new Error('STRIPE_VERIFICATION_PRICE_ID is not set');
  }

  let verificationUrl: string | null = null;
  const originalLog = console.log;

  console.log = (...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(' ');
    if (message.startsWith('Email verification link for ')) {
      const parts = message.split(': ');
      verificationUrl = parts.slice(1).join(': ');
    }
    originalLog(...args);
  };

  const signUpForm = new FormData();
  signUpForm.set('email', email);
  signUpForm.set('password', password);
  signUpForm.set('redirect', 'checkout');
  signUpForm.set('priceId', priceId);
  signUpForm.set('inviteId', '');

  const signUpResult = await signUp({ error: '' }, signUpForm);
  console.log = originalLog;

  const [pendingUser] = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      activatedAt: users.activatedAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!pendingUser) {
    throw new Error('Signup did not create a user record.');
  }

  const [tokenCountRow] = await db
    .select({ count: count() })
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, pendingUser.id));

  const [membershipCountRow] = await db
    .select({ count: count() })
    .from(teamMembers)
    .where(eq(teamMembers.userId, pendingUser.id));

  const signInForm = new FormData();
  signInForm.set('email', email);
  signInForm.set('password', password);
  signInForm.set('redirect', 'checkout');
  signInForm.set('priceId', priceId);
  const blockedSignInResult = await signIn({ error: '' }, signInForm);

  if (!verificationUrl) {
    throw new Error('Verification URL was not captured from signup output.');
  }

  const parsedUrl = new URL(verificationUrl);
  const token = parsedUrl.searchParams.get('token');

  if (!token) {
    throw new Error('Verification token missing from captured URL.');
  }

  const verificationResult = await verifyEmailAddress(token);

  const [verifiedUser] = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      activatedAt: users.activatedAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const [remainingTokenCountRow] = await db
    .select({ count: count() })
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, pendingUser.id));

  console.log(
    JSON.stringify(
      {
        email,
        signUpResult,
        pendingUser,
        tokenCountAfterSignup: tokenCountRow.count,
        membershipCount: membershipCountRow.count,
        verificationUrl,
        blockedSignInResult,
        verificationResult,
        verifiedUser,
        tokenCountAfterVerification: remainingTokenCountRow.count,
      },
      null,
      2
    )
  );
}

void main();

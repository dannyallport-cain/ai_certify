import Link from 'next/link';
import { CircleIcon } from 'lucide-react';
import { redirect } from 'next/navigation';
import { verifyEmailAddress } from '@/lib/auth/email-verification';
import { db } from '@/lib/db/drizzle';
import { activityLogs, teamMembers, ActivityType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function getSafeRedirectPath(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  return value;
}

async function logVerification(userId: number) {
  const [membership] = await db
    .select({
      teamId: teamMembers.teamId,
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  if (!membership?.teamId) {
    return;
  }

  await db.insert(activityLogs).values({
    teamId: membership.teamId,
    userId,
    action: ActivityType.VERIFY_EMAIL,
    ipAddress: '',
  });
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    redirect?: string;
    priceId?: string;
  }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (token) {
    const result = await verifyEmailAddress(token);

    if (result) {
      await logVerification(result.userId);

      const signInUrl = new URL('/sign-in', 'http://local');
      signInUrl.searchParams.set('verified', '1');
      signInUrl.searchParams.set('email', result.email);

      if (params.redirect === 'checkout' && params.priceId) {
        signInUrl.searchParams.set('redirect', 'checkout');
        signInUrl.searchParams.set('priceId', params.priceId);
      } else {
        const safeRedirectPath = getSafeRedirectPath(params.redirect);
        if (safeRedirectPath) {
          signInUrl.searchParams.set('redirect', safeRedirectPath);
        }
      }

      redirect(`${signInUrl.pathname}${signInUrl.search}`);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
          Verification link invalid
        </h1>
        <p className="mt-4 text-sm text-gray-600">
          This email verification link is invalid or has expired. Sign in to request a new one.
        </p>
        <div className="mt-6">
          <Link
            href="/sign-in"
            className="inline-flex justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

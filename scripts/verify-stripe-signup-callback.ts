import 'dotenv/config';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { teamMembers, teams, users } from '@/lib/db/schema';

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-08-27.basil',
});

function getArg(name: string) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) {
    return direct.slice(name.length + 1);
  }

  const index = process.argv.indexOf(name);
  if (index >= 0) {
    return process.argv[index + 1];
  }

  return undefined;
}

async function sleep(ms: number) {
  const safeDelay = Math.max(0, Math.floor(ms));
  await new Promise((resolve) => setTimeout(resolve, safeDelay));
}

async function loadState(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return { user: null, team: null, sessions: [] as Stripe.Checkout.Session[] };
  }

  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      stripeCustomerId: teams.stripeCustomerId,
      stripeSubscriptionId: teams.stripeSubscriptionId,
      stripeProductId: teams.stripeProductId,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      trialEndDate: teams.trialEndDate,
      updatedAt: teams.updatedAt,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  const checkoutSessions = await stripe.checkout.sessions.list({ limit: 100 });
  const sessions = checkoutSessions.data
    .filter((session) => session.client_reference_id === String(user.id))
    .sort((a, b) => b.created - a.created);

  return { user, team, sessions };
}

async function main() {
  const email = getArg('--email');
  const timeoutSeconds = Number(getArg('--timeout') || '180');
  const intervalSeconds = Number(getArg('--interval') || '5');

  if (!email) {
    throw new Error(
      'Usage: pnpm exec tsx scripts/verify-stripe-signup-callback.ts --email you@example.com [--timeout 180] [--interval 5]'
    );
  }

  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    throw new Error('--timeout must be a positive number of seconds');
  }

  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    throw new Error('--interval must be a positive number of seconds');
  }

  const deadline = Date.now() + Math.floor(timeoutSeconds) * 1000;

  while (true) {
    const state = await loadState(email);

    if (!state.user) {
      console.log(`Waiting for user ${email} to exist...`);
    } else {
      const latestSession = state.sessions[0];
      const sessionStatus = latestSession?.status || 'none';
      const teamStatus = state.team?.subscriptionStatus || 'none';
      const ready =
        !!state.team?.stripeSubscriptionId &&
        (teamStatus === 'active' || teamStatus === 'trialing');

      console.log(
        JSON.stringify(
          {
            email,
            userId: state.user.id,
            team: state.team,
            latestCheckoutSession: latestSession
              ? {
                  id: latestSession.id,
                  status: latestSession.status,
                  paymentStatus: latestSession.payment_status,
                  mode: latestSession.mode,
                  successUrl: latestSession.success_url,
                }
              : null,
          },
          null,
          2
        )
      );

      if (ready) {
        console.log('');
        console.log(
          `Verification passed: team ${state.team?.id} is now ${teamStatus} with subscription ${state.team?.stripeSubscriptionId}.`
        );
        return;
      }

      console.log(
        `Still waiting. Latest checkout session is ${sessionStatus}; team subscription status is ${teamStatus}.`
      );
    }

    if (Date.now() >= deadline) {
      process.exitCode = 1;
      console.log('');
      console.log('Verification timed out before the team subscription updated.');
      return;
    }

    await sleep(intervalSeconds * 1000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

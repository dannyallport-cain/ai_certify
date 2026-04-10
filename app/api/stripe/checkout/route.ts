import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { setSession } from '@/lib/auth/session';
import { teamMembers, teams, users } from '@/lib/db/schema';
import { stripe } from '@/lib/payments/stripe';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/subscription', request.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription']
    });

    if (session.mode !== 'subscription') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (!session.customer || typeof session.customer === 'string') {
      throw new Error('Invalid customer data from Stripe.');
    }

    const customerId = session.customer.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      throw new Error('No subscription found for this session.');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });

    const plan = subscription.items.data[0]?.price;

    if (!plan) {
      throw new Error('No plan found for this subscription.');
    }

    const product = plan.product as Stripe.Product;
    const productId = product.id;

    if (!productId) {
      throw new Error('No product ID found for this subscription.');
    }

    const userId = session.client_reference_id || session.metadata?.userId;

    if (!userId) {
      throw new Error("No user ID found in session client reference or metadata.");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found in database.');
    }

    const metadataTeamId = session.metadata?.teamId
      ? Number(session.metadata.teamId)
      : null;

    const userTeam = metadataTeamId
      ? [{ teamId: metadataTeamId }]
      : await db
          .select({
            teamId: teamMembers.teamId
          })
          .from(teamMembers)
          .where(eq(teamMembers.userId, user[0].id))
          .limit(1);

    if (userTeam.length === 0) {
      throw new Error('User is not associated with any team.');
    }

    await db
      .update(teams)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripeProductId: productId,
        planName: product.name,
        subscriptionStatus: subscription.status,
        updatedAt: new Date()
      })
      .where(eq(teams.id, userTeam[0].teamId));

    await setSession(user[0]);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Error handling successful checkout:', error);
    return NextResponse.redirect(new URL('/subscription', request.url));
  }
}
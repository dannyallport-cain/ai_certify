import Stripe from 'stripe';
import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

function serializeBalanceEntry(entry: Stripe.Balance.Available): {
  amount: number;
  currency: string;
  sourceTypes: Stripe.Balance.Available['source_types'];
} {
  return {
    amount: entry.amount,
    currency: entry.currency,
    sourceTypes: entry.source_types ?? {},
  };
}

export async function POST() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const stripe = getStripeClient();
    const balance = await stripe.balance.retrieve();

    return NextResponse.json({
      success: true,
      service: 'stripe',
      message: 'Stripe API reachable and returned the current account balance.',
      checkedAt: new Date().toISOString(),
      details: {
        livemode: balance.livemode,
        available: balance.available.map(serializeBalanceEntry),
        pending: balance.pending.map(serializeBalanceEntry),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to verify Stripe connectivity';

    const status =
      message === 'STRIPE_SECRET_KEY is not configured'
        ? 503
        : 502;

    return NextResponse.json(
      {
        success: false,
        service: 'stripe',
        message,
      },
      { status }
    );
  }
}

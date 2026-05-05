import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

import { getTeamForUser } from '@/lib/db/queries';
import {
  LOCAL_AUTHORITY_TEMPLATE_PACK_FEATURE_KEY,
  getLocalAuthorityTemplatePackOffer,
} from '@/lib/payments/addons';
import { buildStripeMetadata, stripe, getBaseUrl } from '@/lib/payments/stripe';

export async function POST(request: NextRequest) {
  const team = await getTeamForUser();

  if (!team) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  const offer = await getLocalAuthorityTemplatePackOffer();

  if (!offer) {
    return NextResponse.json(
      { error: 'The template pack add-on is not available right now.' },
      { status: 404 }
    );
  }

  const baseUrl = getBaseUrl();
  const successUrl = `${baseUrl}/subscription?success=true&addon=template-pack`;
  const cancelUrl = `${baseUrl}/subscription?cancelled=true&addon=template-pack`;

  const metadata = buildStripeMetadata({
    paymentType: 'subscription',
    purchaseType: 'addon_subscription',
    featureId: LOCAL_AUTHORITY_TEMPLATE_PACK_FEATURE_KEY,
    teamId: team.id.toString(),
    userId: team.teamMembers[0]?.userId?.toString(),
    addonName: offer.name,
  });

  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: team.stripeCustomerId || undefined,
    client_reference_id: team.teamMembers[0]?.userId?.toString() || undefined,
    line_items: [
      {
        price: offer.priceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata,
    },
  };

  const session = await stripe.checkout.sessions.create(checkoutParams);

  if (!session.url) {
    return NextResponse.json(
      { error: 'Stripe checkout session could not be created.' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(session.url, 303);
}

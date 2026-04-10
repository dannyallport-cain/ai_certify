import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { Team } from '@/lib/db/schema';
import {
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription
} from '@/lib/db/queries';

export type StripePaymentType = 'subscription' | 'one_time';

export type StripeCheckoutMetadata = {
  paymentType: StripePaymentType;
  teamId?: string;
  userId?: string;
  purchaseType?: string;
  featureId?: string;
  templateName?: string;
  type?: string;
  [key: string]: string | undefined;
};

export type CreateSubscriptionCheckoutParams = {
  team: Team | null;
  priceId: string;
  successPath?: string;
  cancelPath?: string;
  purchaseType?: string;
  featureId?: string;
  trialPeriodDays?: number | null;
};

export type CreateOneTimeCheckoutParams = {
  team: Team | null;
  userId?: number | string | null;
  successUrl: string;
  cancelUrl: string;
  customerId?: string | null;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  purchaseType?: string;
  featureId?: string;
  metadata?: Record<string, string | undefined>;
};

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil'
});

export function getBaseUrl() {
  return process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function buildStripeMetadata(
  metadata: StripeCheckoutMetadata
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string] => {
      const [, value] = entry;
      return typeof value === 'string' && value.length > 0;
    })
  );
}

export function getMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function getPaymentTypeFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): StripePaymentType | undefined {
  const paymentType = getMetadataValue(metadata, 'paymentType');

  if (paymentType === 'subscription' || paymentType === 'one_time') {
    return paymentType;
  }

  const legacyType = getMetadataValue(metadata, 'type');
  if (legacyType === 'template_creation') {
    return 'one_time';
  }

  return undefined;
}

export async function createSubscriptionCheckoutSession({
  team,
  priceId,
  successPath = '/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}',
  cancelPath = '/pricing',
  purchaseType,
  featureId,
  trialPeriodDays
}: CreateSubscriptionCheckoutParams) {
  const user = await getUser();
  const isVerificationPrice =
    !!process.env.STRIPE_VERIFICATION_PRICE_ID &&
    priceId === process.env.STRIPE_VERIFICATION_PRICE_ID;

  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  const metadata = buildStripeMetadata({
    paymentType: 'subscription',
    purchaseType,
    featureId,
    teamId: team.id.toString(),
    userId: user.id.toString()
  });

  const baseUrl = getBaseUrl();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    success_url: `${baseUrl}${successPath}`,
    cancel_url: `${baseUrl}${cancelPath}`,
    customer: team.stripeCustomerId || undefined,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true,
    metadata,
    subscription_data: {
      metadata,
      ...(isVerificationPrice
        ? {}
        : {
            trial_period_days:
              typeof trialPeriodDays === 'number' ? trialPeriodDays : 14
          })
    }
  });

  redirect(session.url!);
}

export async function createOneTimeCheckoutSession({
  team,
  userId,
  successUrl,
  cancelUrl,
  customerId,
  lineItems,
  purchaseType,
  featureId,
  metadata = {}
}: CreateOneTimeCheckoutParams) {
  const resolvedUserId =
    typeof userId === 'number' ? userId.toString() : userId || undefined;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer: customerId || team?.stripeCustomerId || undefined,
    client_reference_id: resolvedUserId,
    metadata: buildStripeMetadata({
      paymentType: 'one_time',
      purchaseType,
      featureId,
      teamId: team?.id?.toString(),
      userId: resolvedUserId,
      ...metadata
    })
  });

  return session;
}

export async function createCheckoutSession({
  team,
  priceId
}: {
  team: Team | null;
  priceId: string;
}) {
  return createSubscriptionCheckoutSession({ team, priceId });
}

export async function createCustomerPortalSession(team: Team) {
  if (!team.stripeCustomerId || !team.stripeProductId) {
    redirect('/subscription');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(team.stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        },
        payment_method_update: {
          enabled: true
        }
      }
    });
  }

  return stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${getBaseUrl()}/dashboard`,
    configuration: configuration.id
  });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  const team = await getTeamByStripeCustomerId(customerId);

  if (!team) {
    console.error('Team not found for Stripe customer:', customerId);
    return null;
  }

  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    const item = subscription.items.data[0];
    const product =
      typeof item?.price?.product === 'string' ? null : item?.price?.product;

    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId:
        typeof item?.price?.product === 'string'
          ? item.price.product
          : item?.price?.product?.id || null,
      planName: product && !('deleted' in product && product.deleted) ? product.name : team.planName || null,
      subscriptionStatus: status
    });
  } else if (
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'incomplete_expired'
  ) {
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: status
    });
  } else {
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: team.stripeProductId,
      planName: team.planName,
      subscriptionStatus: status
    });
  }

  return team;
}

export async function getStripePrices() {
  if (
    !process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
    process.env.STRIPE_SECRET_KEY.includes('here')
  ) {
    return [
      {
        id: 'price_base_mock',
        productId: 'prod_base_mock',
        unitAmount: 800,
        currency: 'usd',
        interval: 'month',
        trialPeriodDays: 7
      },
      {
        id: 'price_plus_mock',
        productId: 'prod_plus_mock',
        unitAmount: 1200,
        currency: 'usd',
        interval: 'month',
        trialPeriodDays: 7
      }
    ];
  }

  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  if (
    !process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
    process.env.STRIPE_SECRET_KEY.includes('here')
  ) {
    return [
      {
        id: 'prod_base_mock',
        name: 'Base',
        description: 'Base subscription plan',
        defaultPriceId: 'price_base_mock'
      },
      {
        id: 'prod_plus_mock',
        name: 'Plus',
        description: 'Plus subscription plan',
        defaultPriceId: 'price_plus_mock'
      }
    ];
  }

  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}
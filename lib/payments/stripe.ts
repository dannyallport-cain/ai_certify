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

function createStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: '2025-08-27.basil'
  });
}

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!stripeClient) {
    stripeClient = createStripeClient();
  }

  return stripeClient;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, property, receiver) {
    return Reflect.get(getStripeClient(), property, receiver);
  }
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

  const session = await getStripeClient().checkout.sessions.create({
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

  const session = await getStripeClient().checkout.sessions.create({
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
  const configurations = await getStripeClient().billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await getStripeClient().products.retrieve(team.stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await getStripeClient().prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await getStripeClient().billingPortal.configurations.create({
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

  return getStripeClient().billingPortal.sessions.create({
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
  const prices = await getStripeClient().prices.list({
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

export type AdminStripeSubscriptionPlan = {
  id: string;
  productId: string;
  priceId: string;
  name: string;
  description: string | null;
  active: boolean;
  currency: string;
  monthlyPrice: number;
  annualPrice: number | null;
  interval: Stripe.Price.Recurring.Interval | null;
  trialPeriodDays: number | null;
  metadata: Record<string, string>;
  allowances: {
    certificates: string;
    teamSeats: string;
    additionalSeatPrice: string | null;
    targetUser: string | null;
    badge: string | null;
    savingsNote: string | null;
    competitorAnchor: string | null;
  };
  features: string[];
};

const approvedPlanDefaults = {
  starter: {
    displayName: 'Starter',
    description:
      'For solo engineers who need compliant certificates, branded PDFs, and a low-friction upgrade path.',
    monthlyPrice: 5,
    annualPrice: 50,
    currency: 'gbp',
    badge: 'Entry Plan',
    targetUser: 'Occasional or newly self-employed engineers',
    certificates: 'Up to 30 certificates / month',
    teamSeats: '1 user included',
    additionalSeatPrice: null,
    savingsNote: 'Set at ~50% of the common £10 solo benchmark.',
    competitorAnchor: 'Comparable specialist tools often land around £10/month.',
    features: [
      'Electrical and fire certificate workflows',
      'Branded PDF exports',
      'Customer and installation records',
      'Admin analytics visibility',
      'Email support'
    ]
  },
  professional: {
    displayName: 'Small Business',
    description:
      'Built for growing electrical businesses that need unlimited certificates, faster admin, and room for a small office team.',
    monthlyPrice: 9,
    annualPrice: 90,
    currency: 'gbp',
    badge: 'Most Popular',
    targetUser: 'Growing contractors and small electrical businesses',
    certificates: 'Unlimited certificates',
    teamSeats: '3 users included',
    additionalSeatPrice: '£2.50/month each',
    savingsNote:
      'Designed as the best-value plan for day-to-day operational use.',
    competitorAnchor: 'A practical fit for small firms moving beyond solo usage.',
    features: [
      'Unlimited certificate generation',
      'AI-assisted data extraction and autofill',
      'Shared customer and installation records',
      'Priority PDF generation',
      'Team-ready admin visibility',
      'Priority support'
    ]
  },
  team: {
    displayName: 'Enterprise',
    description:
      'For larger firms that need broader team access, stronger oversight, and a scalable certificate workflow across the business.',
    monthlyPrice: 19,
    annualPrice: 190,
    currency: 'gbp',
    badge: 'For Larger Teams',
    targetUser: 'Larger contractors, offices, and compliance-led teams',
    certificates: 'Unlimited certificates',
    teamSeats: '10 users included',
    additionalSeatPrice: '£2/month each',
    savingsNote:
      'Higher seat allowance and admin controls for larger operational teams.',
    competitorAnchor:
      'Structured for businesses needing wider rollout across engineers and admins.',
    features: [
      'Everything in Small Business',
      '10 included users',
      'Enhanced admin and oversight visibility',
      'Streamlined onboarding for office and field teams',
      'Priority operational support',
      'Designed for multi-user rollout'
    ]
  }
} as const;

function getApprovedPlanKey(planName: string) {
  const normalized = planName.toLowerCase();

  if (
    normalized.includes('starter') ||
    normalized.includes('basic') ||
    normalized.includes('base')
  ) {
    return 'starter';
  }

  if (
    normalized.includes('professional') ||
    normalized.includes('small business') ||
    normalized.includes('pro') ||
    normalized.includes('plus')
  ) {
    return 'professional';
  }

  if (normalized.includes('team') || normalized.includes('enterprise')) {
    return 'team';
  }

  return null;
}

function getApprovedPlanDefaults(planName: string) {
  const key = getApprovedPlanKey(planName);

  return key ? approvedPlanDefaults[key] : null;
}

export async function getAdminStripeSubscriptionPlans(): Promise<
  AdminStripeSubscriptionPlan[]
> {
  const prices = await getStripeClient().prices.list({
    expand: ['data.product'],
    type: 'recurring',
    limit: 100
  });

  const plans = prices.data
    .map((price): AdminStripeSubscriptionPlan | null => {
      if (price.recurring?.interval !== 'month' || price.unit_amount === null) {
        return null;
      }

      const product = typeof price.product === 'string' ? null : price.product;

      if (!product || product.deleted) {
        return null;
      }

      const metadata = Object.fromEntries(
        Object.entries(product.metadata ?? {}).map(([key, value]) => [key, value ?? ''])
      );

      const defaults = getApprovedPlanDefaults(product.name);
      const annualPrice = metadata.annualPrice ? Number.parseFloat(metadata.annualPrice) : null;
      const isVerificationPlan =
        product.id === process.env.STRIPE_VERIFICATION_PRODUCT_ID ||
        price.id === process.env.STRIPE_VERIFICATION_PRICE_ID ||
        product.name.toLowerCase().includes('verification');

      if (isVerificationPlan) {
        return null;
      }

      const features = (metadata.features || '')
        .split('|')
        .map((feature) => feature.trim())
        .filter(Boolean);

      const isGenericDescription =
        !product.description ||
        product.description === 'Base subscription plan' ||
        product.description === 'Plus subscription plan';

      return {
        id: metadata.planId || product.id,
        productId: product.id,
        priceId: price.id,
        name: defaults?.displayName || product.name,
        description: isGenericDescription
          ? defaults?.description || product.description
          : product.description,
        active: product.active && price.active,
        currency: defaults?.currency || price.currency,
        monthlyPrice: defaults?.monthlyPrice ?? (price.unit_amount ?? 0) / 100,
        annualPrice:
          Number.isFinite(annualPrice) ? annualPrice : defaults?.annualPrice ?? null,
        interval: price.recurring?.interval ?? null,
        trialPeriodDays:
          price.recurring?.trial_period_days ??
          (metadata.trialPeriodDays ? Number.parseInt(metadata.trialPeriodDays, 10) : 14),
        metadata,
        allowances: {
          certificates:
            metadata.certificates || defaults?.certificates || 'Unlimited certificates',
          teamSeats: metadata.teamSeats || defaults?.teamSeats || '1 user included',
          additionalSeatPrice:
            metadata.additionalSeatPrice || defaults?.additionalSeatPrice || null,
          targetUser: metadata.targetUser || defaults?.targetUser || 'Electrical contractors',
          badge: metadata.badge || defaults?.badge || null,
          savingsNote: metadata.savingsNote || defaults?.savingsNote || null,
          competitorAnchor: metadata.competitorAnchor || defaults?.competitorAnchor || null,
        },
        features: features.length > 0 ? features : [...(defaults?.features || [])]
      };
    })
    .filter((plan): plan is AdminStripeSubscriptionPlan => plan !== null);

  if (plans.length === 0) {
    return [];
  }

  return plans.sort((left, right) => left.monthlyPrice - right.monthlyPrice);
}

export async function getStripeProducts() {
  const products = await getStripeClient().products.list({
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

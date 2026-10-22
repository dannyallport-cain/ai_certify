import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { Team } from '@/lib/db/schema';
import { getStripeClient } from '@/lib/stripe/client';
import {
  formatSeatPrice,
  getPlanByKey,
  getPlanForProductName,
  type PlanKey
} from '@/lib/payments/pricing/plan-catalog';
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
  planKey?: string;
  type?: string;
  [key: string]: string | undefined;
};

export type CreateSubscriptionCheckoutParams = {
  team: Team | null;
  priceId?: string;
  /**
   * Catalogue plan key. When present (and the Stripe product is known) the
   * subscription is created at the published catalogue price, so the amount in
   * checkout always matches the amount on the pricing page.
   */
  planKey?: string | null;
  productId?: string | null;
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

// The Stripe client is created on demand from the active credentials so that an
// administrator can replace the keys at runtime. See `@/lib/stripe/client`.
export { getStripeClient } from '@/lib/stripe/client';

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

function buildSubscriptionLineItem({
  catalogPlanKey,
  productId,
  priceId
}: {
  catalogPlanKey?: string | null;
  productId?: string | null;
  priceId?: string;
}): Stripe.Checkout.SessionCreateParams.LineItem {
  const catalogPlan = catalogPlanKey ? getPlanByKey(catalogPlanKey) : null;

  if (catalogPlan && productId) {
    return {
      price_data: {
        currency: catalogPlan.currency,
        product: productId,
        unit_amount: Math.round(catalogPlan.monthlyPrice * 100),
        recurring: { interval: 'month' }
      },
      quantity: 1
    };
  }

  if (!priceId) {
    throw new Error(
      'A Stripe priceId or a catalogue plan key with a productId is required to start checkout.'
    );
  }

  return { price: priceId, quantity: 1 };
}

export async function createSubscriptionCheckoutSession({
  team,
  priceId,
  planKey,
  productId,
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

  const checkoutReference = priceId || planKey || '';

  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${checkoutReference}`);
  }

  const metadata = buildStripeMetadata({
    paymentType: 'subscription',
    purchaseType,
    featureId,
    planKey: planKey ?? undefined,
    teamId: team.id.toString(),
    userId: user.id.toString()
  });

  const baseUrl = getBaseUrl();

  const stripeClient = await getStripeClient();
  const session = await stripeClient.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      buildSubscriptionLineItem({
        catalogPlanKey: planKey,
        productId,
        priceId
      })
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

  const stripeClient = await getStripeClient();
  const session = await stripeClient.checkout.sessions.create({
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
  const stripeClient = await getStripeClient();
  const configurations = await stripeClient.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripeClient.products.retrieve(team.stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripeClient.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripeClient.billingPortal.configurations.create({
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

  return stripeClient.billingPortal.sessions.create({
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
  const stripeClient = await getStripeClient();
  const prices = await stripeClient.prices.list({
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
  /** Catalogue plan this Stripe product is mapped to, when one matches. */
  catalogKey: PlanKey | null;
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

const GENERIC_DESCRIPTIONS = new Set([
  'Base subscription plan',
  'Plus subscription plan'
]);

export async function getAdminStripeSubscriptionPlans(): Promise<
  AdminStripeSubscriptionPlan[]
> {
  const stripeClient = await getStripeClient();
  const prices = await stripeClient.prices.list({
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

      const catalogPlan =
        getPlanForProductName(product.name) ??
        getPlanForProductName(metadata.planId) ??
        getPlanForProductName(metadata.displayName);

      const annualPriceFromMetadata = metadata.annualPrice
        ? Number.parseFloat(metadata.annualPrice)
        : null;
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
        !product.description || GENERIC_DESCRIPTIONS.has(product.description);

      return {
        id: metadata.planId || product.id,
        productId: product.id,
        priceId: price.id,
        name: catalogPlan?.name || product.name,
        catalogKey: catalogPlan?.key ?? null,
        description: isGenericDescription
          ? catalogPlan?.description ?? product.description
          : product.description,
        active: product.active && price.active,
        currency: catalogPlan?.currency || price.currency,
        // The live Stripe amount is what will actually be charged, so it wins.
        monthlyPrice: (price.unit_amount ?? 0) / 100,
        annualPrice:
          Number.isFinite(annualPriceFromMetadata) && annualPriceFromMetadata !== null
            ? annualPriceFromMetadata
            : catalogPlan?.annualPrice ?? null,
        interval: price.recurring?.interval ?? null,
        trialPeriodDays:
          price.recurring?.trial_period_days ??
          (metadata.trialPeriodDays ? Number.parseInt(metadata.trialPeriodDays, 10) : 14),
        metadata,
        allowances: {
          certificates:
            metadata.certificates || catalogPlan?.certificates || 'Unlimited certificates',
          teamSeats:
            metadata.teamSeats ||
            (catalogPlan ? `${catalogPlan.seatsIncluded} users included` : '1 user included'),
          additionalSeatPrice:
            metadata.additionalSeatPrice ||
            (catalogPlan ? formatSeatPrice(catalogPlan) : null),
          targetUser:
            metadata.targetUser || catalogPlan?.targetUser || 'Electrical contractors',
          badge: metadata.badge || catalogPlan?.badge || null,
          savingsNote: metadata.savingsNote || catalogPlan?.savingsNote || null,
          competitorAnchor:
            metadata.competitorAnchor || catalogPlan?.competitorAnchor || null
        },
        features: features.length > 0 ? features : [...(catalogPlan?.features ?? [])]
      };
    })
    .filter((plan): plan is AdminStripeSubscriptionPlan => plan !== null);

  if (plans.length === 0) {
    return [];
  }

  return plans.sort((left, right) => left.monthlyPrice - right.monthlyPrice);
}

export async function getStripeProducts() {
  const stripeClient = await getStripeClient();

  const products = await stripeClient.products.list({
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

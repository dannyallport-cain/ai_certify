import Stripe from 'stripe';

import { listPurchaseEntitlementsForTeam } from '@/lib/db/queries';
import { stripe } from './stripe';

export const LOCAL_AUTHORITY_TEMPLATE_PACK_NAME =
  'Local Authority / Housing Association Template Pack';

export const LOCAL_AUTHORITY_TEMPLATE_PACK_FEATURE_KEY =
  'local_authority_housing_template_pack';

export type AddonOffer = {
  productId: string;
  priceId: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  currency: string;
  interval: Stripe.Price.Recurring.Interval;
  trialPeriodDays: number | null;
};

function isActiveEntitlementStatus(status?: string | null) {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

function getMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function isTemplatePackProduct(product: Stripe.Product) {
  const featureKey =
    getMetadataValue(product.metadata, 'featureKey') ||
    getMetadataValue(product.metadata, 'featureId');
  const productName = normalizeName(product.name);

  return (
    featureKey === LOCAL_AUTHORITY_TEMPLATE_PACK_FEATURE_KEY ||
    productName === normalizeName(LOCAL_AUTHORITY_TEMPLATE_PACK_NAME) ||
    productName.includes('local authority') ||
    productName.includes('housing association') ||
    productName.includes('template pack')
  );
}

export async function getLocalAuthorityTemplatePackOffer(): Promise<AddonOffer | null> {
  let prices: Stripe.ApiList<Stripe.Price>;

  try {
    prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
      type: 'recurring'
    });
  } catch (error) {
    console.error('Failed to load Stripe add-on offer for pricing page:', error);
    return null;
  }

  for (const price of prices.data) {
    if (
      price.recurring?.interval !== 'month' ||
      price.unit_amount === null ||
      !price.active
    ) {
      continue;
    }

    const product = typeof price.product === 'string' ? null : price.product;

    if (!product || product.deleted || !isTemplatePackProduct(product)) {
      continue;
    }

    return {
      productId: product.id,
      priceId: price.id,
      name: product.name,
      description: product.description ?? null,
      monthlyPrice: price.unit_amount / 100,
      currency: price.currency,
      interval: price.recurring.interval,
      trialPeriodDays: price.recurring.trial_period_days ?? null
    };
  }

  return null;
}

export async function hasLocalAuthorityTemplatePackAccess(teamId: number) {
  const entitlements = await listPurchaseEntitlementsForTeam(teamId);

  return entitlements.some(
    (entitlement) =>
      entitlement.featureKey === LOCAL_AUTHORITY_TEMPLATE_PACK_FEATURE_KEY &&
      isActiveEntitlementStatus(entitlement.status)
  );
}

import { getAdminStripeSubscriptionPlans } from '@/lib/payments/stripe';
import { PLAN_CATALOG, type PlanCatalogEntry, type PlanKey } from './plan-catalog';

export type MarketingPlan = PlanCatalogEntry & {
  /** Live Stripe price to check out with, when one is available. */
  priceId: string | null;
  productId: string | null;
};

export type MarketingPlansResult = {
  plans: MarketingPlan[];
  /** True when live Stripe prices were resolved, so plan CTAs can check out. */
  checkoutReady: boolean;
  warning: string | null;
};

const NO_LIVE_PRICE: Pick<MarketingPlan, 'priceId' | 'productId'> = {
  priceId: null,
  productId: null,
};

/**
 * The published pricing ladder, with live Stripe price IDs attached where the
 * matching product exists. Prices always come from the catalogue so the page
 * shows the rate we actually charge; Stripe is only used for the IDs.
 */
export async function getMarketingPlans(): Promise<MarketingPlansResult> {
  try {
    const stripePlans = await getAdminStripeSubscriptionPlans();
    const liveByKey = new Map<PlanKey, { priceId: string; productId: string }>();

    stripePlans.forEach((plan) => {
      if (plan.catalogKey && plan.active && !liveByKey.has(plan.catalogKey)) {
        liveByKey.set(plan.catalogKey, { priceId: plan.priceId, productId: plan.productId });
      }
    });

    return {
      plans: PLAN_CATALOG.map((plan) => ({
        ...plan,
        ...(liveByKey.get(plan.key) ?? NO_LIVE_PRICE),
      })),
      checkoutReady: liveByKey.size > 0,
      warning: null,
    };
  } catch (error) {
    console.error('[pricing] failed to load live Stripe prices:', error);

    return {
      plans: PLAN_CATALOG.map((plan) => ({ ...plan, ...NO_LIVE_PRICE })),
      checkoutReady: false,
      warning:
        'Online checkout is temporarily unavailable. The prices below are our published rates and are not affected — get in touch and we will set your workspace up directly.',
    };
  }
}

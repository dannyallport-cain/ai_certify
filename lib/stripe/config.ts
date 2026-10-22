import { formatSeatPrice, PLAN_CATALOG } from '@/lib/payments/pricing/plan-catalog';

/**
 * Static reference data for the legacy admin Stripe screen. Live values come
 * from `@/lib/payments/stripe`; everything here is derived from the published
 * pricing catalogue so the admin view can never disagree with the pricing page.
 */
const [soloPlan, businessPlan, enterprisePlan] = PLAN_CATALOG;

function toProduct(plan: typeof soloPlan, idPrefix: string) {
  return {
    id: `prod_${idPrefix}`,
    name: `${plan.name} Plan`,
    description: plan.description,
    features: plan.features,
    prices: {
      monthly: {
        id: `price_${idPrefix}_monthly`,
        amount: Math.round(plan.monthlyPrice * 100),
        interval: 'month' as const,
      },
      yearly: {
        id: `price_${idPrefix}_yearly`,
        amount: Math.round(plan.annualPrice * 100),
        interval: 'year' as const,
      },
    },
  };
}

export const STRIPE_PRODUCTS = {
  STARTER: toProduct(soloPlan, 'solo'),
  PROFESSIONAL: toProduct(businessPlan, 'business'),
  ENTERPRISE: toProduct(enterprisePlan, 'enterprise'),
};

export const STRIPE_FEATURES = {
  CERTIFICATE_LIMIT: {
    STARTER: 40,
    PROFESSIONAL: -1, // Unlimited
    ENTERPRISE: -1,
  },
  TEAM_SEATS: {
    STARTER: soloPlan.seatsIncluded,
    PROFESSIONAL: businessPlan.seatsIncluded,
    ENTERPRISE: enterprisePlan.seatsIncluded,
  },
  TEMPLATES: {
    STARTER: 'basic',
    PROFESSIONAL: 'custom',
    ENTERPRISE: 'custom',
  },
  SUPPORT: {
    STARTER: 'email',
    PROFESSIONAL: 'priority',
    ENTERPRISE: '24/7',
  },
  ANALYTICS: {
    STARTER: 'basic',
    PROFESSIONAL: 'advanced',
    ENTERPRISE: 'advanced',
  },
  API_ACCESS: {
    STARTER: false,
    PROFESSIONAL: false,
    ENTERPRISE: true,
  },
  TEAM_COLLABORATION: {
    STARTER: false,
    PROFESSIONAL: true,
    ENTERPRISE: true,
  },
  CUSTOM_BRANDING: {
    STARTER: true,
    PROFESSIONAL: true,
    ENTERPRISE: true,
  },
  FLOOR_PLAN_MODULE: {
    STARTER: true,
    PROFESSIONAL: true,
    ENTERPRISE: true,
  },
  DEDICATED_ACCOUNT_MANAGER: {
    STARTER: false,
    PROFESSIONAL: false,
    ENTERPRISE: true,
  },
};

/** Extra-seat pricing shown next to each plan, e.g. "£16.49/month each". */
export const STRIPE_PLAN_SEAT_PRICING = {
  STARTER: formatSeatPrice(soloPlan),
  PROFESSIONAL: formatSeatPrice(businessPlan),
  ENTERPRISE: formatSeatPrice(enterprisePlan),
};

export type StripeProductId = keyof typeof STRIPE_PRODUCTS;
export type StripeFeatureKey = keyof typeof STRIPE_FEATURES;

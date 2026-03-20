import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

export const STRIPE_PRODUCTS = {
  STARTER: {
    id: 'prod_starter',
    name: 'Starter Plan',
    description: 'Perfect for small teams getting started',
    features: [
      'Up to 100 certificates/month',
      'Basic templates',
      'Email support',
      'PDF export',
      'Basic analytics'
    ],
    prices: {
      monthly: {
        id: 'price_starter_monthly',
        amount: 2900, // $29.00
        interval: 'month'
      },
      yearly: {
        id: 'price_starter_yearly',
        amount: 29000, // $290.00
        interval: 'year'
      }
    }
  },
  PROFESSIONAL: {
    id: 'prod_professional',
    name: 'Professional Plan',
    description: 'Ideal for growing organizations',
    features: [
      'Up to 1000 certificates/month',
      'Custom templates',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Team collaboration'
    ],
    prices: {
      monthly: {
        id: 'price_professional_monthly',
        amount: 9900, // $99.00
        interval: 'month'
      },
      yearly: {
        id: 'price_professional_yearly',
        amount: 99000, // $990.00
        interval: 'year'
      }
    }
  },
  ENTERPRISE: {
    id: 'prod_enterprise',
    name: 'Enterprise Plan',
    description: 'For large organizations with advanced needs',
    features: [
      'Unlimited certificates',
      'Custom branding',
      '24/7 support',
      'Advanced security',
      'Custom integrations',
      'Dedicated account manager'
    ],
    prices: {
      monthly: {
        id: 'price_enterprise_monthly',
        amount: 29900, // $299.00
        interval: 'month'
      },
      yearly: {
        id: 'price_enterprise_yearly',
        amount: 299000, // $2,990.00
        interval: 'year'
      }
    }
  }
};

export const STRIPE_FEATURES = {
  CERTIFICATE_LIMIT: {
    STARTER: 100,
    PROFESSIONAL: 1000,
    ENTERPRISE: -1 // Unlimited
  },
  TEMPLATES: {
    STARTER: 'basic',
    PROFESSIONAL: 'custom',
    ENTERPRISE: 'custom'
  },
  SUPPORT: {
    STARTER: 'email',
    PROFESSIONAL: 'priority',
    ENTERPRISE: '24/7'
  },
  ANALYTICS: {
    STARTER: 'basic',
    PROFESSIONAL: 'advanced',
    ENTERPRISE: 'advanced'
  },
  API_ACCESS: {
    STARTER: false,
    PROFESSIONAL: true,
    ENTERPRISE: true
  },
  TEAM_COLLABORATION: {
    STARTER: false,
    PROFESSIONAL: true,
    ENTERPRISE: true
  },
  CUSTOM_BRANDING: {
    STARTER: false,
    PROFESSIONAL: false,
    ENTERPRISE: true
  },
  CUSTOM_INTEGRATIONS: {
    STARTER: false,
    PROFESSIONAL: false,
    ENTERPRISE: true
  },
  DEDICATED_ACCOUNT_MANAGER: {
    STARTER: false,
    PROFESSIONAL: false,
    ENTERPRISE: true
  }
};

export type StripeProductId = keyof typeof STRIPE_PRODUCTS;
export type StripeFeatureKey = keyof typeof STRIPE_FEATURES; 
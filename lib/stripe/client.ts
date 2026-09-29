import Stripe from 'stripe';

import { getStripeSecretKey } from './credentials';

export const STRIPE_API_VERSION = '2025-08-27.basil' as const;

export const STRIPE_NOT_CONFIGURED_MESSAGE =
  'STRIPE_SECRET_KEY is not set (Stripe is not configured for this environment)';

let cachedClient: { secretKey: string; client: Stripe } | null = null;

/**
 * Build (or reuse) a Stripe client using the currently active secret key.
 * The key is resolved at call time so credential changes made in the admin UI
 * take effect without a redeploy.
 */
export async function getStripeClient(): Promise<Stripe> {
  const secretKey = await getStripeSecretKey();

  if (!secretKey) {
    throw new Error(STRIPE_NOT_CONFIGURED_MESSAGE);
  }

  if (cachedClient && cachedClient.secretKey === secretKey) {
    return cachedClient.client;
  }

  const client = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });

  cachedClient = { secretKey, client };

  return client;
}

export async function tryGetStripeClient(): Promise<Stripe | null> {
  try {
    return await getStripeClient();
  } catch {
    return null;
  }
}

export async function isStripeConfigured(): Promise<boolean> {
  return (await getStripeSecretKey()) !== null;
}

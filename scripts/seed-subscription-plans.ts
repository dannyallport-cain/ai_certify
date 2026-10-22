import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import Stripe from 'stripe';

import { getPlanForProductName, PLAN_CATALOG } from '../lib/payments/pricing/plan-catalog';

loadEnv({ path: '.env.local' });
loadEnv();

/**
 * Seeds the `subscription_plans` reference table from the published pricing
 * catalogue, resolving the Stripe product for each plan. Safe to re-run:
 * plans are upserted by name.
 */
const STORAGE_LIMIT_GB: Record<string, number> = {
  solo: 5,
  business: 50,
  enterprise: 200,
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    const products = await stripe.products.list({ active: true, limit: 100 });

    for (const plan of PLAN_CATALOG) {
      const product = products.data.find(
        (candidate) => getPlanForProductName(candidate.name)?.key === plan.key
      );

      if (!product) {
        console.warn(`- ${plan.name}: no active Stripe product matched — skipped`);
        continue;
      }

      await sql`
        INSERT INTO subscription_plans
          (name, description, stripe_product_id, trial_days, max_users, max_assessments_per_month, storage_limit_gb)
        VALUES
          (${plan.name}, ${plan.description}, ${product.id}, ${plan.trialPeriodDays},
           ${plan.seatsIncluded}, ${plan.key === 'solo' ? 40 : -1},
           ${STORAGE_LIMIT_GB[plan.key] ?? 5})
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          stripe_product_id = EXCLUDED.stripe_product_id,
          trial_days = EXCLUDED.trial_days,
          max_users = EXCLUDED.max_users,
          max_assessments_per_month = EXCLUDED.max_assessments_per_month,
          storage_limit_gb = EXCLUDED.storage_limit_gb
      `;

      console.log(
        `- ${plan.name}: ${product.id}, ${plan.seatsIncluded} seats, ${plan.monthlyPrice}/month`
      );
    }

    const rows = await sql`
      SELECT name, max_users, max_assessments_per_month, storage_limit_gb, stripe_product_id
      FROM subscription_plans ORDER BY max_users
    `;
    console.log('subscription_plans:', JSON.stringify(rows));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { config as loadEnv } from 'dotenv';
import Stripe from 'stripe';

loadEnv({ path: '.env.local' });
loadEnv();

import {
  formatSeatPrice,
  getPlanForProductName,
  PLAN_CATALOG,
  type PlanCatalogEntry,
} from '../lib/payments/pricing/plan-catalog';

/**
 * Aligns live Stripe plan products and monthly prices with the published
 * catalogue in `lib/payments/pricing/plan-catalog.ts`.
 *
 * Dry run by default. Pass --apply to write, and --deactivate-old to retire
 * the previous monthly price on each product once the new one exists.
 */
const APPLY = process.argv.includes('--apply');
const DEACTIVATE_OLD = process.argv.includes('--deactivate-old');

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

function priceMetadata(plan: PlanCatalogEntry) {
  return {
    planKey: plan.key,
    annualPrice: plan.annualPrice.toString(),
    certificates: plan.certificates,
    teamSeats: `${plan.seatsIncluded} users included`,
    additionalSeatPrice: formatSeatPrice(plan),
    targetUser: plan.targetUser,
    badge: plan.badge ?? '',
    savingsNote: plan.savingsNote,
    competitorAnchor: plan.competitorAnchor,
    features: plan.features.join('|'),
    trialPeriodDays: plan.trialPeriodDays.toString(),
  };
}

async function syncPlan(plan: PlanCatalogEntry) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const product = products.data.find(
    (candidate) => getPlanForProductName(candidate.name)?.key === plan.key
  );

  if (!product) {
    console.log(`- ${plan.name}: no Stripe product matched. Create one or rename it.`);
    return;
  }

  const metadata = priceMetadata(plan);
  const desiredAmount = Math.round(plan.monthlyPrice * 100);
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const monthlyPrices = prices.data.filter(
    (price) => price.recurring?.interval === 'month' && price.unit_amount !== null
  );
  const matchingPrice = monthlyPrices.find((price) => price.unit_amount === desiredAmount);
  const currentAmounts = monthlyPrices
    .map((price) => `£${(price.unit_amount ?? 0) / 100}`)
    .join(', ');

  console.log(
    `- ${plan.name} (${product.id}): active monthly prices [${currentAmounts || 'none'}]` +
      (matchingPrice ? ' — catalogue price present.' : ` — needs £${plan.monthlyPrice}.`)
  );

  if (!APPLY) {
    return;
  }

  await stripe.products.update(product.id, { metadata });

  let activePrice = matchingPrice;

  if (!activePrice) {
    activePrice = await stripe.prices.create({
      product: product.id,
      currency: plan.currency,
      unit_amount: desiredAmount,
      recurring: { interval: 'month', trial_period_days: plan.trialPeriodDays },
      metadata: { planKey: plan.key, priceKind: 'monthly' },
    });

    console.log(`  created price ${activePrice.id} (£${plan.monthlyPrice})`);
  }

  if (DEACTIVATE_OLD) {
    const stalePrices = monthlyPrices.filter((price) => price.id !== activePrice?.id);

    await Promise.all(
      stalePrices.map(async (price) => {
        await stripe.prices.update(price.id, { active: false });
        console.log(`  retired £${(price.unit_amount ?? 0) / 100} price ${price.id}`);
      })
    );
  }

  await stripe.products.update(product.id, { default_price: activePrice.id });
  console.log(`  product metadata updated, default price ${activePrice.id}`);
}

async function main() {
  console.log(APPLY ? 'Applying catalogue to Stripe…' : 'Dry run — no Stripe changes. Use --apply to write.');
  console.log('');

  for (const plan of PLAN_CATALOG) {
    await syncPlan(plan);
  }

  console.log('');
  console.log(
    APPLY
      ? 'Done. Existing subscriptions keep their current price until you migrate them.'
      : 'Re-run with --apply to update products and prices.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

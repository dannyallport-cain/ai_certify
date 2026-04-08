import 'dotenv/config';
import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-08-27.basil',
});

async function main() {
  const productName = 'Verification';
  const recurringInterval: Stripe.PriceCreateParams.Recurring.Interval = 'month';

  const existingProducts = await stripe.products.list({
    active: true,
    limit: 100,
  });

  let product = existingProducts.data.find((item) => item.name === productName);

  if (!product) {
    product = await stripe.products.create({
      name: productName,
      description: 'Temporary low-cost plan for manual Stripe signup verification',
    });
    console.log(`Created product ${product.id}`);
  } else {
    console.log(`Using existing product ${product.id}`);
  }

  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });

  let price = existingPrices.data.find(
    (item) =>
      item.currency === 'gbp' &&
      item.unit_amount === 10 &&
      item.recurring?.interval === recurringInterval
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: 'gbp',
      unit_amount: 10,
      recurring: {
        interval: recurringInterval,
      },
      nickname: 'Verification GBP 0.10 / month',
    });
    console.log(`Created price ${price.id}`);
  } else {
    console.log(`Using existing price ${price.id}`);
  }

  console.log('');
  console.log('Add this to your .env for local verification runs:');
  console.log(`STRIPE_VERIFICATION_PRICE_ID="${price.id}"`);
  console.log('');
  console.log('This verification price is GBP 0.10/month and skips the free trial.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

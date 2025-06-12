import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

async function createStripeProducts() {
  // Skip Stripe setup if no valid API key is provided
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder') || process.env.STRIPE_SECRET_KEY.includes('here')) {
    console.log('Skipping Stripe products creation - no valid API key provided.');
    console.log('You can add real Stripe keys later and run this seed again.');
    return;
  }

  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  const email = 'test@test.com';
  
  // Check if user already exists
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (existingUser.length === 0) {
    const password = 'admin123';
    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values([
        {
          email: email,
          passwordHash: passwordHash,
          role: "owner",
        },
      ])
      .returning();

    console.log('Initial user created.');

    const [team] = await db
      .insert(teams)
      .values({
        name: 'Test Team',
      })
      .returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: 'owner',
    });
  } else {
    console.log('User already exists, skipping user creation.');
  }

  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });

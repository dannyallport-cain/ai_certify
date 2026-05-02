'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth/admin';
import { stripe } from '@/lib/payments/stripe';

const createStripePlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().min(1, 'Description is required'),
  monthlyPrice: z.coerce.number().positive('Monthly price must be greater than 0'),
  annualPrice: z.coerce.number().positive('Annual price must be greater than 0'),
  targetUser: z.string().min(1, 'Best for is required'),
  certificates: z.string().min(1, 'Usage is required'),
  teamSeats: z.string().min(1, 'Seats are required'),
  additionalSeatPrice: z.string().optional(),
  badge: z.string().optional(),
  savingsNote: z.string().optional(),
  competitorAnchor: z.string().optional(),
  trialPeriodDays: z.coerce.number().int().min(0).max(365),
  features: z.string().min(1, 'At least one feature is required'),
});

const updateStripePlanSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().min(1, 'Description is required'),
  monthlyPrice: z.coerce.number().positive('Monthly price must be greater than 0'),
  annualPrice: z.coerce.number().positive('Annual price must be greater than 0'),
  targetUser: z.string().min(1, 'Best for is required'),
  certificates: z.string().min(1, 'Usage is required'),
  teamSeats: z.string().min(1, 'Seats are required'),
  additionalSeatPrice: z.string().optional(),
  badge: z.string().optional(),
  savingsNote: z.string().optional(),
  competitorAnchor: z.string().optional(),
  trialPeriodDays: z.coerce.number().int().min(0).max(365),
  features: z.string().min(1, 'At least one feature is required'),
});

const deleteStripePlanSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export type CreateStripePlanState = {
  success?: boolean;
  message?: string;
  error?: string;
};

export type UpdateStripePlanState = {
  success?: boolean;
  message?: string;
  error?: string;
};

function formatPlanFeatures(features: string) {
  return features
    .split('\n')
    .map((feature) => feature.trim())
    .filter(Boolean)
    .join('|');
}

async function revalidateSubscriptionPages() {
  revalidatePath('/admin/subscriptions');
  revalidatePath('/subscription');
}

export async function createStripePlanMetadata(
  _prevState: CreateStripePlanState,
  formData: FormData
): Promise<CreateStripePlanState> {
  await requireAdmin();

  const parsed = createStripePlanSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    monthlyPrice: formData.get('monthlyPrice'),
    annualPrice: formData.get('annualPrice'),
    targetUser: formData.get('targetUser'),
    certificates: formData.get('certificates'),
    teamSeats: formData.get('teamSeats'),
    additionalSeatPrice: formData.get('additionalSeatPrice') || '',
    badge: formData.get('badge') || '',
    savingsNote: formData.get('savingsNote') || '',
    competitorAnchor: formData.get('competitorAnchor') || '',
    trialPeriodDays: formData.get('trialPeriodDays') || 0,
    features: formData.get('features'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Invalid plan details',
    };
  }

  const data = parsed.data;
  const monthlyAmount = Math.round(data.monthlyPrice * 100);

  const productMetadata = {
    annualPrice: data.annualPrice.toString(),
    certificates: data.certificates,
    teamSeats: data.teamSeats,
    additionalSeatPrice: data.additionalSeatPrice || '',
    targetUser: data.targetUser,
    badge: data.badge || '',
    savingsNote: data.savingsNote || '',
    competitorAnchor: data.competitorAnchor || '',
    trialPeriodDays: data.trialPeriodDays.toString(),
    features: formatPlanFeatures(data.features),
  };

  const product = await stripe.products.create({
    name: data.name,
    description: data.description,
    active: true,
    metadata: productMetadata,
  });

  await stripe.prices.create({
    product: product.id,
    currency: 'gbp',
    unit_amount: monthlyAmount,
    recurring: {
      interval: 'month',
      trial_period_days: data.trialPeriodDays || undefined,
    },
    metadata: {
      planId: product.id,
      priceKind: 'monthly',
    },
  });

  await revalidateSubscriptionPages();

  return {
    success: true,
    message: 'Stripe plan created successfully.',
  };
}

export async function updateStripePlanMetadata(
  _prevState: UpdateStripePlanState,
  formData: FormData
): Promise<UpdateStripePlanState> {
  await requireAdmin();

  const parsed = updateStripePlanSchema.safeParse({
    productId: formData.get('productId'),
    name: formData.get('name'),
    description: formData.get('description'),
    monthlyPrice: formData.get('monthlyPrice'),
    annualPrice: formData.get('annualPrice'),
    targetUser: formData.get('targetUser'),
    certificates: formData.get('certificates'),
    teamSeats: formData.get('teamSeats'),
    additionalSeatPrice: formData.get('additionalSeatPrice') || '',
    badge: formData.get('badge') || '',
    savingsNote: formData.get('savingsNote') || '',
    competitorAnchor: formData.get('competitorAnchor') || '',
    trialPeriodDays: formData.get('trialPeriodDays') || 0,
    features: formData.get('features'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Invalid plan details',
    };
  }

  const data = parsed.data;
  const monthlyAmount = Math.round(data.monthlyPrice * 100);

  const prices = await stripe.prices.list({
    product: data.productId,
    active: true,
    type: 'recurring',
    limit: 100,
  });

  const monthlyPrice = prices.data.find(
    (price) => price.recurring?.interval === 'month' && price.unit_amount !== null
  );

  if (!monthlyPrice) {
    return {
      error: 'No active monthly Stripe price found for this product.',
    };
  }

  const currentProduct = await stripe.products.retrieve(data.productId);

  const productMetadata = {
    ...(currentProduct.metadata ?? {}),
    annualPrice: data.annualPrice.toString(),
    certificates: data.certificates,
    teamSeats: data.teamSeats,
    additionalSeatPrice: data.additionalSeatPrice || '',
    targetUser: data.targetUser,
    badge: data.badge || '',
    savingsNote: data.savingsNote || '',
    competitorAnchor: data.competitorAnchor || '',
    trialPeriodDays: data.trialPeriodDays.toString(),
    features: formatPlanFeatures(data.features),
  };

  await stripe.products.update(data.productId, {
    name: data.name,
    description: data.description,
    metadata: productMetadata,
  });

  if (monthlyPrice.unit_amount !== monthlyAmount) {
    await stripe.prices.update(monthlyPrice.id, {
      active: false,
    });

    await stripe.prices.create({
      product: data.productId,
      currency: monthlyPrice.currency,
      unit_amount: monthlyAmount,
      recurring: {
        interval: 'month',
        trial_period_days: data.trialPeriodDays || undefined,
      },
      metadata: {
        replacedPriceId: monthlyPrice.id,
      },
    });
  }

  await revalidateSubscriptionPages();

  return {
    success: true,
    message: 'Stripe plan updated successfully.',
  };
}

export type DeleteStripePlanState = {
  success?: boolean;
  message?: string;
  error?: string;
};

export async function deleteStripePlanMetadata(
  _prevState: DeleteStripePlanState,
  formData: FormData
): Promise<DeleteStripePlanState> {
  await requireAdmin();

  const parsed = deleteStripePlanSchema.safeParse({
    productId: formData.get('productId'),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Invalid plan details',
    };
  }

  const { productId } = parsed.data;
  const product = await stripe.products.retrieve(productId);

  if ('deleted' in product && product.deleted) {
    await revalidateSubscriptionPages();

    return {
      success: true,
      message: 'Stripe plan was already removed.',
    };
  }

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: 'recurring',
    limit: 100,
  });

  await Promise.all(
    prices.data.map((price) =>
      stripe.prices.update(price.id, {
        active: false,
      })
    )
  );

  await stripe.products.update(productId, {
    active: false,
  });

  await revalidateSubscriptionPages();

  return {
    success: true,
    message: 'Stripe plan deleted successfully.',
  };
}

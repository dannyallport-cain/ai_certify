'use server';

import { redirect } from 'next/navigation';
import {
  createCheckoutSession,
  createCustomerPortalSession,
  createOneTimeCheckoutSession,
  createSubscriptionCheckoutSession,
  getBaseUrl
} from './stripe';
import { getTeamForUser, getUser } from '@/lib/db/queries';

export async function checkoutAction(formData: FormData) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  const priceId = formData.get('priceId') as string;
  const purchaseType =
    (formData.get('purchaseType') as string | null) || 'subscription_plan';
  const featureId = (formData.get('featureId') as string | null) || undefined;

  await createSubscriptionCheckoutSession({
    team,
    priceId,
    purchaseType,
    featureId
  });

  redirect('/subscription?success=true');
}

export async function legacyCheckoutAction(formData: FormData) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  const priceId = formData.get('priceId') as string;

  await createCheckoutSession({ team, priceId });

  redirect('/subscription?success=true');
}

export async function customerPortalAction() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();

  if (!team) {
    redirect('/dashboard');
  }

  const session = await createCustomerPortalSession(team);

  redirect(session.url);
}

export async function oneTimeCheckoutAction(formData: FormData) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  const priceId = formData.get('priceId') as string | null;
  const quantityValue = formData.get('quantity') as string | null;
  const purchaseType =
    (formData.get('purchaseType') as string | null) || 'one_time_purchase';
  const featureId = (formData.get('featureId') as string | null) || undefined;
  const successPath =
    (formData.get('successPath') as string | null) ||
    '/subscription?success=true';
  const cancelPath =
    (formData.get('cancelPath') as string | null) || '/subscription';

  if (!priceId) {
    throw new Error('Missing priceId for one-time checkout');
  }

  const quantity = Number(quantityValue || '1');
  const baseUrl = getBaseUrl();

  const session = await createOneTimeCheckoutSession({
    team,
    userId: user.id,
    successUrl: `${baseUrl}${successPath}`,
    cancelUrl: `${baseUrl}${cancelPath}`,
    lineItems: [
      {
        price: priceId,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
      }
    ],
    purchaseType,
    featureId
  });

  redirect(session.url!);
}
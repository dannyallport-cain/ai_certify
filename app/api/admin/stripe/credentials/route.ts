import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser, isAdmin } from '@/lib/auth/admin';
import { STRIPE_CREDENTIAL_LABELS, toStripeCredentialStatusList } from '@/lib/stripe/credential-status';
import {
  getStripeCredentials,
  saveStripeCredentials,
  type StripeCredentialKey,
} from '@/lib/stripe/credentials';

export const dynamic = 'force-dynamic';

const CREDENTIAL_KEYS = Object.keys(STRIPE_CREDENTIAL_LABELS) as StripeCredentialKey[];

const saveSchema = z.object({
  secretKey: z.string().max(500).optional(),
  publishableKey: z.string().max(500).optional(),
  webhookSecret: z.string().max(500).optional(),
});

function validateField(key: StripeCredentialKey, value: string): string | null {
  if (value.length === 0) {
    return null;
  }

  if (/\s/.test(value)) {
    return `${STRIPE_CREDENTIAL_LABELS[key]} must not contain spaces or line breaks.`;
  }

  if (key === 'secretKey' && !/^(sk|rk)_(live|test)_/.test(value)) {
    return 'Secret Key should start with sk_live_, sk_test_, rk_live_, or rk_test_.';
  }

  if (key === 'publishableKey' && !/^pk_(live|test)_/.test(value)) {
    return 'Publishable Key should start with pk_live_ or pk_test_.';
  }

  if (key === 'webhookSecret' && !value.startsWith('whsec_')) {
    return 'Webhook Secret should start with whsec_.';
  }

  return null;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const credentials = await getStripeCredentials();

  return NextResponse.json(
    { credentials: toStripeCredentialStatusList(credentials) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid credentials payload.' },
      { status: 400 }
    );
  }

  const input: Partial<Record<StripeCredentialKey, string>> = {};

  for (const key of CREDENTIAL_KEYS) {
    const rawValue = parsed.data[key];

    if (typeof rawValue !== 'string') {
      continue;
    }

    const trimmed = rawValue.trim();
    const validationError = validateField(key, trimmed);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    input[key] = trimmed;
  }

  if (Object.keys(input).length === 0) {
    return NextResponse.json(
      { error: 'No credential fields were provided.' },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  const credentials = await saveStripeCredentials(input, user?.id ?? null);

  return NextResponse.json(
    {
      success: true,
      message: 'Stripe credentials updated.',
      credentials: toStripeCredentialStatusList(credentials),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

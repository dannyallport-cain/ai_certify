import { getAppSettings, upsertAppSettings, deleteAppSettings } from '@/lib/db/app-settings';

/**
 * Keys under which Stripe credentials are stored in the `app_settings` table.
 * Values stored here override the corresponding environment variables, which
 * lets an administrator change Stripe credentials from the admin UI without a
 * redeploy.
 */
export const STRIPE_CREDENTIAL_KEYS = {
  secretKey: 'stripe.secret_key',
  publishableKey: 'stripe.publishable_key',
  webhookSecret: 'stripe.webhook_secret',
} as const;

export type StripeCredentialKey = keyof typeof STRIPE_CREDENTIAL_KEYS;

export type StripeCredentialSource = 'database' | 'environment' | 'missing';

export type ResolvedStripeCredential = {
  key: StripeCredentialKey;
  value: string | null;
  source: StripeCredentialSource;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type StripeCredentials = Record<StripeCredentialKey, ResolvedStripeCredential>;

const ENVIRONMENT_FALLBACKS: Record<StripeCredentialKey, string[]> = {
  secretKey: ['STRIPE_SECRET_KEY'],
  publishableKey: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_PUBLISHABLE_KEY'],
  webhookSecret: ['STRIPE_WEBHOOK_SECRET'],
};

const CREDENTIAL_CACHE_TTL_MS = 15_000;
const ALL_CREDENTIAL_KEYS: StripeCredentialKey[] = [
  'secretKey',
  'publishableKey',
  'webhookSecret',
];

type CredentialCache = {
  expiresAt: number;
  credentials: StripeCredentials;
};

let credentialCache: CredentialCache | null = null;

function readEnvironmentValue(key: StripeCredentialKey): string | null {
  for (const envName of ENVIRONMENT_FALLBACKS[key]) {
    const value = process.env[envName];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function resolveCredential(
  key: StripeCredentialKey,
  stored: { value: string | null; updatedAt: Date | null; updatedBy: number | null } | undefined
): ResolvedStripeCredential {
  const storedValue = stored?.value?.trim();

  if (storedValue) {
    return {
      key,
      value: storedValue,
      source: 'database',
      updatedAt: stored?.updatedAt ? stored.updatedAt.toISOString() : null,
      updatedBy: stored?.updatedBy ?? null,
    };
  }

  const environmentValue = readEnvironmentValue(key);

  if (environmentValue) {
    return {
      key,
      value: environmentValue,
      source: 'environment',
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    key,
    value: null,
    source: 'missing',
    updatedAt: null,
    updatedBy: null,
  };
}

async function loadStoredSettings() {
  try {
    return await getAppSettings(Object.values(STRIPE_CREDENTIAL_KEYS));
  } catch (error) {
    console.warn(
      '[stripe] Could not read stored Stripe credentials, falling back to environment variables:',
      error instanceof Error ? error.message : error
    );
    return {} as Awaited<ReturnType<typeof getAppSettings>>;
  }
}

/**
 * Resolve the active Stripe credentials, preferring values stored in the
 * database over environment variables. Results are cached briefly to avoid a
 * database round-trip on every Stripe API call.
 */
export async function getStripeCredentials(): Promise<StripeCredentials> {
  const now = Date.now();

  if (credentialCache && credentialCache.expiresAt > now) {
    return credentialCache.credentials;
  }

  const stored = await loadStoredSettings();

  const credentials = ALL_CREDENTIAL_KEYS.reduce((acc, key) => {
    acc[key] = resolveCredential(key, stored[STRIPE_CREDENTIAL_KEYS[key]]);
    return acc;
  }, {} as StripeCredentials);

  credentialCache = {
    expiresAt: now + CREDENTIAL_CACHE_TTL_MS,
    credentials,
  };

  return credentials;
}

export function invalidateStripeCredentialsCache(): void {
  credentialCache = null;
}

export async function getStripeSecretKey(): Promise<string | null> {
  const credentials = await getStripeCredentials();
  return credentials.secretKey.value;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const credentials = await getStripeCredentials();
  return credentials.webhookSecret.value;
}

export async function getStripePublishableKey(): Promise<string | null> {
  const credentials = await getStripeCredentials();
  return credentials.publishableKey.value;
}

export type SaveStripeCredentialsInput = Partial<Record<StripeCredentialKey, string | null>>;

/**
 * Persist a new set of Stripe credentials. A key with an empty/null value
 * removes the stored override so the environment variable (if any) applies.
 */
export async function saveStripeCredentials(
  input: SaveStripeCredentialsInput,
  updatedBy: number | null
): Promise<StripeCredentials> {
  const overrides: string[] = [];
  const upserts: { key: string; value: string | null; updatedBy: number | null }[] = [];

  for (const key of ALL_CREDENTIAL_KEYS) {
    if (!(key in input)) {
      continue;
    }

    const settingKey = STRIPE_CREDENTIAL_KEYS[key];
    const rawValue = input[key];
    const normalized = typeof rawValue === 'string' ? rawValue.trim() : null;

    if (normalized) {
      upserts.push({ key: settingKey, value: normalized, updatedBy });
    } else {
      overrides.push(settingKey);
    }
  }

  if (upserts.length > 0) {
    await upsertAppSettings(upserts);
  }

  if (overrides.length > 0) {
    await deleteAppSettings(overrides);
  }

  invalidateStripeCredentialsCache();

  return getStripeCredentials();
}

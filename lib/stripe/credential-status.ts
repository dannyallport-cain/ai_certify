import type { StripeCredentialKey, StripeCredentials } from './credentials';

/**
 * Shared, serialisable representation of a single Stripe credential that is
 * safe to send to the browser (never includes the raw secret value).
 */
export type StripeCredentialStatusDto = {
  key: StripeCredentialKey;
  label: string;
  configured: boolean;
  source: 'database' | 'environment' | 'missing';
  maskedValue: string | null;
  updatedAt: string | null;
};

export type StripeCredentialsResponse = {
  credentials: StripeCredentialStatusDto[];
};

export const STRIPE_CREDENTIAL_LABELS: Record<StripeCredentialKey, string> = {
  secretKey: 'Secret Key',
  publishableKey: 'Publishable Key',
  webhookSecret: 'Webhook Secret',
};

const CREDENTIAL_ORDER: StripeCredentialKey[] = [
  'secretKey',
  'publishableKey',
  'webhookSecret',
];

export function maskSecretValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value.length <= 8) {
    return '•'.repeat(value.length);
  }

  return `${value.slice(0, 7)}${'•'.repeat(Math.min(24, value.length - 11))}${value.slice(-4)}`;
}

export function toStripeCredentialStatusList(
  credentials: StripeCredentials
): StripeCredentialStatusDto[] {
  return CREDENTIAL_ORDER.map((key) => {
    const credential = credentials[key];

    return {
      key,
      label: STRIPE_CREDENTIAL_LABELS[key],
      configured: Boolean(credential.value),
      source: credential.source,
      maskedValue: maskSecretValue(credential.value),
      updatedAt: credential.updatedAt,
    };
  });
}

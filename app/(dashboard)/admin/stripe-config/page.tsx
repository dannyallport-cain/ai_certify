import { CreditCard, KeyRound, ShieldCheck } from 'lucide-react';
import { AdminMutedNote, AdminPageHero, AdminSection } from '@/components/admin/AdminPageSection';
import IntegrationTestCard from '@/components/integrations/IntegrationTestCard';
import StripeCredentialEditor from '@/components/admin/StripeCredentialEditor';
import { requireAdmin } from '@/lib/auth/admin';
import {
  toStripeCredentialStatusList,
  type StripeCredentialStatusDto,
} from '@/lib/stripe/credential-status';
import { getStripeCredentials } from '@/lib/stripe/credentials';

export const dynamic = 'force-dynamic';

const SOURCE_LABELS: Record<StripeCredentialStatusDto['source'], string> = {
  database: 'Saved in admin',
  environment: 'From environment',
  missing: 'Not configured',
};

export default async function StripeConfigPage() {
  await requireAdmin();

  const credentials = await getStripeCredentials();
  const credentialStatuses = toStripeCredentialStatusList(credentials);

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Payments setup"
        title="Stripe configuration"
        description="Paste a new set of Stripe keys at any time. Values saved here are stored securely and used immediately for pricing, checkout, and webhooks."
        tone="blue"
        icon={<CreditCard className="h-8 w-8" />}
      />

      <AdminSection
        eyebrow="Configuration status"
        title="Active credentials"
        description="A quick check of the keys currently powering Stripe billing workflows."
        icon={<ShieldCheck className="h-5 w-5" />}
        tone="green"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {credentialStatuses.map((credential) => (
            <div
              key={credential.key}
              className={`rounded-2xl border p-5 ${
                credential.configured
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : 'border-amber-200 bg-amber-50/70'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{credential.label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {credential.configured ? 'Configured' : 'Attention needed'}
              </p>
              <p className="mt-2 text-sm text-slate-600">{SOURCE_LABELS[credential.source]}</p>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Credentials"
        title="Paste a new set of Stripe codes"
        description="Replace the secret key, publishable key, or webhook signing secret. Leave a field blank to keep its current value."
        icon={<KeyRound className="h-5 w-5" />}
        tone="blue"
      >
        <StripeCredentialEditor initialCredentials={credentialStatuses} />

        <AdminMutedNote tone="blue">
          Saved values are stored against this deployment and override environment variables. Remove an override
          with the Use env action to fall back to the configured environment variable.
        </AdminMutedNote>
      </AdminSection>

      <IntegrationTestCard
        title="Stripe connectivity test"
        description="Run a live balance lookup against Stripe to confirm the active credentials can authenticate and return data from the account."
        serviceLabel="Stripe"
        endpointPath="/api/admin/stripe/test"
        tone="blue"
        buttonLabel="Test Stripe connection"
        successLabel="Stripe connection verified successfully."
        hint="This performs a real Stripe balance retrieval using the active secret key."
      />
    </div>
  );
}

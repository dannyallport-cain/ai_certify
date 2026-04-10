import { CreditCard, KeyRound, ShieldCheck } from 'lucide-react';
import { AdminMutedNote, AdminPageHero, AdminSection } from '@/components/admin/AdminPageSection';
import StripeSecretField from '@/components/admin/StripeSecretField';
import { requireAdmin } from '@/lib/auth/admin';

export default async function StripeConfigPage() {
  await requireAdmin();

  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Payments setup"
        title="Stripe configuration"
        description="Separate credential visibility, webhook verification, and deployment status into clearer sections with softer visual grouping."
        tone="blue"
        icon={<CreditCard className="h-8 w-8" />}
      />

      <AdminSection
        eyebrow="Configuration status"
        title="Environment readiness"
        description="A quick check of the two secrets required for admin billing workflows."
        icon={<ShieldCheck className="h-5 w-5" />}
        tone="green"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              label: 'Secret key',
              configured: Boolean(secretKey),
              helper: secretKey ? 'Configured from environment variables.' : 'Missing STRIPE_SECRET_KEY.',
            },
            {
              label: 'Webhook secret',
              configured: Boolean(webhookSecret),
              helper: webhookSecret
                ? 'Configured from environment variables.'
                : 'Missing STRIPE_WEBHOOK_SECRET.',
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border p-5 ${
                item.configured
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : 'border-amber-200 bg-amber-50/70'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {item.configured ? 'Configured' : 'Attention needed'}
              </p>
              <p className="mt-2 text-sm text-slate-600">{item.helper}</p>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Credentials"
        title="Stored secret values"
        description="Read-only secret visibility for admins, with each key broken into its own field."
        icon={<KeyRound className="h-5 w-5" />}
        tone="blue"
      >
        <div className="grid gap-6">
          <StripeSecretField
            label="Secret Key"
            value={secretKey}
            placeholder="STRIPE_SECRET_KEY is not configured"
            helperText={
              secretKey ? 'Configured from environment variables.' : 'Missing STRIPE_SECRET_KEY.'
            }
          />
          <StripeSecretField
            label="Webhook Secret"
            value={webhookSecret}
            placeholder="STRIPE_WEBHOOK_SECRET is not configured"
            helperText={
              webhookSecret
                ? 'Configured from environment variables.'
                : 'Missing STRIPE_WEBHOOK_SECRET.'
            }
          />
        </div>

        <AdminMutedNote tone="blue">
          These values remain read-only here so the page acts as a deployment verification screen rather than a credential editor.
        </AdminMutedNote>
      </AdminSection>
    </div>
  );
}

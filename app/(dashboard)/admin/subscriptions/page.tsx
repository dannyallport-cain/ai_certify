import StripePlanEditor from '@/components/admin/StripePlanEditor';
import { AdminMutedNote, AdminPageHero, AdminSection } from '@/components/admin/AdminPageSection';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { requireAdmin } from '@/lib/auth/admin';
import { getAdminStripeSubscriptionPlans } from '@/lib/payments/stripe';
import { CreditCard, Layers3, PencilLine, Sparkles } from 'lucide-react';

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function SubscriptionsPage() {
  await requireAdmin();
  const plans = await getAdminStripeSubscriptionPlans();

  const activePlans = plans.filter((plan) => plan.active).length;
  const lowestPrice = Math.min(...plans.map((plan) => plan.monthlyPrice));
  const highestPrice = Math.max(...plans.map((plan) => plan.monthlyPrice));
  const currency = plans[0]?.currency ?? 'gbp';

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Billing controls"
        title="Subscription plans"
        description="Review live Stripe pricing, compare allowances, and keep editable billing metadata organised in separate sections."
        tone="green"
        icon={<CreditCard className="h-8 w-8" />}
        actions={
          <>
            <Badge variant="outline" className="border-white/40 bg-white/60 text-slate-700">
              {activePlans} active plans
            </Badge>
            <Badge variant="outline" className="border-white/40 bg-white/60 text-slate-700">
              Live Stripe data
            </Badge>
          </>
        }
      />

      <AdminSection
        eyebrow="Plan overview"
        title="Pricing snapshot"
        description="A small summary of active products and pricing range before you edit anything."
        icon={<Sparkles className="h-5 w-5" />}
        tone="blue"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Active plans', `${activePlans}`],
            ['Entry price', formatCurrency(lowestPrice, currency)],
            ['Top plan', formatCurrency(highestPrice, currency)],
          ].map(([label, value]) => (
            <Card key={label} className="rounded-2xl border-slate-200 bg-white shadow-none">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Live catalogue"
        title="Current live Stripe plans"
        description="Each plan card isolates pricing, allowances, and Stripe IDs into an easier-to-scan block."
        icon={<Layers3 className="h-5 w-5" />}
        tone="green"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.priceId} className="rounded-2xl border-emerald-200/70 bg-white shadow-none">
              <CardContent className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                    <p className="text-sm text-slate-600">
                      {plan.description || 'No Stripe description configured yet.'}
                    </p>
                  </div>
                  <Badge variant={plan.active ? 'default' : 'secondary'}>
                    {plan.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Monthly price', formatCurrency(plan.monthlyPrice, plan.currency)],
                    [
                      'Annual price',
                      plan.annualPrice
                        ? formatCurrency(plan.annualPrice, plan.currency)
                        : 'Not configured',
                    ],
                    ['Best for', plan.allowances.targetUser || 'Not configured'],
                    ['Usage', `${plan.allowances.certificates}`],
                    ['Seats', `${plan.allowances.teamSeats}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-emerald-50/70 p-4">
                      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
                        {label}
                      </dt>
                      <dd className="mt-2 text-sm text-slate-700">{value}</dd>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
                  <dt className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
                    Stripe IDs
                  </dt>
                  <dd className="mt-2 break-all text-sm text-slate-700">
                    Price: {plan.priceId}
                    <br />
                    Product: {plan.productId}
                  </dd>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        eyebrow="Editing"
        title="Edit Stripe plan options"
        description="Keep editing controls separate from reporting so pricing changes feel less crowded."
        icon={<PencilLine className="h-5 w-5" />}
        tone="amber"
      >
        <AdminMutedNote tone="amber">
          Changes made here update live Stripe product metadata and replace the active monthly Stripe price if the monthly amount changes.
        </AdminMutedNote>

        <div className="grid gap-6">
          {plans.map((plan) => (
            <StripePlanEditor key={`${plan.productId}-editor`} plan={plan} />
          ))}
        </div>
      </AdminSection>
    </div>
  );
}

import Link from 'next/link';
import StripePlanCreator from '@/components/admin/StripePlanCreator';
import StripePlanEditor from '@/components/admin/StripePlanEditor';
import { AdminMutedNote, AdminPageHero, AdminSection } from '@/components/admin/AdminPageSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { requireAdmin } from '@/lib/auth/admin';
import { getAdminStripeSubscriptionPlans, type AdminStripeSubscriptionPlan } from '@/lib/payments/stripe';
import { CreditCard, Layers3, PencilLine, Plus, Sparkles } from 'lucide-react';

type PlanSnapshot = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  currency: string;
  monthlyPrice: number;
  annualPrice: number | null;
  targetUser: string;
  certificates: string;
  teamSeats: string;
  additionalSeatPrice: string | null;
  badge: string | null;
  savingsNote: string | null;
  competitorAnchor: string | null;
  trialPeriodDays: number | null;
  features: string[];
  statusLabel: string;
  statusTone: 'default' | 'secondary';
};

type PriceSummary = {
  activePlans: number;
  lowestPrice: number | null;
  highestPrice: number | null;
  currency: string;
};

function formatCurrency(value: number | null, currency: string) {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(value);
}

function createLivePlanSnapshot(plan: AdminStripeSubscriptionPlan): PlanSnapshot {
  return {
    id: plan.priceId,
    name: plan.name,
    description: plan.description,
    active: plan.active,
    currency: plan.currency,
    monthlyPrice: plan.monthlyPrice,
    annualPrice: plan.annualPrice,
    targetUser: plan.allowances.targetUser || 'Not configured',
    certificates: plan.allowances.certificates,
    teamSeats: plan.allowances.teamSeats,
    additionalSeatPrice: plan.allowances.additionalSeatPrice,
    badge: plan.allowances.badge,
    savingsNote: plan.allowances.savingsNote,
    competitorAnchor: plan.allowances.competitorAnchor,
    trialPeriodDays: plan.trialPeriodDays,
    features: plan.features,
    statusLabel: plan.active ? 'Active Stripe plan' : 'Inactive Stripe plan',
    statusTone: plan.active ? 'default' : 'secondary',
  };
}

function getPriceSummary(plans: AdminStripeSubscriptionPlan[]): PriceSummary {
  if (plans.length === 0) {
    return {
      activePlans: 0,
      lowestPrice: null,
      highestPrice: null,
      currency: 'gbp',
    };
  }

  return {
    activePlans: plans.filter((plan) => plan.active).length,
    lowestPrice: Math.min(...plans.map((plan) => plan.monthlyPrice)),
    highestPrice: Math.max(...plans.map((plan) => plan.monthlyPrice)),
    currency: plans[0]?.currency ?? 'gbp',
  };
}

function PlanSnapshotCard({ plan }: { plan: PlanSnapshot }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-none">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
            <p className="text-sm text-slate-600">
              {plan.description || 'No description configured yet.'}
            </p>
          </div>
          <Badge variant={plan.statusTone}>{plan.statusLabel}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Monthly price', formatCurrency(plan.monthlyPrice, plan.currency)],
            [
              'Annual price',
              plan.annualPrice !== null
                ? formatCurrency(plan.annualPrice, plan.currency)
                : 'Not configured',
            ],
            ['Best for', plan.targetUser || 'Not configured'],
            ['Usage', plan.certificates],
            ['Seats', plan.teamSeats],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                {label}
              </dt>
              <dd className="mt-2 text-sm text-slate-700">{value}</dd>
            </div>
          ))}
        </div>

        {(plan.badge || plan.savingsNote || plan.competitorAnchor) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Badge
              </dt>
              <dd className="mt-2 text-sm text-slate-700">{plan.badge || 'Not configured'}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Trial days
              </dt>
              <dd className="mt-2 text-sm text-slate-700">
                {plan.trialPeriodDays !== null ? plan.trialPeriodDays : 'Not configured'}
              </dd>
            </div>
          </div>
        ) : null}

        <div className="space-y-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
                Savings note
              </dt>
              <dd className="mt-2 text-sm text-slate-700">{plan.savingsNote || 'Not configured'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
                Competitor anchor
              </dt>
              <dd className="mt-2 text-sm text-slate-700">
                {plan.competitorAnchor || 'Not configured'}
              </dd>
            </div>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
              Features
            </dt>
            <ul className="mt-3 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-emerald-200 bg-white/80 p-4">
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
              Stripe IDs
            </dt>
            <dd className="mt-2 break-all text-sm text-slate-700">
              {plan.active ? `Price: ${plan.id}` : 'Inactive plan preview'}
            </dd>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function SubscriptionsPage() {
  await requireAdmin();
  const livePlans = await getAdminStripeSubscriptionPlans();
  const hasLivePlans = livePlans.length > 0;
  const planSnapshots = livePlans.map(createLivePlanSnapshot);
  const { activePlans, lowestPrice, highestPrice, currency } = getPriceSummary(livePlans);

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Billing controls"
        title="Subscription plans"
        description="Create new live Stripe plans, review current pricing, and edit or delete existing plans in one place."
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
            <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
              <Link href="#create-plan">
                <Plus className="mr-2 h-4 w-4" />
                Create new plan
              </Link>
            </Button>
          </>
        }
      />

      <div id="create-plan" className="scroll-mt-24">
        <AdminSection
          eyebrow="Create plan"
          title="Define a new live Stripe plan"
          description="Create a new Stripe product with its monthly recurring price and billing metadata."
          icon={<Plus className="h-5 w-5" />}
          tone="green"
        >
          <StripePlanCreator />
        </AdminSection>
      </div>

      <AdminSection
        eyebrow="Plan overview"
        title="Pricing snapshot"
        description="A quick look at the active pricing range before you edit or remove anything."
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
        title="Current Stripe plans"
        description="Each plan card shows pricing, allowances, and feature text for a live Stripe product."
        icon={<Layers3 className="h-5 w-5" />}
        tone="green"
      >
        {planSnapshots.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {planSnapshots.map((plan) => (
              <PlanSnapshotCard key={plan.id} plan={plan} />
            ))}
          </div>
        ) : (
          <AdminMutedNote tone="green">
            No live plans exist yet. Use the create form above to add your first Stripe product.
          </AdminMutedNote>
        )}
      </AdminSection>

      <AdminSection
        eyebrow="Editing"
        title="Edit or remove plans"
        description="Each live plan below has its own save and delete controls."
        icon={<PencilLine className="h-5 w-5" />}
        tone="amber"
      >
        <AdminMutedNote tone="amber">
          Save edits to update Stripe metadata and pricing, or delete a plan to deactivate the product and its recurring prices.
        </AdminMutedNote>

        {hasLivePlans ? (
          <div className="grid gap-6">
            {livePlans.map((plan) => (
              <StripePlanEditor key={`${plan.productId}-editor`} plan={plan} />
            ))}
          </div>
        ) : (
          <AdminMutedNote tone="amber">
            There are no editable live plans yet.
          </AdminMutedNote>
        )}
      </AdminSection>
    </div>
  );
}

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';

import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  CreditCard,
  Layers3,
  Package,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  getAdminStripeSubscriptionPlans,
} from '@/lib/payments/stripe';
import { getLocalAuthorityTemplatePackOffer } from '@/lib/payments/addons';

export const dynamic = 'force-dynamic';

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(value);
}

function PricingMechanismCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Icon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={highlight ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}>
        {label}
      </span>
      <span
        className={`text-right font-semibold ${
          highlight ? 'text-slate-950 dark:text-white' : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function MechanismStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-cyan-600 text-sm font-bold text-white">
          {number}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default async function PricingPage() {
  let plans: Awaited<ReturnType<typeof getAdminStripeSubscriptionPlans>> = [];
  let templatePackOffer: Awaited<ReturnType<typeof getLocalAuthorityTemplatePackOffer>> = null;
  let pricingWarning: string | null = null;

  try {
    [plans, templatePackOffer] = await Promise.all([
      getAdminStripeSubscriptionPlans(),
      getLocalAuthorityTemplatePackOffer(),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    pricingWarning = message.includes('STRIPE_SECRET_KEY')
      ? 'Pricing is temporarily unavailable because Stripe is not configured (missing STRIPE_SECRET_KEY).'
      : 'Pricing data is temporarily unavailable. Please try again shortly.';
    console.error('[pricing] failed to load pricing data:', error);
  }

  const activePlans = plans.filter((plan) => plan.active);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <Header />

      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white py-20 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40">
              <ShieldCheck className="h-4 w-4" />
              Pricing built for certification teams, field crews, and growing offices
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Simple pricing that grows with your team
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Start with a monthly plan, add seats as your team expands, and unlock specialist packs when you need them.
              Billing is handled securely through Stripe, so payment methods, invoices, and plan changes stay in one place.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PricingMechanismCard
              icon={CreditCard}
              title="Monthly plans"
              description="Choose a recurring subscription that matches how your team uses certificates, reports, and templates."
            />
            <PricingMechanismCard
              icon={Users}
              title="Team seats"
              description="Each plan includes a set number of users so you can keep access aligned with your office and field teams."
            />
            <PricingMechanismCard
              icon={Layers3}
              title="Usage allowances"
              description="Plans show the certificate allowance and usage limits clearly, so costs stay predictable as throughput changes."
            />
            <PricingMechanismCard
              icon={Package}
              title="Optional add-ons"
              description="Purchase specialist document packs separately from your core subscription when a project needs extra workflows."
            />
          </div>
        </div>
      </section>

      {pricingWarning ? (
        <section className="border-b border-amber-200 bg-amber-50 py-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="mx-auto max-w-7xl px-4 text-sm font-medium text-amber-800 dark:text-amber-200 sm:px-6 lg:px-8">
            {pricingWarning}
          </div>
        </section>
      ) : null}

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Choose the plan that fits your workflow</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Compare the included users, monthly allowance, and support level across each plan before you get started.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {activePlans.map((plan) => {
              const highlight = (plan.allowances.badge || '').toLowerCase().includes('popular');
              const monthlyPrice = formatCurrency(plan.monthlyPrice, plan.currency);
              const ctaLabel =
                plan.name === 'Enterprise'
                  ? 'Talk to sales'
                  : plan.trialPeriodDays && plan.trialPeriodDays > 0
                    ? 'Start free trial'
                    : 'Get started';

              return (
                <div
                  key={plan.priceId}
                  className={`relative flex flex-col rounded-3xl border p-8 shadow-sm transition-transform ${
                    highlight
                      ? 'border-cyan-500 bg-white text-slate-950 shadow-cyan-500/20 lg:scale-[1.02] dark:border-cyan-400 dark:bg-slate-900 dark:text-white'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  {plan.allowances.badge ? (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-cyan-600 px-4 py-1 text-sm font-semibold text-white">
                      {plan.allowances.badge}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className={highlight ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-600 dark:text-slate-300'}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-dashed border-slate-200 pt-6 dark:border-slate-700">
                    <div className="flex items-end gap-2">
                      <span className={`text-5xl font-bold ${highlight ? 'text-slate-950 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                        {monthlyPrice}
                      </span>
                      <span className={highlight ? 'pb-1 font-medium text-slate-700 dark:text-slate-300' : 'pb-1 text-slate-500'}>
                        /month
                      </span>
                    </div>

                    {plan.annualPrice ? (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        Annual reference price: {formatCurrency(plan.annualPrice, plan.currency)}/year
                      </p>
                    ) : null}

                    {plan.trialPeriodDays ? (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Includes a {plan.trialPeriodDays}-day free trial.
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={`mt-6 space-y-3 rounded-2xl border p-4 text-sm ${
                      highlight
                        ? 'border-cyan-200 bg-white dark:border-slate-700 dark:bg-slate-950/40'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40'
                    }`}
                  >
                    <DetailRow
                      label="Best for"
                      value={plan.allowances.targetUser || 'Electrical contractors'}
                      highlight={highlight}
                    />
                    <DetailRow
                      label="Monthly certificates"
                      value={plan.allowances.certificates}
                      highlight={highlight}
                    />
                    <DetailRow
                      label="Users included"
                      value={plan.allowances.teamSeats}
                      highlight={highlight}
                    />
                    {plan.allowances.additionalSeatPrice ? (
                      <DetailRow
                        label="Additional users"
                        value={plan.allowances.additionalSeatPrice}
                        highlight={highlight}
                      />
                    ) : null}
                    {plan.allowances.savingsNote ? (
                      <DetailRow
                        label="Why customers choose it"
                        value={plan.allowances.savingsNote}
                        highlight={highlight}
                      />
                    ) : null}
                  </div>

                  <ul className="mt-6 flex flex-1 flex-col gap-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <CheckCircle2
                          className={`mt-0.5 h-5 w-5 flex-none ${
                            highlight ? 'text-cyan-600 dark:text-cyan-400' : 'text-emerald-500'
                          }`}
                        />
                        <span
                          className={
                            highlight
                              ? 'font-medium text-slate-900 dark:text-slate-100'
                              : 'font-medium text-slate-800 dark:text-slate-200'
                          }
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button
                      asChild
                      className={`h-12 w-full rounded-full text-base font-semibold ${
                        highlight
                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                          : 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'
                      }`}
                    >
                      <Link href={plan.name === 'Enterprise' ? '/contact' : '/sign-up'}>{ctaLabel}</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300">
              How billing works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              A clear path from signup to managed billing
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Pick a plan, add specialists when you need them, and keep billing under control from the customer portal.
              The pricing model is designed to stay straightforward as your team and usage grow.
            </p>

            <div className="mt-10 grid gap-4">
              <MechanismStep
                number="01"
                title="Choose a subscription plan"
                description="Starter, Small Business, and Enterprise are billed monthly, with clear allowances for users and certificate volume."
              />
              <MechanismStep
                number="02"
                title="Scale seats and usage"
                description="Each plan shows who is included, what volume is covered, and what it costs to expand as your team grows."
              />
              <MechanismStep
                number="03"
                title="Add specialist packs separately"
                description="Optional document packs and specialised workflows can be purchased alongside your core subscription without changing the base plan."
              />
              <MechanismStep
                number="04"
                title="Manage everything in Stripe"
                description="Update payment methods, review invoices, and change plans through the secure billing portal whenever you need to."
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-xl font-semibold">Which plan should I choose?</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  • <strong>Starter</strong> is for solo engineers who want compliant certificates, branded PDFs, and a simple monthly bill.
                </p>
                <p>
                  • <strong>Small Business</strong> suits growing teams that need unlimited certificates, mobile capture, and AI-assisted workflows.
                </p>
                <p>
                  • <strong>Enterprise</strong> is for larger organisations that need broader access, deeper automation, and integration support.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm dark:border-slate-800">
              <h3 className="text-xl font-semibold">Specialist add-ons</h3>
              <p className="mt-3 text-slate-300">
                Add-on packs are purchased separately from your recurring subscription, so you can unlock
                housing, template, or workflow-specific features only when they are useful to your team.
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                {templatePackOffer ? (
                  <>
                    <p className="text-sm uppercase tracking-[0.25em] text-cyan-200">
                      Available add-on
                    </p>
                    <p className="mt-2 text-lg font-semibold">{templatePackOffer.name}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {templatePackOffer.description || 'Specialised workflow pack available as a separate purchase.'}
                    </p>
                    <p className="mt-3 text-2xl font-bold">
                      {formatCurrency(templatePackOffer.monthlyPrice, templatePackOffer.currency)}
                      <span className="text-sm font-normal text-slate-300"> per month</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm uppercase tracking-[0.25em] text-cyan-200">
                      Add-on placeholder
                    </p>
                    <p className="mt-2 text-lg font-semibold">Document packs and specialist workflows</p>
                    <p className="mt-1 text-sm text-slate-300">
                      When a pack is published in Stripe, it appears here as a separate purchase from the monthly subscription.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import Link from 'next/link';

import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';
import { formatGbp } from '@/lib/payments/pricing/benchmarks';
import { PLAN_CATALOG } from '@/lib/payments/pricing/plan-catalog';

type BillingStep = {
  number: string;
  title: string;
  description: string;
};

const BILLING_STEPS: BillingStep[] = [
  {
    number: '01',
    title: 'Pick a plan and try it free',
    description:
      'Solo, Business and Enterprise each include a 14-day trial. Seats and certificate volume are shown before you check out.',
  },
  {
    number: '02',
    title: 'Checkout charges the published rate',
    description:
      'The subscription is created at the price on this page, so the Stripe invoice always matches what you were quoted.',
  },
  {
    number: '03',
    title: 'Add modules when the work appears',
    description:
      'Floor plans, AI usage, extra seats and integrations are separate monthly tiers you can add or drop between months.',
  },
  {
    number: '04',
    title: 'Manage everything in Stripe',
    description:
      'Cards, invoices and plan changes live in the Stripe billing portal, including switching to annual billing.',
  },
];

export function BillingSteps() {
  return (
    <Section tone="white">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <SectionHeading
            align="left"
            eyebrow="How billing works"
            title="From signup to a managed Stripe subscription"
            description="One monthly invoice covers your plan and every add-on module you switch on."
            className="max-w-none"
          />

          <div className="mt-8 grid gap-3">
            {BILLING_STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cyan-600 text-xs font-bold text-white">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Reveal className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Which plan should I choose?
            </h3>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {PLAN_CATALOG.map((plan) => (
                <li key={plan.key} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-slate-400" />
                  <span>
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      {plan.name} — {formatGbp(plan.monthlyPrice)}/month.
                    </strong>{' '}
                    {plan.seatsIncluded} {plan.seatsIncluded === 1 ? 'seat' : 'seats'} for{' '}
                    {plan.targetUser.toLowerCase()}.
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80} className="rounded-2xl bg-slate-950 p-6 text-white">
            <h3 className="text-base font-semibold">Need an annual invoice?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Annual billing charges ten months for twelve on every plan. Purchase orders and
              invoice-before-payment are available on Enterprise — we will set the subscription up at
              the same published rates.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Ask about annual billing
            </Link>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, Sparkles } from 'lucide-react';

import { CallToAction } from '@/components/marketing/CallToAction';
import { PageHero } from '@/components/marketing/PageHero';
import { Section, SectionHeading } from '@/components/marketing/Section';
import { AddonModules } from '@/components/marketing/pricing/AddonModules';
import { BillingSteps } from '@/components/marketing/pricing/BillingSteps';
import { PlanCard } from '@/components/marketing/pricing/PlanCard';
import { PricingMechanisms } from '@/components/marketing/pricing/PricingMechanisms';
import { PricingMethod } from '@/components/marketing/pricing/PricingMethod';
import {
  PER_USER_BENCHMARK_GBP,
  formatGbp,
} from '@/lib/payments/pricing/benchmarks';
import { getMarketingPlans } from '@/lib/payments/pricing/marketing-plans';
import type { PlanKey } from '@/lib/payments/pricing/plan-catalog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pricing | AI-Certificates',
  description:
    'Certification plans at least 30% below the published specialist rates: Solo, Business and Enterprise, with tiered add-on modules for floor plans, AI usage, extra seats and integrations.',
};

const PLAN_CTA: Record<PlanKey, { href: string; label: string }> = {
  solo: { href: '/sign-up', label: 'Start free trial' },
  business: { href: '/sign-up', label: 'Start free trial' },
  enterprise: { href: '/contact', label: 'Talk to sales' },
};

const CERTIFICATE_GROUPS = [
  {
    title: 'Electrical',
    items: ['EICR', 'EIC', 'Minor works', 'PAT testing'],
  },
  {
    title: 'Fire & emergency lighting',
    items: [
      'BS 5839 design',
      'Installation & commissioning',
      'BS 5266 emergency lighting',
      'Extinguisher servicing',
    ],
  },
  {
    title: 'Housing & voids',
    items: ['Void inspections', 'Stock condition', 'Damp & mould', 'Communal areas'],
  },
  {
    title: 'Gas & specialist',
    items: ['CP12', 'Plant room checks', 'Legionella', 'Contractor access'],
  },
];

export default async function PricingPage() {
  const { plans, warning } = await getMarketingPlans();

  return (
    <>
      <PageHero
        align="center"
        eyebrow="Pricing"
        title="Every plan 30% under the tools you are comparing us with"
        description="Each plan and module is priced against the published rate of the closest specialist tool, then discounted by 30%. Pick the seats you need, add modules when a project calls for them, and keep one predictable monthly invoice."
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-cyan-100 backdrop-blur">
          <ShieldCheck className="h-4 w-4" />
          No per-certificate charges · Change plan or modules any month
        </span>
      </PageHero>

      <PricingMechanisms />

      {warning ? (
        <div className="border-y border-amber-200 bg-amber-50 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="mx-auto max-w-7xl px-4 text-sm font-medium text-amber-800 sm:px-6 lg:px-8 dark:text-amber-200">
            {warning}
          </p>
        </div>
      ) : null}

      <Section tone="muted" id="plans">
        <SectionHeading
          eyebrow="Plans"
          title="Choose the seats you need, not the apps you can afford"
          description={`Three plans, each anchored to the ${formatGbp(PER_USER_BENCHMARK_GBP)} per-user market rate of a single-trade app and discounted from there. Every plan includes the full certificate library, the template builder and mobile capture.`}
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              href={PLAN_CTA[plan.key].href}
              ctaLabel={PLAN_CTA[plan.key].label}
              delay={index * 70}
            />
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-300">
          All prices exclude VAT. Annual billing charges ten months for twelve on every plan.
        </p>
      </Section>

      <AddonModules />

      <PricingMethod />

      <Section tone="muted">
        <SectionHeading
          eyebrow="Included with every plan"
          title="The certificate work you already do, priced once"
          description="Plans are not a menu of certificate types — the whole library is available on every tier, including the specialist packs."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {CERTIFICATE_GROUPS.map((group) => (
            <div
              key={group.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{group.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 flex-none text-cyan-600 dark:text-cyan-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Need the housing association template pack?
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Nine mobile-ready report templates for void inspections, damp and mould, plant rooms
                and communal areas, billed as a separate add-on.
              </p>
            </div>
          </div>
          <Link
            href="/housing-associations"
            className="inline-flex h-10 flex-none items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            See the housing pack
          </Link>
        </div>
      </Section>

      <BillingSteps />

      <CallToAction
        tone="muted"
        title="Not sure how many seats you need?"
        description="Tell us how many engineers you have and roughly how many certificates and reports you issue a month. We will map it to the right plan and modules."
        primaryHref="/contact"
        primaryLabel="Ask about pricing"
        secondaryHref="/features"
        secondaryLabel="See what is included"
      />
    </>
  );
}

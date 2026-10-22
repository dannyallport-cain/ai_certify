import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';
import { Button } from '@/components/ui/button';
import { formatGbp } from '@/lib/payments/pricing/benchmarks';
import { ANNUAL_MONTHS_CHARGED, type PlanCatalogEntry } from '@/lib/payments/pricing/plan-catalog';
import { cn } from '@/lib/utils';

type PlanCardProps = {
  plan: PlanCatalogEntry;
  href: string;
  ctaLabel: string;
  delay?: number;
};

const FREE_ANNUAL_MONTHS = 12 - ANNUAL_MONTHS_CHARGED;

export function PlanCard({ plan, href, ctaLabel, delay = 0 }: PlanCardProps) {
  const highlight = (plan.badge ?? '').toLowerCase().includes('popular');

  return (
    <Reveal
      delay={delay}
      className={cn(
        'relative flex flex-col rounded-3xl border p-7',
        highlight
          ? 'border-cyan-500 bg-white shadow-xl shadow-cyan-500/10 lg:-mt-4 lg:mb-4 dark:border-cyan-400 dark:bg-slate-900'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
      )}
    >
      {plan.badge ? (
        <div className="absolute -top-3.5 left-7 rounded-full bg-cyan-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          {plan.badge}
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {plan.seatsIncluded} {plan.seatsIncluded === 1 ? 'seat' : 'seats'}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300">{plan.tagline}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.description}</p>

      <div className="mt-6 border-t border-dashed border-slate-200 pt-6 dark:border-slate-700">
        <div className="flex items-end gap-1.5">
          <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatGbp(plan.monthlyPrice)}
          </span>
          <span className="pb-1 text-sm font-medium text-slate-500 dark:text-slate-400">/month</span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          or {formatGbp(plan.annualPrice)}/year — {FREE_ANNUAL_MONTHS} months free
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {plan.trialPeriodDays}-day free trial, no card required.
        </p>

        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <span className="font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            {plan.savingsPercent}% cheaper
          </span>
          <span className="ml-1.5 text-emerald-900 dark:text-emerald-200">
            than {formatGbp(plan.benchmark.monthlyPriceGbp)} for {plan.benchmark.seatsCompared}{' '}
            {plan.benchmark.seatsCompared === 1 ? 'user' : 'users'} on {plan.benchmark.vendor}
          </span>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-950/40">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-slate-500 dark:text-slate-400">Certificates</dt>
          <dd className="text-right font-semibold text-slate-950 dark:text-white">{plan.certificates}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-slate-500 dark:text-slate-400">Extra seats</dt>
          <dd className="text-right font-semibold text-slate-950 dark:text-white">
            {formatGbp(plan.extraSeatPriceGbp)}/month each
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-slate-500 dark:text-slate-400">Best for</dt>
          <dd className="text-right font-medium text-slate-700 dark:text-slate-300">{plan.targetUser}</dd>
        </div>
      </dl>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <CheckCircle2
              className={cn(
                'mt-0.5 h-4 w-4 flex-none',
                highlight ? 'text-cyan-600 dark:text-cyan-400' : 'text-emerald-500',
              )}
            />
            <span className="font-medium text-slate-800 dark:text-slate-200">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Button
          asChild
          className={cn(
            'h-11 w-full rounded-full text-sm font-semibold',
            highlight
              ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              : 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200',
          )}
        >
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      </div>
    </Reveal>
  );
}

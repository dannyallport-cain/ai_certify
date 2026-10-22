import Link from 'next/link';
import { Check, ArrowUpRight } from 'lucide-react';

import { formatGbp } from '@/lib/payments/pricing/benchmarks';
import type { AddonTier } from '@/lib/payments/pricing/addon-catalog';
import { cn } from '@/lib/utils';

type AddonTierCardProps = {
  tier: AddonTier;
  moduleId: string;
  moduleName: string;
};

export function AddonTierCard({ tier, moduleId, moduleName }: AddonTierCardProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-2xl border p-5',
        tier.highlight
          ? 'border-cyan-400 bg-white shadow-lg shadow-cyan-500/10 dark:border-cyan-500/60 dark:bg-slate-900'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
            {tier.name}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{tier.summary}</p>
        </div>
        {tier.highlight ? (
          <span className="flex-none rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300">
            Popular
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {formatGbp(tier.monthlyPrice)}
        </span>
        <span className="pb-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">/month</span>
      </div>

      <p className="mt-1.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 line-through dark:text-slate-500">
          {formatGbp(tier.benchmarkMonthlyGbp)}
        </span>{' '}
        on {tier.benchmarkLabel} — {tier.savingsPercent}% less
      </p>

      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {tier.includes.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs leading-5">
            <Check
              className={cn(
                'mt-0.5 h-3.5 w-3.5 flex-none',
                tier.highlight ? 'text-cyan-600 dark:text-cyan-400' : 'text-emerald-500',
              )}
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-dashed border-slate-200 pt-3 text-[11px] leading-4 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Best for {tier.bestFor.charAt(0).toLowerCase()}
        {tier.bestFor.slice(1)}
      </p>

      <Link
        href={`/contact?topic=add-on&module=${moduleId}&tier=${tier.id}`}
        aria-label={`Request the ${moduleName} ${tier.name} add-on`}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
      >
        Add this module
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

import Link from 'next/link';
import { ArrowRight, BadgePercent } from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';
import {
  COMPETITOR_BENCHMARKS,
  PRICING_METHOD_EXAMPLES,
  discountPercent,
  formatGbp,
} from '@/lib/payments/pricing/benchmarks';

/**
 * Shows the arithmetic behind the ladder: the published competitor rate we
 * anchored to, our price, and the resulting saving.
 */
export function PricingMethod() {
  return (
    <Section tone="white" id="how-pricing-is-set">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-16">
        <SectionHeading
          align="left"
          eyebrow="How the prices are set"
          title="We took the market rate and cut 30% off it"
          description="Every plan and module is anchored to the published price of the closest specialist tool, then discounted. No per-certificate charges, no credit packs that expire in a week, and no licence per device."
          className="max-w-none"
        >
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <BadgePercent className="h-4 w-4" />
            At least 30% below the comparable published price
          </div>
        </SectionHeading>

        <Reveal
          delay={80}
          className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                    What we compared
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                    Market
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                    Ours
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                    Saving
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {PRICING_METHOD_EXAMPLES.map((example) => {
                  const benchmark = COMPETITOR_BENCHMARKS[example.benchmarkId];

                  return (
                    <tr key={example.label}>
                      <th
                        scope="row"
                        className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300"
                      >
                        {example.label}
                        <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                          {benchmark.vendor} · {benchmark.sourceNote}
                        </span>
                      </th>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        {formatGbp(example.benchmarkGbp)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatGbp(example.ourPriceGbp)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {discountPercent(example.ourPriceGbp, example.benchmarkGbp)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Comparison prices are the vendors' published list prices in October 2026, converted
              to GBP where they bill in USD or EUR. Per-seat rates and full tier detail sit above; ask
              us for the working if you would rather see it line by line.
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
            >
              Talk through the comparison
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

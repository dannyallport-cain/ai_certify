import type { ComponentType } from 'react';
import { Flame, Plug, Sparkles, Users } from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';
import { Section, SectionHeading } from '@/components/marketing/Section';
import {
  ADDON_MODULES,
  getAddonBenchmarkEntryPrice,
  getAddonEntryPrice,
  type AddonIconKey,
} from '@/lib/payments/pricing/addon-catalog';
import { formatGbp } from '@/lib/payments/pricing/benchmarks';
import { AddonTierCard } from './AddonTierCard';

const MODULE_ICONS: Record<AddonIconKey, ComponentType<{ className?: string }>> = {
  flame: Flame,
  sparkles: Sparkles,
  users: Users,
  plug: Plug,
};

/**
 * The add-on catalogue as a tiered module section: every module lists its
 * three tiers, the specialist tool it replaces, and the saving against it.
 */
export function AddonModules() {
  const tierCount = ADDON_MODULES.reduce((total, module) => total + module.tiers.length, 0);

  return (
    <Section tone="muted" id="add-ons">
      <SectionHeading
        eyebrow="Add-on modules"
        title="Bolt on modules only when the work turns up"
        description="Four modules, each tiered three ways. Start on the tier that matches your month and move up when the workload does — every tier is priced at least 30% below the specialist tool it replaces."
      >
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900">
            {ADDON_MODULES.length} modules
          </span>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900">
            {tierCount} tiers
          </span>
          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            From 30% below the tool it replaces
          </span>
        </div>
      </SectionHeading>

      <div className="mt-12 space-y-6">
        {ADDON_MODULES.map((module, index) => {
          const Icon = MODULE_ICONS[module.icon];

          return (
            <Reveal
              key={module.id}
              delay={index * 60}
              className="rounded-3xl border border-slate-200 bg-white/80 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-slate-950 text-cyan-300 dark:bg-cyan-500/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {module.name}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Module {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {module.description}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Replaces:
                      </span>{' '}
                      {module.replaces}
                    </p>
                  </div>
                </div>

                <div className="flex flex-none flex-col gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm lg:text-right dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    From
                  </span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatGbp(getAddonEntryPrice(module))}
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      /month
                    </span>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    vs {formatGbp(getAddonBenchmarkEntryPrice(module))} elsewhere
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {module.tiers.map((tier) => (
                  <AddonTierCard
                    key={tier.id}
                    tier={tier}
                    moduleId={module.id}
                    moduleName={module.name}
                  />
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {module.billingNote}
              </p>
            </Reveal>
          );
        })}
      </div>

      <Reveal
        delay={80}
        className="mt-6 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white sm:p-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold">How add-on modules bill</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Modules stack on top of your plan and are billed monthly on the same Stripe invoice. Add
              one mid-month and it is prorated; drop back down when the project closes. Your plan's
              included seats and certificate volume never change when you add a module.
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3 lg:flex-none">
            {[
              { label: 'Same invoice', detail: 'One monthly Stripe bill' },
              { label: 'Prorated', detail: 'Add or remove any month' },
              { label: 'Per workspace', detail: 'Not per device' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="font-semibold text-cyan-200">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

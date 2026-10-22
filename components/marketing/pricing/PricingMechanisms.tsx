import type { ComponentType } from 'react';
import { CreditCard, Layers3, Package, Users } from 'lucide-react';

import { Section } from '@/components/marketing/Section';

type Mechanism = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

const MECHANISMS: Mechanism[] = [
  {
    icon: CreditCard,
    title: 'Monthly plans',
    description:
      'A recurring Stripe subscription priced per workspace, with seats and certificate volume shown up front.',
  },
  {
    icon: Users,
    title: 'Team seats',
    description:
      'Every plan includes a set number of users at a per-seat rate at least 30% below the going market price.',
  },
  {
    icon: Layers3,
    title: 'Tiered add-ons',
    description:
      'Floor plans, AI usage, extra seats and integrations each come in three tiers you can switch between.',
  },
  {
    icon: Package,
    title: 'No per-certificate fees',
    description:
      'Certificate volume is part of the plan, so a busy month never turns into a surprise invoice.',
  },
];

/** The four pricing principles at the top of the pricing page. */
export function PricingMechanisms() {
  return (
    <Section tone="white" padding="compact">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {MECHANISMS.map((mechanism) => {
          const Icon = mechanism.icon;

          return (
            <div
              key={mechanism.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <Icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                {mechanism.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {mechanism.description}
              </p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

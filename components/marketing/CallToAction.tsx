import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';
import { Section } from './Section';

type CallToActionProps = {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tone?: 'white' | 'muted';
  className?: string;
};

/**
 * Shared closing panel so every marketing page ends with the same
 * invitation instead of a bespoke block.
 */
export function CallToAction({
  title = 'Ready to modernise your certification workflow?',
  description = 'Build reusable templates, capture evidence on mobile, and deliver finished documents without the rework.',
  primaryHref = '/sign-up',
  primaryLabel = 'Start free trial',
  secondaryHref = '/contact',
  secondaryLabel = 'Book a demo',
  tone = 'white',
  className,
}: CallToActionProps) {
  return (
    <Section tone={tone} padding="compact" className={className}>
      <Reveal className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_140%_at_10%_0%,rgba(37,99,235,0.45),transparent_55%),radial-gradient(80%_100%_at_90%_20%,rgba(34,211,238,0.28),transparent_55%)]"
        />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-pretty text-base leading-7 text-slate-300">{description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link
              href={primaryHref}
              className={cn(
                'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950',
                'transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-xl hover:shadow-cyan-500/20',
              )}
            >
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

'use client';

import { ExternalLink, Info } from 'lucide-react';

import type { BlueprintSource, DemoDesignSummary } from '@/lib/design/demo';

interface DemoPlanBannerProps {
  summary: DemoDesignSummary;
  source: BlueprintSource;
}

/**
 * Explains that this is a worked example, and credits the published plan it was drawn from.
 *
 * The credit is a real link rather than a footnote because the drawing reproduces someone else's
 * room schedule: a surveyor checking the demonstration should be able to see where the dimensions
 * came from.
 */
export default function DemoPlanBanner({ summary, source }: DemoPlanBannerProps) {
  const stats = [
    { label: 'Storeys', value: String(summary.floors) },
    { label: 'Compartment zones', value: String(summary.zones) },
    { label: 'Devices', value: String(summary.devices) },
    { label: 'External areas', value: String(summary.areas) },
    { label: 'Floor area', value: `${summary.floorAreaSquareMeters} m²` },
    { label: 'Zoned', value: `${Math.round(summary.zoneCoverageRatio * 100)}%` },
  ];

  return (
    <section className="rounded-xl border border-border bg-muted/40 p-3 print:hidden">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Demonstration plan</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A complete two-storey zone plan, ready to explore. Drag devices out of the catalogue,
            draw compartments, add external areas and open the inspectors — every edit behaves
            exactly as it does on a real design. Nothing is written to your designs until you save a
            copy.
          </p>

          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-1.5">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="text-xs font-semibold text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Layout drawn from{' '}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
            >
              {source.title}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>{' '}
            ({source.publisher}, {source.reference}). {source.derived}
          </p>
        </div>
      </div>
    </section>
  );
}

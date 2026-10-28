import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ZonePlanViewer from '@/components/zone-plan/ZonePlanViewer';
import { getZonePlanByToken, readPlanSession, recordZonePlanView } from '@/lib/zone-plans/store';
import { isZonePlanToken } from '@/lib/zone-plans/tokens';
import { normaliseLegendConfig } from '@/mobile/modules/fire-alarm-roomplan/plan3d/legend-config';

/**
 * The hosted zone plan behind the emailed link.
 *
 * The share token is the credential, so the page is public, renders nothing about the team or the
 * customer, and is marked noindex: a link that leaks into a search index would expose a site plan
 * to anyone.
 */

export const dynamic = 'force-dynamic';

interface ZonePlanPageProps {
  params: Promise<{ token: string }>;
}

const FALLBACK_TITLE = 'Fire alarm zone plan';

function readTitle(planTitle: string | null, legend: unknown): string {
  const normalised = normaliseLegendConfig(legend);

  return planTitle || normalised.planTitle || FALLBACK_TITLE;
}

export async function generateMetadata({ params }: ZonePlanPageProps): Promise<Metadata> {
  const { token } = await params;

  if (!isZonePlanToken(token)) {
    return { title: FALLBACK_TITLE, robots: { index: false, follow: false } };
  }

  const plan = await getZonePlanByToken(token).catch(() => null);

  if (!plan) {
    return { title: FALLBACK_TITLE, robots: { index: false, follow: false } };
  }

  const legend = normaliseLegendConfig(plan.legend);
  const title = readTitle(plan.title, plan.legend);

  return {
    title: legend.siteName ? `${title} — ${legend.siteName}` : title,
    description: legend.siteName
      ? `Fire alarm zone plan for ${legend.siteName}`
      : 'Fire alarm zone plan',
    robots: { index: false, follow: false },
  };
}

export default async function ZonePlanPage({ params }: ZonePlanPageProps) {
  const { token } = await params;

  if (!isZonePlanToken(token)) {
    notFound();
  }

  let plan: Awaited<ReturnType<typeof getZonePlanByToken>>;

  try {
    plan = await getZonePlanByToken(token);
  } catch (error) {
    console.error('Zone plan page error:', error);

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">This plan is unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The plan could not be loaded just now. Try the link again in a moment, or ask the sender
            to resend it.
          </p>
        </div>
      </main>
    );
  }

  if (!plan) {
    notFound();
  }

  // Best effort view tracking: the drawing must render even if this write fails.
  void recordZonePlanView(plan.id);

  return (
    <main className="min-h-screen bg-background">
      <ZonePlanViewer
        token={plan.shareToken}
        session={readPlanSession(plan)}
        initialZones={plan.zones}
        initialLegend={plan.legend}
        editEnabled={plan.editEnabled}
        updatedAt={plan.updatedAt.toISOString()}
      />
    </main>
  );
}

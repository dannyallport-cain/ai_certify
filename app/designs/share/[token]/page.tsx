import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SharedDesignViewer from '@/components/design/SharedDesignViewer';
import { getDesignByToken, isDesignShareToken, recordDesignView } from '@/lib/design/store';

/**
 * The public, read-only view of an issued design.
 *
 * The share token is the credential, so the page renders nothing about the team, the customer or
 * the capture, and is marked noindex: a link that drifts into a search index would expose a
 * building's layout to anyone.
 */

export const dynamic = 'force-dynamic';

const FALLBACK_TITLE = 'Fire alarm design';

interface SharedDesignPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: SharedDesignPageProps): Promise<Metadata> {
  const { token } = await params;

  if (!isDesignShareToken(token)) {
    return { title: FALLBACK_TITLE, robots: { index: false, follow: false } };
  }

  const design = await getDesignByToken(token).catch(() => null);

  if (!design) {
    return { title: FALLBACK_TITLE, robots: { index: false, follow: false } };
  }

  return {
    title: design.design.sheet.siteName
      ? `${design.name} — ${design.design.sheet.siteName}`
      : design.name,
    description: `Fire alarm zone plan${design.siteName ? ` for ${design.siteName}` : ''}`,
    robots: { index: false, follow: false },
  };
}

export default async function SharedDesignPage({ params }: SharedDesignPageProps) {
  const { token } = await params;

  if (!isDesignShareToken(token)) {
    notFound();
  }

  let design: Awaited<ReturnType<typeof getDesignByToken>>;

  try {
    design = await getDesignByToken(token);
  } catch (error) {
    console.error('Shared design page error:', error);

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">This plan is unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The design could not be loaded just now. Try the link again in a moment, or ask the
            sender to resend it.
          </p>
        </div>
      </main>
    );
  }

  if (!design) {
    notFound();
  }

  // Best effort view tracking: the drawing must render even if this write fails.
  void recordDesignView(design.id);

  return (
    <main className="min-h-screen bg-background">
      <SharedDesignViewer design={design.design} />
    </main>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Building2, Layers, LayoutTemplate, MapPin } from 'lucide-react';

import NewDesignButton from '@/components/design/NewDesignButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { createDemoDesign, summariseDemoDesign } from '@/lib/design/demo';
import { listDesigns } from '@/lib/design/store';

export const metadata = {
  title: 'Building designs',
};

export const dynamic = 'force-dynamic';

/**
 * Design library.
 *
 * This is the separate design section: plans that have been worked up from a capture (or drawn
 * from nothing) with devices, zones and external areas, as distinct from the raw captures listed
 * under fire alarm surveys.
 */
export default async function DesignsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();

  if (!team) {
    redirect('/dashboard');
  }

  const designs = await listDesigns(team.id);
  // The demonstration is built, not stored, so its counts come from the document itself.
  const demo = summariseDemoDesign(createDemoDesign());

  const floorTotal = designs.reduce((total, design) => total + design.floorCount, 0);
  const deviceTotal = designs.reduce((total, design) => total + design.deviceCount, 0);
  const sharedCount = designs.filter((design) => Boolean(design.shareToken)).length;

  return (
    <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Building2 className="h-7 w-7 text-muted-foreground" />
            Building designs
          </h2>
          <p className="text-muted-foreground">
            Multi-floor plan views with fire alarm devices, colour coded zones and external areas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/fire-alarm-surveys">
              <MapPin className="mr-2 h-4 w-4" />
              Captures
            </Link>
          </Button>
          <NewDesignButton />
        </div>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
            <LayoutTemplate className="h-4 w-4 text-foreground" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Demonstration plan</h3>
            <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
              A finished two-storey zone plan drawn from a published architectural blueprint:{' '}
              {demo.floors} storeys, {demo.zones} compartment zones, {demo.devices} devices and{' '}
              {demo.areas} external areas over {demo.floorAreaSquareMeters} m². Open it to place
              detectors, redraw a zone or move a call point, then save a copy as your own design.
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href="/designs/demo">
            Open the demonstration
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Designs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{designs.length}</div>
            <p className="text-xs text-muted-foreground">Buildings drawn for this team</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Floors</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{floorTotal}</div>
            <p className="text-xs text-muted-foreground">Storeys across every design</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devices</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deviceTotal}</div>
            <p className="text-xs text-muted-foreground">Placed on the plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedCount}</div>
            <p className="text-xs text-muted-foreground">With a live link</p>
          </CardContent>
        </Card>
      </div>

      {designs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No designs yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Start a blank design and add floors by hand, or capture a building with RoomPlan on the
            phone and open the published design here to place devices against the measured plan.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <NewDesignButton />
            <Button asChild variant="outline">
              <Link href="/designs/demo">Open the demonstration plan</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {designs.map((design) => (
            <Link
              key={design.id}
              href={`/designs/${design.id}`}
              className="group rounded-xl border border-border bg-card p-4 transition hover:border-foreground/30 hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">{design.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {design.siteName || 'No site name yet'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    design.shareToken
                      ? 'bg-green-100 text-green-800'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {design.shareToken ? 'Shared' : design.status}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Floors</dt>
                  <dd className="font-semibold text-foreground">{design.floorCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Devices</dt>
                  <dd className="font-semibold text-foreground">{design.deviceCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Zones</dt>
                  <dd className="font-semibold text-foreground">{design.zoneCount}</dd>
                </div>
              </dl>

              <p className="mt-3 text-[11px] text-muted-foreground">
                Updated {new Date(design.updatedAt).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

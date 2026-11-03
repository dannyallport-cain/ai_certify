'use client';

import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';

import { buildFloorScene, sortFloors, type BuildingDesign } from '@/lib/design';

import { DesignCanvas } from './DesignCanvas';
import DesignLegend from './DesignLegend';

interface SharedDesignViewerProps {
  design: BuildingDesign;
}

/**
 * Read-only view of a shared design.
 *
 * The canvas is the same component the editor uses, with every interaction wired to a no-op, so a
 * shared plan cannot be edited by accident and cannot drift from how it looked in the studio. The
 * storey bar is reimplemented here rather than reusing the editor's, because none of the add,
 * copy or delete controls should exist on a link sent to a client.
 */
export default function SharedDesignViewer({ design }: SharedDesignViewerProps) {
  const floors = useMemo(() => sortFloors(design.floors), [design.floors]);
  const [floorId, setFloorId] = useState<string | null>(floors[0]?.id ?? null);

  const floor = floors.find((entry) => entry.id === floorId) ?? floors[0] ?? null;

  const scene = useMemo(
    () => buildFloorScene(design, floor?.id ?? null, { fitAllFloors: true }),
    [design, floor?.id],
  );

  const sheet = design.sheet;
  const companyLine = [sheet.companyName, sheet.companyPhone, sheet.companyEmail, sheet.accreditation]
    .filter(Boolean)
    .join(' · ');

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 print:mb-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {sheet.title}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold text-foreground">{design.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[sheet.siteName, sheet.jobReference ? `Job ${sheet.jobReference}` : null, sheet.revision ? `Rev ${sheet.revision}` : null]
              .filter(Boolean)
              .join(' · ') || 'Fire alarm arrangement'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted print:hidden"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-1.5 print:hidden">
        {floors.map((entry) => {
          const isActive = entry.id === floor?.id;

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setFloorId(entry.id)}
              aria-current={isActive}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? 'border-foreground/40 bg-foreground text-background'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              {entry.name}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] print:block">
        <div className="rounded-xl border border-border bg-card p-2 print:border-0 print:p-0">
          <DesignCanvas
            design={design}
            floorId={floor?.id ?? null}
            tool="select"
            pendingKind={null}
            areaKind="other"
            selectedDeviceId={null}
            selectedZoneId={null}
            onPlaceDevice={() => undefined}
            onMoveDevice={() => undefined}
            onDrawZone={() => undefined}
            onDrawArea={() => undefined}
            onSelectDevice={() => undefined}
            onSelectZone={() => undefined}
            showGrid={sheet.showGrid}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 text-xs text-muted-foreground print:hidden">
            <span>{floor ? `${floor.name} · level ${floor.level}` : 'No floor'}</span>
            <span>
              {scene.stats.roomCount} room(s) · {scene.stats.deviceCount} device(s) ·{' '}
              {scene.stats.floorAreaSquareMeters.toFixed(1)} m²
            </span>
          </div>
        </div>

        <aside className="space-y-3 print:hidden">
          <DesignLegend
            scene={scene}
            selectedZoneId={null}
            onSelectZone={() => undefined}
          />
        </aside>
      </div>

      <footer className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground print:mt-2">
        <p>{companyLine || 'Company details are printed on the issued sheet.'}</p>
        {sheet.preparedBy || sheet.preparedOn ? (
          <p className="mt-1">
            Prepared by {sheet.preparedBy || '—'}
            {sheet.preparedOn ? ` on ${sheet.preparedOn}` : ''}
          </p>
        ) : null}
        {sheet.notes ? <p className="mt-1">{sheet.notes}</p> : null}
      </footer>
    </main>
  );
}

'use client';

import { useMemo, useState } from 'react';

import type {
  Plan3DLegendConfig,
  Plan3DPoint,
} from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';
import type { FireAlarmScanSession } from '@/mobile/modules/fire-alarm-roomplan/types';

import LegendPanel from './LegendPanel';
import PlanDrawing from './PlanDrawing';
import ZoneListPanel from './ZoneListPanel';
import { useZonePlanEditor } from './useZonePlanEditor';

interface ZonePlanViewerProps {
  token: string;
  session: FireAlarmScanSession;
  initialZones: unknown;
  initialLegend: unknown;
  editEnabled: boolean;
  updatedAt: string;
}

const SAVE_LABELS = {
  idle: 'Save changes',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Retry save',
} as const;

export default function ZonePlanViewer({
  token,
  session,
  initialZones,
  initialLegend,
  editEnabled,
  updatedAt,
}: ZonePlanViewerProps) {
  const editor = useZonePlanEditor({
    token,
    session,
    initialZones: Array.isArray(initialZones) ? (initialZones as never) : [],
    initialLegend: (initialLegend ?? null) as Plan3DLegendConfig,
    canEdit: editEnabled,
  });
  const [isDrawing, setIsDrawing] = useState(false);

  const legend = editor.legend;

  const lastUpdated = useMemo(() => {
    const parsed = new Date(updatedAt);

    return Number.isNaN(parsed.getTime()) ? updatedAt : parsed.toLocaleString();
  }, [updatedAt]);

  const companyLine = [
    legend.company.name,
    ...legend.company.addressLines,
    legend.company.phone,
    legend.company.email,
    legend.company.website,
    legend.company.accreditation,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleCompanyChange = (patch: Partial<Plan3DLegendConfig['company']>) => {
    editor.updateLegend({ company: { ...legend.company, ...patch } });
  };

  const handlePointerDown = (point: Plan3DPoint) => {
    setIsDrawing(true);
    editor.startDraft(point);
  };

  const handlePointerUp = (point: Plan3DPoint) => {
    setIsDrawing(false);
    editor.finishDraft(point);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 print:max-w-none print:px-0 print:py-0">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 print:mb-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Fire alarm zone plan
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold text-foreground">
            {legend.planTitle || 'Fire alarm zone plan'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              legend.siteName,
              legend.jobReference ? `Job ${legend.jobReference}` : null,
              legend.revision ? `Rev ${legend.revision}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || `Session ${session.id}`}
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <span className="text-xs text-muted-foreground">Updated {lastUpdated}</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Print
          </button>
          {editEnabled ? (
            <button
              type="button"
              disabled={editor.saveState === 'saving' || !editor.isDirty}
              onClick={() => void editor.save(token)}
              className="rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {SAVE_LABELS[editor.saveState]}
            </button>
          ) : (
            <span className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              View only
            </span>
          )}
        </div>
      </header>

      {editor.error ? (
        <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive print:hidden">
          {editor.error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] print:block">
        <div className="rounded-xl border border-border bg-card p-2 print:border-0 print:p-0">
          <PlanDrawing
            plan={editor.plan}
            zones={editor.plan.zones}
            selectedZoneId={editor.selectedZoneId}
            draft={editor.draft}
            interactive={editEnabled}
            onPointerDown={handlePointerDown}
            onPointerMove={(point) => {
              if (isDrawing) {
                editor.updateDraft(point);
              }
            }}
            onPointerUp={handlePointerUp}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 text-xs text-muted-foreground print:hidden">
            <span>
              {editEnabled
                ? 'Drag on the plan to draw a zone. Select a zone to rename or recolour it.'
                : 'Colour coded zones for this plan.'}
            </span>
            <span>
              {editor.plan.stats.roomCount} room(s) · {editor.plan.stats.deviceCount} device(s)
            </span>
          </div>
        </div>

        <aside className="space-y-4 print:hidden">
          <ZoneListPanel
            zones={editor.zones}
            summaries={editor.plan.zoneSummary}
            unassignedDeviceCount={editor.plan.unassignedDeviceCount}
            selectedZoneId={editor.selectedZoneId}
            canEdit={editEnabled}
            onSelect={editor.selectZone}
            onRename={editor.renameSelected}
            onRecolour={editor.recolourSelected}
            onRemove={editor.removeSelected}
            onDuplicate={editor.duplicateSelected}
          />

          <LegendPanel
            legend={legend}
            plan={editor.plan}
            canEdit={editEnabled}
            onChange={(patch) => editor.updateLegend(patch)}
            onCompanyChange={handleCompanyChange}
          />
        </aside>
      </div>

      <footer className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground print:mt-2">
        <p>{companyLine || 'Company details can be added in the legend.'}</p>
        {legend.preparedBy || legend.preparedOn ? (
          <p className="mt-1">
            Prepared by {legend.preparedBy || '—'}
            {legend.preparedOn ? ` on ${legend.preparedOn}` : ''}
          </p>
        ) : null}
        {legend.notes ? <p className="mt-1">{legend.notes}</p> : null}
      </footer>
    </div>
  );
}

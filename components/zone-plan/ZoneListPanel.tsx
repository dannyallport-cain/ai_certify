'use client';

import { useState } from 'react';

import { PLAN3D_ZONE_COLOURS } from '@/mobile/modules/fire-alarm-roomplan/plan3d/zone-model';
import type {
  Plan3DZone,
  Plan3DZoneSummary,
} from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';

interface ZoneListPanelProps {
  zones: Plan3DZone[];
  summaries: Plan3DZoneSummary[];
  unassignedDeviceCount: number;
  selectedZoneId: string | null;
  canEdit: boolean;
  onSelect: (zoneId: string | null) => void;
  onRename: (name: string) => void;
  onRecolour: (colour: string) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function summaryFor(summaries: Plan3DZoneSummary[], zoneId: string): Plan3DZoneSummary | null {
  return summaries.find((summary) => summary.zoneId === zoneId) ?? null;
}

export default function ZoneListPanel({
  zones,
  summaries,
  unassignedDeviceCount,
  selectedZoneId,
  canEdit,
  onSelect,
  onRename,
  onRecolour,
  onRemove,
  onDuplicate,
}: ZoneListPanelProps) {
  const selected = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const [draftName, setDraftName] = useState('');

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Zones</h2>
        <span className="text-xs text-muted-foreground">{zones.length} defined</span>
      </div>

      {zones.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No zones yet. {canEdit ? 'Drag on the plan to draw one.' : 'The owner has not drawn any zones.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {zones.map((zone) => {
            const summary = summaryFor(summaries, zone.id);
            const isSelected = zone.id === selectedZoneId;

            return (
              <li key={zone.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(zone.id);
                    setDraftName(zone.name);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${
                    isSelected
                      ? 'border-foreground/40 bg-muted'
                      : 'border-transparent hover:border-border hover:bg-muted/60'
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-sm border"
                    style={{ backgroundColor: `${zone.colour}55`, borderColor: zone.colour }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">
                      {zone.reference} · {zone.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {summary
                        ? `${summary.areaSquareMeters.toFixed(1)} m² · ${summary.deviceCount} device(s)`
                        : 'No devices inside'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {unassignedDeviceCount > 0 ? (
        <p className="mt-3 rounded-lg bg-muted px-2 py-1.5 text-xs text-muted-foreground">
          {unassignedDeviceCount} device(s) sit outside every zone.
        </p>
      ) : null}

      {canEdit && selected ? (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Zone name</span>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={() => onRename(draftName)}
              placeholder={selected.name}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40"
            />
          </label>

          <div>
            <span className="text-xs font-medium text-muted-foreground">Colour</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {PLAN3D_ZONE_COLOURS.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  aria-label={`Use colour ${colour}`}
                  onClick={() => onRecolour(colour)}
                  className={`h-6 w-6 rounded-md border-2 transition ${
                    selected.colour === colour ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: colour }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDuplicate}
              className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex-1 rounded-lg border border-destructive/40 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
            >
              Delete zone
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

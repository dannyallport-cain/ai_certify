'use client';

import { useState } from 'react';
import { Copy, Layers, Plus, Trash2 } from 'lucide-react';

import { FLOOR_KIND_LABELS, type DesignFloor, type DesignZone } from '@/lib/design';

interface FloorBarProps {
  floors: DesignFloor[];
  floorId: string | null;
  zones: DesignZone[];
  devicesByFloor: Record<string, number>;
  canDelete: boolean;
  onSelect: (floorId: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

/**
 * Storey switcher.
 *
 * Multi-floor capture is only useful if moving between floors is one click and the drawing stays
 * registered: the canvas fits every floor to the same transform, so this bar is the whole of the
 * navigation model.
 */
export default function FloorBar({
  floors,
  floorId,
  zones,
  devicesByFloor,
  canDelete,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onRename,
}: FloorBarProps) {
  const active = floors.find((floor) => floor.id === floorId) ?? null;
  const [draftName, setDraftName] = useState('');

  const startRename = () => setDraftName(active?.name ?? '');

  return (
    <section className="rounded-xl border border-border bg-card p-2 print:hidden">
      <div className="flex flex-wrap items-center gap-1.5">
        <Layers className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />

        {floors.map((floor) => {
          const isActive = floor.id === floorId;
          const zoneCount = zones.filter((zone) => zone.floorId === floor.id).length;
          const deviceCount = devicesByFloor[floor.id] ?? 0;

          return (
            <button
              key={floor.id}
              type="button"
              onClick={() => {
                onSelect(floor.id);
                setDraftName(floor.name);
              }}
              aria-current={isActive}
              className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                isActive
                  ? 'border-foreground/40 bg-foreground text-background'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-xs font-semibold">{floor.name}</span>
                <span
                  className={`truncate text-[11px] ${
                    isActive ? 'text-background/70' : 'text-muted-foreground'
                  }`}
                >
                  {deviceCount} dev · {zoneCount} zone
                </span>
              </span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onAdd}
            title="Add a floor above"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" />
            Floor
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            disabled={!active}
            title="Copy this floor with its rooms, devices and zones"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!active || !canDelete}
            title={canDelete ? 'Delete this floor' : 'A design needs at least one floor'}
            className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {active ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
          <label className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Floor
            </span>
            <input
              value={draftName || active.name}
              onFocus={startRename}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={() => {
                if (draftName.trim() && draftName.trim() !== active.name) {
                  onRename(draftName.trim());
                }
                setDraftName('');
              }}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-foreground/40"
            />
          </label>

          <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            {FLOOR_KIND_LABELS[active.kind]} · level {active.level} · {active.heightMeters.toFixed(1)} m
          </span>

          <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            {active.rooms.length} room{active.rooms.length === 1 ? '' : 's'}
            {active.sourceSessionId ? ' · from scan' : ' · drawn'}
          </span>
        </div>
      ) : null}
    </section>
  );
}

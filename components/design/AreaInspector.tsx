'use client';

import { Trash2 } from 'lucide-react';

import {
  AREA_KIND_COLOURS,
  AREA_KIND_LABELS,
  polygonArea,
  type DesignArea,
  type DesignAreaKind,
} from '@/lib/design';

interface AreaInspectorProps {
  area: DesignArea;
  onNameChange: (name: string) => void;
  onKindChange: (kind: DesignAreaKind) => void;
  onColourChange: (colour: string) => void;
  onDelete: () => void;
}

const AREA_KINDS: DesignAreaKind[] = [
  'car_park',
  'compound',
  'yard',
  'bin_store',
  'plant',
  'canopy',
  'loading_bay',
  'garden',
  'other',
];

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40';

/**
 * Detail panel for an externally drawn area.
 *
 * These are the parts of the site RoomPlan cannot see — car parks, compounds, bin stores — so they
 * are drawn by hand and labelled here. They print with a dashed outline to make clear they are not
 * measured building fabric.
 */
export default function AreaInspector({
  area,
  onNameChange,
  onKindChange,
  onColourChange,
  onDelete,
}: AreaInspectorProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-3 print:hidden">
      <header className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-6 w-6 shrink-0 rounded-md border"
          style={{ backgroundColor: `${area.colour}66`, borderColor: area.colour }}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{area.name}</h2>
          <p className="text-[11px] text-muted-foreground">
            {AREA_KIND_LABELS[area.kind]} · {polygonArea(area.polygon).toFixed(1)} m²
          </p>
        </div>
      </header>

      <div className="mt-3 space-y-2.5">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <input
            value={area.name}
            onChange={(event) => onNameChange(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Area type</span>
          <select
            value={area.kind}
            onChange={(event) => onKindChange(event.target.value as DesignAreaKind)}
            className={INPUT_CLASS}
          >
            {AREA_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {AREA_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="text-xs font-medium text-muted-foreground">Hatch colour</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {Object.values(AREA_KIND_COLOURS).map((colour) => (
              <button
                key={colour}
                type="button"
                aria-label={`Use colour ${colour}`}
                aria-pressed={area.colour === colour}
                onClick={() => onColourChange(colour)}
                className={`h-6 w-6 rounded-md border-2 transition ${
                  area.colour === colour ? 'border-foreground' : 'border-transparent'
                }`}
                style={{ backgroundColor: colour }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete area
          </button>
        </div>
      </div>
    </section>
  );
}

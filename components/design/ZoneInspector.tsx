'use client';

import { Copy, PenLine, Trash2, X } from 'lucide-react';

import {
  DESIGN_ZONE_COLOURS,
  MAX_ZONE_OPACITY,
  MIN_ZONE_OPACITY,
  polygonArea,
  zoneAreaSquareMeters,
  zoneRegions,
  type DesignFloor,
  type DesignZone,
} from '@/lib/design';

interface ZoneInspectorProps {
  zone: DesignZone;
  deviceCount: number;
  /** Every storey, so a vertical compartment can be given its extent. */
  floors: DesignFloor[];
  /** Compartments this one could sit inside, on a storey they share. */
  nestCandidates: { id: string; label: string }[];
  onNestChange: (parentZoneId: string | null) => void;
  onFloorsChange: (floorIds: string[]) => void;
  /** Set when the last nesting attempt was refused, e.g. the child does not fit. */
  nestingError: string | null;
  /** True when new rectangles are being added to this zone rather than starting a new one. */
  isDrawingTarget: boolean;
  onToggleDrawTarget: () => void;
  onRemoveRegion: (regionIndex: number) => void;
  onNameChange: (name: string) => void;
  onReferenceChange: (reference: string) => void;
  onColourChange: (colour: string) => void;
  onOpacityChange: (opacity: number) => void;
  onNotesChange: (notes: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40';

/**
 * Detail panel for a zone.
 *
 * The opacity slider exists because a zone is a semi-translucent wash over the plan: too opaque and
 * the room names and device symbols underneath disappear, too faint and adjacent compartments
 * cannot be told apart on a phone in daylight.
 */
export default function ZoneInspector({
  zone,
  deviceCount,
  floors,
  nestCandidates,
  onNestChange,
  onFloorsChange,
  nestingError,
  isDrawingTarget,
  onToggleDrawTarget,
  onRemoveRegion,
  onNameChange,
  onReferenceChange,
  onColourChange,
  onOpacityChange,
  onNotesChange,
  onDuplicate,
  onDelete,
}: ZoneInspectorProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-3 print:hidden">
      <header className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-6 w-6 shrink-0 rounded-md border"
          style={{ backgroundColor: `${zone.colour}55`, borderColor: zone.colour }}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {zone.reference} · {zone.name}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {zoneAreaSquareMeters(zone).toFixed(1)} m² · {deviceCount} device
            {deviceCount === 1 ? '' : 's'} · {zoneRegions(zone).length} part
            {zoneRegions(zone).length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <div className="mt-3 space-y-2.5">
        <button
          type="button"
          onClick={onToggleDrawTarget}
          aria-pressed={isDrawingTarget}
          className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
            isDrawingTarget
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-foreground hover:bg-muted'
          }`}
        >
          <PenLine className="h-3.5 w-3.5" />
          {isDrawingTarget ? 'Drawing into this zone — done' : 'Add areas to this zone'}
        </button>

        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Parts of this zone
          </span>
          <ul className="mt-1 space-y-1">
            {zoneRegions(zone).map((region, index) => (
              <li
                key={`${zone.id}-region-${index}`}
                className="flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground"
              >
                <span className="flex-1">
                  Part {index + 1} · {polygonArea(region).toFixed(1)} m²
                </span>
                <button
                  type="button"
                  aria-label={`Remove part ${index + 1}`}
                  onClick={() => onRemoveRegion(index)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Parts may touch but never overlap another zone.
          </p>
        </div>

        <div>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Nested inside</span>
            <select
              value={zone.parentZoneId ?? ''}
              onChange={(event) => onNestChange(event.target.value || null)}
              className={INPUT_CLASS}
            >
              <option value="">Not nested — a top-level compartment</option>
              {nestCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-[11px] text-muted-foreground">
            A lift shaft or stair inside a floor plate is its own zone nested in that plate: the
            plate's area and fill exclude it.
          </p>
          {nestingError ? (
            <p className="mt-1 text-[11px] font-medium text-destructive">{nestingError}</p>
          ) : null}
        </div>

        <div>
          <span className="text-xs font-medium text-muted-foreground">Also covers storeys</span>
          <ul className="mt-1 space-y-1">
            {floors
              .filter((floor) => floor.id !== zone.floorId)
              .map((floor) => {
                const checked = zone.spansFloorIds.includes(floor.id);

                return (
                  <li key={floor.id}>
                    <label className="flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-[11px] text-foreground">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          onFloorsChange(
                            checked
                              ? zone.spansFloorIds.filter((id) => id !== floor.id)
                              : [...zone.spansFloorIds, floor.id],
                          )
                        }
                        className="h-3.5 w-3.5 accent-foreground"
                      />
                      {floor.name}
                    </label>
                  </li>
                );
              })}
          </ul>
          <p className="mt-1 text-[11px] text-muted-foreground">
            A stair or lift shaft is one zone through every storey it passes — tick each one it
            reaches.
          </p>
        </div>
        <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Reference</span>
            <input
              value={zone.reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Zone name</span>
            <input
              value={zone.name}
              onChange={(event) => onNameChange(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <div>
          <span className="text-xs font-medium text-muted-foreground">Colour</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {DESIGN_ZONE_COLOURS.map((colour) => (
              <button
                key={colour}
                type="button"
                aria-label={`Use colour ${colour}`}
                aria-pressed={zone.colour === colour}
                onClick={() => onColourChange(colour)}
                className={`h-6 w-6 rounded-md border-2 transition ${
                  zone.colour === colour ? 'border-foreground' : 'border-transparent'
                }`}
                style={{ backgroundColor: colour }}
              />
            ))}
          </div>
        </div>

        <label className="block">
          <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Fill opacity</span>
            <span>{Math.round(zone.opacity * 100)}%</span>
          </span>
          <input
            type="range"
            min={Math.round(MIN_ZONE_OPACITY * 100)}
            max={Math.round(MAX_ZONE_OPACITY * 100)}
            value={Math.round(zone.opacity * 100)}
            onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
            className="mt-1 w-full accent-foreground"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={zone.notes ?? ''}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={2}
            placeholder="Detection coverage, compartment notes…"
            className={`${INPUT_CLASS} resize-none`}
          />
        </label>

        <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete zone
          </button>
        </div>
      </div>
    </section>
  );
}

'use client';

import { Copy, RotateCw, Trash2 } from 'lucide-react';

import {
  DESIGN_DEVICE_CATALOGUE,
  MOUNTING_LABELS,
  getDeviceDefinition,
  type DesignDevice,
  type DesignMounting,
  type DesignZone,
} from '@/lib/design';

import DeviceSymbol from './DeviceSymbol';

interface DeviceInspectorProps {
  device: DesignDevice;
  zones: DesignZone[];
  onLabelChange: (label: string) => void;
  onKindChange: (kind: string) => void;
  onMountingChange: (mounting: DesignMounting) => void;
  onAddressChange: (address: string) => void;
  onNotesChange: (notes: string) => void;
  onZoneChange: (zoneId: string | null) => void;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const MOUNTINGS: DesignMounting[] = ['ceiling', 'ceiling_void', 'wall', 'floor', 'external'];

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40';

const SELECT_CLASS =
  'mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40';

/**
 * Detail panel for a single device.
 *
 * The label is free text and is what gets printed beside the symbol, so it is editable here rather
 * than derived from the catalogue: a real schedule says things like "GF-01 Reception ceiling",
 * not "Optical smoke detector".
 */
export default function DeviceInspector({
  device,
  zones,
  onLabelChange,
  onKindChange,
  onMountingChange,
  onAddressChange,
  onNotesChange,
  onZoneChange,
  onRotate,
  onDuplicate,
  onDelete,
}: DeviceInspectorProps) {
  const definition = getDeviceDefinition(device.kind);
  const zone = zones.find((entry) => entry.id === device.zoneId) ?? null;

  return (
    <section className="rounded-xl border border-border bg-card p-3 print:hidden">
      <header className="flex items-start gap-2">
        <svg width={40} height={40} viewBox="0 0 100 100" aria-hidden className="shrink-0">
          <DeviceSymbol kind={device.kind} size={100} x={0} y={0} />
        </svg>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{definition.label}</h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {definition.standardReference}
            {device.fromCapture ? ' · from scan' : ''}
          </p>
        </div>
      </header>

      <div className="mt-3 space-y-2.5">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Label on the plan</span>
          <input
            value={device.label}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder={definition.label}
            className={INPUT_CLASS}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Device type</span>
          <select
            value={device.kind}
            onChange={(event) => onKindChange(event.target.value)}
            className={SELECT_CLASS}
          >
            {DESIGN_DEVICE_CATALOGUE.map((entry) => (
              <option key={entry.kind} value={entry.kind}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Mounted on</span>
            <select
              value={device.mounting}
              onChange={(event) => onMountingChange(event.target.value as DesignMounting)}
              className={SELECT_CLASS}
            >
              {MOUNTINGS.map((mounting) => (
                <option key={mounting} value={mounting}>
                  {MOUNTING_LABELS[mounting]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Zone</span>
            <select
              value={device.zoneId ?? ''}
              onChange={(event) => onZoneChange(event.target.value || null)}
              className={SELECT_CLASS}
            >
              <option value="">Unassigned</option>
              {zones.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.reference} · {entry.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Address / loop reference</span>
          <input
            value={device.address ?? ''}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="L1-07"
            className={INPUT_CLASS}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={device.notes ?? ''}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={2}
            placeholder="Coverage note, access issue, obstruction…"
            className={`${INPUT_CLASS} resize-none`}
          />
        </label>

        <p className="text-[11px] text-muted-foreground">
          {zone
            ? `Inside ${zone.reference} · ${zone.name}`
            : 'Not inside any zone; the legend will list it as unassigned.'}
          {' · '}
          {device.position.x.toFixed(2)} m, {device.position.y.toFixed(2)} m
        </p>

        <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
          <button
            type="button"
            onClick={onRotate}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Rotate
          </button>
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
            Delete
          </button>
        </div>
      </div>
    </section>
  );
}

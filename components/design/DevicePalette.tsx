'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

import {
  DESIGN_DEVICE_CATALOGUE,
  DESIGN_DEVICE_CATEGORIES,
  getDeviceCategory,
  getDeviceDefinition,
  type DesignDeviceDefinition,
} from '@/lib/design';

import DeviceSymbol from './DeviceSymbol';

interface DevicePaletteProps {
  pendingKind: string | null;
  onArm: (kind: string | null) => void;
}

const CHIP_SIZE = 34;

/**
 * The fire alarm device catalogue.
 *
 * Items are dragged onto the plan, which is the interaction the task calls for: the drag image is
 * the actual symbol being placed, so the surveyor sees exactly what will land on the drawing.
 * Clicking an item arms it instead, for trackpads and for placing several of the same device.
 */
export default function DevicePalette({ pendingKind, onArm }: DevicePaletteProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return DESIGN_DEVICE_CATEGORIES.map((category) => ({
      category,
      devices: DESIGN_DEVICE_CATALOGUE.filter((device) => {
        if (device.category !== category.id) {
          return false;
        }

        if (!needle) {
          return true;
        }

        return [device.label, device.glyph, ...device.keywords]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      }),
    })).filter((group) => group.devices.length > 0);
  }, [query]);

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Devices</h2>
          {pendingKind ? (
            <button
              type="button"
              onClick={() => onArm(null)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">{DESIGN_DEVICE_CATALOGUE.length}</span>
          )}
        </div>

        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search detectors, MCP, sounder…"
            aria-label="Search the device catalogue"
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2 text-xs text-foreground outline-none focus:border-foreground/40"
          />
        </div>

        {pendingKind ? (
          <p className="mt-2 rounded-lg bg-muted px-2 py-1.5 text-xs text-foreground">
            Click the plan to place{' '}
            <span className="font-semibold">{getDeviceDefinition(pendingKind).label}</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Drag onto the plan, or click to arm then click to place.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">No devices match “{query}”.</p>
        ) : null}

        {groups.map((group) => {
          const isCollapsed = collapsed[group.category.id] ?? false;

          return (
            <div key={group.category.id} className="mb-2">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [group.category.id]: !isCollapsed,
                  }))
                }
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/60"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: group.category.colour }}
                />
                <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.category.label}
                </span>
                <span className="text-xs text-muted-foreground">{group.devices.length}</span>
              </button>

              {isCollapsed ? null : (
                <ul className="mt-1 space-y-0.5">
                  {group.devices.map((device) => (
                    <PaletteItem
                      key={device.kind}
                      device={device}
                      armed={pendingKind === device.kind}
                      onArm={onArm}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PaletteItem({
  device,
  armed,
  onArm,
}: {
  device: DesignDeviceDefinition;
  armed: boolean;
  onArm: (kind: string | null) => void;
}) {
  const colour = getDeviceCategory(device.category).colour;

  return (
    <li>
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('application/x-design-device', device.kind);
          event.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={() => onArm(armed ? null : device.kind)}
        aria-pressed={armed}
        title={`${device.label} — ${device.standardReference}`}
        className={`group flex w-full cursor-grab items-center gap-2 rounded-lg border px-1.5 py-1 text-left transition active:cursor-grabbing ${
          armed
            ? 'border-foreground/50 bg-muted'
            : 'border-transparent hover:border-border hover:bg-muted/50'
        }`}
      >
        <svg
          width={CHIP_SIZE}
          height={CHIP_SIZE}
          viewBox="0 0 100 100"
          className="shrink-0"
          aria-hidden
        >
          <SymbolPreview kind={device.kind} colour={colour} />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-foreground">{device.label}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {device.glyph} · {device.standardReference}
          </span>
        </span>
      </button>
    </li>
  );
}

function SymbolPreview({ kind, colour }: { kind: string; colour: string }) {
  return <DeviceSymbol kind={kind} size={100} x={0} y={0} colour={colour} />;
}

'use client';

import type { FloorScene } from '@/lib/design';

import DeviceSymbol from './DeviceSymbol';

interface DesignLegendProps {
  scene: FloorScene;
  onSelectZone: (zoneId: string) => void;
  selectedZoneId: string | null;
}

/** "12.4 m² · 3 storeys · in Z1", the facts a reviewer needs to read the zone map. */
function formatZoneMeta(zone: FloorScene['zoneLegend'][number]): string {
  const parts = [`${zone.areaSquareMeters.toFixed(1)} m²`];

  if (zone.floorCount > 1) {
    parts.push(`${zone.floorCount} storeys`);
  }

  if (zone.nestedInReference) {
    parts.push(`in ${zone.nestedInReference}`);
  }

  return parts.join(' · ');
}

/**
 * The key printed under the drawing: a symbol key for every device type on this floor and a
 * colour key for every zone, with the area, the storeys it covers, the compartment it sits inside
 * and the device count.
 */
export default function DesignLegend({
  scene,
  onSelectZone,
  selectedZoneId,
}: DesignLegendProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h2 className="text-sm font-semibold text-foreground">Legend</h2>

      {scene.zoneLegend.length > 0 ? (
        <div className="mt-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Zones
          </h3>
          <ul className="mt-1 space-y-0.5">
            {scene.zoneLegend.map((zone) => (
              <li key={zone.zoneId}>
                <button
                  type="button"
                  onClick={() => onSelectZone(zone.zoneId)}
                  className={`flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-xs transition ${
                    zone.zoneId === selectedZoneId ? 'bg-muted' : 'hover:bg-muted/60'
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-sm border"
                    style={{ backgroundColor: `${zone.colour}55`, borderColor: zone.colour }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-foreground">
                      {zone.reference} · {zone.name}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {formatZoneMeta(zone)}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">{zone.deviceCount}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {scene.areaLegend.length > 0 ? (
        <div className="mt-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            External areas
          </h3>
          <ul className="mt-1 space-y-0.5">
            {scene.areaLegend.map((area) => (
              <li key={area.areaId} className="flex items-center gap-2 px-1 py-0.5 text-xs">
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-sm border border-dashed"
                  style={{ backgroundColor: `${area.colour}66`, borderColor: area.colour }}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{area.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Devices
        </h3>

        {scene.deviceLegend.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">No devices on this floor yet.</p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {scene.deviceLegend.map((entry) => (
              <li key={entry.kind} className="flex items-center gap-2 px-1 py-0.5">
                <svg width={22} height={22} viewBox="0 0 100 100" aria-hidden className="shrink-0">
                  <DeviceSymbol
                    kind={entry.kind}
                    size={100}
                    x={0}
                    y={0}
                    colour={entry.colour}
                  />
                </svg>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {entry.label}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{entry.count}</span>
              </li>
            ))}
          </ul>
        )}

        {scene.unassignedDeviceCount > 0 ? (
          <p className="mt-2 rounded-md bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">
            {scene.unassignedDeviceCount} device
            {scene.unassignedDeviceCount === 1 ? '' : 's'} sit outside every zone.
          </p>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-2 text-[11px]">
        <div>
          <dt className="text-muted-foreground">Floor area</dt>
          <dd className="font-semibold text-foreground">
            {scene.stats.floorAreaSquareMeters.toFixed(1)} m²
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rooms</dt>
          <dd className="font-semibold text-foreground">{scene.stats.roomCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Zones</dt>
          <dd className="font-semibold text-foreground">{scene.stats.zoneCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Devices</dt>
          <dd className="font-semibold text-foreground">{scene.stats.deviceCount}</dd>
        </div>
      </dl>
    </section>
  );
}

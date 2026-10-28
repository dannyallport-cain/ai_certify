'use client';

import type { FireAlarmPlan3D } from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';

interface PlanKeysProps {
  plan: FireAlarmPlan3D;
}

/**
 * The two keys the plan is read against: what each marker means, and what each zone contains.
 * Both are derived from the drawing, so they cannot drift from the zones on the plan.
 */
export default function PlanKeys({ plan }: PlanKeysProps) {
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-3">
      {plan.zoneSummary.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Zone key
          </h3>
          <ul className="mt-2 space-y-1">
            {plan.zoneSummary.map((zone) => (
              <li key={zone.zoneId} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border"
                  style={{ backgroundColor: `${zone.colour}55`, borderColor: zone.colour }}
                />
                <span className="min-w-0 flex-1 text-xs text-foreground">
                  <span className="font-medium">
                    {zone.reference} {zone.name}
                  </span>
                  <span className="block text-muted-foreground">
                    {zone.areaSquareMeters.toFixed(1)} m² · {zone.deviceCount} device(s)
                    {zone.devices.length > 0
                      ? ` · ${zone.devices
                          .map((entry) => `${entry.glyph} ${entry.count}`)
                          .join(', ')}`
                      : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.legend.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Device key
          </h3>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {plan.legend.map((entry) => (
              <li key={`${entry.deviceType}-${entry.inCeilingVoid ? 'void' : 'room'}`} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.colour }}
                />
                <span className="text-xs text-foreground">
                  {entry.label} × {entry.count}
                  {entry.inCeilingVoid ? ' (void)' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {plan.stats.roomCount} room(s) · {plan.stats.deviceCount} device(s) ·{' '}
        {plan.stats.floorAreaSquareMeters.toFixed(1)} m²
      </p>
    </div>
  );
}

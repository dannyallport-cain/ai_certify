'use client';

import type { Plan3DSessionFloor } from '@/mobile/modules/fire-alarm-roomplan/plan3d/floors';

interface FloorTabsProps {
  floors: Plan3DSessionFloor[];
  activeLevel: number | null;
  onSelect: (level: number) => void;
}

/**
 * Storey tabs for a captured plan.
 *
 * A capture that covered several storeys used to print as one sheet with the floors overlaid on
 * top of each other. Splitting by the captured `level` is what makes a multi-floor survey readable,
 * and the counts tell the surveyor at a glance whether a storey was actually scanned.
 */
export default function FloorTabs({ floors, activeLevel, onSelect }: FloorTabsProps) {
  if (floors.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 print:hidden">
      {floors.map((floor) => {
        const isActive = floor.level === activeLevel;

        return (
          <button
            key={floor.level}
            type="button"
            onClick={() => onSelect(floor.level)}
            aria-current={isActive}
            className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
              isActive
                ? 'border-foreground/40 bg-foreground text-background'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            <span className="block font-semibold">{floor.name}</span>
            <span
              className={`block text-[11px] ${
                isActive ? 'text-background/70' : 'text-muted-foreground'
              }`}
            >
              {floor.roomCount} room{floor.roomCount === 1 ? '' : 's'} · {floor.deviceCount} device
              {floor.deviceCount === 1 ? '' : 's'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

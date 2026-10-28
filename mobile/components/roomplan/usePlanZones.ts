import { useCallback, useState } from 'react';

import { unprojectFloorPoint } from '@/modules/fire-alarm-roomplan/plan3d/projection';
import {
  PLAN3D_ZONE_COLOURS,
  getZoneColour,
  sanitiseZones,
} from '@/modules/fire-alarm-roomplan/plan3d/zone-model';
import { createZoneFromRectangle } from '@/modules/fire-alarm-roomplan/plan3d/zone-presets';
import type {
  Plan3DCamera,
  Plan3DPoint,
  Plan3DViewport,
  Plan3DZone,
} from '@/modules/fire-alarm-roomplan/plan3d/plan3d-types';

export interface ZoneDraft {
  start: Plan3DPoint;
  end: Plan3DPoint;
}

export interface PlanZonesEditor {
  zones: Plan3DZone[];
  selectedZoneId: string | null;
  draft: ZoneDraft | null;
  selectZone: (zoneId: string | null) => void;
  beginDraft: (point: Plan3DPoint) => void;
  moveDraft: (point: Plan3DPoint) => void;
  commitDraft: (point: Plan3DPoint, camera: Plan3DCamera, viewport: Plan3DViewport) => void;
  cancelDraft: () => void;
  renameZone: (zoneId: string, name: string) => void;
  cycleColour: (zoneId: string) => void;
  removeZone: (zoneId: string) => void;
  replaceZones: (zones: Plan3DZone[]) => void;
}

/** Matches the hosted viewer: a drag shorter than this is a tap, not a zone. */
const MIN_DRAG_PIXELS = 8;

/**
 * Zones authored on the phone, in plan view.
 *
 * The drag is kept in drawing pixels so the rubber band matches the finger, and only converted to
 * room coordinates when it is committed — the same order the browser editor uses, so a zone drawn
 * here and one drawn there come out identical.
 */
export function usePlanZones(initialZones: Plan3DZone[] = []): PlanZonesEditor {
  const [zones, setZones] = useState<Plan3DZone[]>(() => sanitiseZones(initialZones));
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ZoneDraft | null>(null);

  const beginDraft = useCallback((point: Plan3DPoint) => {
    setDraft({ start: point, end: point });
  }, []);

  const moveDraft = useCallback((point: Plan3DPoint) => {
    setDraft((current) => (current ? { ...current, end: point } : current));
  }, []);

  const cancelDraft = useCallback(() => setDraft(null), []);

  const commitDraft = useCallback(
    (point: Plan3DPoint, camera: Plan3DCamera, viewport: Plan3DViewport) => {
      setDraft((current) => {
        if (!current) {
          return null;
        }

        const dragPixels = Math.hypot(point.x - current.start.x, point.y - current.start.y);

        if (dragPixels < MIN_DRAG_PIXELS) {
          return null;
        }

        const startWorld = unprojectFloorPoint(current.start, camera, viewport);
        const endWorld = unprojectFloorPoint(point, camera, viewport);

        if (!startWorld || !endWorld) {
          return null;
        }

        setZones((existing) => {
          const zone = createZoneFromRectangle(startWorld, endWorld, existing);

          if (!zone) {
            return existing;
          }

          setSelectedZoneId(zone.id);

          return [...existing, zone];
        });

        return null;
      });
    },
    [],
  );

  const renameZone = useCallback((zoneId: string, name: string) => {
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    setZones((existing) =>
      existing.map((zone) => (zone.id === zoneId ? { ...zone, name: trimmed } : zone)),
    );
  }, []);

  const cycleColour = useCallback((zoneId: string) => {
    setZones((existing) =>
      existing.map((zone) => {
        if (zone.id !== zoneId) {
          return zone;
        }

        const index = PLAN3D_ZONE_COLOURS.indexOf(zone.colour);
        const next = PLAN3D_ZONE_COLOURS[(index + 1) % PLAN3D_ZONE_COLOURS.length];

        return { ...zone, colour: next ?? getZoneColour(0) };
      }),
    );
  }, []);

  const removeZone = useCallback((zoneId: string) => {
    setZones((existing) => existing.filter((zone) => zone.id !== zoneId));
    setSelectedZoneId((current) => (current === zoneId ? null : current));
  }, []);

  const replaceZones = useCallback((next: Plan3DZone[]) => {
    setZones(sanitiseZones(next));
    setSelectedZoneId(null);
    setDraft(null);
  }, []);

  return {
    zones,
    selectedZoneId,
    draft,
    selectZone: setSelectedZoneId,
    beginDraft,
    moveDraft,
    commitDraft,
    cancelDraft,
    renameZone,
    cycleColour,
    removeZone,
    replaceZones,
  };
}

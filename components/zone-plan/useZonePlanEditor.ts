'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  createZoneFromRectangle,
  renameZone,
} from '@/mobile/modules/fire-alarm-roomplan/plan3d/zone-presets';
import {
  getZoneColour,
  sanitiseZones,
} from '@/mobile/modules/fire-alarm-roomplan/plan3d/zone-model';
import { normaliseLegendConfig } from '@/mobile/modules/fire-alarm-roomplan/plan3d/legend-config';
import { unprojectFloorPoint } from '@/mobile/modules/fire-alarm-roomplan/plan3d/projection';
import { generateFireAlarmPlan3D } from '@/mobile/modules/fire-alarm-roomplan/plan3d/generator';
import type {
  FireAlarmPlan3D,
  Plan3DLegendConfig,
  Plan3DPoint,
  Plan3DZone,
} from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';
import type { FireAlarmScanSession } from '@/mobile/modules/fire-alarm-roomplan/types';

import type { DraftZone } from './PlanDrawing';

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 600;
const VIEW_PADDING = 32;
/** A drag shorter than this in drawing pixels is treated as a tap, not a zone. */
const MIN_DRAG_PIXELS = 8;

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface ZonePlanEditor {
  plan: FireAlarmPlan3D;
  zones: Plan3DZone[];
  legend: Plan3DLegendConfig;
  selectedZoneId: string | null;
  draft: DraftZone | null;
  saveState: SaveState;
  error: string | null;
  isDirty: boolean;
  selectZone: (zoneId: string | null) => void;
  startDraft: (point: Plan3DPoint) => void;
  updateDraft: (point: Plan3DPoint) => void;
  finishDraft: (point: Plan3DPoint) => void;
  cancelDraft: () => void;
  updateZone: (zoneId: string, patch: Partial<Plan3DZone>) => void;
  renameSelected: (name: string) => void;
  recolourSelected: (colour: string) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  updateLegend: (patch: Partial<Plan3DLegendConfig>) => void;
  save: (token: string) => Promise<boolean>;
}

export interface ZonePlanEditorInput {
  token: string;
  session: FireAlarmScanSession;
  initialZones: Plan3DZone[];
  initialLegend: Plan3DLegendConfig;
  canEdit: boolean;
}

function buildPlan(session: FireAlarmScanSession, zones: Plan3DZone[]): FireAlarmPlan3D {
  return generateFireAlarmPlan3D(session, {
    camera: {
      projection: 'top-down',
      yawDegrees: 0,
      pitchDegrees: 90,
      zoom: 1,
      showCeiling: false,
      showFloorGrid: true,
      showDevices: true,
      showLabels: true,
    },
    colourScheme: 'schematic',
    viewport: { width: VIEW_WIDTH, height: VIEW_HEIGHT, padding: VIEW_PADDING },
    zones,
  });
}

/**
 * Owns the zone plan being edited in the hosted viewer.
 *
 * The plan is regenerated from the stored session on every change rather than patched, which keeps
 * the browser drawing and the mobile app's drawing on exactly the same code path.
 */
export function useZonePlanEditor(input: ZonePlanEditorInput): ZonePlanEditor {
  const [zones, setZones] = useState<Plan3DZone[]>(() => sanitiseZones(input.initialZones));
  const [legend, setLegend] = useState<Plan3DLegendConfig>(() =>
    normaliseLegendConfig(input.initialLegend),
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftZone | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState(() =>
    JSON.stringify({ zones: input.initialZones, legend: input.initialLegend }),
  );

  const plan = useMemo(() => buildPlan(input.session, zones), [input.session, zones]);

  const toWorld = useCallback(
    (point: Plan3DPoint): Plan3DPoint | null =>
      unprojectFloorPoint(point, plan.camera, plan.viewport),
    [plan.camera, plan.viewport],
  );

  const signature = useMemo(() => JSON.stringify({ zones, legend }), [zones, legend]);

  const startDraft = useCallback(
    (point: Plan3DPoint) => {
      if (!input.canEdit) {
        return;
      }

      setDraft({ start: point, end: point });
    },
    [input.canEdit],
  );

  const updateDraft = useCallback((point: Plan3DPoint) => {
    setDraft((current) => (current ? { ...current, end: point } : current));
  }, []);

  const cancelDraft = useCallback(() => setDraft(null), []);

  const finishDraft = useCallback(
    (point: Plan3DPoint) => {
      setDraft((current) => {
        if (!current) {
          return null;
        }

        const dragPixels = Math.hypot(point.x - current.start.x, point.y - current.start.y);

        if (dragPixels < MIN_DRAG_PIXELS) {
          return null;
        }

        const startWorld = toWorld(current.start);
        const endWorld = toWorld(point);

        if (!startWorld || !endWorld) {
          return null;
        }

        const zone = createZoneFromRectangle(startWorld, endWorld, zones);

        if (zone) {
          setZones((existing) => [...existing, zone]);
          setSelectedZoneId(zone.id);
          setSaveState('idle');
        }

        return null;
      });
    },
    [toWorld, zones],
  );

  const updateZone = useCallback((zoneId: string, patch: Partial<Plan3DZone>) => {
    setZones((existing) =>
      existing.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone)),
    );
    setSaveState('idle');
  }, []);

  const renameSelected = useCallback(
    (name: string) => {
      if (!selectedZoneId) {
        return;
      }

      setZones((existing) =>
        existing.map((zone) => (zone.id === selectedZoneId ? renameZone(zone, name) : zone)),
      );
      setSaveState('idle');
    },
    [selectedZoneId],
  );

  const recolourSelected = useCallback(
    (colour: string) => {
      if (!selectedZoneId) {
        return;
      }

      updateZone(selectedZoneId, { colour });
    },
    [selectedZoneId, updateZone],
  );

  const removeSelected = useCallback(() => {
    if (!selectedZoneId) {
      return;
    }

    setZones((existing) => existing.filter((zone) => zone.id !== selectedZoneId));
    setSelectedZoneId(null);
    setSaveState('idle');
  }, [selectedZoneId]);

  const duplicateSelected = useCallback(() => {
    const source = zones.find((zone) => zone.id === selectedZoneId);

    if (!source) {
      return;
    }

    const copy: Plan3DZone = {
      ...source,
      id: `${source.id}-copy-${Date.now().toString(36)}`,
      name: `${source.name} (copy)`,
      reference: `${source.reference}B`,
      colour: getZoneColour(zones.length),
    };

    setZones((existing) => [...existing, copy]);
    setSelectedZoneId(copy.id);
    setSaveState('idle');
  }, [selectedZoneId, zones]);

  const updateLegend = useCallback((patch: Partial<Plan3DLegendConfig>) => {
    setLegend((current) => ({ ...current, ...patch }));
    setSaveState('idle');
  }, []);

  const save = useCallback(
    async (token: string) => {
      setSaveState('saving');
      setError(null);

      try {
        const response = await fetch(`/api/zone-plans/${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zones, legend }),
        });
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(body?.error ?? 'Unable to save the plan');
        }

        setSavedSignature(signature);
        setSaveState('saved');

        return true;
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Unable to save the plan');
        setSaveState('error');

        return false;
      }
    },
    [legend, signature, zones],
  );

  return {
    plan,
    zones,
    legend,
    selectedZoneId,
    draft,
    saveState,
    error,
    isDirty: signature !== savedSignature,
    selectZone: setSelectedZoneId,
    startDraft,
    updateDraft,
    finishDraft,
    cancelDraft,
    updateZone,
    renameSelected,
    recolourSelected,
    removeSelected,
    duplicateSelected,
    updateLegend,
    save,
  };
}

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  addArea,
  addDevice,
  addFloor as addFloorMutation,
  addZoneRegion,
  assignDeviceToZone,
  boundsOfPoints,
  findZoneConflict,
  floorCoverage,
  nestZone,
  removeZoneRegion,
  setZoneFloors,
  duplicateDevice,
  duplicateFloor as duplicateFloorMutation,
  duplicateZone,
  moveDevice,
  recolourZone,
  removeArea,
  removeDevice,
  removeFloor as removeFloorMutation,
  removeZone,
  renameDesign,
  renameZone,
  rotateDevice,
  setZoneOpacity,
  sortFloors,
  updateArea,
  updateDeviceAddress,
  updateDeviceKind,
  updateDeviceLabel,
  updateDeviceMounting,
  updateDeviceNotes,
  updateFloor,
  updateSheet,
  updateZone,
  zoneEveryRoom,
  type BuildingDesign,
  type DesignAreaKind,
  type DesignDevice,
  type DesignFloor,
  type DesignMounting,
  type DesignPoint,
  type DesignRect,
  type DesignSheet,
  type DesignTool,
  type DesignZone,
} from '@/lib/design';
import { polygonFromRect } from '@/lib/design';

/**
 * Editor state for the design studio.
 *
 * Every edit is a pure mutation from `lib/design/mutations`, applied here and pushed onto an undo
 * stack. The alternative — tracking individual field changes in component state — would drift from
 * what the server stores the first time a save failed, so the document is the single source of
 * truth and the history is just snapshots of it.
 */

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface DesignSelection {
  type: 'device' | 'zone' | 'area';
  id: string;
}

export interface DesignEditor {
  design: BuildingDesign;
  floors: DesignFloor[];
  floor: DesignFloor | null;
  floorId: string | null;
  tool: DesignTool;
  selection: DesignSelection | null;
  /** Device kind armed from the palette, waiting for a click on the canvas. */
  pendingKind: string | null;
  saveState: SaveState;
  error: string | null;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  shareToken: string | null;
  selectedDevice: DesignDevice | null;
  selectedZone: DesignZone | null;
  setTool: (tool: DesignTool) => void;
  setFloor: (floorId: string) => void;
  select: (selection: DesignSelection | null) => void;
  armDeviceKind: (kind: string | null) => void;
  placeDevice: (kind: string, point: DesignPoint) => void;
  dropDevice: (deviceId: string, point: DesignPoint) => void;
  drawZone: (rect: DesignRect) => void;
  /** Zone that new rectangles are added to. Null means a drag starts a new zone. */
  zoneTargetId: string | null;
  setZoneTarget: (zoneId: string | null) => void;
  /** Feedback from the last zone drag, e.g. why it was refused or clipped. */
  zoneMessage: string | null;
  removeSelectedZoneRegion: (regionIndex: number) => void;
  /** How much of the current floor is inside a zone, and which rooms are not. */
  coverage: ReturnType<typeof floorCoverage> | null;
  /** Nest the selected zone inside another compartment, or un-nest it with null. */
  nestSelectedZone: (parentZoneId: string | null) => void;
  /** Storeys the selected zone also covers, for a stair or lift shaft. */
  setSelectedZoneFloors: (floorIds: string[]) => void;
  /** Message from the last nesting attempt. */
  nestingError: string | null;
  /** A drag refused because it sat inside a compartment, offered as a nested zone instead. */
  pendingNestedZone: {
    polygon: import('@/lib/design').DesignPolygon;
    parentZoneId: string;
    parentReference: string;
  } | null;
  acceptNestedZone: () => void;
  dismissNestedZone: () => void;
  drawArea: (rect: DesignRect, kind: DesignAreaKind) => void;
  updateDevice: (deviceId: string, patch: Partial<DesignDevice>) => void;
  setDeviceLabel: (deviceId: string, label: string) => void;
  setDeviceKind: (deviceId: string, kind: string) => void;
  setDeviceMounting: (deviceId: string, mounting: DesignMounting) => void;
  setDeviceAddress: (deviceId: string, address: string) => void;
  setDeviceNotes: (deviceId: string, notes: string) => void;
  setDeviceZone: (deviceId: string, zoneId: string | null) => void;
  rotateSelectedDevice: (degrees: number) => void;
  duplicateSelectedDevice: () => void;
  deleteSelectedDevice: () => void;
  updateSelectedZone: (patch: Partial<DesignZone>) => void;
  renameSelectedZone: (name: string) => void;
  recolourSelectedZone: (colour: string) => void;
  setSelectedZoneOpacity: (opacity: number) => void;
  duplicateSelectedZone: () => void;
  deleteSelectedZone: () => void;
  updateSelectedArea: (patch: Partial<import('@/lib/design').DesignArea>) => void;
  deleteSelectedArea: () => void;
  zoneAllRooms: () => void;
  setDesignName: (name: string) => void;
  updateDesignSheet: (patch: Partial<DesignSheet>) => void;
  updateFloorDetails: (patch: Partial<DesignFloor>) => void;
  addFloor: () => void;
  duplicateFloor: () => void;
  deleteFloor: () => void;
  importDesign: (design: BuildingDesign) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<boolean>;
  publish: (editEnabled: boolean) => Promise<string | null>;
  /**
   * 'demo' means the document lives only in this browser: there is no row to save against, so the
   * studio offers "save a copy" instead of "save", and publishing is unavailable.
   */
  mode: 'persisted' | 'demo';
  /** Demo mode: creates a real design from the current document and returns its id. */
  saveCopy: () => Promise<number | null>;
}

interface EditorInput {
  designId: number;
  initialDesign: BuildingDesign;
  initialShareToken: string | null;
  mode?: 'persisted' | 'demo';
}

const MAX_HISTORY = 60;

export function useDesignEditor(input: EditorInput): DesignEditor {
  const [design, setDesign] = useState<BuildingDesign>(input.initialDesign);
  const [past, setPast] = useState<BuildingDesign[]>([]);
  const [future, setFuture] = useState<BuildingDesign[]>([]);
  const [floorId, setFloorId] = useState<string | null>(
    sortFloors(input.initialDesign.floors)[0]?.id ?? null,
  );
  const [tool, setToolState] = useState<DesignTool>('select');
  const [selection, setSelection] = useState<DesignSelection | null>(null);
  const [pendingKind, setPendingKind] = useState<string | null>(null);
  const [zoneTargetId, setZoneTargetId] = useState<string | null>(null);
  const [zoneMessage, setZoneMessage] = useState<string | null>(null);
  const [nestingError, setNestingError] = useState<string | null>(null);
  const [pendingNestedZone, setPendingNestedZone] = useState<{
    polygon: import('@/lib/design').DesignPolygon;
    parentZoneId: string;
    parentReference: string;
  } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(input.initialShareToken);

  const savedSignature = useRef(JSON.stringify(input.initialDesign));

  const commit = useCallback((next: BuildingDesign) => {
    setDesign((current) => {
      setPast((history) => [...history, current].slice(-MAX_HISTORY));
      setFuture([]);

      return next;
    });
    setSaveState('idle');
  }, []);

  const floors = useMemo(() => sortFloors(design.floors), [design.floors]);
  const floor = floors.find((entry) => entry.id === floorId) ?? floors[0] ?? null;
  const activeFloorId = floor?.id ?? null;

  // Recomputed whenever the zones change, because a zone that is drawn, moved or deleted changes
  // what is left uncovered on the storey.
  const coverage = useMemo(
    () => (floor ? floorCoverage(floor, design.zones) : null),
    [design.zones, floor],
  );

  const selectedDevice =
    selection?.type === 'device'
      ? design.devices.find((device) => device.id === selection.id) ?? null
      : null;
  const selectedZone =
    selection?.type === 'zone'
      ? design.zones.find((zone) => zone.id === selection.id) ?? null
      : null;
  const selectedArea =
    selection?.type === 'area'
      ? design.areas.find((area) => area.id === selection.id) ?? null
      : null;

  const setTool = useCallback((next: DesignTool) => {
    setToolState(next);
    setPendingKind(null);
  }, []);

  const setFloor = useCallback((next: string) => {
    setFloorId(next);
    setSelection(null);
    setZoneTargetId(null);
    setZoneMessage(null);
  }, []);

  const armDeviceKind = useCallback((kind: string | null) => {
    setPendingKind(kind);
    setToolState(kind ? 'device' : 'select');
  }, []);

  const placeDevice = useCallback(
    (kind: string, point: DesignPoint) => {
      if (!activeFloorId) {
        return;
      }

      const result = addDevice(design, { floorId: activeFloorId, kind, position: point });

      commit(result.design);
      setSelection({ type: 'device', id: result.device.id });
      setPendingKind(null);
      setToolState('select');
    },
    [activeFloorId, commit, design],
  );

  const dropDevice = useCallback(
    (deviceId: string, point: DesignPoint) => {
      if (!activeFloorId) {
        return;
      }

      commit(moveDevice(design, deviceId, point, activeFloorId));
      setSelection({ type: 'device', id: deviceId });
    },
    [activeFloorId, commit, design],
  );

  const drawZone = useCallback(
    (rect: DesignRect) => {
      if (!activeFloorId) {
        return;
      }

      const polygon = polygonFromRect(rect);
      const result = addZoneRegion(design, {
        floorId: activeFloorId,
        polygon,
        zoneId: zoneTargetId,
      });

      if (!result.zone) {
        if (result.failure === 'overlap') {
          // The drag sits inside an existing compartment. Offer it as a nested zone, which is
          // what a lift shaft or stair inside a floor plate actually is.
          const bounds = boundsOfPoints(polygon);
          const blocker = findZoneConflict(
            { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY },
            design.zones,
            activeFloorId,
            null,
          );

          if (blocker) {
            setPendingNestedZone({
              polygon,
              parentZoneId: blocker.id,
              parentReference: blocker.reference,
            });
            setZoneMessage(
              `That area is inside ${blocker.reference}. Add it as its own compartment nested inside ${blocker.reference}?`,
            );

            return;
          }
        }

        setZoneMessage(
          result.failure === 'overlap'
            ? 'That area is already inside another zone.'
            : 'Drag a larger area to make a compartment.',
        );

        return;
      }

      setPendingNestedZone(null);

      commit(result.design);
      setSelection({ type: 'zone', id: result.zone.id });
      // Keep the zone armed so the next drag adds another part to the same compartment, which is
      // how an L-shaped or split zone gets built.
      setZoneTargetId(result.zone.id);
      setZoneMessage(
        result.trimmed
          ? 'Part of that drag overlapped another zone, so only the free area was added.'
          : null,
      );
    },
    [activeFloorId, commit, design, zoneTargetId],
  );

  const removeSelectedZoneRegion = useCallback(
    (regionIndex: number) => {
      if (!selectedZone) {
        return;
      }

      commit(removeZoneRegion(design, selectedZone.id, regionIndex));
    },
    [commit, design, selectedZone],
  );

  const nestSelectedZone = useCallback(
    (parentZoneId: string | null) => {
      if (!selectedZone) {
        return;
      }

      const result = nestZone(design, selectedZone.id, parentZoneId);

      if (result.failure) {
        setNestingError(
          result.failure === 'cycle'
            ? 'A zone cannot sit inside one of its own compartments.'
            : result.failure === 'not_contained'
              ? 'This compartment is not wholly inside that one. Draw it inside first.'
              : 'That compartment no longer exists.',
        );

        return;
      }

      setNestingError(null);
      commit(result.design);
    },
    [commit, design, selectedZone],
  );

  const setSelectedZoneFloors = useCallback(
    (floorIds: string[]) => {
      if (!selectedZone) {
        return;
      }

      setNestingError(null);
      commit(setZoneFloors(design, selectedZone.id, floorIds));
    },
    [commit, design, selectedZone],
  );

  const acceptNestedZone = useCallback(() => {
    if (!pendingNestedZone || !activeFloorId) {
      return;
    }

    const result = addZoneRegion(design, {
      floorId: activeFloorId,
      polygon: pendingNestedZone.polygon,
      parentZoneId: pendingNestedZone.parentZoneId,
    });

    if (!result.zone) {
      setZoneMessage(
        result.failure === 'not_contained'
          ? 'That area is not wholly inside the parent compartment.'
          : 'That area could not be nested there.',
      );

      return;
    }

    commit(result.design);
    setSelection({ type: 'zone', id: result.zone.id });
    setPendingNestedZone(null);
    setZoneMessage(`${result.zone.reference} added as a nested compartment.`);
  }, [activeFloorId, commit, design, pendingNestedZone]);

  const dismissNestedZone = useCallback(() => {
    setPendingNestedZone(null);
    setZoneMessage(null);
  }, []);

  const drawArea = useCallback(
    (rect: DesignRect, kind: DesignAreaKind) => {
      if (!activeFloorId) {
        return;
      }

      const polygon = polygonFromRect(rect);
      const result = addArea(design, { floorId: activeFloorId, polygon, kind });

      if (!result.area) {
        return;
      }

      commit(result.design);
      setSelection({ type: 'area', id: result.area.id });
      setToolState('select');
    },
    [activeFloorId, commit, design],
  );

  const updateDevice = useCallback(
    (deviceId: string, patch: Partial<DesignDevice>) => {
      commit({
        ...design,
        devices: design.devices.map((device) =>
          device.id === deviceId ? { ...device, ...patch } : device,
        ),
      });
    },
    [commit, design],
  );

  const setDeviceLabel = useCallback(
    (deviceId: string, label: string) => commit(updateDeviceLabel(design, deviceId, label)),
    [commit, design],
  );
  const setDeviceKind = useCallback(
    (deviceId: string, kind: string) => commit(updateDeviceKind(design, deviceId, kind)),
    [commit, design],
  );
  const setDeviceMounting = useCallback(
    (deviceId: string, mounting: DesignMounting) =>
      commit(updateDeviceMounting(design, deviceId, mounting)),
    [commit, design],
  );
  const setDeviceAddress = useCallback(
    (deviceId: string, address: string) => commit(updateDeviceAddress(design, deviceId, address)),
    [commit, design],
  );
  const setDeviceNotes = useCallback(
    (deviceId: string, notes: string) => commit(updateDeviceNotes(design, deviceId, notes)),
    [commit, design],
  );
  const setDeviceZone = useCallback(
    (deviceId: string, zoneId: string | null) =>
      commit(assignDeviceToZone(design, deviceId, zoneId)),
    [commit, design],
  );

  const rotateSelectedDevice = useCallback(
    (degrees: number) => {
      if (!selectedDevice) {
        return;
      }

      commit(rotateDevice(design, selectedDevice.id, selectedDevice.rotation + degrees));
    },
    [commit, design, selectedDevice],
  );

  const duplicateSelectedDevice = useCallback(() => {
    if (!selectedDevice) {
      return;
    }

    commit(duplicateDevice(design, selectedDevice.id));
  }, [commit, design, selectedDevice]);

  const deleteSelectedDevice = useCallback(() => {
    if (!selectedDevice) {
      return;
    }

    commit(removeDevice(design, selectedDevice.id));
    setSelection(null);
  }, [commit, design, selectedDevice]);

  const updateSelectedZone = useCallback(
    (patch: Partial<DesignZone>) => {
      if (!selectedZone) {
        return;
      }

      commit(updateZone(design, selectedZone.id, patch));
    },
    [commit, design, selectedZone],
  );

  const renameSelectedZone = useCallback(
    (name: string) => {
      if (!selectedZone) {
        return;
      }

      commit(renameZone(design, selectedZone.id, name));
    },
    [commit, design, selectedZone],
  );

  const recolourSelectedZone = useCallback(
    (colour: string) => {
      if (!selectedZone) {
        return;
      }

      commit(recolourZone(design, selectedZone.id, colour));
    },
    [commit, design, selectedZone],
  );

  const setSelectedZoneOpacity = useCallback(
    (opacity: number) => {
      if (!selectedZone) {
        return;
      }

      commit(setZoneOpacity(design, selectedZone.id, opacity));
    },
    [commit, design, selectedZone],
  );

  const duplicateSelectedZone = useCallback(() => {
    if (!selectedZone) {
      return;
    }

    commit(duplicateZone(design, selectedZone.id));
  }, [commit, design, selectedZone]);

  const deleteSelectedZone = useCallback(() => {
    if (!selectedZone) {
      return;
    }

    commit(removeZone(design, selectedZone.id));
    setSelection(null);
  }, [commit, design, selectedZone]);

  const updateSelectedArea = useCallback(
    (patch: Partial<import('@/lib/design').DesignArea>) => {
      if (!selectedArea) {
        return;
      }

      commit(updateArea(design, selectedArea.id, patch));
    },
    [commit, design, selectedArea],
  );

  const deleteSelectedArea = useCallback(() => {
    if (!selectedArea) {
      return;
    }

    commit(removeArea(design, selectedArea.id));
    setSelection(null);
  }, [commit, design, selectedArea]);

  const zoneAllRooms = useCallback(() => {
    if (!activeFloorId) {
      return;
    }

    commit(zoneEveryRoom(design, activeFloorId));
  }, [activeFloorId, commit, design]);

  const setDesignName = useCallback(
    (name: string) => commit(renameDesign(design, name)),
    [commit, design],
  );

  const updateDesignSheet = useCallback(
    (patch: Partial<DesignSheet>) => commit(updateSheet(design, patch)),
    [commit, design],
  );

  const updateFloorDetails = useCallback(
    (patch: Partial<DesignFloor>) => {
      if (!activeFloorId) {
        return;
      }

      commit(updateFloor(design, activeFloorId, patch));
    },
    [activeFloorId, commit, design],
  );

  const addFloor = useCallback(() => {
    const result = addFloorMutation(design);

    commit(result.design);
    setFloorId(result.floor.id);
  }, [commit, design]);

  const duplicateFloor = useCallback(() => {
    if (!activeFloorId) {
      return;
    }

    const result = duplicateFloorMutation(design, activeFloorId);

    if (!result.floor) {
      return;
    }

    commit(result.design);
    setFloorId(result.floor.id);
  }, [activeFloorId, commit, design]);

  const deleteFloor = useCallback(() => {
    if (!activeFloorId || design.floors.length <= 1) {
      return;
    }

    const next = removeFloorMutation(design, activeFloorId);
    const remaining = sortFloors(next.floors);

    commit(next);
    setFloorId(remaining[remaining.length - 1]?.id ?? null);
    setSelection(null);
  }, [activeFloorId, commit, design]);

  const importDesign = useCallback(
    (next: BuildingDesign) => {
      commit(next);
      setFloorId(sortFloors(next.floors)[0]?.id ?? null);
      setSelection(null);
    },
    [commit],
  );

  const undo = useCallback(() => {
    setPast((history) => {
      if (history.length === 0) {
        return history;
      }

      const previous = history[history.length - 1];

      setDesign((current) => {
        setFuture((stack) => [current, ...stack].slice(0, MAX_HISTORY));

        return previous;
      });
      setSaveState('idle');

      return history.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((stack) => {
      if (stack.length === 0) {
        return stack;
      }

      const next = stack[0];

      setDesign((current) => {
        setPast((history) => [...history, current].slice(-MAX_HISTORY));

        return next;
      });
      setSaveState('idle');

      return stack.slice(1);
    });
  }, []);

  const save = useCallback(async () => {
    setSaveState('saving');
    setError(null);

    try {
      const response = await fetch(`/api/designs/${input.designId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Unable to save the design');
      }

      savedSignature.current = JSON.stringify(design);
      setSaveState('saved');

      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the design');
      setSaveState('error');

      return false;
    }
  }, [design, input.designId]);

  const saveCopy = useCallback(async () => {
    setSaveState('saving');
    setError(null);

    try {
      const response = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: design.name, design }),
      });
      const body = (await response.json().catch(() => null)) as
        | { design?: { id: number }; error?: string }
        | null;

      if (!response.ok || !body?.design) {
        throw new Error(body?.error ?? 'Unable to save a copy of the design');
      }

      setSaveState('saved');

      return body.design.id;
    } catch (copyError) {
      setError(
        copyError instanceof Error ? copyError.message : 'Unable to save a copy of the design',
      );
      setSaveState('error');

      return null;
    }
  }, [design]);

  const publish = useCallback(
    async (editEnabled: boolean) => {
      const saved = await save();

      if (!saved) {
        return null;
      }

      try {
        const response = await fetch(`/api/designs/${input.designId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publish: true, editEnabled }),
        });
        const body = (await response.json().catch(() => null)) as
          | { published?: { shareToken: string }; error?: string }
          | null;

        if (!response.ok || !body?.published) {
          throw new Error(body?.error ?? 'Unable to publish the design');
        }

        setShareToken(body.published.shareToken);

        return body.published.shareToken;
      } catch (publishError) {
        setError(
          publishError instanceof Error ? publishError.message : 'Unable to publish the design',
        );
        setSaveState('error');

        return null;
      }
    },
    [input.designId, save],
  );

  return {
    design,
    floors,
    floor,
    floorId: activeFloorId,
    tool,
    selection,
    pendingKind,
    saveState,
    error,
    isDirty: JSON.stringify(design) !== savedSignature.current,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    shareToken,
    selectedDevice,
    selectedZone,
    setTool,
    setFloor,
    select: setSelection,
    armDeviceKind,
    placeDevice,
    dropDevice,
    drawZone,
    drawArea,
    zoneTargetId,
    setZoneTarget: setZoneTargetId,
    zoneMessage,
    removeSelectedZoneRegion,
    coverage,
    nestSelectedZone,
    setSelectedZoneFloors,
    nestingError,
    pendingNestedZone,
    acceptNestedZone,
    dismissNestedZone,
    updateDevice,
    setDeviceLabel,
    setDeviceKind,
    setDeviceMounting,
    setDeviceAddress,
    setDeviceNotes,
    setDeviceZone,
    rotateSelectedDevice,
    duplicateSelectedDevice,
    deleteSelectedDevice,
    updateSelectedZone,
    renameSelectedZone,
    recolourSelectedZone,
    setSelectedZoneOpacity,
    duplicateSelectedZone,
    deleteSelectedZone,
    updateSelectedArea,
    deleteSelectedArea,
    zoneAllRooms,
    setDesignName,
    updateDesignSheet,
    updateFloorDetails,
    addFloor,
    duplicateFloor,
    deleteFloor,
    importDesign,
    undo,
    redo,
    save,
    publish,
    mode: input.mode ?? 'persisted',
    saveCopy,
  };
}

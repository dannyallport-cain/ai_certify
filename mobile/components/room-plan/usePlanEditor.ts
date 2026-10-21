import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  FireAlarmDeviceDetection,
  FireAlarmDeviceType,
  FireAlarmFloorplanRoom,
  FireAlarmScanSession,
} from '@/modules/fire-alarm-roomplan';
import { buildPlanGeometry, createRectangularRoom } from '@/modules/fire-alarm-roomplan';
import { getRoomPlanSession, saveRoomPlanSession } from '@/services/roomplan/session-store';
import {
  buildSessionWithDevices,
  createManualDevice,
  patchDevice,
} from '@/services/roomplan/session-mutations';

export interface ManualRoomDraft {
  name: string;
  widthMeters: number;
  depthMeters: number;
  wallHeightMeters: number;
}

function createEmptySession(sessionId?: string, sessionName?: string): FireAlarmScanSession {
  const now = new Date().toISOString();

  return {
    id: sessionId ?? `plan-session-${Date.now()}`,
    status: 'completed',
    metadata: {
      startedAt: now,
      endedAt: now,
      platform: 'mobile',
      scannerVersion: 'plan-editor',
      sessionName: sessionName ?? 'Fire alarm plan',
    },
    floorplan: {
      units: 'meters',
      rooms: [],
      deviceCount: 0,
      wallCount: 0,
    },
    devices: [],
    rawPayload: {
      source: 'plan-editor',
    },
  };
}

function parseSessionParam(value: string | string[] | undefined): FireAlarmScanSession | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as FireAlarmScanSession;
  } catch {
    return null;
  }
}

export interface UsePlanEditorOptions {
  sessionId?: string;
  sessionParam?: string | string[];
}

export function usePlanEditor({ sessionId, sessionParam }: UsePlanEditorOptions) {
  const [session, setSession] = useState<FireAlarmScanSession | null>(null);
  const [devices, setDevices] = useState<FireAlarmDeviceDetection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      const parsed = parseSessionParam(sessionParam);
      let nextSession = parsed;

      if (!nextSession && sessionId) {
        nextSession = await getRoomPlanSession(sessionId);
      }

      if (isCancelled) {
        return;
      }

      const resolved = nextSession ?? createEmptySession(sessionId);
      setSession(resolved);
      setDevices(resolved.devices ?? []);
      hasLoadedRef.current = true;
      setIsLoading(false);
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [sessionId, sessionParam]);

  const persist = useCallback(async (nextSession: FireAlarmScanSession, nextDevices: FireAlarmDeviceDetection[]) => {
    setSaveState('saving');
    await saveRoomPlanSession(buildSessionWithDevices(nextSession, nextDevices));
    setSaveState('saved');
  }, []);

  useEffect(() => {
    if (!session || !hasLoadedRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      void persist(session, devices);
    }, 350);

    return () => clearTimeout(timeout);
  }, [devices, persist, session]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const geometry = useMemo(() => buildPlanGeometry(session), [session]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  );

  const updateDevice = useCallback((deviceId: string, patch: Partial<FireAlarmDeviceDetection>) => {
    setDevices((current) => patchDevice(current, deviceId, patch));
  }, []);

  const removeDevice = useCallback((deviceId: string) => {
    setDevices((current) => current.filter((device) => device.id !== deviceId));
    setSelectedDeviceId((current) => (current === deviceId ? null : current));
  }, []);

  const moveDeviceTo = useCallback(
    (deviceId: string, point: { x: number; y: number }) => {
      setDevices((current) =>
        current.map((device) =>
          device.id === deviceId
            ? {
                ...device,
                location: {
                  x: Number(point.x.toFixed(2)),
                  y: Number(point.y.toFixed(2)),
                  z: device.location?.z ?? 0,
                },
                metadata: { ...(device.metadata ?? {}), placedInPlan: true },
              }
            : device,
        ),
      );
    },
    [],
  );

  const addDevice = useCallback(
    (type: FireAlarmDeviceType): FireAlarmDeviceDetection => {
      const room = geometry.rooms[0];
      const origin = room ? room.centroid : { x: 1, y: 1 };
      const created = createManualDevice(session?.id ?? 'plan-session', {
        type,
        position: origin,
        ceilingHeight: geometry.defaultWallHeight,
        label: `${type.replace('_', ' ')} ${devices.filter((device) => device.type === type).length + 1}`,
      });

      setDevices((current) => [...current, created]);
      setSelectedDeviceId(created.id);
      return created;
    },
    [devices, geometry.defaultWallHeight, geometry.rooms, session?.id],
  );

  const addRoom = useCallback(
    (draft: ManualRoomDraft) => {
      const startX = geometry.rooms.length > 0 ? geometry.bounds.maxX + 1 : 0;
      const room = createRectangularRoom({
        name: draft.name,
        widthMeters: draft.widthMeters,
        depthMeters: draft.depthMeters,
        wallHeightMeters: draft.wallHeightMeters,
        originX: startX,
        originY: 0,
      });
      const floorplanRoom: FireAlarmFloorplanRoom = {
        id: room.id,
        name: room.name,
        level: 0,
        areaSquareMeters: room.areaSquareMeters,
        perimeterMeters: room.perimeterMeters,
        outline: room.outline.map((point) => ({ x: point.x, y: point.y, z: 0 })),
        wallSegments: room.walls.map((wall) => ({
          id: wall.id,
          start: { x: wall.start.x, y: wall.start.y, z: 0 },
          end: { x: wall.end.x, y: wall.end.y, z: 0 },
          height: wall.height,
          length: wall.length,
        })),
        openings: [],
        devices: [],
      };

      setSession((current) =>
        current
          ? {
              ...current,
              floorplan: {
                units: current.floorplan?.units ?? 'meters',
                wallCount: (current.floorplan?.wallCount ?? 0) + room.walls.length,
                deviceCount: current.floorplan?.deviceCount ?? 0,
                rooms: [...(current.floorplan?.rooms ?? []), floorplanRoom],
              },
            }
          : current,
      );
    },
    [geometry.bounds.maxX, geometry.rooms.length],
  );

  const removeRoomById = useCallback((roomId: string) => {
    setSession((current) =>
      current && current.floorplan
        ? {
            ...current,
            floorplan: {
              ...current.floorplan,
              rooms: current.floorplan.rooms.filter((room) => room.id !== roomId),
            },
          }
        : current,
    );
  }, []);

  const saveNow = useCallback(async () => {
    if (!session) {
      return;
    }

    await persist(session, devices);
  }, [devices, persist, session]);

  return {
    session,
    devices,
    setDevices,
    geometry,
    isLoading,
    saveState,
    selectedDevice,
    selectedDeviceId,
    setSelectedDeviceId,
    updateDevice,
    removeDevice,
    moveDeviceTo,
    addDevice,
    addRoom,
    removeRoomById,
    saveNow,
  };
}

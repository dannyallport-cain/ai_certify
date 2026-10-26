import type {
  FireAlarmDeviceDetection,
  FireAlarmDeviceType,
  FireAlarmScanSession,
  Plan3DMounting,
} from '@/modules/fire-alarm-roomplan';

/** A device entry while it is being edited on the review screen. */
export type EditableDevice = FireAlarmDeviceDetection & {
  reviewed?: boolean;
};

/**
 * Where the inspector put a device on the 3D plan. This is the only supported way to give a
 * manual device a position: typing raw world coordinates is not something a surveyor can do on
 * site, so the placement view produces these instead.
 */
export interface ManualDevicePlacement {
  position: { x: number; y: number; z: number };
  mounting: Plan3DMounting;
  roomId: string | null;
  roomName: string | null;
  surfaceId: string | null;
}

let manualDeviceSequence = 0;

function isMounting(value: unknown): value is Plan3DMounting {
  return (
    value === 'floor' ||
    value === 'wall' ||
    value === 'ceiling' ||
    value === 'ceiling_void'
  );
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Builds a blank entry for a device the inspector is adding by hand. */
export function createManualDevice(
  sessionId: string,
  options: { type?: FireAlarmDeviceType; placement?: ManualDevicePlacement } = {},
): EditableDevice {
  manualDeviceSequence += 1;

  const placement = options.placement;

  return {
    id: `device-${Date.now()}-${manualDeviceSequence}`,
    type: options.type ?? 'unknown',
    manufacturer: 'Unknown',
    notes: '',
    source: 'manual',
    location: placement ? { ...placement.position } : { x: 0, y: 0, z: 0 },
    roomId: placement?.roomId ?? null,
    metadata: {
      sessionId,
      ...(placement
        ? {
            mounting: placement.mounting,
            surfaceId: placement.surfaceId,
            roomName: placement.roomName,
          }
        : {}),
    },
    reviewed: true,
  };
}

/** Reads back the placement recorded on a device by the placement view. */
export function readDevicePlacement(device: FireAlarmDeviceDetection): ManualDevicePlacement | null {
  const location = device.location;

  if (!location || typeof location.x !== 'number' || typeof location.y !== 'number') {
    return null;
  }

  const metadata = device.metadata ?? {};
  const mounting = isMounting(metadata.mounting) ? metadata.mounting : null;

  return {
    position: { x: location.x, y: location.y, z: location.z ?? 0 },
    mounting: mounting ?? 'wall',
    roomId: device.roomId ?? readString(metadata.roomId),
    roomName: readString(metadata.roomName),
    surfaceId: readString(metadata.surfaceId),
  };
}

/** Applies a placement (and type/notes) chosen in the placement modal to an existing row. */
export function applyPlacementToDevice(
  device: EditableDevice,
  input: { type: FireAlarmDeviceType; placement: ManualDevicePlacement; notes?: string },
): EditableDevice {
  const notes = input.notes?.trim();

  return {
    ...device,
    type: input.type,
    location: { ...input.placement.position },
    roomId: input.placement.roomId,
    metadata: {
      ...(device.metadata ?? {}),
      mounting: input.placement.mounting,
      surfaceId: input.placement.surfaceId,
      roomName: input.placement.roomName,
    },
    notes: notes && notes.length > 0 ? notes : device.notes,
    reviewed: true,
  };
}

const MOUNTING_LABELS: Record<Plan3DMounting, string> = {
  floor: 'Floor mounted',
  wall: 'Wall mounted',
  ceiling: 'Ceiling mounted',
  ceiling_void: 'In the ceiling void',
  unknown: 'Unplaced',
};

/** One-line summary for the device card, e.g. "Wall mounted · Kitchen · 1.4 m". */
export function describeDevicePlacement(device: FireAlarmDeviceDetection): string {
  const placement = readDevicePlacement(device);
  const metadata = device.metadata ?? {};
  const mounting = isMounting(metadata.mounting) ? metadata.mounting : null;

  if (!placement || !mounting) {
    return 'No position set — place it on the 3D view';
  }

  const room = placement.roomName ?? (placement.roomId ? 'Room' : null);
  const height = `${placement.position.z.toFixed(2)} m`;

  return [MOUNTING_LABELS[placement.mounting], room, height].filter(Boolean).join(' · ');
}

/** A session that exists before any RoomPlan capture has been made. */
export function buildEmptySession(sessionId?: string): FireAlarmScanSession {
  const now = new Date().toISOString();

  return {
    id: sessionId ?? `manual-session-${Date.now()}`,
    status: 'completed',
    metadata: {
      startedAt: now,
      endedAt: now,
      platform: 'mobile',
      scannerVersion: 'review-ui-m1',
      sessionName: 'Manual review session',
    },
    floorplan: {
      units: 'meters',
      rooms: [],
      deviceCount: 0,
      wallCount: 0,
    },
    devices: [],
    rawPayload: { source: 'review-screen-fallback' },
  };
}

export function parseSessionParam(
  value: string | string[] | undefined,
): FireAlarmScanSession | null {
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

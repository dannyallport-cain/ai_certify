import type {
  FireAlarmDeviceDetection,
  FireAlarmDevicePoint,
  FireAlarmDeviceType,
  FireAlarmManufacturer,
  FireAlarmScanSession,
} from '../../modules/fire-alarm-roomplan/types';

export const DEFAULT_CEILING_HEIGHT_METERS = 2.7;

export function getManufacturerName(manufacturer: FireAlarmManufacturer | undefined): string {
  if (!manufacturer) {
    return 'Unknown';
  }

  if (typeof manufacturer === 'string') {
    return manufacturer.trim() || 'Unknown';
  }

  return manufacturer.name?.trim() || 'Unknown';
}

export function inferDeviceIdentification(device: FireAlarmDeviceDetection): boolean {
  const labelText = device.label?.toLowerCase() ?? '';
  const manufacturerName = getManufacturerName(device.manufacturer).toLowerCase();

  if (device.identifiedByUser === true) {
    return true;
  }

  if (device.type !== 'unknown') {
    return true;
  }

  if (manufacturerName && manufacturerName !== 'unknown' && manufacturerName !== 'null') {
    return true;
  }

  return /panel|detector|sounder|interface|io[_\s]?unit|vad/.test(labelText);
}

export function mergeDeviceLists(
  existingDevices: FireAlarmDeviceDetection[],
  incomingDevices: FireAlarmDeviceDetection[],
): FireAlarmDeviceDetection[] {
  const existingById = new Map(existingDevices.map((device) => [device.id, device]));
  const merged = incomingDevices.map((incomingDevice) => {
    const existingDevice = existingById.get(incomingDevice.id);
    const identifiedByUser =
      existingDevice?.identifiedByUser ??
      incomingDevice.identifiedByUser ??
      inferDeviceIdentification(incomingDevice);

    if (!existingDevice) {
      return { ...incomingDevice, identifiedByUser } satisfies FireAlarmDeviceDetection;
    }

    return {
      ...incomingDevice,
      type: existingDevice.identifiedByUser ? existingDevice.type : incomingDevice.type,
      label: existingDevice.label ?? incomingDevice.label,
      manufacturer: existingDevice.manufacturer ?? incomingDevice.manufacturer,
      notes: existingDevice.notes ?? incomingDevice.notes,
      identifiedByUser,
      metadata: {
        ...(incomingDevice.metadata ?? {}),
        ...(existingDevice.metadata ?? {}),
      },
    } satisfies FireAlarmDeviceDetection;
  });

  const incomingIds = new Set(incomingDevices.map((device) => device.id));
  const remainingExistingDevices = existingDevices.filter((device) => !incomingIds.has(device.id));

  return [...merged, ...remainingExistingDevices];
}

export function buildSessionWithDevices(
  session: FireAlarmScanSession,
  devices: FireAlarmDeviceDetection[],
): FireAlarmScanSession {
  return {
    ...session,
    devices,
    floorplan: session.floorplan
      ? {
          ...session.floorplan,
          deviceCount: devices.length,
          rooms: session.floorplan.rooms.map((room) => ({
            ...room,
            devices: devices.filter((device) => device.roomId === room.id),
          })),
        }
      : session.floorplan,
    rawPayload: {
      ...(session.rawPayload ?? {}),
      identification: {
        identifiedDeviceCount: devices.filter((device) => device.identifiedByUser).length,
        totalVisibleDeviceCount: devices.length,
      },
    },
  };
}

export function defaultHeightForType(
  type: FireAlarmDeviceType,
  ceilingHeight = DEFAULT_CEILING_HEIGHT_METERS,
): number {
  switch (type) {
    case 'detector':
    case 'vad':
      return ceilingHeight;
    case 'sounder':
      return Math.max(ceilingHeight - 0.3, 0.5);
    case 'interface':
    case 'io_unit':
      return Math.max(ceilingHeight - 1.5, 0.3);
    default:
      return 0;
  }
}

export function createManualDevice(
  sessionId: string,
  options: {
    type?: FireAlarmDeviceType;
    label?: string;
    manufacturer?: FireAlarmManufacturer;
    position?: { x: number; y: number };
    heightMeters?: number;
    ceilingHeight?: number;
  } = {},
): FireAlarmDeviceDetection {
  const type = options.type ?? 'detector';
  const position = options.position ?? { x: 1, y: 1 };
  const location: FireAlarmDevicePoint = {
    x: Number(position.x.toFixed(2)),
    y: Number(position.y.toFixed(2)),
    z: options.heightMeters ?? defaultHeightForType(type, options.ceilingHeight),
  };

  return {
    id: `manual-device-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    type,
    label: options.label ?? 'New device',
    manufacturer: options.manufacturer ?? 'Unknown',
    confidence: null,
    location,
    notes: '',
    source: 'manual',
    roomId: null,
    wallSegmentId: null,
    identifiedByUser: true,
    evidenceFrames: [],
    metadata: {
      sessionId,
      origin: 'plan-editor',
    },
  };
}

export function patchDevice(
  devices: FireAlarmDeviceDetection[],
  deviceId: string,
  patch: Partial<FireAlarmDeviceDetection>,
): FireAlarmDeviceDetection[] {
  return devices.map((device) => {
    if (device.id !== deviceId) {
      return device;
    }

    const nextLocation =
      patch.location === undefined
        ? device.location
        : { ...(device.location ?? { x: 0, y: 0 }), ...patch.location };

    return {
      ...device,
      ...patch,
      location: nextLocation,
      metadata: {
        ...(device.metadata ?? {}),
        ...(patch.metadata ?? {}),
        editedInPlan: true,
      },
    } satisfies FireAlarmDeviceDetection;
  });
}

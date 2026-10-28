import type {
  FireAlarmDeviceDetection,
  FireAlarmDevicePoint,
  FireAlarmDeviceType,
  FireAlarmManufacturer,
  FireAlarmScanSession,
} from '@/modules/fire-alarm-roomplan';

/** Device types an engineer can assign, in the order they appear on screen. */
export const DEVICE_TYPES: FireAlarmDeviceType[] = [
  'detector',
  'sounder',
  'panel',
  'interface',
  'io_unit',
  'vad',
  'unknown',
];

export const MANUFACTURER_OPTIONS = [
  'Unknown',
  'Apollo',
  'Hochiki',
  'Gent',
  'Advanced',
  'Morley',
  'Notifier',
  'Kentec',
  'C-Tec',
  'Siemens',
  'Eaton',
  'Hyfire',
  'System Sensor',
];

export function formatDeviceType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getManufacturerName(manufacturer: FireAlarmManufacturer | undefined): string {
  if (!manufacturer) {
    return 'Unknown';
  }

  if (typeof manufacturer === 'string') {
    return manufacturer.trim() || 'Unknown';
  }

  return manufacturer.name?.trim() || 'Unknown';
}

export function formatManufacturer(manufacturer: FireAlarmManufacturer | undefined): string {
  const name = getManufacturerName(manufacturer);

  if (typeof manufacturer !== 'string' && manufacturer?.confidence != null) {
    return `${name} · ${Math.round(manufacturer.confidence * 100)}%`;
  }

  return name;
}

export function formatLocation(point?: FireAlarmDevicePoint | null): string {
  if (!point) {
    return 'No position';
  }

  return `${point.x.toFixed(1)}, ${point.y.toFixed(1)} m`;
}

export function formatConfidence(confidence?: number | null): string {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    return '';
  }

  return `${Math.round(confidence * 100)}% confidence`;
}

/**
 * Whether a detection already reads as fire alarm equipment, so the
 * auto-identify action only touches the rows that need a human.
 */
export function inferDeviceIdentification(device: FireAlarmDeviceDetection): boolean {
  if (device.identifiedByUser === true) {
    return true;
  }

  if (device.type && device.type !== 'unknown') {
    return true;
  }

  const manufacturer = getManufacturerName(device.manufacturer).toLowerCase();

  if (manufacturer && manufacturer !== 'unknown') {
    return true;
  }

  return /panel|detector|sounder|interface|io[_\s]?unit|vad/.test(
    device.label?.toLowerCase() ?? '',
  );
}

/**
 * Merges a fresh detection list into the one already on screen. Anything the
 * engineer has edited wins over what the scanner reports.
 */
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
      type:
        existingDevice.identifiedByUser && existingDevice.type
          ? existingDevice.type
          : incomingDevice.type,
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
  const remainingExisting = existingDevices.filter((device) => !incomingIds.has(device.id));

  return [...merged, ...remainingExisting];
}

/** Rebuilds a session so its counts match the current device list. */
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

export function countIdentifiedDevices(devices: FireAlarmDeviceDetection[]): number {
  return devices.filter((device) => device.identifiedByUser).length;
}

export function countUnidentifiedDevices(devices: FireAlarmDeviceDetection[]): number {
  return devices.filter((device) => device.identifiedByUser !== true).length;
}

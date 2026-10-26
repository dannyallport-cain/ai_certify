import type { FireAlarmDeviceDetection, FireAlarmDeviceType } from '../types';
import type { Plan3DMounting, Plan3DVertex } from './plan3d-types';
import type { Plan3DPlacedDevice } from './room-types';
import { boundsOfVertices, clamp, finaliseBounds, isFiniteNumber, lerp } from './geometry';

interface MountingDefault {
  heightMeters: number;
  mounting: Plan3DMounting;
}

const MOUNTING_DEFAULTS: Record<FireAlarmDeviceType, MountingDefault> = {
  panel: { heightMeters: 1.3, mounting: 'wall' },
  sounder: { heightMeters: 2.2, mounting: 'wall' },
  detector: { heightMeters: 0, mounting: 'ceiling' },
  interface: { heightMeters: 1.5, mounting: 'wall' },
  io_unit: { heightMeters: 1.5, mounting: 'wall' },
  vad: { heightMeters: 2.3, mounting: 'wall' },
  unknown: { heightMeters: 1.6, mounting: 'wall' },
};

const UNKNOWN_MOUNTING: MountingDefault = MOUNTING_DEFAULTS.unknown;

const MIN_DEVICE_HEIGHT_METERS = 0.05;
const CEILING_SNAP_MARGIN_METERS = 0.3;
const SYNTHETIC_INSET_RATIO = 0.18;
const OUT_OF_BOUNDS_MARGIN_METERS = 0.25;

function getMountingDefault(type: FireAlarmDeviceType): MountingDefault {
  return MOUNTING_DEFAULTS[type] ?? UNKNOWN_MOUNTING;
}

/**
 * Reads the surface the inspector picked in the placement view. An explicit choice outranks the
 * per-type defaults, so a detector deliberately put on a wall is not snapped back to the ceiling.
 */
export function readDeclaredMounting(device: FireAlarmDeviceDetection): Plan3DMounting | null {
  const declared = device.metadata?.mounting;

  return declared === 'floor' || declared === 'wall' || declared === 'ceiling' ? declared : null;
}

/** Resolves a device's installed height, falling back to the type's typical mounting height. */
export function resolveDeviceHeightMeters(
  device: FireAlarmDeviceDetection,
  roomHeightMeters: number,
): number {
  const declared = readDeclaredMounting(device);

  if (declared === 'ceiling') {
    return roomHeightMeters;
  }

  if (declared === 'floor') {
    return MIN_DEVICE_HEIGHT_METERS;
  }

  const fallback = getMountingDefault(device.type);
  const candidate = device.location?.z;

  if (isFiniteNumber(candidate) && candidate > MIN_DEVICE_HEIGHT_METERS) {
    return clamp(candidate, MIN_DEVICE_HEIGHT_METERS, roomHeightMeters);
  }

  if (fallback.mounting === 'ceiling') {
    return roomHeightMeters;
  }

  return clamp(fallback.heightMeters, MIN_DEVICE_HEIGHT_METERS, roomHeightMeters);
}

export function resolveDeviceMounting(
  device: FireAlarmDeviceDetection,
  heightMeters: number,
  roomHeightMeters: number,
): Plan3DMounting {
  const declared = readDeclaredMounting(device);

  if (declared) {
    return declared;
  }

  if (device.type === 'detector' || heightMeters >= roomHeightMeters - CEILING_SNAP_MARGIN_METERS) {
    return 'ceiling';
  }

  if (device.type === 'panel' || device.type === 'interface' || device.type === 'io_unit') {
    return heightMeters <= 0.4 ? 'floor' : 'wall';
  }

  return getMountingDefault(device.type).mounting;
}

interface FootprintRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function footprintRect(footprint: Plan3DVertex[]): FootprintRect | null {
  if (footprint.length < 3) {
    return null;
  }

  const bounds = finaliseBounds(boundsOfVertices(footprint));

  if (bounds.maxX - bounds.minX < 1e-3 || bounds.maxY - bounds.minY < 1e-3) {
    return null;
  }

  return { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY };
}

function rawDevicePositions(
  devices: FireAlarmDeviceDetection[],
): ({ x: number; y: number } | null)[] {
  return devices.map((device) => {
    const location = device.location;

    if (!location || !isFiniteNumber(location.x) || !isFiniteNumber(location.y)) {
      return null;
    }

    return { x: location.x, y: location.y };
  });
}

/**
 * Distributes devices that have no usable absolute position across the footprint so each one
 * still appears on the plan, spread on a deterministic lattice.
 */
function fallbackPositions(rect: FootprintRect, count: number): { x: number; y: number }[] {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const width = rect.maxX - rect.minX;
  const height = rect.maxY - rect.minY;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      x: rect.minX + width * ((column + 1) / (columns + 1)),
      y: rect.minY + height * ((row + 1) / (rows + 1)),
    };
  });
}

/** Re-scales captured device coordinates into a synthesized footprint. */
function remapIntoFootprint(
  positions: ({ x: number; y: number } | null)[],
  rect: FootprintRect,
): { x: number; y: number }[] {
  const known = positions.filter(
    (position): position is { x: number; y: number } => position !== null,
  );

  if (known.length === 0) {
    return fallbackPositions(rect, positions.length);
  }

  const minX = known.reduce((lowest, position) => Math.min(lowest, position.x), Number.POSITIVE_INFINITY);
  const maxX = known.reduce((highest, position) => Math.max(highest, position.x), Number.NEGATIVE_INFINITY);
  const minY = known.reduce((lowest, position) => Math.min(lowest, position.y), Number.POSITIVE_INFINITY);
  const maxY = known.reduce((highest, position) => Math.max(highest, position.y), Number.NEGATIVE_INFINITY);

  const insetX = (rect.maxX - rect.minX) * SYNTHETIC_INSET_RATIO;
  const insetY = (rect.maxY - rect.minY) * SYNTHETIC_INSET_RATIO;
  const targetMinX = rect.minX + insetX;
  const targetMaxX = rect.maxX - insetX;
  const targetMinY = rect.minY + insetY;
  const targetMaxY = rect.maxY - insetY;

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const fallbacks = fallbackPositions(rect, positions.length);

  return positions.map((position, index) => {
    if (!position) {
      return fallbacks[index];
    }

    const ratioX = spanX < 1e-3 ? 0.5 : (position.x - minX) / spanX;
    const ratioY = spanY < 1e-3 ? 0.5 : (position.y - minY) / spanY;

    return {
      x: lerp(targetMinX, targetMaxX, clamp(ratioX, 0, 1)),
      y: lerp(targetMinY, targetMaxY, clamp(ratioY, 0, 1)),
    };
  });
}

function clampIntoFootprint(position: { x: number; y: number }, rect: FootprintRect) {
  return {
    x: clamp(position.x, rect.minX, rect.maxX),
    y: clamp(position.y, rect.minY, rect.maxY),
  };
}

export interface PlaceDevicesInput {
  devices: FireAlarmDeviceDetection[];
  footprint: Plan3DVertex[];
  roomHeightMeters: number;
  synthesized: boolean;
  coordinateScale: number;
}

/** Resolves every device in a room into a world position on the generated plan. */
export function placeDevicesInRoom(input: PlaceDevicesInput): Plan3DPlacedDevice[] {
  const { devices, footprint, roomHeightMeters, synthesized, coordinateScale } = input;

  if (devices.length === 0) {
    return [];
  }

  const rect = footprintRect(footprint);

  if (!rect) {
    return devices.map((device) => {
      const heightMeters = resolveDeviceHeightMeters(device, roomHeightMeters);

      return {
        device,
        worldPosition: { x: 0, y: 0, z: heightMeters },
        mounting: resolveDeviceMounting(device, heightMeters, roomHeightMeters),
        inferredPosition: true,
      };
    });
  }

  const scaledPositions = rawDevicePositions(devices).map((position) =>
    position ? { x: position.x * coordinateScale, y: position.y * coordinateScale } : null,
  );

  const lattice = fallbackPositions(rect, devices.length);

  const positions = synthesized
    ? remapIntoFootprint(scaledPositions, rect)
    : scaledPositions.map((position, index) => {
        if (!position) {
          return lattice[index];
        }

        const withinBounds =
          position.x >= rect.minX - OUT_OF_BOUNDS_MARGIN_METERS &&
          position.x <= rect.maxX + OUT_OF_BOUNDS_MARGIN_METERS &&
          position.y >= rect.minY - OUT_OF_BOUNDS_MARGIN_METERS &&
          position.y <= rect.maxY + OUT_OF_BOUNDS_MARGIN_METERS;

        return withinBounds ? position : clampIntoFootprint(position, rect);
      });

  return devices.map((device, index) => {
    const heightMeters = resolveDeviceHeightMeters(device, roomHeightMeters);
    const position = positions[index];
    const hasCapturedPosition = scaledPositions[index] !== null;

    return {
      device,
      worldPosition: { x: position.x, y: position.y, z: heightMeters },
      mounting: resolveDeviceMounting(device, heightMeters, roomHeightMeters),
      inferredPosition: !hasCapturedPosition || synthesized,
    };
  });
}

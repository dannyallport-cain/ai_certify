import type { FireAlarmDeviceType } from '../types';
import type {
  Plan3DMounting,
  Plan3DPickSurfaceKind,
  Plan3DProjection,
} from './plan3d-types';

/**
 * What each device type may be fixed to, and how the plan should be aimed so the inspector can
 * tap that surface. A detector belongs on the ceiling, so asking for one puts the camera in plan
 * view; a panel belongs on a wall, so the camera drops to a near-elevation where wall faces are
 * tappable. Keeping this in one table stops the placement view and the modal from disagreeing.
 */

export interface Plan3DMountingOption {
  mounting: Plan3DMounting;
  label: string;
  description: string;
}

export interface Plan3DMountingCamera {
  projection: Plan3DProjection;
  yawDegrees: number;
  pitchDegrees: number;
}

/** Height of a device sitting in the ceiling void, measured from the finished ceiling upwards. */
export const CEILING_VOID_OFFSET_METERS = 0.45;

const MOUNTING_LABELS: Record<Plan3DMounting, string> = {
  floor: 'Floor',
  wall: 'Wall',
  ceiling: 'Ceiling',
  ceiling_void: 'Ceiling void',
  unknown: 'Unplaced',
};

const MOUNTING_DESCRIPTIONS: Record<Plan3DMounting, string> = {
  floor: 'Standing on the floor',
  wall: 'Fixed to a wall face',
  ceiling: 'Fixed to the ceiling, head in the room',
  ceiling_void: 'Above the ceiling, inside the void',
  unknown: 'Not placed yet',
};

const SURFACE_KINDS_BY_MOUNTING: Record<Plan3DMounting, Plan3DPickSurfaceKind[]> = {
  floor: ['floor'],
  wall: ['wall'],
  ceiling: ['ceiling'],
  ceiling_void: ['ceiling_void'],
  unknown: ['floor', 'wall', 'ceiling'],
};

/**
 * Mountings offered per device type, most typical first. A detector leads with the ceiling and
 * still allows the void; a panel and an interface are wall only; a sounder is happy either way.
 */
const MOUNTINGS_BY_TYPE: Record<FireAlarmDeviceType, Plan3DMounting[]> = {
  detector: ['ceiling', 'ceiling_void', 'wall'],
  sounder: ['wall', 'ceiling'],
  panel: ['wall'],
  interface: ['wall'],
  io_unit: ['wall'],
  vad: ['wall', 'ceiling'],
  unknown: ['wall', 'ceiling', 'ceiling_void', 'floor'],
};

const CAMERA_BY_MOUNTING: Record<Plan3DMounting, Plan3DMountingCamera> = {
  // Straight down: the ceiling and the floor share an outline, so the only thing to aim at is
  // where in the room the device sits.
  ceiling: { projection: 'top-down', yawDegrees: 0, pitchDegrees: 90 },
  ceiling_void: { projection: 'top-down', yawDegrees: 0, pitchDegrees: 90 },
  floor: { projection: 'top-down', yawDegrees: 0, pitchDegrees: 90 },
  // Near-elevation: wall faces are square to the camera, so a tap picks the wall and the height.
  wall: { projection: 'isometric', yawDegrees: 0, pitchDegrees: 12 },
  unknown: { projection: 'isometric', yawDegrees: 45, pitchDegrees: 30 },
};

export function getMountingLabel(mounting: Plan3DMounting): string {
  return MOUNTING_LABELS[mounting] ?? MOUNTING_LABELS.unknown;
}

export function getMountingDescription(mounting: Plan3DMounting): string {
  return MOUNTING_DESCRIPTIONS[mounting] ?? MOUNTING_DESCRIPTIONS.unknown;
}

export function isCeilingVoidMounting(mounting: Plan3DMounting | null | undefined): boolean {
  return mounting === 'ceiling_void';
}

/** The mountings offered for a device type, in the order they should be presented. */
export function getMountingOptions(type: FireAlarmDeviceType): Plan3DMountingOption[] {
  const mountings = MOUNTINGS_BY_TYPE[type] ?? MOUNTINGS_BY_TYPE.unknown;

  return mountings.map((mounting) => ({
    mounting,
    label: getMountingLabel(mounting),
    description: getMountingDescription(mounting),
  }));
}

/** The mounting a type is normally installed with — the first option in its list. */
export function getDefaultMounting(type: FireAlarmDeviceType): Plan3DMounting {
  return getMountingOptions(type)[0]?.mounting ?? 'wall';
}

export function getMountingSurfaceKinds(mounting: Plan3DMounting): Plan3DPickSurfaceKind[] {
  return SURFACE_KINDS_BY_MOUNTING[mounting] ?? SURFACE_KINDS_BY_MOUNTING.unknown;
}

/** Union of the pick targets for several mountings, de-duplicated and in canonical order. */
export function getSurfaceKindsForMountings(
  mountings: Plan3DMounting[],
): Plan3DPickSurfaceKind[] {
  const order: Plan3DPickSurfaceKind[] = ['floor', 'wall', 'ceiling', 'ceiling_void'];
  const wanted = new Set<Plan3DPickSurfaceKind>();

  mountings.forEach((mounting) => {
    getMountingSurfaceKinds(mounting).forEach((kind) => wanted.add(kind));
  });

  return order.filter((kind) => wanted.has(kind));
}

/** The camera view that makes a mounting's surface easiest to tap. */
export function getMountingCamera(mounting: Plan3DMounting): Plan3DMountingCamera {
  return CAMERA_BY_MOUNTING[mounting] ?? CAMERA_BY_MOUNTING.unknown;
}

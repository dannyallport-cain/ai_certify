import { getZoneColour } from './palette';
import type {
  BuildingDesign,
  DesignArea,
  DesignAreaKind,
  DesignDevice,
  DesignFloor,
  DesignFloorKind,
  DesignMounting,
  DesignPoint,
  DesignPolygon,
  DesignSheet,
  DesignZone,
} from './types';
import { DESIGN_SCHEMA_VERSION } from './types';
import { getDeviceDefinition } from './device-catalogue';

/**
 * Construction helpers for a new design.
 *
 * Ids are generated here rather than by the database because the editor creates floors, zones
 * and devices offline and only syncs on save: a stable client id keeps undo history and the
 * selection valid across a round trip.
 */

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createFloorId(): string {
  return createId('floor');
}

export function createRoomId(): string {
  return createId('room');
}

export function createZoneId(): string {
  return createId('zone');
}

export function createAreaId(): string {
  return createId('area');
}

export function createDeviceId(): string {
  return createId('dev');
}

export const DEFAULT_SHEET: DesignSheet = {
  title: 'Fire alarm zone plan',
  siteName: '',
  siteAddress: '',
  jobReference: '',
  revision: 'A',
  preparedBy: '',
  preparedOn: '',
  companyName: '',
  companyPhone: '',
  companyEmail: '',
  accreditation: '',
  notes: '',
  scaleNote: '',
  showZoneLegend: true,
  showDeviceLegend: true,
  showGrid: true,
};

export const DEFAULT_FLOOR_HEIGHT_METERS = 2.7;

export const AREA_KIND_LABELS: Record<DesignAreaKind, string> = {
  car_park: 'Car park',
  compound: 'Compound',
  yard: 'Yard',
  bin_store: 'Bin store',
  plant: 'Plant area',
  canopy: 'Canopy',
  loading_bay: 'Loading bay',
  garden: 'Garden',
  other: 'Area',
};

export const AREA_KIND_COLOURS: Record<DesignAreaKind, string> = {
  car_park: '#94A3B8',
  compound: '#A8A29E',
  yard: '#A8A29E',
  bin_store: '#78716C',
  plant: '#78716C',
  canopy: '#CBD5E1',
  loading_bay: '#94A3B8',
  garden: '#86EFAC',
  other: '#CBD5E1',
};

export const FLOOR_KIND_LABELS: Record<DesignFloorKind, string> = {
  ground: 'Ground floor',
  upper: 'Upper floor',
  basement: 'Basement',
  mezzanine: 'Mezzanine',
  external: 'External',
};

export const MOUNTING_LABELS: Record<DesignMounting, string> = {
  ceiling: 'Ceiling',
  ceiling_void: 'Ceiling void',
  wall: 'Wall',
  floor: 'Floor',
  external: 'External',
};

interface CreateFloorInput {
  name?: string;
  kind?: DesignFloorKind;
  level?: number;
  elevationMeters?: number;
  heightMeters?: number;
  manual?: boolean;
  sourceSessionId?: string | null;
}

export function createFloor(input: CreateFloorInput = {}): DesignFloor {
  const level = input.level ?? 0;
  const kind = input.kind ?? (level === 0 ? 'ground' : level > 0 ? 'upper' : 'basement');

  return {
    id: createFloorId(),
    name: input.name ?? defaultFloorName(kind, level),
    kind,
    level,
    elevationMeters: input.elevationMeters ?? level * DEFAULT_FLOOR_HEIGHT_METERS,
    heightMeters: input.heightMeters ?? DEFAULT_FLOOR_HEIGHT_METERS,
    rooms: [],
    sourceSessionId: input.sourceSessionId ?? null,
    manual: input.manual ?? true,
    notes: null,
  };
}

export function defaultFloorName(kind: DesignFloorKind, level: number): string {
  if (kind === 'ground') {
    return 'Ground floor';
  }

  if (kind === 'basement') {
    return level === -1 ? 'Basement' : `Basement ${Math.abs(level)}`;
  }

  if (kind === 'mezzanine') {
    return 'Mezzanine';
  }

  if (kind === 'external') {
    return 'External';
  }

  return level === 1 ? 'First floor' : `Floor ${level}`;
}

interface CreateZoneInput {
  floorId: string;
  /** One or more parts; a compartment is allowed to be disjoint or L-shaped. */
  regions: DesignPolygon[];
  existing: DesignZone[];
  name?: string;
  reference?: string;
  colour?: string;
  opacity?: number;
  /** Extra storeys the compartment continues through, e.g. the floors of a stair or shaft. */
  spansFloorIds?: string[];
  /** Zone this one sits inside, when it is a shaft within a plate. */
  parentZoneId?: string | null;
}

/** Next free `Z<n>` across the whole design, so references never collide between floors. */
export function nextZoneReference(existing: DesignZone[]): string {
  const used = new Set(existing.map((zone) => zone.reference.trim().toUpperCase()));
  let index = existing.length + 1;

  while (used.has(`Z${index}`)) {
    index += 1;
  }

  return `Z${index}`;
}

export function createZone(input: CreateZoneInput): DesignZone {
  const reference = input.reference?.trim() || nextZoneReference(input.existing);

  return {
    id: createZoneId(),
    floorId: input.floorId,
    name: input.name?.trim() || `Zone ${reference}`,
    reference,
    colour: input.colour || getZoneColour(input.existing.length),
    opacity: input.opacity ?? 0.22,
    regions: input.regions.filter((region) => region.length >= 3),
    spansFloorIds: (input.spansFloorIds ?? []).filter((id) => id && id !== input.floorId),
    parentZoneId: input.parentZoneId ?? null,
    notes: null,
  };
}

interface CreateAreaInput {
  floorId: string;
  polygon: DesignPolygon;
  kind?: DesignAreaKind;
  name?: string;
  colour?: string;
}

export function createArea(input: CreateAreaInput): DesignArea {
  const kind = input.kind ?? 'other';

  return {
    id: createAreaId(),
    floorId: input.floorId,
    kind,
    name: input.name?.trim() || AREA_KIND_LABELS[kind],
    colour: input.colour || AREA_KIND_COLOURS[kind],
    polygon: input.polygon,
    notes: null,
  };
}

interface CreateDeviceInput {
  floorId: string;
  kind: string;
  position: DesignPoint;
  label?: string;
  zoneId?: string | null;
  mounting?: DesignMounting;
  fromCapture?: boolean;
}

export function createDevice(input: CreateDeviceInput): DesignDevice {
  const definition = getDeviceDefinition(input.kind);

  return {
    id: createDeviceId(),
    floorId: input.floorId,
    kind: definition.kind,
    label: input.label?.trim() ?? '',
    position: input.position,
    mounting: input.mounting ?? definition.defaultMounting,
    zoneId: input.zoneId ?? null,
    rotation: 0,
    address: null,
    notes: null,
    fromCapture: input.fromCapture ?? false,
  };
}

/** A brand new, empty design with a single ground floor ready to draw on. */
export function createEmptyDesign(name = 'New design'): BuildingDesign {
  const groundFloor = createFloor({ kind: 'ground', level: 0 });

  return {
    id: createId('design'),
    name,
    sourceSessionId: null,
    floors: [groundFloor],
    zones: [],
    devices: [],
    areas: [],
    sheet: { ...DEFAULT_SHEET },
    version: DESIGN_SCHEMA_VERSION,
  };
}

/** Floors sorted by storey so the switcher always reads bottom to top. */
export function sortFloors(floors: DesignFloor[]): DesignFloor[] {
  return [...floors].sort((left, right) => left.level - right.level || left.name.localeCompare(right.name));
}

/** The next storey index above the highest existing floor. */
export function nextLevel(floors: DesignFloor[]): number {
  return floors.reduce((highest, floor) => Math.max(highest, floor.level), 0) + 1;
}

import { normalisePolygon, pointInPolygon, polygonArea, polygonFromRect } from '../geometry';
import { zoneFloorIds, zoneRegions, zonesOnFloor } from '../zones';
import type {
  BuildingDesign,
  DesignArea,
  DesignDevice,
  DesignFloor,
  DesignPolygon,
  DesignRoom,
  DesignSheet,
  DesignZone,
} from '../types';
import { DESIGN_SCHEMA_VERSION } from '../types';
import { getDeviceDefinition } from '../device-catalogue';
import {
  DEMO_BLOCK_DEPTH_METERS,
  DEMO_BLOCK_WIDTH_METERS,
  DEMO_BLUEPRINT_SOURCE,
  DEMO_CORRIDOR_DEPTH_METERS,
  DEMO_FIRST_DEVICES,
  DEMO_FIRST_FLOOR_ID,
  DEMO_FIRST_ROOMS,
  DEMO_FIRST_ZONES,
  DEMO_GROUND_AREAS,
  DEMO_GROUND_DEVICES,
  DEMO_GROUND_FLOOR_ID,
  DEMO_GROUND_ROOMS,
  DEMO_GROUND_ZONES,
  type BlueprintArea,
  type BlueprintDevice,
  type BlueprintRoom,
  type BlueprintZone,
} from './blueprint';

/**
 * Builds the demonstration design from the measured blueprint.
 *
 * Everything here is deterministic: ids are derived from names and references rather than
 * generated, so the plan a visitor opens is the same one the smoke test asserts and the
 * documentation describes. There is no database involved — the design is a plain `BuildingDesign`,
 * which is what lets `/designs/demo` render the real studio against it.
 */

export const DEMO_DESIGN_ID = 'design-demo-brookfield';
export const DEMO_DESIGN_NAME = 'Brookfield House — demonstration plan';

/** Storey height on both floors, so the stair core lines up in a future 3D read. */
const DEMO_FLOOR_HEIGHT_METERS = 2.7;

type FloorKey = 'ground' | 'first';

interface FloorBlueprint {
  key: FloorKey;
  id: string;
  name: string;
  level: number;
  rooms: BlueprintRoom[];
  zones: BlueprintZone[];
  devices: BlueprintDevice[];
}

const FLOOR_BLUEPRINTS: FloorBlueprint[] = [
  {
    key: 'ground',
    id: DEMO_GROUND_FLOOR_ID,
    name: 'Ground floor',
    level: 0,
    rooms: DEMO_GROUND_ROOMS,
    zones: DEMO_GROUND_ZONES,
    devices: DEMO_GROUND_DEVICES,
  },
  {
    key: 'first',
    id: DEMO_FIRST_FLOOR_ID,
    name: 'First floor',
    level: 1,
    rooms: DEMO_FIRST_ROOMS,
    zones: DEMO_FIRST_ZONES,
    devices: DEMO_FIRST_DEVICES,
  },
];

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function roomId(floorKey: FloorKey, name: string): string {
  return `room-demo-${floorKey}-${slug(name)}`;
}

function roomPolygon(room: BlueprintRoom): DesignPolygon {
  return polygonFromRect({
    minX: room.x,
    minY: room.y,
    maxX: room.x + room.width,
    maxY: room.y + room.depth,
  });
}

function buildRooms(blueprint: FloorBlueprint): DesignRoom[] {
  return blueprint.rooms.map((room) => ({
    id: roomId(blueprint.key, room.name),
    name: room.name,
    polygon: roomPolygon(room),
    open: room.open ?? false,
    notes: null,
  }));
}

function buildFloor(blueprint: FloorBlueprint): DesignFloor {
  return {
    id: blueprint.id,
    name: blueprint.name,
    kind: blueprint.level === 0 ? 'ground' : 'upper',
    level: blueprint.level,
    elevationMeters: blueprint.level * DEMO_FLOOR_HEIGHT_METERS,
    heightMeters: DEMO_FLOOR_HEIGHT_METERS,
    rooms: buildRooms(blueprint),
    sourceSessionId: null,
    // Drawn from a published plan rather than captured with RoomPlan.
    manual: true,
    notes: null,
  };
}

/**
 * Turns one zone of the blueprint into a compartment.
 *
 * Regions come from the room outlines the zone names, so a multi-region compartment is simply a
 * zone that names several rooms. The parent is resolved by reference in a second pass, because a
 * blueprint may name a parent declared later in the list.
 */
function buildZone(blueprint: FloorBlueprint, zone: BlueprintZone): DesignZone {
  const regions = zone.roomNames
    .map((name) => blueprint.rooms.find((room) => room.name === name))
    .filter((room): room is BlueprintRoom => Boolean(room))
    .map((room) => roomPolygon(room));

  if (zone.extraRegion) {
    regions.push(roomPolygon(zone.extraRegion));
  }

  const cleaned = regions
    .map((region) => normalisePolygon(region))
    .filter((region) => polygonArea(region) > 0);

  return {
    id: `zone-demo-${slug(zone.reference)}`,
    floorId: blueprint.id,
    name: zone.name,
    reference: zone.reference,
    colour: zone.colour,
    opacity: zone.opacity,
    regions: cleaned,
    spansFloorIds: (zone.spans ?? [])
      .map((key) => FLOOR_BLUEPRINTS.find((entry) => entry.key === key)?.id ?? null)
      .filter((id): id is string => Boolean(id) && id !== blueprint.id),
    parentZoneId: null,
    notes: zone.notes ?? null,
  };
}

/** Resolves every blueprint `parentReference` into a real zone id once all zones exist. */
function linkZoneParents(zones: DesignZone[], blueprints: FloorBlueprint[]): DesignZone[] {
  const idByReference = new Map(
    zones.map((zone) => [zone.reference.trim().toUpperCase(), zone.id]),
  );

  const parentByZone = new Map<string, string | null>();

  blueprints.forEach((blueprint) => {
    blueprint.zones.forEach((zone) => {
      const parentId = zone.parentReference
        ? idByReference.get(zone.parentReference.trim().toUpperCase()) ?? null
        : null;

      parentByZone.set(`zone-demo-${slug(zone.reference)}`, parentId);
    });
  });

  return zones.map((zone) => {
    const parentZoneId = parentByZone.get(zone.id) ?? null;

    return parentZoneId && parentZoneId !== zone.id ? { ...zone, parentZoneId } : zone;
  });
}

/** Nesting depth, used to prefer a shaft over the floor plate it sits inside. */
function nestingDepth(zones: DesignZone[], zone: DesignZone): number {
  let depth = 0;
  let cursor: DesignZone | undefined = zone;

  while (cursor?.parentZoneId && depth < 8) {
    cursor = zones.find((candidate) => candidate.id === cursor?.parentZoneId);

    if (!cursor) {
      break;
    }

    depth += 1;
  }

  return depth;
}

/**
 * Assigns each device to the compartment containing it, mirroring the rule the editor applies
 * when a device is dropped: the deepest compartment wins, then the simplest.
 */
function sealDevices(devices: DesignDevice[], zones: DesignZone[]): DesignDevice[] {
  return devices.map((device) => {
    const owner = zonesOnFloor(zones, device.floorId)
      .filter((zone) => zoneRegions(zone).some((region) => pointInPolygon(device.position, region)))
      .sort(
        (left, right) =>
          nestingDepth(zones, right) - nestingDepth(zones, left) ||
          zoneRegions(left).length - zoneRegions(right).length,
      )[0];

    return { ...device, zoneId: owner?.id ?? null };
  });
}

/** Loop address for a device, numbered per storey in the order the blueprint lists them. */
function deviceAddress(floorKey: FloorKey, index: number): string {
  const loop = floorKey === 'ground' ? 1 : 2;

  return `L${loop}-${String(index + 1).padStart(2, '0')}`;
}

/**
 * Device labels.
 *
 * A zone plan prints a short annotation beside every symbol, not the device's full name — the
 * legend already says what a circle with an S is. The loop address is the annotation, which is
 * what a surveyor reads off the sheet to find the device on the panel, and it keeps 55 symbols on
 * one storey readable. Only the devices worth naming on the drawing (the panel, the entrance call
 * point, the riser) carry their own label.
 */
function buildDevices(blueprint: FloorBlueprint): DesignDevice[] {
  return blueprint.devices.map((device, index) => {
    const definition = getDeviceDefinition(device.kind);
    const address = deviceAddress(blueprint.key, index);

    return {
      id: `device-demo-${blueprint.key}-${String(index + 1).padStart(2, '0')}`,
      floorId: blueprint.id,
      kind: definition.kind,
      label: device.label ?? address,
      position: { x: device.x, y: device.y },
      mounting: device.mounting ?? definition.defaultMounting,
      zoneId: null,
      rotation: device.rotation ?? 0,
      address,
      notes: device.notes ?? null,
      fromCapture: false,
    };
  });
}

function buildArea(blueprint: BlueprintArea): DesignArea {
  return {
    id: `area-demo-${slug(blueprint.name)}`,
    floorId: DEMO_GROUND_FLOOR_ID,
    kind: blueprint.kind,
    name: blueprint.name,
    colour: '',
    polygon: roomPolygon(blueprint),
    notes: null,
  };
}

const DEMO_SHEET: DesignSheet = {
  title: 'Fire alarm zone plan — demonstration',
  siteName: 'Brookfield House',
  siteAddress: 'Demonstration building, 30 m × 14 m over two storeys',
  jobReference: 'DEMO-001',
  revision: 'A',
  preparedBy: 'Design studio demonstration',
  preparedOn: '2026-01-01',
  companyName: '',
  companyPhone: '',
  companyEmail: '',
  accreditation: '',
  notes:
    'Worked example drawn from a published architectural plan. Devices, zones and external areas are all editable — change anything, then save a copy to keep your own version.',
  scaleNote: '1:100 @ A3',
  showZoneLegend: true,
  showDeviceLegend: true,
  showGrid: true,
};

/**
 * The demonstration building, ready to open in the studio.
 *
 * One 30 m × 14 m floor plate over two storeys, a spine corridor with rooms either side, a stair
 * core that is one compartment across both storeys, a riser nested inside the ground floor
 * plant-room zone, 13 zones, and a full device set: panel, repeater, detection (optical, heat, CO,
 * aspirating), call points, sounders, beacons, VADs, interfaces, a door holder and yard devices.
 */
export function createDemoDesign(): BuildingDesign {
  const floors = FLOOR_BLUEPRINTS.map(buildFloor);
  const zones = linkZoneParents(
    FLOOR_BLUEPRINTS.flatMap((blueprint) =>
      blueprint.zones.map((zone) => buildZone(blueprint, zone)),
    ),
    FLOOR_BLUEPRINTS,
  );

  return {
    id: DEMO_DESIGN_ID,
    name: DEMO_DESIGN_NAME,
    sourceSessionId: null,
    floors,
    zones,
    devices: sealDevices(FLOOR_BLUEPRINTS.flatMap(buildDevices), zones),
    areas: DEMO_GROUND_AREAS.map(buildArea),
    sheet: { ...DEMO_SHEET },
    version: DESIGN_SCHEMA_VERSION,
  };
}

export interface DemoDesignSummary {
  floors: number;
  zones: number;
  devices: number;
  areas: number;
  floorAreaSquareMeters: number;
  zoneCoverageRatio: number;
  verticalZones: number;
  nestedZones: number;
}

/**
 * What the demonstration contains, used by the designs page card and by the documentation, so the
 * numbers quoted can never drift from the plan itself.
 */
export function summariseDemoDesign(design: BuildingDesign): DemoDesignSummary {
  const areaOf = (regions: DesignPolygon[]): number =>
    regions.reduce((total, region) => total + polygonArea(region), 0);

  const floorArea = design.floors.reduce(
    (total, floor) => total + floor.rooms.reduce((sum, room) => sum + polygonArea(room.polygon), 0),
    0,
  );

  /**
   * A vertical compartment is drawn once and projected onto every storey it covers, so its
   * footprint counts once per storey when measuring how much of the building is zoned.
   */
  const projectedArea = (zone: DesignZone): number =>
    areaOf(zoneRegions(zone)) * zoneFloorIds(zone).length;

  // A nested compartment sits inside its parent's fill, so counting both would double the area.
  const nestedArea = design.zones
    .filter((zone) => Boolean(zone.parentZoneId))
    .reduce((total, zone) => total + projectedArea(zone), 0);

  const zonedArea = design.zones.reduce((total, zone) => total + projectedArea(zone), 0);

  return {
    floors: design.floors.length,
    zones: design.zones.length,
    devices: design.devices.length,
    areas: design.areas.length,
    floorAreaSquareMeters: Math.round(floorArea * 10) / 10,
    zoneCoverageRatio: floorArea > 0 ? Math.min(1, (zonedArea - nestedArea) / floorArea) : 0,
    verticalZones: design.zones.filter((zone) => zoneFloorIds(zone).length > 1).length,
    nestedZones: design.zones.filter((zone) => Boolean(zone.parentZoneId)).length,
  };
}

export {
  DEMO_BLOCK_DEPTH_METERS,
  DEMO_BLOCK_WIDTH_METERS,
  DEMO_BLUEPRINT_SOURCE,
  DEMO_CORRIDOR_DEPTH_METERS,
};

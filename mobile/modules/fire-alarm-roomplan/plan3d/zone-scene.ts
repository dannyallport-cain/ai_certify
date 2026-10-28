import type { FireAlarmDeviceType } from '../types';
import type {
  Plan3DCamera,
  Plan3DPoint,
  Plan3DVertex,
  Plan3DViewport,
  Plan3DText,
  Plan3DZone,
  Plan3DZoneDeviceCount,
  Plan3DZonePolygon,
  Plan3DZoneSummary,
} from './plan3d-types';
import type { Plan3DRoom } from './room-types';
import {
  boundsOfPoints2D,
  boundsOfVertices,
  createVertex,
  pointInPolygon,
} from './geometry';
import { getPlan3DDeviceStyle, PLAN3D_DEVICE_TYPE_ORDER } from './palette';
import { mapProjectedPoint, projectVertex } from './projection';
import { zoneAreaSquareMeters, zoneCentroid } from './zone-model';

const ZONE_FILL_OPACITY_BLUEPRINT = 0.2;
const ZONE_FILL_OPACITY_SCHEMATIC = 0.16;
const ZONE_STROKE_WIDTH = 1.8;
/** Zone labels sit just above the floor so walls and markers still draw over them. */
const ZONE_LABEL_HEIGHT_METERS = 0.02;

export interface WorldBounds2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Resolves which zone owns each device. A device belongs to the first zone whose polygon
 * contains its floor position, so overlapping zones never double count a device.
 */
export function assignDevicesToZones(
  zones: Plan3DZone[],
  rooms: Plan3DRoom[],
): { assignments: Map<string, string[]>; unassignedDeviceIds: string[] } {
  const assignments = new Map<string, string[]>();
  zones.forEach((zone) => assignments.set(zone.id, []));

  const unassignedDeviceIds: string[] = [];

  rooms.forEach((room) => {
    room.devices.forEach((placed) => {
      const position = { x: placed.worldPosition.x, y: placed.worldPosition.y };
      const owner = zones.find((zone) => pointInPolygon(position, zone.polygon));

      if (!owner) {
        unassignedDeviceIds.push(placed.device.id);
        return;
      }

      assignments.get(owner.id)?.push(placed.device.id);
    });
  });

  return { assignments, unassignedDeviceIds };
}

function collectDeviceTypes(rooms: Plan3DRoom[]): Map<string, FireAlarmDeviceType> {
  const types = new Map<string, FireAlarmDeviceType>();

  rooms.forEach((room) => {
    room.devices.forEach((placed) => {
      types.set(placed.device.id, placed.device.type);
    });
  });

  return types;
}

function countDevicesByZone(
  zones: Plan3DZone[],
  deviceTypes: Map<string, FireAlarmDeviceType>,
  assignments: Map<string, string[]>,
): Map<string, Plan3DZoneDeviceCount[]> {
  const counts = new Map<string, Plan3DZoneDeviceCount[]>();

  zones.forEach((zone) => {
    const byType = new Map<FireAlarmDeviceType, number>();

    (assignments.get(zone.id) ?? []).forEach((deviceId) => {
      const type = deviceTypes.get(deviceId) ?? 'unknown';
      byType.set(type, (byType.get(type) ?? 0) + 1);
    });

    const entries: Plan3DZoneDeviceCount[] = [];

    PLAN3D_DEVICE_TYPE_ORDER.forEach((type) => {
      const count = byType.get(type) ?? 0;

      if (count === 0) {
        return;
      }

      const style = getPlan3DDeviceStyle(type, null);

      entries.push({
        deviceType: type,
        label: style.label,
        glyph: style.glyph,
        colour: style.colour,
        count,
      });
    });

    counts.set(zone.id, entries);
  });

  return counts;
}

/** Per-zone roll-up consumed by the on-plan key, the printed legend and the hosted viewer. */
export function buildZoneSummaries(zones: Plan3DZone[], rooms: Plan3DRoom[]): {
  summaries: Plan3DZoneSummary[];
  unassignedDeviceCount: number;
} {
  const { assignments, unassignedDeviceIds } = assignDevicesToZones(zones, rooms);
  const devicesByZone = countDevicesByZone(zones, collectDeviceTypes(rooms), assignments);

  const summaries = zones.map((zone) => {
    const devices = devicesByZone.get(zone.id) ?? [];

    return {
      zoneId: zone.id,
      name: zone.name,
      reference: zone.reference,
      colour: zone.colour,
      areaSquareMeters: zoneAreaSquareMeters(zone),
      deviceCount: devices.reduce((total, entry) => total + entry.count, 0),
      devices,
    } satisfies Plan3DZoneSummary;
  });

  return { summaries, unassignedDeviceCount: unassignedDeviceIds.length };
}

/** Projects the zone outlines flat onto the floor plane for the current camera. */
export function buildZonePolygons(input: {
  zones: Plan3DZone[];
  camera: Plan3DCamera;
  viewport: Plan3DViewport;
  schematic: boolean;
}): Plan3DZonePolygon[] {
  const { zones, camera, viewport, schematic } = input;
  const fillOpacity = schematic ? ZONE_FILL_OPACITY_SCHEMATIC : ZONE_FILL_OPACITY_BLUEPRINT;

  return zones.map((zone) => {
    const floorVertices: Plan3DVertex[] = zone.polygon.map((point) => createVertex(point.x, point.y, 0));
    const points: Plan3DPoint[] = floorVertices.map((vertex) =>
      mapProjectedPoint(projectVertex(vertex, camera), viewport),
    );
    const depthTotal = floorVertices.reduce(
      (total, vertex) => total + projectVertex(vertex, camera).depth,
      0,
    );

    return {
      zoneId: zone.id,
      points,
      fill: zone.colour,
      fillOpacity,
      stroke: zone.colour,
      strokeWidth: ZONE_STROKE_WIDTH,
      depth: floorVertices.length > 0 ? depthTotal / floorVertices.length : 0,
    } satisfies Plan3DZonePolygon;
  });
}

/**
 * Zone reference labels. Each label sits at the centre of its zone and is tinted with the zone
 * colour, so the fill and the label read as one object on either colour scheme.
 */
export function buildZoneTexts(input: {
  zones: Plan3DZone[];
  camera: Plan3DCamera;
  viewport: Plan3DViewport;
}): Plan3DText[] {
  const { zones, camera, viewport } = input;

  return zones.reduce<Plan3DText[]>((texts, zone) => {
    if (zone.polygon.length < 3) {
      return texts;
    }

    const centre = zoneCentroid(zone.polygon);
    const projected = projectVertex(
      createVertex(centre.x, centre.y, ZONE_LABEL_HEIGHT_METERS),
      camera,
    );

    texts.push({
      id: `${zone.id}-label`,
      text: zone.reference,
      position: mapProjectedPoint(projected, viewport),
      colour: zone.colour,
      size: 11,
      align: 'center',
      depth: projected.depth,
      emphasis: 'strong',
    });

    return texts;
  }, []);
}

/** World-space bounds of every zone, used to fit the viewport and clamp the editor. */
export function zoneBounds(zones: Plan3DZone[]): WorldBounds2D | null {
  const points = zones.flatMap((zone) => zone.polygon);

  if (points.length === 0) {
    return null;
  }

  return boundsOfPoints2D(points);
}

/** World-space bounds of the captured geometry, which is what a new zone is drawn inside. */
export function roomsBounds(rooms: Plan3DRoom[]): WorldBounds2D {
  const bounds = boundsOfVertices(rooms.flatMap((room) => room.footprint));

  return {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
  };
}

import type { Plan3DPoint, Plan3DZone } from './plan3d-types';
import type { Plan3DRoom } from './room-types';
import { distance2D, pointInPolygon } from './geometry';
import {
  createZoneId,
  createZoneReference,
  getZoneColour,
  normaliseZonePolygon,
  rectangleZonePolygon,
} from './zone-model';

/** Hand-drawn zone vertex hit radius, in metres. Mirrors the editor's touch tolerance. */
const VERTEX_HIT_TOLERANCE_METERS = 0.25;

/**
 * "Auto zone" for a captured room. The zone outline is the room footprint itself, which is what
 * makes a generated zone line up with the diagram's own borders rather than an arbitrary box.
 */
export function createZoneFromRoom(room: Plan3DRoom, existing: Plan3DZone[]): Plan3DZone | null {
  const polygon = normaliseZonePolygon(room.footprint.map((vertex) => ({ x: vertex.x, y: vertex.y })));

  if (polygon.length < 3) {
    return null;
  }

  const reference = createZoneReference(existing);

  return {
    id: createZoneId(),
    name: room.name,
    reference,
    colour: getZoneColour(existing.length),
    polygon,
    notes: null,
  };
}

/** One zone per captured room, so a plan can be colour coded in a single action. */
export function createZonesFromRooms(rooms: Plan3DRoom[]): Plan3DZone[] {
  return rooms.reduce<Plan3DZone[]>((zones, room) => {
    const zone = createZoneFromRoom(room, zones);

    return zone ? [...zones, zone] : zones;
  }, []);
}

/** Rectangle defined by a drag between two floor points, in world metres. */
export function createZoneFromRectangle(
  start: Plan3DPoint,
  end: Plan3DPoint,
  existing: Plan3DZone[],
  name?: string,
): Plan3DZone | null {
  const polygon = rectangleZonePolygon(start, end);

  if (polygon.length < 3) {
    return null;
  }

  const reference = createZoneReference(existing);

  return {
    id: createZoneId(),
    name: name?.trim() || `Zone ${reference}`,
    reference,
    colour: getZoneColour(existing.length),
    polygon,
    notes: null,
  };
}

/** The zone whose polygon contains the given floor point, last-defined first. */
export function findZoneAtPoint(zones: Plan3DZone[], point: Plan3DPoint): Plan3DZone | null {
  for (let index = zones.length - 1; index >= 0; index -= 1) {
    if (pointInPolygon(point, zones[index].polygon)) {
      return zones[index];
    }
  }

  return null;
}

/** Index of the polygon vertex within touch range of `point`, or -1 for none. */
export function findZoneVertexIndex(polygon: Plan3DPoint[], point: Plan3DPoint): number {
  return polygon.findIndex((vertex) => distance2D(vertex, point) <= VERTEX_HIT_TOLERANCE_METERS);
}

/** Snaps a floor point to a 100 mm grid so hand-drawn zone edges stay tidy. */
export function snapPointToGrid(point: Plan3DPoint, gridSizeMeters = 0.1): Plan3DPoint {
  if (!Number.isFinite(gridSizeMeters) || gridSizeMeters <= 0) {
    return { x: point.x, y: point.y };
  }

  return {
    x: Math.round(point.x / gridSizeMeters) * gridSizeMeters,
    y: Math.round(point.y / gridSizeMeters) * gridSizeMeters,
  };
}

/** Renames a zone, keeping a stable reference when the caller does not supply one. */
export function renameZone(zone: Plan3DZone, name: string, reference?: string): Plan3DZone {
  return {
    ...zone,
    name: name.trim() || zone.name,
    reference: reference?.trim() || zone.reference,
  };
}

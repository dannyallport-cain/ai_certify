import type { Plan3DPoint, Plan3DZone } from './plan3d-types';
import {
  boundsOfPoints2D,
  createVertex,
  dedupeVertices,
  isFiniteNumber,
  polygonAreaSquareMeters,
} from './geometry';

/**
 * Zone fills are deliberately a fixed, high-contrast set: adjacent fire compartments have to be
 * told apart on a printed plan, on a phone screen in daylight and by users with reduced colour
 * discrimination. None of them repeat the device marker colours.
 */
export const PLAN3D_ZONE_COLOURS: string[] = [
  '#F97316',
  '#0EA5E9',
  '#22C55E',
  '#A855F7',
  '#EAB308',
  '#EC4899',
  '#14B8A6',
  '#EF4444',
  '#8B5CF6',
  '#84CC16',
];

/** Zones smaller than this are treated as a mis-tap rather than a drawn area. */
export const MIN_ZONE_AREA_SQUARE_METERS = 0.2;

const ZONE_DEDUPE_EPSILON_METERS = 0.05;
const DEFAULT_ZONE_COLOUR = PLAN3D_ZONE_COLOURS[0];
const HEX_COLOUR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function getZoneColour(index: number): string {
  if (!Number.isFinite(index) || index < 0) {
    return DEFAULT_ZONE_COLOUR;
  }

  return PLAN3D_ZONE_COLOURS[Math.floor(index) % PLAN3D_ZONE_COLOURS.length];
}

/** Builds the next free reference (`Z1`, `Z2`, …) given the zones that already exist. */
export function createZoneReference(existing: Plan3DZone[]): string {
  const used = new Set(existing.map((zone) => zone.reference.trim().toUpperCase()));
  let index = existing.length + 1;

  while (used.has(`Z${index}`)) {
    index += 1;
  }

  return `Z${index}`;
}

export function createZoneId(): string {
  return `zone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalises hand-drawn input into a usable zone polygon. Returns an empty array when invalid. */
export function normaliseZonePolygon(points: Plan3DPoint[] | null | undefined): Plan3DPoint[] {
  if (!Array.isArray(points)) {
    return [];
  }

  const vertices = points
    .filter((point) => isFiniteNumber(point?.x) && isFiniteNumber(point?.y))
    .map((point) => createVertex(point.x, point.y));
  const cleaned = dedupeVertices(vertices, ZONE_DEDUPE_EPSILON_METERS);

  if (cleaned.length < 3) {
    return [];
  }

  if (polygonAreaSquareMeters(cleaned) < MIN_ZONE_AREA_SQUARE_METERS) {
    return [];
  }

  return cleaned.map((vertex) => ({ x: vertex.x, y: vertex.y }));
}

/** Axis-aligned rectangle as a zone polygon, used by drag-to-draw and by capture suggestions. */
export function rectangleZonePolygon(start: Plan3DPoint, end: Plan3DPoint): Plan3DPoint[] {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  return normaliseZonePolygon([
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]);
}

export function zoneAreaSquareMeters(zone: Plan3DZone): number {
  return polygonAreaSquareMeters(zone.polygon.map((point) => createVertex(point.x, point.y)));
}

/** Centre of the zone's bounding box, used to place the zone reference label. */
export function zoneCentroid(points: Plan3DPoint[]): Plan3DPoint {
  const bounds = boundsOfPoints2D(points);

  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

/** Orders a polygon consistently so stored zones always render the same way. */
export function sortZoneVertices(points: Plan3DPoint[]): Plan3DPoint[] {
  return normaliseZonePolygon(points);
}

/**
 * Drops zones whose polygon collapsed below the minimum area and repairs missing names,
 * references and colours. Stored records come back from a JSON column, so nothing here can be
 * trusted to be well formed.
 */
export function sanitiseZones(zones: Plan3DZone[] | null | undefined): Plan3DZone[] {
  if (!Array.isArray(zones)) {
    return [];
  }

  return zones.reduce<Plan3DZone[]>((valid, zone, index) => {
    if (!zone || typeof zone.id !== 'string' || !zone.id.trim()) {
      return valid;
    }

    const polygon = normaliseZonePolygon(zone.polygon);

    if (polygon.length < 3) {
      return valid;
    }

    const name = typeof zone.name === 'string' ? zone.name.trim() : '';

    valid.push({
      id: zone.id,
      name: name || `Zone ${index + 1}`,
      reference:
        typeof zone.reference === 'string' && zone.reference.trim()
          ? zone.reference.trim()
          : `Z${index + 1}`,
      colour: HEX_COLOUR_PATTERN.test(zone.colour ?? '') ? zone.colour : getZoneColour(index),
      polygon,
      notes: typeof zone.notes === 'string' && zone.notes.trim() ? zone.notes.trim() : null,
    });

    return valid;
  }, []);
}

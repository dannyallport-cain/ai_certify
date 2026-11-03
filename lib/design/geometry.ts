import type { DesignPoint, DesignPolygon, DesignRect } from './types';

/** Two points closer than this are the same vertex when a polygon is cleaned up. */
export const POLYGON_DEDUPE_EPSILON_METERS = 0.02;

/** Drawn polygons below this area are treated as a mis-drag rather than an area. */
export const MIN_POLYGON_AREA_SQUARE_METERS = 0.25;

export const DEFAULT_SNAP_GRID_METERS = 0.1;

export function isFinitePoint(value: unknown): value is DesignPoint {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { x?: unknown; y?: unknown };

  return (
    typeof candidate.x === 'number' &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === 'number' &&
    Number.isFinite(candidate.y)
  );
}

export function distance(a: DesignPoint, b: DesignPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

/** Signed area; positive when the polygon winds counter-clockwise. */
export function signedArea(polygon: DesignPolygon): number {
  if (polygon.length < 3) {
    return 0;
  }

  let total = 0;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    total += current.x * next.y - next.x * current.y;
  }

  return total / 2;
}

export function polygonArea(polygon: DesignPolygon): number {
  return Math.abs(signedArea(polygon));
}

/**
 * Cleans a hand-drawn polygon: drops duplicate and closing vertices, then forces a
 * counter-clockwise winding so fills and outlines render consistently. Returns an empty array
 * when the input cannot describe a polygon.
 */
export function normalisePolygon(candidate: DesignPolygon | null | undefined): DesignPolygon {
  if (!Array.isArray(candidate)) {
    return [];
  }

  const cleaned: DesignPolygon = [];

  candidate.forEach((point) => {
    if (!isFinitePoint(point)) {
      return;
    }

    const previous = cleaned[cleaned.length - 1];

    if (previous && distance(previous, point) <= POLYGON_DEDUPE_EPSILON_METERS) {
      return;
    }

    cleaned.push({ x: point.x, y: point.y });
  });

  if (cleaned.length > 1) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];

    if (distance(first, last) <= POLYGON_DEDUPE_EPSILON_METERS) {
      cleaned.pop();
    }
  }

  if (cleaned.length < 3) {
    return [];
  }

  if (signedArea(cleaned) < 0) {
    cleaned.reverse();
  }

  return cleaned;
}

/** Four corners for a rectangle dragged between two points, in world metres. */
export function polygonFromRect(rect: DesignRect): DesignPolygon {
  const minX = Math.min(rect.minX, rect.maxX);
  const maxX = Math.max(rect.minX, rect.maxX);
  const minY = Math.min(rect.minY, rect.maxY);
  const maxY = Math.max(rect.minY, rect.maxY);

  return normalisePolygon([
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ]);
}

export function rectFromPoints(start: DesignPoint, end: DesignPoint): DesignRect {
  return {
    minX: Math.min(start.x, end.x),
    maxX: Math.max(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxY: Math.max(start.y, end.y),
  };
}

export interface PolygonBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const EMPTY_BOUNDS: PolygonBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

/** Bounds of every point in the given polygons, or a zero box when there are none. */
export function boundsOfPolygons(polygons: DesignPolygon[]): PolygonBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  polygons.forEach((polygon) => {
    polygon.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return EMPTY_BOUNDS;
  }

  return { minX, maxX, minY, maxY };
}

export function boundsOfPoints(points: DesignPoint[]): PolygonBounds {
  return boundsOfPolygons([points]);
}

/** Centre of the polygon's bounding box, used to place labels. */
export function polygonCentre(polygon: DesignPolygon): DesignPoint {
  const bounds = boundsOfPoints(polygon);

  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

/**
 * Even-odd ray cast. A point exactly on an edge is not guaranteed either way, which is
 * acceptable: a device sitting precisely on a zone boundary is a drawing mistake and the legend
 * shows the zone totals, so the omission is visible.
 */
export function pointInPolygon(point: DesignPoint, polygon: DesignPolygon): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const current = polygon[index];
    const prior = polygon[previous];
    const straddles = current.y > point.y !== prior.y > point.y;

    if (!straddles) {
      continue;
    }

    const intersectionX =
      ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;

    if (point.x < intersectionX) {
      inside = !inside;
    }
  }

  return inside;
}

/** Snaps a point to a 100 mm grid so placed devices and drawn edges stay tidy. */
export function snapPoint(
  point: DesignPoint,
  gridSizeMeters = DEFAULT_SNAP_GRID_METERS,
): DesignPoint {
  if (!Number.isFinite(gridSizeMeters) || gridSizeMeters <= 0) {
    return { x: point.x, y: point.y };
  }

  return {
    x: Math.round(point.x / gridSizeMeters) * gridSizeMeters,
    y: Math.round(point.y / gridSizeMeters) * gridSizeMeters,
  };
}

/** Moves every vertex of a polygon by the same offset. */
export function translatePolygon(polygon: DesignPolygon, delta: DesignPoint): DesignPolygon {
  return polygon.map((point) => ({ x: point.x + delta.x, y: point.y + delta.y }));
}

/** Axis-aligned outline of all rooms on a floor, used as the building footprint. */
export function footprintOf(polygons: DesignPolygon[]): DesignPolygon {
  const bounds = boundsOfPolygons(polygons);

  if (bounds.maxX - bounds.minX <= 0 || bounds.maxY - bounds.minY <= 0) {
    return [];
  }

  return polygonFromRect(bounds);
}

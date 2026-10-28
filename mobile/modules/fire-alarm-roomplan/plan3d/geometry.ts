import type { Plan3DBounds, Plan3DPoint, Plan3DQuad, Plan3DVertex } from './plan3d-types';

export const GEOMETRY_EPSILON = 1e-6;

/** A projected quad is accepted as a parallelogram when it is within this many pixels. */
const PARALLELOGRAM_TOLERANCE_PX = 1.5;

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function normaliseDegrees(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createVertex(x: number, y: number, z = 0): Plan3DVertex {
  return { x, y, z };
}

export function cloneVertex(vertex: Plan3DVertex): Plan3DVertex {
  return { x: vertex.x, y: vertex.y, z: vertex.z };
}

export function toPoint(vertex: { x: number; y: number }): Plan3DPoint {
  return { x: vertex.x, y: vertex.y };
}

export function distance2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distance3D(a: Plan3DVertex, b: Plan3DVertex): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function midpoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
): Plan3DPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVertex(a: Plan3DVertex, b: Plan3DVertex, t: number): Plan3DVertex {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

/** Signed area of a footprint polygon on the x/y plane. Positive when counter-clockwise. */
export function signedArea2D(vertices: Plan3DVertex[]): number {
  let total = 0;

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    total += current.x * next.y - next.x * current.y;
  }

  return total / 2;
}

export function polygonAreaSquareMeters(vertices: Plan3DVertex[]): number {
  return Math.abs(signedArea2D(vertices));
}

/** Drops repeated vertices and closing duplicates, keeping the original winding. */
export function dedupeVertices(vertices: Plan3DVertex[], epsilon = 1e-4): Plan3DVertex[] {
  const result: Plan3DVertex[] = [];

  vertices.forEach((vertex) => {
    if (!isFiniteNumber(vertex.x) || !isFiniteNumber(vertex.y)) {
      return;
    }

    const previous = result[result.length - 1];
    if (previous && distance2D(previous, vertex) <= epsilon) {
      return;
    }

    result.push(cloneVertex(vertex));
  });

  if (result.length > 1) {
    const first = result[0];
    const last = result[result.length - 1];
    if (distance2D(first, last) <= epsilon) {
      result.pop();
    }
  }

  return result;
}

/**
 * Produces a usable floor footprint: removes duplicates and forces a counter-clockwise
 * winding so wall extrusion is consistent. Returns an empty array when the input cannot
 * describe a polygon.
 */
export function normaliseFootprint(candidates: Plan3DVertex[]): Plan3DVertex[] {
  const cleaned = dedupeVertices(candidates);

  if (cleaned.length < 3) {
    return [];
  }

  if (signedArea2D(cleaned) < 0) {
    cleaned.reverse();
  }

  return cleaned;
}

export function polygonCentroid2D(vertices: Plan3DVertex[]): Plan3DPoint {
  if (vertices.length === 0) {
    return { x: 0, y: 0 };
  }

  const area = signedArea2D(vertices);

  if (Math.abs(area) < GEOMETRY_EPSILON) {
    const sum = vertices.reduce(
      (accumulator, vertex) => ({
        x: accumulator.x + vertex.x,
        y: accumulator.y + vertex.y,
      }),
      { x: 0, y: 0 },
    );

    return { x: sum.x / vertices.length, y: sum.y / vertices.length };
  }

  let cx = 0;
  let cy = 0;

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    const cross = current.x * next.y - next.x * current.y;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }

  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function rectangleFootprint(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Plan3DVertex[] {
  return [
    createVertex(minX, minY),
    createVertex(maxX, minY),
    createVertex(maxX, maxY),
    createVertex(minX, maxY),
  ];
}

export function emptyBounds(): Plan3DBounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };
}

export function expandBounds(bounds: Plan3DBounds, vertex: Plan3DVertex): Plan3DBounds {
  return {
    minX: Math.min(bounds.minX, vertex.x),
    maxX: Math.max(bounds.maxX, vertex.x),
    minY: Math.min(bounds.minY, vertex.y),
    maxY: Math.max(bounds.maxY, vertex.y),
    minZ: Math.min(bounds.minZ, vertex.z),
    maxZ: Math.max(bounds.maxZ, vertex.z),
  };
}

export function boundsOfVertices(vertices: Plan3DVertex[]): Plan3DBounds {
  return vertices.reduce<Plan3DBounds>(
    (bounds, vertex) => expandBounds(bounds, vertex),
    emptyBounds(),
  );
}

export function finaliseBounds(bounds: Plan3DBounds): Plan3DBounds {
  const safe = (value: number) => (Number.isFinite(value) ? value : 0);

  return {
    minX: safe(bounds.minX),
    maxX: safe(bounds.maxX),
    minY: safe(bounds.minY),
    maxY: safe(bounds.maxY),
    minZ: safe(bounds.minZ),
    maxZ: safe(bounds.maxZ),
  };
}

/** Corner order for a vertical wall panel: bottom-start, bottom-end, top-end, top-start. */
export function wallPanelCorners(
  start: Plan3DVertex,
  end: Plan3DVertex,
  baseZ: number,
  heightMeters: number,
): Plan3DVertex[] {
  const topZ = baseZ + heightMeters;

  return [
    createVertex(start.x, start.y, baseZ),
    createVertex(end.x, end.y, baseZ),
    createVertex(end.x, end.y, topZ),
    createVertex(start.x, start.y, topZ),
  ];
}

/**
 * Returns the affine unit-square mapping for a projected surface when its projection is a
 * parallelogram. Orthographic projection maps every rectangle to a parallelogram, so this
 * is exact for floors, ceilings and wall panels.
 */
export function quadFromProjectedPoints(points: Plan3DPoint[]): Plan3DQuad | null {
  if (points.length !== 4) {
    return null;
  }

  const origin = points[0];
  const widthEnd = points[1];
  const opposite = points[2];
  const heightEnd = points[3];

  const expectedOpposite = {
    x: widthEnd.x + heightEnd.x - origin.x,
    y: widthEnd.y + heightEnd.y - origin.y,
  };

  const deviation = Math.hypot(opposite.x - expectedOpposite.x, opposite.y - expectedOpposite.y);
  const u = { x: widthEnd.x - origin.x, y: widthEnd.y - origin.y };
  const v = { x: heightEnd.x - origin.x, y: heightEnd.y - origin.y };

  if (Math.hypot(u.x, u.y) < GEOMETRY_EPSILON || Math.hypot(v.x, v.y) < GEOMETRY_EPSILON) {
    return null;
  }

  if (deviation > PARALLELOGRAM_TOLERANCE_PX) {
    return null;
  }

  return { origin: { x: origin.x, y: origin.y }, u, v };
}

/** Axis-aligned bounds of a set of 2D points. Returns a zero box for an empty input. */
export function boundsOfPoints2D(points: { x: number; y: number }[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  return { minX, maxX, minY, maxY };
}

/**
 * Even-odd ray cast. Points exactly on an edge are not guaranteed either way, which is
 * acceptable here: a device sitting precisely on a zone boundary is a drawing mistake, and
 * the legend shows the zone totals so the omission is visible.
 */
export function pointInPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[],
): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
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

export function projectPointOnSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): { t: number; distance: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared < GEOMETRY_EPSILON) {
    return { t: 0, distance: distance2D(point, start) };
  }

  const rawT = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  const t = clamp(rawT, 0, 1);
  const projected = { x: start.x + dx * t, y: start.y + dy * t };

  return { t, distance: distance2D(point, projected) };
}

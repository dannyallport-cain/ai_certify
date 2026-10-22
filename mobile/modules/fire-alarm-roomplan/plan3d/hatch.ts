import type { Plan3DVertex } from './plan3d-types';
import { degreesToRadians, GEOMETRY_EPSILON, isFiniteNumber } from './geometry';

export interface HatchSegment {
  start: Plan3DVertex;
  end: Plan3DVertex;
}

/** Guards against pathological spacing producing tens of thousands of lines. */
const MAX_HATCH_LINES = 240;

/**
 * Clips a family of parallel lines to a footprint polygon and returns the interior spans.
 * Used for the floor grid and for filling footprints that cannot be drawn as a single
 * projected parallelogram.
 */
export function hatchFootprint(
  polygon: Plan3DVertex[],
  spacingMeters: number,
  angleDegrees: number,
): HatchSegment[] {
  if (polygon.length < 3 || !isFiniteNumber(spacingMeters) || spacingMeters <= 0) {
    return [];
  }

  const spacing = Math.max(spacingMeters, 0.05);
  const radians = degreesToRadians(angleDegrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const toHatchSpace = (vertex: Plan3DVertex) => ({
    x: vertex.x * cos + vertex.y * sin,
    y: -vertex.x * sin + vertex.y * cos,
  });

  const fromHatchSpace = (point: { x: number; y: number }) => ({
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  });

  const rotated = polygon.map(toHatchSpace).filter((point) => isFiniteNumber(point.y));

  if (rotated.length < 3) {
    return [];
  }

  const minY = rotated.reduce((lowest, point) => Math.min(lowest, point.y), Number.POSITIVE_INFINITY);
  const maxY = rotated.reduce((highest, point) => Math.max(highest, point.y), Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return [];
  }

  const firstIndex = Math.ceil(minY / spacing);
  const lastIndex = Math.floor(maxY / spacing);
  const segments: HatchSegment[] = [];

  for (let index = firstIndex; index <= lastIndex && segments.length < MAX_HATCH_LINES; index += 1) {
    const y = index * spacing;
    const crossings: number[] = [];

    for (let edge = 0; edge < rotated.length; edge += 1) {
      const start = rotated[edge];
      const end = rotated[(edge + 1) % rotated.length];
      const startAbove = start.y > y;
      const endAbove = end.y > y;

      if (startAbove === endAbove) {
        continue;
      }

      const t = (y - start.y) / (end.y - start.y);
      if (!Number.isFinite(t)) {
        continue;
      }

      crossings.push(start.x + (end.x - start.x) * t);
    }

    if (crossings.length < 2) {
      continue;
    }

    crossings.sort((left, right) => left - right);

    for (let crossing = 0; crossing + 1 < crossings.length; crossing += 2) {
      const startX = crossings[crossing];
      const endX = crossings[crossing + 1];

      if (!Number.isFinite(startX) || !Number.isFinite(endX) || Math.abs(endX - startX) < GEOMETRY_EPSILON) {
        continue;
      }

      const startPoint = fromHatchSpace({ x: startX, y });
      const endPoint = fromHatchSpace({ x: endX, y });

      segments.push({
        start: { x: startPoint.x, y: startPoint.y, z: 0 },
        end: { x: endPoint.x, y: endPoint.y, z: 0 },
      });
    }
  }

  return segments;
}

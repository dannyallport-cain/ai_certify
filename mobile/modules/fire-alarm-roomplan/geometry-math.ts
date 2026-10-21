export interface PlanPoint {
  x: number;
  y: number;
}

export interface PlanBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export const EMPTY_BOUNDS: PlanBounds = {
  minX: 0,
  minY: 0,
  maxX: 0,
  maxY: 0,
  width: 0,
  height: 0,
};

function round(value: number, precision = 1000): number {
  return Math.round(value * precision) / precision;
}

export function distanceBetween(a: PlanPoint, b: PlanPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function distanceToSegment(point: PlanPoint, start: PlanPoint, end: PlanPoint): number {
  const segmentLength = distanceBetween(start, end);

  if (segmentLength === 0) {
    return distanceBetween(point, start);
  }

  const projection = ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / (segmentLength * segmentLength);
  const clamped = Math.max(0, Math.min(1, projection));

  return distanceBetween(point, {
    x: start.x + clamped * (end.x - start.x),
    y: start.y + clamped * (end.y - start.y),
  });
}

export function polygonArea(points: PlanPoint[]): number {
  if (points.length < 3) {
    return 0;
  }

  let total = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    total += current.x * next.y - next.x * current.y;
  }

  return round(Math.abs(total) / 2);
}

export function polygonPerimeter(points: PlanPoint[]): number {
  if (points.length < 2) {
    return 0;
  }

  let total = 0;

  for (let index = 0; index < points.length; index += 1) {
    total += distanceBetween(points[index], points[(index + 1) % points.length]);
  }

  return round(total);
}

export function polygonCentroid(points: PlanPoint[]): PlanPoint {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const sum = points.reduce(
    (accumulator, point) => ({ x: accumulator.x + point.x, y: accumulator.y + point.y }),
    { x: 0, y: 0 },
  );

  return { x: round(sum.x / points.length), y: round(sum.y / points.length) };
}

export function pointInPolygon(point: PlanPoint, polygon: PlanPoint[]): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let isInside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

export function computeBounds(points: PlanPoint[]): PlanBounds {
  if (points.length === 0) {
    return EMPTY_BOUNDS;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX: round(minX),
    minY: round(minY),
    maxX: round(maxX),
    maxY: round(maxY),
    width: round(maxX - minX),
    height: round(maxY - minY),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function dedupeConsecutivePoints(points: PlanPoint[], tolerance = 0.02): PlanPoint[] {
  return points.reduce<PlanPoint[]>((accumulator, point) => {
    const previous = accumulator[accumulator.length - 1];

    if (!previous || distanceBetween(previous, point) > tolerance) {
      accumulator.push(point);
    }

    return accumulator;
  }, []);
}

export function rotatePoint(point: PlanPoint, radians: number): PlanPoint {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: round(point.x * cos - point.y * sin),
    y: round(point.x * sin + point.y * cos),
  };
}

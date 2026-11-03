import { boundsOfPoints, pointInPolygon, polygonArea, polygonFromRect } from './geometry';
import type { DesignFloor, DesignPoint, DesignPolygon, DesignRect, DesignZone } from './types';

/**
 * Zone geometry: everything that makes a zone plan behave like a compartment plan rather than a
 * set of loose rectangles.
 *
 * Four rules drive this module:
 *
 * 1. A zone is a set of regions, so a compartment can be L-shaped, wrap a stair core, or be two
 *    unconnected parts of the same storey.
 * 2. Zones may be **vertical**: a stair, lift shaft or riser is one zone projected through several
 *    storeys, so "which zones are on this floor" is not the same as "which zones were drawn here".
 * 3. A zone may be **nested** inside another — a shaft within a plate. That is the only overlap
 *    allowed; everywhere else, drawing over an existing zone adds only the free remainder or is
 *    refused, which keeps the device roll-up unambiguous.
 * 4. Once zones are drawn, every part of the floor should belong to one. `floorCoverage` reports
 *    what is not yet covered, per room, so gaps are found before the plan is printed.
 */

/** How close an edge must be to an existing edge before it snaps onto it. */
export const ZONE_SNAP_TOLERANCE_METERS = 0.35;
/** Grid step used to measure how much of a room is inside a zone. */
export const COVERAGE_SAMPLE_METERS = 0.25;
/** Anything smaller than this is treated as a mis-drag rather than a compartment. */
export const MIN_ZONE_REGION_AREA_SQUARE_METERS = 0.16;

/** The regions of a zone. Tolerates older stored designs that only carry one outline. */
export function zoneRegions(zone: DesignZone): DesignPolygon[] {
  const regions = Array.isArray(zone.regions) ? zone.regions : [];
  const extra = (zone as { polygon?: DesignPolygon }).polygon;

  if (regions.length > 0) {
    return regions;
  }

  return extra && extra.length >= 3 ? [extra] : [];
}

export function zoneAreaSquareMeters(zone: DesignZone): number {
  return zoneRegions(zone).reduce((total, region) => total + polygonArea(region), 0);
}

/** Every storey a zone appears on: where it was drawn first, then the storeys it passes through. */
export function zoneFloorIds(zone: DesignZone): string[] {
  const spans = Array.isArray(zone.spansFloorIds) ? zone.spansFloorIds : [];

  return [zone.floorId, ...spans.filter((floorId) => floorId && floorId !== zone.floorId)];
}

/** True when the zone is drawn on, or passes through, this storey. */
export function zoneAppearsOnFloor(zone: DesignZone, floorId: string): boolean {
  return zoneFloorIds(zone).includes(floorId);
}

/**
 * The zones visible on a storey: those drawn there plus the vertical ones passing through it.
 *
 * Every consumer must use this rather than filtering on `zone.floorId`, otherwise a shaft that
 * spans three floors would only exist on the floor it was drawn on.
 */
export function zonesOnFloor(zones: DesignZone[], floorId: string): DesignZone[] {
  return zones.filter((zone) => zoneAppearsOnFloor(zone, floorId));
}

/** Zones nested directly inside this one. */
export function childZones(zones: DesignZone[], zoneId: string): DesignZone[] {
  return zones.filter((zone) => zone.parentZoneId === zoneId);
}

/** How deeply a zone is nested: 0 for a floor plate, 1 for a shaft inside it, and so on. */
export function zoneDepth(zones: DesignZone[], zone: DesignZone, limit = 8): number {
  let depth = 0;
  let current = zone;

  while (current.parentZoneId && depth < limit) {
    const parent = zones.find((candidate) => candidate.id === current.parentZoneId);

    if (!parent) {
      break;
    }

    depth += 1;
    current = parent;
  }

  return depth;
}

/** True when `candidate` is `zone` or sits somewhere above it in the nesting chain. */
export function zoneIsAncestor(
  zones: DesignZone[],
  candidateId: string,
  zoneId: string,
): boolean {
  let current = zones.find((zone) => zone.id === zoneId);
  let guard = 0;

  while (current && guard < 8) {
    if (current.id === candidateId) {
      return true;
    }

    current = current.parentZoneId
      ? zones.find((zone) => zone.id === current?.parentZoneId)
      : undefined;
    guard += 1;
  }

  return false;
}

/** Regions of the compartments nested inside a zone, which are holes in its fill. */
export function childRegionsOnFloor(
  zones: DesignZone[],
  zone: DesignZone,
  floorId: string,
): DesignPolygon[] {
  return childZones(zones, zone.id)
    .filter((child) => zoneAppearsOnFloor(child, floorId))
    .flatMap((child) => zoneRegions(child));
}

/**
 * A zone's own area, excluding the compartments nested inside it.
 *
 * A shaft is not part of the floor plate it passes through, so the plate's figure has to be the
 * plate minus the shaft — otherwise the legend double counts the shaft.
 */
export function zoneNetAreaSquareMeters(zones: DesignZone[], zone: DesignZone): number {
  const holes = childZones(zones, zone.id).reduce(
    (total, child) => total + zoneAreaSquareMeters(child),
    0,
  );

  return Math.max(0, zoneAreaSquareMeters(zone) - holes);
}

/** Draw order: plates before the compartments nested inside them, biggest first. */
export function zonesInDrawOrder(zones: DesignZone[], floorId: string): DesignZone[] {
  return zonesOnFloor(zones, floorId).sort(
    (left, right) =>
      zoneDepth(zones, left) - zoneDepth(zones, right) ||
      zoneAreaSquareMeters(right) - zoneAreaSquareMeters(left),
  );
}

/**
 * The zone owning a point on a floor, preferring the most specific compartment.
 *
 * A device standing on a landing inside a shaft belongs to the shaft zone, not to the plate that
 * surrounds it, so the deepest enclosing zone wins.
 */
export function zoneAtPoint(
  zones: DesignZone[],
  floorId: string,
  point: DesignPoint,
): DesignZone | null {
  const candidates = zones
    .filter(
      (zone) =>
        zoneAppearsOnFloor(zone, floorId) &&
        zoneRegions(zone).some((region) => pointInPolygon(point, region)),
    )
    .sort((left, right) => zoneDepth(zones, right) - zoneDepth(zones, left));

  return candidates[0] ?? null;
}

/** True when every corner and edge midpoint of the rectangle falls inside the given polygons. */
export function rectInsidePolygons(rect: DesignRect, polygons: DesignPolygon[]): boolean {
  const xs = [rect.minX, (rect.minX + rect.maxX) / 2, rect.maxX];
  const ys = [rect.minY, (rect.minY + rect.maxY) / 2, rect.maxY];
  const points: DesignPoint[] = [];

  xs.forEach((x) => ys.forEach((y) => points.push({ x, y })));

  return points.every((point) => polygons.some((polygon) => pointInPolygon(point, polygon)));
}

function rectFromPoints(a: DesignPoint, b: DesignPoint): DesignRect {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

/**
 * Reads a polygon as an axis-aligned rectangle when it is one. RoomPlan outlines are usually
 * rectangular, so this is what lets overlap trimming work on captured rooms too.
 */
export function axisAlignedRect(polygon: DesignPolygon): DesignRect | null {
  if (polygon.length < 3) {
    return null;
  }

  const xs = Array.from(new Set(polygon.map((point) => Math.round(point.x * 1000) / 1000)));
  const ys = Array.from(new Set(polygon.map((point) => Math.round(point.y * 1000) / 1000)));

  if (xs.length !== 2 || ys.length !== 2) {
    return null;
  }

  const rect = rectFromPoints({ x: xs[0], y: ys[0] }, { x: xs[1], y: ys[1] });

  // A four-point polygon could still be an L drawn with two corners; area proves it is a box.
  const area = polygonArea(polygon);
  const boxArea = (rect.maxX - rect.minX) * (rect.maxY - rect.minY);

  return Math.abs(area - boxArea) <= Math.max(0.01, boxArea * 0.001) ? rect : null;
}

/** Edge coordinates of every region on a floor, used as snap targets. */
export function collectSnapEdges(
  zones: DesignZone[],
  floorId: string,
  ignoreZoneId?: string | null,
): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];

  zones
    .filter((zone) => zoneAppearsOnFloor(zone, floorId) && zone.id !== ignoreZoneId)
    .forEach((zone) => {
      zoneRegions(zone).forEach((region) => {
        region.forEach((point) => {
          xs.push(point.x);
          ys.push(point.y);
        });
      });
    });

  return { xs, ys };
}

function nearest(value: number, targets: number[], tolerance: number): number {
  let best = value;
  let bestDistance = tolerance;

  targets.forEach((target) => {
    const distance = Math.abs(value - target);

    if (distance <= bestDistance) {
      best = target;
      bestDistance = distance;
    }
  });

  return best;
}

/**
 * Snaps a dragged rectangle onto nearby zone edges, so neighbouring compartments share an exact
 * edge instead of leaving a hairline gap that later reads as an uncovered strip.
 */
export function snapRect(
  rect: DesignRect,
  edges: { xs: number[]; ys: number[] },
  tolerance = ZONE_SNAP_TOLERANCE_METERS,
): DesignRect {
  const minX = nearest(rect.minX, edges.xs, tolerance);
  const maxX = nearest(rect.maxX, edges.xs, tolerance);
  const minY = nearest(rect.minY, edges.ys, tolerance);
  const maxY = nearest(rect.maxY, edges.ys, tolerance);

  return {
    minX,
    minY,
    maxX: Math.max(maxX, minX),
    maxY: Math.max(maxY, minY),
  };
}

export function rectToPolygon(rect: DesignRect): DesignPolygon {
  return polygonFromRect(rect);
}

function rectanglesOverlap(a: DesignRect, b: DesignRect): boolean {
  return a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
}

function orientation(a: DesignPoint, b: DesignPoint, c: DesignPoint): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

  if (Math.abs(value) < 1e-9) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function onSegment(a: DesignPoint, b: DesignPoint, c: DesignPoint): boolean {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  );
}

function segmentsIntersect(
  p1: DesignPoint,
  q1: DesignPoint,
  p2: DesignPoint,
  q2: DesignPoint,
): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  if (o1 === 0 && onSegment(p1, p2, q1)) {
    return true;
  }

  if (o2 === 0 && onSegment(p1, q2, q1)) {
    return true;
  }

  if (o3 === 0 && onSegment(p2, p1, q2)) {
    return true;
  }

  return o4 === 0 && onSegment(p2, q1, q2);
}

/** True when a rectangle and a polygon share any area. Touching edges do not count. */
export function rectIntersectsPolygon(rect: DesignRect, polygon: DesignPolygon): boolean {
  if (polygon.length < 3) {
    return false;
  }

  const box = axisAlignedRect(polygon);

  if (box) {
    return rectanglesOverlap(rect, box);
  }

  const corners: DesignPoint[] = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ];

  if (corners.some((corner) => pointInPolygon(corner, polygon))) {
    return true;
  }

  if (polygon.some((point) => point.x > rect.minX && point.x < rect.maxX && point.y > rect.minY && point.y < rect.maxY)) {
    return true;
  }

  for (let index = 0; index < corners.length; index += 1) {
    const from = corners[index];
    const to = corners[(index + 1) % corners.length];

    for (let edge = 0; edge < polygon.length; edge += 1) {
      const next = polygon[(edge + 1) % polygon.length];

      if (segmentsIntersect(from, to, polygon[edge], next)) {
        return true;
      }
    }
  }

  return false;
}

/** The first zone on the floor that a rectangle would overlap, ignoring one zone by id. */
export function findZoneConflict(
  rect: DesignRect,
  zones: DesignZone[],
  floorId: string,
  ignoreZoneId?: string | null,
): DesignZone | null {
  return (
    zonesOnFloor(zones, floorId).find(
      (zone) =>
        zone.id !== ignoreZoneId &&
        zoneRegions(zone).some((region) => rectIntersectsPolygon(rect, region)),
    ) ?? null
  );
}

/**
 * The first zone on the floor that a rectangle would overlap, ignoring several by id.
 *
 * Used when the rectangles being checked may legitimately sit inside a parent compartment: its
 * ancestors are excluded, everything else still blocks.
 */
export function findZoneConflictExcept(
  rect: DesignRect,
  zones: DesignZone[],
  floorId: string,
  exceptZoneIds: string[],
): DesignZone | null {
  const allowed = new Set(exceptZoneIds);

  return (
    zonesOnFloor(zones, floorId).find(
      (zone) =>
        !allowed.has(zone.id) &&
        zoneRegions(zone).some((region) => rectIntersectsPolygon(rect, region)),
    ) ?? null
  );
}

/**
 * Removes the blockers from a rectangle, returning the free pieces.
 *
 * Splitting against several rectangles in turn keeps each result a rectangle, so the remainder of
 * a drag that clips a neighbour can be added as regions without inventing non-rectilinear shapes.
 */
export function subtractRects(rect: DesignRect, blockers: DesignRect[]): DesignRect[] {
  let pieces: DesignRect[] = [rect];

  blockers.forEach((blocker) => {
    const next: DesignRect[] = [];

    pieces.forEach((piece) => {
      if (!rectanglesOverlap(piece, blocker)) {
        next.push(piece);
        return;
      }

      if (blocker.minY > piece.minY) {
        next.push({ ...piece, maxY: Math.min(piece.maxY, blocker.minY) });
      }

      if (blocker.maxY < piece.maxY) {
        next.push({ ...piece, minY: Math.max(piece.minY, blocker.maxY) });
      }

      const overlapMinY = Math.max(piece.minY, blocker.minY);
      const overlapMaxY = Math.min(piece.maxY, blocker.maxY);

      if (blocker.minX > piece.minX) {
        next.push({ ...piece, maxX: Math.min(piece.maxX, blocker.minX), minY: overlapMinY, maxY: overlapMaxY });
      }

      if (blocker.maxX < piece.maxX) {
        next.push({ ...piece, minX: Math.max(piece.minX, blocker.maxX), minY: overlapMinY, maxY: overlapMaxY });
      }
    });

    pieces = next.filter(
      (piece) => piece.maxX - piece.minX > 0.01 && piece.maxY - piece.minY > 0.01,
    );
  });

  return pieces;
}

export interface RoomCoverage {
  roomId: string;
  name: string;
  areaSquareMeters: number;
  coveredRatio: number;
}

export interface FloorCoverage {
  /** Area of every room on the floor. */
  totalAreaSquareMeters: number;
  coveredAreaSquareMeters: number;
  /** 0 to 1. */
  ratio: number;
  /** Rooms that are not fully inside a zone, worst first. */
  uncoveredRooms: RoomCoverage[];
  /** True when every room is covered and nothing is left to zone. */
  complete: boolean;
}

/**
 * Measures how much of a floor sits inside a zone.
 *
 * Sampling on a fixed grid rather than doing polygon union keeps this honest for the arbitrary
 * outlines RoomPlan produces, and the step is small enough that a gap narrower than a doorway is
 * still reported.
 */
export function floorCoverage(floor: DesignFloor, zones: DesignZone[]): FloorCoverage {
  const regions = zonesOnFloor(zones, floor.id).flatMap((zone) => zoneRegions(zone));

  const rooms: RoomCoverage[] = [];
  let totalArea = 0;
  let coveredArea = 0;

  floor.rooms.forEach((room) => {
    const area = polygonArea(room.polygon);

    if (area <= 0) {
      return;
    }

    const bounds = boundsOfPoints(room.polygon);
    const step = COVERAGE_SAMPLE_METERS;
    let samples = 0;
    let inside = 0;

    for (let x = bounds.minX + step / 2; x < bounds.maxX; x += step) {
      for (let y = bounds.minY + step / 2; y < bounds.maxY; y += step) {
        const point = { x, y };

        if (!pointInPolygon(point, room.polygon)) {
          continue;
        }

        samples += 1;

        if (regions.some((region) => pointInPolygon(point, region))) {
          inside += 1;
        }
      }
    }

    const ratio = samples === 0 ? 0 : inside / samples;

    totalArea += area;
    coveredArea += area * ratio;
    rooms.push({ roomId: room.id, name: room.name, areaSquareMeters: area, coveredRatio: ratio });
  });

  const uncoveredRooms = rooms
    .filter((room) => room.coveredRatio < 0.98)
    .sort((left, right) => left.coveredRatio - right.coveredRatio);

  return {
    totalAreaSquareMeters: totalArea,
    coveredAreaSquareMeters: coveredArea,
    ratio: totalArea === 0 ? 0 : coveredArea / totalArea,
    uncoveredRooms,
    complete: rooms.length > 0 && uncoveredRooms.length === 0,
  };
}

/**
 * Zones on a floor that overlap each other, excluding a compartment and its own children — that
 * pair overlaps by design, because a shaft is a hole in the plate around it.
 */
export function findOverlappingZones(zones: DesignZone[], floorId: string): [string, string][] {
  const onFloor = zonesOnFloor(zones, floorId);
  const overlaps: [string, string][] = [];

  for (let left = 0; left < onFloor.length; left += 1) {
    for (let right = left + 1; right < onFloor.length; right += 1) {
      const a = onFloor[left];
      const b = onFloor[right];

      if (zoneIsAncestor(zones, a.id, b.id) || zoneIsAncestor(zones, b.id, a.id)) {
        continue;
      }
      const clash = zoneRegions(a).some((regionA) => {
        const box = axisAlignedRect(regionA);

        return zoneRegions(b).some((regionB) =>
          box
            ? rectIntersectsPolygon(box, regionB)
            : rectIntersectsPolygon(polygonBoundsRect(regionB), regionA),
        );
      });

      if (clash) {
        overlaps.push([a.id, b.id]);
      }
    }
  }

  return overlaps;
}

function polygonBoundsRect(polygon: DesignPolygon): DesignRect {
  const bounds = boundsOfPoints(polygon);

  return { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY };
}

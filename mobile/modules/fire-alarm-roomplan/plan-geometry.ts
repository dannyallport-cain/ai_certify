import {
  computeBounds,
  dedupeConsecutivePoints,
  distanceBetween,
  EMPTY_BOUNDS,
  polygonArea,
  polygonCentroid,
  polygonPerimeter,
  type PlanBounds,
  type PlanPoint,
} from './geometry-math';
import type {
  FireAlarmDevicePoint,
  FireAlarmFloorplanRoom,
  FireAlarmOpening,
  FireAlarmScanSession,
  FireAlarmWallSegment,
} from './types';

export const DEFAULT_WALL_HEIGHT_METERS = 2.7;
export const DEFAULT_WALL_THICKNESS_METERS = 0.12;
export const DEFAULT_ROOM_WIDTH_METERS = 6;
export const DEFAULT_ROOM_DEPTH_METERS = 4;

export interface PlanWallSegment {
  id: string;
  roomId: string;
  start: PlanPoint;
  end: PlanPoint;
  height: number;
  thickness: number;
  length: number;
}

export interface PlanOpeningMarker {
  id: string;
  roomId: string;
  kind: FireAlarmOpening['kind'];
  position: PlanPoint;
  width: number;
  height: number;
  wallSegmentId: string | null;
  angleRadians: number;
}

export interface PlanRoomShape {
  id: string;
  name: string;
  level: number;
  outline: PlanPoint[];
  walls: PlanWallSegment[];
  openings: PlanOpeningMarker[];
  areaSquareMeters: number;
  perimeterMeters: number;
  centroid: PlanPoint;
}

export type PlanGeometrySource = 'roomplan' | 'manual' | 'derived';

export interface PlanGeometry {
  rooms: PlanRoomShape[];
  walls: PlanWallSegment[];
  openings: PlanOpeningMarker[];
  bounds: PlanBounds;
  units: 'meters' | 'feet';
  source: PlanGeometrySource;
  hasGeometry: boolean;
  defaultWallHeight: number;
}

export const EMPTY_PLAN_GEOMETRY: PlanGeometry = {
  rooms: [],
  walls: [],
  openings: [],
  bounds: EMPTY_BOUNDS,
  units: 'meters',
  source: 'derived',
  hasGeometry: false,
  defaultWallHeight: DEFAULT_WALL_HEIGHT_METERS,
};

export function toPlanPoint(point?: FireAlarmDevicePoint | null): PlanPoint | null {
  if (!point) {
    return null;
  }

  if (typeof point.x !== 'number' || typeof point.y !== 'number') {
    return null;
  }

  return { x: point.x, y: point.y };
}

function positiveOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function buildWall(
  id: string,
  roomId: string,
  start: PlanPoint,
  end: PlanPoint,
  height: number,
  thickness = DEFAULT_WALL_THICKNESS_METERS,
): PlanWallSegment {
  return {
    id,
    roomId,
    start,
    end,
    height,
    thickness,
    length: distanceBetween(start, end),
  };
}

function wallsFromSegmentList(
  segments: FireAlarmWallSegment[],
  roomId: string,
  defaultHeight: number,
): PlanWallSegment[] {
  return segments.reduce<PlanWallSegment[]>((accumulator, segment, index) => {
    const start = toPlanPoint(segment.start);
    const end = toPlanPoint(segment.end);

    if (!start || !end || distanceBetween(start, end) < 0.05) {
      return accumulator;
    }

    accumulator.push(
      buildWall(
        segment.id || `${roomId}-wall-${index + 1}`,
        roomId,
        start,
        end,
        positiveOr(segment.height, defaultHeight),
      ),
    );

    return accumulator;
  }, []);
}

function wallsFromOutline(outline: PlanPoint[], roomId: string, height: number): PlanWallSegment[] {
  return outline.map((start, index) =>
    buildWall(
      `${roomId}-outline-wall-${index + 1}`,
      roomId,
      start,
      outline[(index + 1) % outline.length],
      height,
    ),
  );
}

function angleOfWall(wall: PlanWallSegment): number {
  return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
}

function nearestWall(walls: PlanWallSegment[], point: PlanPoint): PlanWallSegment | null {
  let bestWall: PlanWallSegment | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  walls.forEach((wall) => {
    const abx = wall.end.x - wall.start.x;
    const aby = wall.end.y - wall.start.y;
    const lengthSquared = abx * abx + aby * aby;

    if (lengthSquared === 0) {
      return;
    }

    const t = Math.max(
      0,
      Math.min(1, ((point.x - wall.start.x) * abx + (point.y - wall.start.y) * aby) / lengthSquared),
    );
    const distance = distanceBetween(point, {
      x: wall.start.x + t * abx,
      y: wall.start.y + t * aby,
    });

    if (distance < bestDistance) {
      bestDistance = distance;
      bestWall = wall;
    }
  });

  return bestWall;
}

function buildOpeningMarker(
  opening: FireAlarmOpening,
  index: number,
  roomId: string,
  walls: PlanWallSegment[],
): PlanOpeningMarker | null {
  const position = toPlanPoint(opening.position);

  if (!position) {
    return null;
  }

  const explicitWall = opening.wallSegmentId
    ? walls.find((wall) => wall.id === opening.wallSegmentId) ?? null
    : null;
  const wall = explicitWall ?? nearestWall(walls, position);

  return {
    id: opening.id || `${roomId}-opening-${index + 1}`,
    roomId,
    kind: opening.kind ?? 'unknown',
    position,
    width: positiveOr(opening.width, 0.9),
    height: positiveOr(opening.height, opening.kind === 'window' ? 1.2 : 2.1),
    wallSegmentId: wall?.id ?? null,
    angleRadians: wall ? angleOfWall(wall) : 0,
  };
}

function outlineFromWalls(walls: PlanWallSegment[]): PlanPoint[] {
  const unique = walls
    .flatMap((wall) => [wall.start, wall.end])
    .reduce<PlanPoint[]>((accumulator, point) => {
      const exists = accumulator.some(
        (candidate) =>
          Math.abs(candidate.x - point.x) < 0.05 && Math.abs(candidate.y - point.y) < 0.05,
      );

      if (!exists) {
        accumulator.push(point);
      }

      return accumulator;
    }, []);

  if (unique.length < 3) {
    return [];
  }

  const centre = polygonCentroid(unique);

  return [...unique].sort(
    (left, right) =>
      Math.atan2(left.y - centre.y, left.x - centre.x) -
      Math.atan2(right.y - centre.y, right.x - centre.x),
  );
}

export function normalizeRoomShape(
  room: FireAlarmFloorplanRoom,
  index: number,
  defaultWallHeight = DEFAULT_WALL_HEIGHT_METERS,
): PlanRoomShape | null {
  const roomId = room.id || `room-${index + 1}`;
  const outline = dedupeConsecutivePoints(
    (room.outline ?? [])
      .map((point) => toPlanPoint(point))
      .filter((point): point is PlanPoint => point !== null),
    0.05,
  );
  const explicitWalls = wallsFromSegmentList(room.wallSegments ?? [], roomId, defaultWallHeight);
  const walls = explicitWalls.length
    ? explicitWalls
    : outline.length >= 3
      ? wallsFromOutline(outline, roomId, defaultWallHeight)
      : [];

  if (walls.length === 0) {
    return null;
  }

  const resolvedOutline = outline.length >= 3 ? outline : outlineFromWalls(walls);

  if (resolvedOutline.length < 3) {
    return null;
  }

  const openings = (room.openings ?? [])
    .map((opening, openingIndex) => buildOpeningMarker(opening, openingIndex, roomId, walls))
    .filter((opening): opening is PlanOpeningMarker => opening !== null);

  return {
    id: roomId,
    name: room.name?.trim() || `Room ${index + 1}`,
    level: room.level ?? 0,
    outline: resolvedOutline,
    walls,
    openings,
    areaSquareMeters: positiveOr(room.areaSquareMeters, polygonArea(resolvedOutline)),
    perimeterMeters: positiveOr(room.perimeterMeters, polygonPerimeter(resolvedOutline)),
    centroid: polygonCentroid(resolvedOutline),
  };
}

export function buildPlanGeometry(
  session: FireAlarmScanSession | null | undefined,
  options: { defaultWallHeight?: number; source?: PlanGeometrySource } = {},
): PlanGeometry {
  const defaultWallHeight = options.defaultWallHeight ?? DEFAULT_WALL_HEIGHT_METERS;
  const floorplanRooms = session?.floorplan?.rooms ?? [];
  const rooms = floorplanRooms
    .map((room, index) => normalizeRoomShape(room, index, defaultWallHeight))
    .filter((room): room is PlanRoomShape => room !== null);

  if (rooms.length === 0) {
    return {
      ...EMPTY_PLAN_GEOMETRY,
      units: session?.floorplan?.units ?? 'meters',
      defaultWallHeight,
    };
  }

  const walls = rooms.flatMap((room) => room.walls);
  const openings = rooms.flatMap((room) => room.openings);
  const outlinePoints = rooms.flatMap((room) => room.outline);

  return {
    rooms,
    walls,
    openings,
    bounds: computeBounds(outlinePoints),
    units: session?.floorplan?.units ?? 'meters',
    source: options.source ?? (session?.rawPayload?.['source'] === 'js-fallback' ? 'derived' : 'roomplan'),
    hasGeometry: outlinePoints.length >= 3,
    defaultWallHeight,
  };
}

import { computeBounds, polygonArea, polygonCentroid, polygonPerimeter, type PlanPoint } from './geometry-math';
import {
  DEFAULT_ROOM_DEPTH_METERS,
  DEFAULT_ROOM_WIDTH_METERS,
  DEFAULT_WALL_HEIGHT_METERS,
  normalizeRoomShape,
  type PlanGeometry,
  type PlanGeometrySource,
  type PlanRoomShape,
} from './plan-geometry';

export interface ManualRoomInput {
  name?: string;
  widthMeters?: number;
  depthMeters?: number;
  wallHeightMeters?: number;
  originX?: number;
  originY?: number;
  level?: number;
}

function clampSize(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, 1), 100);
}

export function createRectangularRoom(input: ManualRoomInput = {}, id?: string): PlanRoomShape {
  const width = clampSize(input.widthMeters, DEFAULT_ROOM_WIDTH_METERS);
  const depth = clampSize(input.depthMeters, DEFAULT_ROOM_DEPTH_METERS);
  const height = clampSize(input.wallHeightMeters, DEFAULT_WALL_HEIGHT_METERS);
  const originX = input.originX ?? 0;
  const originY = input.originY ?? 0;
  const roomId = id ?? `manual-room-${Date.now()}-${Math.round(Math.random() * 1000)}`;

  const outline: PlanPoint[] = [
    { x: originX, y: originY },
    { x: originX + width, y: originY },
    { x: originX + width, y: originY + depth },
    { x: originX, y: originY + depth },
  ];

  const created = normalizeRoomShape(
    {
      id: roomId,
      name: input.name?.trim() || 'New room',
      level: input.level ?? 0,
      areaSquareMeters: polygonArea(outline),
      perimeterMeters: polygonPerimeter(outline),
      outline: outline.map((point) => ({ ...point, z: 0 })),
      wallSegments: outline.map((start, index) => ({
        id: `${roomId}-wall-${index + 1}`,
        start: { ...start, z: 0 },
        end: { ...outline[(index + 1) % outline.length], z: 0 },
        height,
        length: Math.hypot(
          outline[(index + 1) % outline.length].x - start.x,
          outline[(index + 1) % outline.length].y - start.y,
        ),
      })),
      openings: [],
      devices: [],
    },
    input.level ?? 0,
    height,
  );

  if (created) {
    return { ...created, areaSquareMeters: polygonArea(outline), perimeterMeters: polygonPerimeter(outline) };
  }

  return {
    id: roomId,
    name: input.name?.trim() || 'New room',
    level: input.level ?? 0,
    outline,
    walls: [],
    openings: [],
    areaSquareMeters: polygonArea(outline),
    perimeterMeters: polygonPerimeter(outline),
    centroid: polygonCentroid(outline),
  };
}

export function assemblePlanGeometry(
  rooms: PlanRoomShape[],
  options: { units?: 'meters' | 'feet'; source?: PlanGeometrySource; defaultWallHeight?: number } = {},
): PlanGeometry {
  const walls = rooms.flatMap((room) => room.walls);
  const openings = rooms.flatMap((room) => room.openings);
  const outlinePoints = rooms.flatMap((room) => room.outline);

  return {
    rooms,
    walls,
    openings,
    bounds: computeBounds(outlinePoints),
    units: options.units ?? 'meters',
    source: options.source ?? 'manual',
    hasGeometry: rooms.length > 0,
    defaultWallHeight: options.defaultWallHeight ?? DEFAULT_WALL_HEIGHT_METERS,
  };
}

export function withRooms(geometry: PlanGeometry, rooms: PlanRoomShape[]): PlanGeometry {
  return assemblePlanGeometry(rooms, {
    units: geometry.units,
    source: geometry.source,
    defaultWallHeight: geometry.defaultWallHeight,
  });
}

export function upsertRoom(geometry: PlanGeometry, room: PlanRoomShape): PlanGeometry {
  const existingIndex = geometry.rooms.findIndex((candidate) => candidate.id === room.id);

  if (existingIndex === -1) {
    return withRooms(geometry, [...geometry.rooms, room]);
  }

  const nextRooms = [...geometry.rooms];
  nextRooms[existingIndex] = room;
  return withRooms(geometry, nextRooms);
}

export function removeRoom(geometry: PlanGeometry, roomId: string): PlanGeometry {
  return withRooms(
    geometry,
    geometry.rooms.filter((room) => room.id !== roomId),
  );
}

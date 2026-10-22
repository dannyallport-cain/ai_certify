import type {
  FireAlarmDeviceDetection,
  FireAlarmFloorplanRoom,
  FireAlarmOpening,
  FireAlarmScanSession,
  FireAlarmWallSegment,
} from '../types';
import type { Plan3DVertex } from './plan3d-types';
import type {
  Plan3DOpeningKind,
  Plan3DRoom,
  Plan3DRoomResolution,
  Plan3DWall,
  Plan3DWallOpening,
} from './room-types';
import {
  clamp,
  createVertex,
  distance2D,
  isFiniteNumber,
  lerpVertex,
  normaliseFootprint,
  polygonAreaSquareMeters,
  projectPointOnSegment,
  rectangleFootprint,
} from './geometry';
import { placeDevicesInRoom } from './devices';

const FEET_TO_METERS = 0.3048;

const DEFAULT_ROOM_WIDTH_METERS = 6;
const DEFAULT_ROOM_LENGTH_METERS = 4;
const DEFAULT_ROOM_HEIGHT_METERS = 2.7;
const MIN_ROOM_HEIGHT_METERS = 1.8;
const MAX_ROOM_HEIGHT_METERS = 12;
const SYNTHETIC_ROOM_GAP_METERS = 3;

const WALL_CHAIN_EPSILON_METERS = 0.05;
const MIN_WALL_LENGTH_METERS = 0.1;

const DEFAULT_OPENING_WIDTH_METERS = 0.9;
const DOOR_HEIGHT_METERS = 2.1;
const WINDOW_SILL_METERS = 0.9;
const WINDOW_HEIGHT_METERS = 1.2;
const GENERAL_OPENING_HEIGHT_METERS = 2.05;

export function resolveCoordinateScale(units: 'meters' | 'feet' | undefined): number {
  return units === 'feet' ? FEET_TO_METERS : 1;
}

function footprintFromOutline(
  room: FireAlarmFloorplanRoom,
  scale: number,
): Plan3DVertex[] {
  const outline = room.outline ?? [];

  return normaliseFootprint(
    outline.map((point) => createVertex(point.x * scale, point.y * scale)),
  );
}

/**
 * Chains unordered wall segments into a closed footprint. Segments whose start or end match
 * the current cursor are appended until the chain closes or no candidate remains.
 */
export function footprintFromWallSegments(
  segments: FireAlarmWallSegment[],
  scale: number,
): Plan3DVertex[] {
  const edges = segments
    .filter(
      (segment) =>
        isFiniteNumber(segment.start?.x) &&
        isFiniteNumber(segment.start?.y) &&
        isFiniteNumber(segment.end?.x) &&
        isFiniteNumber(segment.end?.y),
    )
    .map((segment) => ({
      start: createVertex(segment.start.x * scale, segment.start.y * scale),
      end: createVertex(segment.end.x * scale, segment.end.y * scale),
    }))
    .filter((edge) => distance2D(edge.start, edge.end) > WALL_CHAIN_EPSILON_METERS);

  if (edges.length < 3) {
    return [];
  }

  const vertices: Plan3DVertex[] = [edges[0].start, edges[0].end];
  const used = new Set<number>([0]);
  let cursor = edges[0].end;

  for (let step = 0; step < edges.length; step += 1) {
    let matched = false;

    for (let index = 0; index < edges.length; index += 1) {
      if (used.has(index)) {
        continue;
      }

      const edge = edges[index];

      if (distance2D(edge.start, cursor) <= WALL_CHAIN_EPSILON_METERS) {
        vertices.push(edge.end);
        cursor = edge.end;
        used.add(index);
        matched = true;
        break;
      }

      if (distance2D(edge.end, cursor) <= WALL_CHAIN_EPSILON_METERS) {
        vertices.push(edge.start);
        cursor = edge.start;
        used.add(index);
        matched = true;
        break;
      }
    }

    if (!matched) {
      break;
    }
  }

  return normaliseFootprint(vertices);
}

function syntheticFootprint(index: number, areaSquareMeters: number | null | undefined): Plan3DVertex[] {
  const aspectRatio = DEFAULT_ROOM_WIDTH_METERS / DEFAULT_ROOM_LENGTH_METERS;
  const usableArea =
    isFiniteNumber(areaSquareMeters) && areaSquareMeters > 4
      ? areaSquareMeters
      : DEFAULT_ROOM_WIDTH_METERS * DEFAULT_ROOM_LENGTH_METERS;

  const lengthMeters = Math.sqrt(usableArea / aspectRatio);
  const widthMeters = lengthMeters * aspectRatio;
  const originX = index * (widthMeters + SYNTHETIC_ROOM_GAP_METERS);

  return rectangleFootprint(originX, 0, originX + widthMeters, lengthMeters);
}

function resolveRoomHeightMeters(
  room: FireAlarmFloorplanRoom | undefined,
  scale: number,
  fallbackHeightMeters: number,
): number {
  const heights = (room?.wallSegments ?? [])
    .map((segment) => segment.height)
    .filter((height): height is number => isFiniteNumber(height) && height > 0.5)
    .map((height) => height * scale);

  const resolved = heights.length > 0 ? Math.max(...heights) : fallbackHeightMeters;

  return clamp(resolved, MIN_ROOM_HEIGHT_METERS, MAX_ROOM_HEIGHT_METERS);
}

function buildWallsFromFootprint(
  roomId: string,
  footprint: Plan3DVertex[],
  heightMeters: number,
): Plan3DWall[] {
  return footprint.map((vertex, index) => {
    const next = footprint[(index + 1) % footprint.length];

    return {
      id: `${roomId}-wall-${index + 1}`,
      roomId,
      start: vertex,
      end: next,
      heightMeters,
      lengthMeters: distance2D(vertex, next),
    };
  });
}

function buildWalls(
  roomId: string,
  footprint: Plan3DVertex[],
  segments: FireAlarmWallSegment[],
  scale: number,
  heightMeters: number,
): Plan3DWall[] {
  const usable = segments.filter(
    (segment) =>
      isFiniteNumber(segment.start?.x) &&
      isFiniteNumber(segment.start?.y) &&
      isFiniteNumber(segment.end?.x) &&
      isFiniteNumber(segment.end?.y),
  );

  if (usable.length < 3) {
    return buildWallsFromFootprint(roomId, footprint, heightMeters);
  }

  return usable
    .map((segment, index) => {
      const start = createVertex(segment.start.x * scale, segment.start.y * scale);
      const end = createVertex(segment.end.x * scale, segment.end.y * scale);
      const segmentHeight =
        isFiniteNumber(segment.height) && segment.height > 0.5 ? segment.height * scale : heightMeters;

      return {
        id: `${roomId}-wall-${index + 1}`,
        roomId,
        start,
        end,
        heightMeters: clamp(segmentHeight, MIN_ROOM_HEIGHT_METERS, MAX_ROOM_HEIGHT_METERS),
        lengthMeters: distance2D(start, end),
        sourceSegmentId: segment.id || null,
      };
    })
    .filter((wall) => wall.lengthMeters > WALL_CHAIN_EPSILON_METERS);
}

function normaliseOpeningKind(kind: FireAlarmOpening['kind'] | undefined): Plan3DOpeningKind {
  if (kind === 'door' || kind === 'window' || kind === 'opening') {
    return kind;
  }

  return 'unknown';
}

function resolveOpeningHeights(
  kind: Plan3DOpeningKind,
  opening: FireAlarmOpening,
  scale: number,
  wallHeightMeters: number,
): { sillMeters: number; heightMeters: number } {
  const declaredSill = isFiniteNumber(opening.position?.z) ? opening.position.z * scale : null;
  const declaredHeight = isFiniteNumber(opening.height) ? opening.height * scale : null;

  if (kind === 'window') {
    const sillMeters = clamp(declaredSill ?? WINDOW_SILL_METERS, 0.2, wallHeightMeters - 0.3);
    const heightMeters = clamp(
      declaredHeight ?? WINDOW_HEIGHT_METERS,
      0.3,
      wallHeightMeters - sillMeters,
    );

    return { sillMeters, heightMeters };
  }

  const sillMeters = kind === 'door' ? 0 : clamp(declaredSill ?? 0, 0, wallHeightMeters - 0.3);
  const fallbackHeight = kind === 'door' ? DOOR_HEIGHT_METERS : GENERAL_OPENING_HEIGHT_METERS;
  const heightMeters = clamp(
    declaredHeight ?? fallbackHeight,
    0.3,
    wallHeightMeters - sillMeters,
  );

  return { sillMeters, heightMeters };
}

function resolveOpenings(
  room: FireAlarmFloorplanRoom | undefined,
  walls: Plan3DWall[],
  scale: number,
): Plan3DWallOpening[] {
  const openings = room?.openings ?? [];

  if (walls.length === 0) {
    return [];
  }

  return openings.flatMap((opening, index) => {
    const position = opening.position;
    let openingWall: Plan3DWall | null = null;
    let centerRatio = 0.5;

    if (position && isFiniteNumber(position.x) && isFiniteNumber(position.y)) {
      const point = { x: position.x * scale, y: position.y * scale };
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const candidate of walls) {
        const projection = projectPointOnSegment(point, candidate.start, candidate.end);

        if (projection.distance < bestDistance) {
          bestDistance = projection.distance;
          openingWall = candidate;
          centerRatio = projection.t;
        }
      }
    } else if (opening.wallSegmentId) {
      // The capture can name the wall without giving a position; centre the opening on that wall
      // rather than dropping it from the plan.
      openingWall =
        walls.find(
          (candidate) =>
            candidate.sourceSegmentId === opening.wallSegmentId ||
            candidate.id === opening.wallSegmentId,
        ) ?? null;
    }

    if (!openingWall) {
      return [];
    }

    const wall = openingWall;
    const wallLength = Math.max(wall.lengthMeters, MIN_WALL_LENGTH_METERS);
    const desiredWidth = (isFiniteNumber(opening.width) ? opening.width : DEFAULT_OPENING_WIDTH_METERS) * scale;
    const widthMeters = clamp(desiredWidth, 0.3, Math.max(wallLength - 0.1, 0.3));
    const halfRatio = widthMeters / 2 / wallLength;
    const clampedRatio = clamp(centerRatio, halfRatio, 1 - halfRatio);
    const kind = normaliseOpeningKind(opening.kind);
    const { sillMeters, heightMeters } = resolveOpeningHeights(kind, opening, scale, wall.heightMeters);

    const start = lerpVertex(wall.start, wall.end, clampedRatio - halfRatio);
    const end = lerpVertex(wall.start, wall.end, clampedRatio + halfRatio);

    return [
      {
        id: opening.id || `${wall.id}-opening-${index + 1}`,
        roomId: wall.roomId,
        kind,
        start: createVertex(start.x, start.y, sillMeters),
        end: createVertex(end.x, end.y, sillMeters),
        sillMeters,
        heightMeters,
      },
    ];
  });
}

interface RoomDefinition {
  id: string;
  name: string;
  source?: FireAlarmFloorplanRoom;
}

function resolveRoomDefinitions(session: FireAlarmScanSession): RoomDefinition[] {
  const sourceRooms = session.floorplan?.rooms ?? [];

  if (sourceRooms.length > 0) {
    return sourceRooms.map((room, index) => ({
      id: room.id || `${session.id}-room-${index + 1}`,
      name: room.name?.trim() || `Room ${index + 1}`,
      source: room,
    }));
  }

  const declaredRoomIds = Array.from(
    new Set(
      (session.devices ?? [])
        .map((device) => device.roomId)
        .filter((roomId): roomId is string => typeof roomId === 'string' && roomId.length > 0),
    ),
  );

  if (declaredRoomIds.length > 0) {
    return declaredRoomIds.map((roomId) => ({ id: roomId, name: roomId }));
  }

  return [
    {
      id: `${session.id}-room-1`,
      name: session.metadata.sessionName?.trim() || 'Captured room',
    },
  ];
}

function assignDevicesToRooms(
  devices: FireAlarmDeviceDetection[],
  roomIds: string[],
): Map<string, FireAlarmDeviceDetection[]> {
  const grouped = new Map<string, FireAlarmDeviceDetection[]>();
  roomIds.forEach((roomId) => grouped.set(roomId, []));

  const fallbackRoomId = roomIds[0];

  devices.forEach((device) => {
    const targetRoomId =
      device.roomId && grouped.has(device.roomId) ? device.roomId : fallbackRoomId;

    if (!targetRoomId) {
      return;
    }

    grouped.get(targetRoomId)?.push(device);
  });

  return grouped;
}

/** Builds the 3D room set used by the plan generator from a captured session. */
export function resolvePlan3DRooms(
  session: FireAlarmScanSession,
  fallbackWallHeightMeters?: number,
): Plan3DRoomResolution {
  const scale = resolveCoordinateScale(session.floorplan?.units);
  const fallbackHeight = clamp(
    fallbackWallHeightMeters ?? DEFAULT_ROOM_HEIGHT_METERS,
    MIN_ROOM_HEIGHT_METERS,
    MAX_ROOM_HEIGHT_METERS,
  );

  const definitions = resolveRoomDefinitions(session);
  const groupedDevices = assignDevicesToRooms(session.devices ?? [], definitions.map((room) => room.id));
  const warnings: string[] = [];

  if ((session.floorplan?.rooms?.length ?? 0) === 0) {
    warnings.push(
      'No captured room geometry was available, so representative rooms were generated for the plan.',
    );
  }

  const rooms = definitions.map((definition, index) => {
    const source = definition.source;
    const fromOutline = source ? footprintFromOutline(source, scale) : [];
    const fromSegments =
      fromOutline.length >= 3 ? [] : footprintFromWallSegments(source?.wallSegments ?? [], scale);

    const capturedFootprint = fromOutline.length >= 3 ? fromOutline : fromSegments;
    const synthesized = capturedFootprint.length < 3;
    const footprint = synthesized
      ? syntheticFootprint(index, source?.areaSquareMeters)
      : capturedFootprint;

    if (synthesized) {
      warnings.push(`Room "${definition.name}" had no captured footprint; a representative room was generated.`);
    }

    const heightMeters = resolveRoomHeightMeters(source, scale, fallbackHeight);
    const walls = buildWalls(
      definition.id,
      footprint,
      source?.wallSegments ?? [],
      scale,
      heightMeters,
    );
    const openings = resolveOpenings(source, walls, scale);
    const devices = groupedDevices.get(definition.id) ?? [];

    return {
      id: definition.id,
      name: definition.name,
      footprint,
      walls,
      openings,
      heightMeters,
      floorAreaSquareMeters: polygonAreaSquareMeters(footprint),
      synthesized,
      devices: placeDevicesInRoom({
        devices,
        footprint,
        roomHeightMeters: heightMeters,
        synthesized,
        coordinateScale: scale,
      }),
    } satisfies Plan3DRoom;
  });

  return { rooms, warnings };
}

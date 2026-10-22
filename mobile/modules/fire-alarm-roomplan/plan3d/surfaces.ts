import type { Plan3DLayer, Plan3DSegmentKind, Plan3DSurfaceKind, Plan3DVertex } from './plan3d-types';
import type { Plan3DRoom, Plan3DWallOpening } from './room-types';
import { hatchFootprint } from './hatch';
import { createVertex, distance2D, polygonCentroid2D, wallPanelCorners } from './geometry';

export interface WorldSurface {
  id: string;
  kind: Plan3DSurfaceKind;
  layer: Plan3DLayer;
  roomId: string;
  vertices: Plan3DVertex[];
}

export interface WorldLine {
  id: string;
  kind: Plan3DSegmentKind;
  layer: Plan3DLayer;
  roomId: string | null;
  start: Plan3DVertex;
  end: Plan3DVertex;
  dashed: boolean;
}

export interface RoomSurfaces {
  surfaces: WorldSurface[];
  lines: WorldLine[];
}

export interface RoomSurfaceOptions {
  showCeiling: boolean;
  showFloorGrid: boolean;
  gridSpacingMeters: number;
}

/** Nudges opening panels toward the room interior so they sit in front of the wall face. */
const OPENING_INSET_METERS = 0.04;

function insetTowardInterior(
  start: Plan3DVertex,
  end: Plan3DVertex,
  interior: { x: number; y: number },
  insetMeters: number,
): { start: Plan3DVertex; end: Plan3DVertex } {
  const wallMidpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const dx = interior.x - wallMidpoint.x;
  const dy = interior.y - wallMidpoint.y;
  const length = Math.hypot(dx, dy);

  if (length < 1e-4) {
    return { start, end };
  }

  const offsetX = (dx / length) * insetMeters;
  const offsetY = (dy / length) * insetMeters;

  return {
    start: { x: start.x + offsetX, y: start.y + offsetY, z: start.z },
    end: { x: end.x + offsetX, y: end.y + offsetY, z: end.z },
  };
}

function openingPanelVertices(
  opening: Plan3DWallOpening,
  interior: { x: number; y: number },
): Plan3DVertex[] {
  const { start, end } = insetTowardInterior(
    opening.start,
    opening.end,
    interior,
    OPENING_INSET_METERS,
  );

  return wallPanelCorners(start, end, opening.sillMeters, opening.heightMeters);
}

function openingOutlineLines(
  opening: Plan3DWallOpening,
  interior: { x: number; y: number },
  roomId: string,
): WorldLine[] {
  const corners = openingPanelVertices(opening, interior);

  return corners.map((corner, index) => ({
    id: `${opening.id}-edge-${index + 1}`,
    kind: 'opening' as Plan3DSegmentKind,
    layer: 'structure' as Plan3DLayer,
    roomId,
    start: corner,
    end: corners[(index + 1) % corners.length],
    dashed: false,
  }));
}

function footprintOutlineLines(
  footprint: Plan3DVertex[],
  roomId: string,
  z: number,
  kind: Plan3DSegmentKind,
): WorldLine[] {
  return footprint.map((vertex, index) => {
    const next = footprint[(index + 1) % footprint.length];

    return {
      id: `${roomId}-${kind}-${index + 1}`,
      kind,
      layer: (kind === 'floor-outline' ? 'base' : 'structure') as Plan3DLayer,
      roomId,
      start: createVertex(vertex.x, vertex.y, z),
      end: createVertex(next.x, next.y, z),
      dashed: false,
    };
  });
}

function verticalCornerLines(room: Plan3DRoom, footprint: Plan3DVertex[]): WorldLine[] {
  const corners: Plan3DVertex[] = [];
  const seen = new Set<string>();

  const addCorner = (vertex: Plan3DVertex) => {
    const key = `${vertex.x.toFixed(3)}:${vertex.y.toFixed(3)}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    corners.push(vertex);
  };

  room.walls.forEach((wall) => addCorner(wall.start));
  footprint.forEach(addCorner);

  return corners
    .filter((corner) => {
      const inside = room.walls.some(
        (wall) =>
          distance2D(wall.start, corner) < 0.02 || distance2D(wall.end, corner) < 0.02,
      );
      return inside;
    })
    .map((corner, index) => ({
      id: `${room.id}-corner-${index + 1}`,
      kind: 'wall-corner' as Plan3DSegmentKind,
      layer: 'structure' as Plan3DLayer,
      roomId: room.id,
      start: createVertex(corner.x, corner.y, 0),
      end: createVertex(corner.x, corner.y, room.heightMeters),
      dashed: false,
    }));
}

/** Converts one resolved room into the world-space surfaces and lines for the plan. */
export function buildRoomSurfaces(room: Plan3DRoom, options: RoomSurfaceOptions): RoomSurfaces {
  const surfaces: WorldSurface[] = [];
  const lines: WorldLine[] = [];

  if (room.footprint.length < 3) {
    return { surfaces, lines };
  }

  const interior = polygonCentroid2D(room.footprint);

  surfaces.push({
    id: `${room.id}-floor`,
    kind: 'floor',
    layer: 'base',
    roomId: room.id,
    vertices: room.footprint.map((vertex) => createVertex(vertex.x, vertex.y, 0)),
  });

  lines.push(...footprintOutlineLines(room.footprint, room.id, 0, 'floor-outline'));

  if (options.showCeiling) {
    surfaces.push({
      id: `${room.id}-ceiling`,
      kind: 'ceiling',
      layer: 'structure',
      roomId: room.id,
      vertices: room.footprint.map((vertex) =>
        createVertex(vertex.x, vertex.y, room.heightMeters),
      ),
    });

    lines.push(
      ...footprintOutlineLines(room.footprint, room.id, room.heightMeters, 'ceiling-outline'),
    );
  }

  room.walls.forEach((wall, index) => {
    surfaces.push({
      id: `${room.id}-wall-surface-${index + 1}`,
      kind: 'wall',
      layer: 'structure',
      roomId: room.id,
      vertices: wallPanelCorners(wall.start, wall.end, 0, wall.heightMeters),
    });

    lines.push({
      id: `${room.id}-wall-top-${index + 1}`,
      kind: 'wall-outline',
      layer: 'structure',
      roomId: room.id,
      start: createVertex(wall.start.x, wall.start.y, wall.heightMeters),
      end: createVertex(wall.end.x, wall.end.y, wall.heightMeters),
      dashed: false,
    });
  });

  lines.push(...verticalCornerLines(room, room.footprint));

  room.openings.forEach((opening, index) => {
    surfaces.push({
      id: `${room.id}-opening-surface-${index + 1}`,
      kind: 'opening',
      layer: 'structure',
      roomId: room.id,
      vertices: openingPanelVertices(opening, interior),
    });

    lines.push(...openingOutlineLines(opening, interior, room.id));
  });

  if (options.showFloorGrid) {
    const hatch = hatchFootprint(room.footprint, options.gridSpacingMeters, 0);

    hatch.forEach((segment, index) => {
      lines.push({
        id: `${room.id}-grid-${index + 1}`,
        kind: 'floor-grid',
        layer: 'base',
        roomId: room.id,
        start: createVertex(segment.start.x, segment.start.y, 0),
        end: createVertex(segment.end.x, segment.end.y, 0),
        dashed: true,
      });
    });
  }

  return { surfaces, lines };
}

/** Picks a sensible floor grid spacing for the overall plan size. */
export function resolveGridSpacingMeters(maxDimensionMeters: number): number {
  if (maxDimensionMeters > 24) {
    return 5;
  }

  if (maxDimensionMeters > 12) {
    return 2;
  }

  return 1;
}

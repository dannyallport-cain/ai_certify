import { pointsToPath, projectPoint3D, type PlanCamera, type PlanPoint3D } from './projection';
import type { PlanGeometry, PlanOpeningMarker, PlanWallSegment } from './plan-geometry';
import {
  PLAN_WALL_STROKE,
  PLAN_WALL_TOP_FILL,
  openingColour,
  wallFaceColour,
} from './plan-theme';
import type { PlanScenePolygon } from './plan-scene-types';

function averageDepth(points: PlanPoint3D[], camera: PlanCamera): number {
  const total = points.reduce((sum, point) => sum + projectPoint3D(point, camera).depth, 0);
  return total / points.length;
}

function wallAngle(wall: PlanWallSegment): number {
  return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
}

/**
 * True when the wall stands between the camera and the room interior. Those "near" faces are
 * culled so the plan reads as an open-top dollhouse view instead of hiding the floor behind them.
 */
function isNearSideWall(wall: PlanWallSegment, geometry: PlanGeometry, camera: PlanCamera): boolean {
  const room = geometry.rooms.find((candidate) => candidate.id === wall.roomId);

  if (!room) {
    return false;
  }

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const midX = (wall.start.x + wall.end.x) / 2;
  const midY = (wall.start.y + wall.end.y) / 2;
  const toCentreX = room.centroid.x - midX;
  const toCentreY = room.centroid.y - midY;
  const perpendicularX = -dy / length;
  const perpendicularY = dx / length;
  const orientation = perpendicularX * toCentreX + perpendicularY * toCentreY >= 0 ? -1 : 1;
  const outwardX = perpendicularX * orientation;
  const outwardY = perpendicularY * orientation;
  const viewX = Math.sin(camera.yaw);
  const viewY = Math.cos(camera.yaw);

  return outwardX * viewX + outwardY * viewY < -0.05;
}

function buildWallFace(wall: PlanWallSegment, camera: PlanCamera): PlanScenePolygon {
  const corners: PlanPoint3D[] = [
    { x: wall.start.x, y: wall.start.y, z: 0 },
    { x: wall.end.x, y: wall.end.y, z: 0 },
    { x: wall.end.x, y: wall.end.y, z: wall.height },
    { x: wall.start.x, y: wall.start.y, z: wall.height },
  ];
  const projected = corners.map((corner) => projectPoint3D(corner, camera));

  return {
    id: `wall-face-${wall.id}`,
    kind: 'wall-face',
    path: pointsToPath(projected),
    depth: averageDepth(corners, camera),
    fill: wallFaceColour(wallAngle(wall), camera.yaw),
    stroke: PLAN_WALL_STROKE,
    strokeWidth: 1,
    opacity: 1,
  };
}

function buildWallTop(wall: PlanWallSegment, camera: PlanCamera): PlanScenePolygon {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const offsetX = (-dy / length) * (wall.thickness / 2);
  const offsetY = (dx / length) * (wall.thickness / 2);
  const corners: PlanPoint3D[] = [
    { x: wall.start.x + offsetX, y: wall.start.y + offsetY, z: wall.height },
    { x: wall.end.x + offsetX, y: wall.end.y + offsetY, z: wall.height },
    { x: wall.end.x - offsetX, y: wall.end.y - offsetY, z: wall.height },
    { x: wall.start.x - offsetX, y: wall.start.y - offsetY, z: wall.height },
  ];
  const projected = corners.map((corner) => projectPoint3D(corner, camera));

  return {
    id: `wall-top-${wall.id}`,
    kind: 'wall-top',
    path: pointsToPath(projected),
    depth: averageDepth(corners, camera) - 0.001,
    fill: PLAN_WALL_TOP_FILL,
    stroke: PLAN_WALL_STROKE,
    strokeWidth: 0.6,
    opacity: 1,
  };
}

function findWall(geometry: PlanGeometry, opening: PlanOpeningMarker): PlanWallSegment | null {
  if (opening.wallSegmentId) {
    const match = geometry.walls.find((wall) => wall.id === opening.wallSegmentId);
    if (match) {
      return match;
    }
  }

  return geometry.walls.find((wall) => wall.roomId === opening.roomId) ?? null;
}

function nearestPointOnWall(wall: PlanWallSegment, x: number, y: number) {
  const abx = wall.end.x - wall.start.x;
  const aby = wall.end.y - wall.start.y;
  const lengthSquared = abx * abx + aby * aby;

  if (lengthSquared === 0) {
    return { x: wall.start.x, y: wall.start.y };
  }

  const t = Math.max(0, Math.min(1, ((x - wall.start.x) * abx + (y - wall.start.y) * aby) / lengthSquared));
  return { x: wall.start.x + t * abx, y: wall.start.y + t * aby };
}

function buildOpening(
  opening: PlanOpeningMarker,
  geometry: PlanGeometry,
  camera: PlanCamera,
): PlanScenePolygon | null {
  const wall = findWall(geometry, opening);

  if (!wall) {
    return null;
  }

  const centre = nearestPointOnWall(wall, opening.position.x, opening.position.y);
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy) || 1;
  const unitX = dx / length;
  const unitY = dy / length;
  const halfWidth = Math.min(opening.width, wall.length) / 2;
  const topHeight = Math.min(opening.height, wall.height);

  const corners: PlanPoint3D[] = [
    { x: centre.x - unitX * halfWidth, y: centre.y - unitY * halfWidth, z: 0 },
    { x: centre.x + unitX * halfWidth, y: centre.y + unitY * halfWidth, z: 0 },
    { x: centre.x + unitX * halfWidth, y: centre.y + unitY * halfWidth, z: topHeight },
    { x: centre.x - unitX * halfWidth, y: centre.y - unitY * halfWidth, z: topHeight },
  ];
  const projected = corners.map((corner) => projectPoint3D(corner, camera));

  return {
    id: `opening-${opening.id}`,
    kind: 'opening',
    path: pointsToPath(projected),
    depth: averageDepth(corners, camera) - 0.02,
    fill: openingColour(opening.kind),
    stroke: PLAN_WALL_STROKE,
    strokeWidth: 0.8,
    opacity: opening.kind === 'door' ? 0.85 : 0.7,
  };
}

export function buildWallPolygons(
  geometry: PlanGeometry,
  camera: PlanCamera,
): PlanScenePolygon[] {
  const walls = geometry.walls.flatMap((wall) => {
    const top = buildWallTop(wall, camera);

    if (isNearSideWall(wall, geometry, camera)) {
      return [top];
    }

    return [buildWallFace(wall, camera), top];
  });
  const openings = geometry.openings
    .filter((opening) => {
      const wall = findWall(geometry, opening);

      return !wall || !isNearSideWall(wall, geometry, camera);
    })
    .map((opening) => buildOpening(opening, geometry, camera))
    .filter((opening): opening is PlanScenePolygon => opening !== null);

  return [...walls, ...openings].sort((left, right) => right.depth - left.depth);
}

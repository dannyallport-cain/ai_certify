import { pointsToPath, projectPoint3D, type PlanCamera } from './projection';
import type { PlanGeometry } from './plan-geometry';
import { PLAN_FLOOR_FILL, PLAN_FLOOR_STROKE, PLAN_GRID_STROKE, PLAN_ROOM_LABEL } from './plan-theme';
import type { PlanSceneLine, PlanScenePolygon, PlanSceneText } from './plan-scene-types';

const MAX_GRID_LINES = 34;

export function buildFloorPolygons(
  geometry: PlanGeometry,
  camera: PlanCamera,
): PlanScenePolygon[] {
  return geometry.rooms.map((room) => {
    const projected = room.outline.map((point) => projectPoint3D({ ...point, z: 0 }, camera));
    const centre = projectPoint3D({ ...room.centroid, z: 0 }, camera);

    return {
      id: `floor-${room.id}`,
      kind: 'floor',
      path: pointsToPath(projected),
      depth: centre.depth,
      fill: PLAN_FLOOR_FILL,
      stroke: PLAN_FLOOR_STROKE,
      strokeWidth: 1.5,
      opacity: 1,
    } satisfies PlanScenePolygon;
  });
}

const ROOM_LABEL_INSET = 0.45;

/**
 * Places the room label near the corner that projects highest on screen, pulled inwards
 * towards the centroid. The centroid is where devices cluster, so a centred label used to
 * collide with the device labels sitting on top of the markers.
 */
export function buildRoomLabels(geometry: PlanGeometry, camera: PlanCamera): PlanSceneText[] {
  return geometry.rooms.map((room) => {
    const centre = projectPoint3D({ ...room.centroid, z: 0 }, camera);
    const outline = room.outline.map((point) => projectPoint3D({ ...point, z: 0 }, camera));
    const anchorPoint = outline.reduce(
      (highest, point) => (point.y < highest.y ? point : highest),
      outline[0] ?? centre,
    );
    const labelX = anchorPoint.x + (centre.x - anchorPoint.x) * ROOM_LABEL_INSET;
    const labelY = anchorPoint.y + (centre.y - anchorPoint.y) * ROOM_LABEL_INSET - 3;

    return {
      id: `room-label-${room.id}`,
      x: labelX,
      y: labelY,
      text: `${room.name} · ${room.areaSquareMeters.toFixed(1)} m²`,
      colour: PLAN_ROOM_LABEL,
      fontSize: 10,
      anchor: 'middle',
      weight: '600',
      depth: centre.depth,
    } satisfies PlanSceneText;
  });
}

function gridStepFor(geometry: PlanGeometry): number {
  const longestSide = Math.max(geometry.bounds.width, geometry.bounds.height, 1);
  return Math.max(1, Math.ceil(longestSide / MAX_GRID_LINES));
}

export function buildGridLines(geometry: PlanGeometry, camera: PlanCamera): PlanSceneLine[] {
  if (!geometry.hasGeometry) {
    return [];
  }

  const step = gridStepFor(geometry);
  const minX = Math.floor(geometry.bounds.minX - step);
  const maxX = Math.ceil(geometry.bounds.maxX + step);
  const minY = Math.floor(geometry.bounds.minY - step);
  const maxY = Math.ceil(geometry.bounds.maxY + step);
  const lines: PlanSceneLine[] = [];

  for (let x = minX; x <= maxX; x += step) {
    const start = projectPoint3D({ x, y: minY, z: 0 }, camera);
    const end = projectPoint3D({ x, y: maxY, z: 0 }, camera);
    lines.push({
      id: `grid-x-${x}`,
      kind: 'grid',
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: PLAN_GRID_STROKE,
      strokeWidth: 1,
      dashArray: null,
      opacity: 1,
      depth: (start.depth + end.depth) / 2,
    });
  }

  for (let y = minY; y <= maxY; y += step) {
    const start = projectPoint3D({ x: minX, y, z: 0 }, camera);
    const end = projectPoint3D({ x: maxX, y, z: 0 }, camera);
    lines.push({
      id: `grid-y-${y}`,
      kind: 'grid',
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: PLAN_GRID_STROKE,
      strokeWidth: 1,
      dashArray: null,
      opacity: 1,
      depth: (start.depth + end.depth) / 2,
    });
  }

  return lines;
}

export function describeGrid(geometry: PlanGeometry): string | null {
  if (!geometry.hasGeometry) {
    return null;
  }

  return `Grid ${gridStepFor(geometry)} m`;
}

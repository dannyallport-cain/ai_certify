import type {
  Plan3DCamera,
  Plan3DLayer,
  Plan3DPolygon,
  Plan3DSegment,
  Plan3DSegmentKind,
  Plan3DSurfaceKind,
  Plan3DVertex,
  Plan3DViewport,
} from './plan3d-types';
import type { Plan3DPalette } from './palette';
import type { WorldLine, WorldSurface } from './surfaces';
import { quadFromProjectedPoints } from './geometry';
import { mapProjectedPoint, projectVertex } from './projection';

const LAYER_ORDER: Record<Plan3DLayer, number> = {
  base: 0,
  zone: 1,
  structure: 2,
  overlay: 3,
};

interface SurfaceStyle {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
}

interface SegmentStyle {
  colour: string;
  width: number;
  opacity: number;
}

function surfaceStyle(kind: Plan3DSurfaceKind, palette: Plan3DPalette): SurfaceStyle {
  switch (kind) {
    case 'floor':
      return {
        fill: palette.floorFill,
        fillOpacity: palette.floorFillOpacity,
        stroke: palette.floorStroke,
        strokeWidth: 1.4,
      };
    case 'ceiling':
      return {
        fill: palette.ceilingFill,
        fillOpacity: palette.ceilingFillOpacity,
        stroke: palette.ceilingStroke,
        strokeWidth: 1,
      };
    case 'opening':
      return {
        fill: palette.openingFill,
        fillOpacity: palette.openingFillOpacity,
        stroke: palette.openingStroke,
        strokeWidth: 1.2,
      };
    case 'wall':
    default:
      return {
        fill: palette.wallFill,
        fillOpacity: palette.wallFillOpacity,
        stroke: palette.wallStroke,
        strokeWidth: 1,
      };
  }
}

function segmentStyle(kind: Plan3DSegmentKind, palette: Plan3DPalette): SegmentStyle {
  switch (kind) {
    case 'floor-outline':
      return { colour: palette.floorStroke, width: 1.4, opacity: 0.95 };
    case 'wall-outline':
      return { colour: palette.wallTopStroke, width: 1.3, opacity: 0.95 };
    case 'wall-corner':
      return { colour: palette.wallCorner, width: 1, opacity: 0.7 };
    case 'ceiling-outline':
      return { colour: palette.ceilingStroke, width: 1, opacity: 0.85 };
    case 'opening':
      return { colour: palette.openingStroke, width: 1.2, opacity: 0.95 };
    case 'leader':
      return { colour: palette.leader, width: 1, opacity: palette.leaderOpacity };
    case 'floor-grid':
    default:
      return { colour: palette.floorGrid, width: 0.8, opacity: palette.floorGridOpacity };
  }
}

function depthOf(vertices: Plan3DVertex[], camera: Plan3DCamera): number {
  if (vertices.length === 0) {
    return 0;
  }

  const total = vertices.reduce((sum, vertex) => sum + projectVertex(vertex, camera).depth, 0);

  return total / vertices.length;
}

export function collectWorldVertices(surfaces: WorldSurface[], lines: WorldLine[]): Plan3DVertex[] {
  const vertices: Plan3DVertex[] = [];

  surfaces.forEach((surface) => vertices.push(...surface.vertices));
  lines.forEach((line) => {
    vertices.push(line.start, line.end);
  });

  return vertices;
}

export function buildPlan3DPolygons(input: {
  surfaces: WorldSurface[];
  camera: Plan3DCamera;
  viewport: Plan3DViewport;
  palette: Plan3DPalette;
}): Plan3DPolygon[] {
  const { surfaces, camera, viewport, palette } = input;

  return surfaces
    .filter((surface) => surface.vertices.length >= 3)
    .map((surface) => {
      const points = surface.vertices.map((vertex) =>
        mapProjectedPoint(projectVertex(vertex, camera), viewport),
      );
      const style = surfaceStyle(surface.kind, palette);

      return {
        id: surface.id,
        kind: surface.kind,
        layer: surface.layer,
        roomId: surface.roomId,
        points,
        fill: style.fill,
        fillOpacity: style.fillOpacity,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        depth: depthOf(surface.vertices, camera),
        quad: quadFromProjectedPoints(points),
      } satisfies Plan3DPolygon;
    })
    .sort(
      (left, right) =>
        LAYER_ORDER[left.layer] - LAYER_ORDER[right.layer] || right.depth - left.depth,
    );
}

export function buildPlan3DSegments(input: {
  lines: WorldLine[];
  camera: Plan3DCamera;
  viewport: Plan3DViewport;
  palette: Plan3DPalette;
}): Plan3DSegment[] {
  const { lines, camera, viewport, palette } = input;

  return lines
    .map((line) => {
      const style = segmentStyle(line.kind, palette);
      const from = mapProjectedPoint(projectVertex(line.start, camera), viewport);
      const to = mapProjectedPoint(projectVertex(line.end, camera), viewport);
      const depth =
        (projectVertex(line.start, camera).depth + projectVertex(line.end, camera).depth) / 2;

      return {
        id: line.id,
        kind: line.kind,
        layer: line.layer,
        from,
        to,
        colour: style.colour,
        width: style.width,
        opacity: style.opacity,
        depth,
        dashed: line.dashed,
      } satisfies Plan3DSegment;
    })
    .sort(
      (left, right) =>
        LAYER_ORDER[left.layer] - LAYER_ORDER[right.layer] || right.depth - left.depth,
    );
}

export { LAYER_ORDER };

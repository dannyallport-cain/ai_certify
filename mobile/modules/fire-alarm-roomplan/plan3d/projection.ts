import type {
  Plan3DCamera,
  Plan3DPoint,
  Plan3DProjection,
  Plan3DVertex,
  Plan3DViewport,
} from './plan3d-types';
import { clamp, degreesToRadians, normaliseDegrees } from './geometry';

export interface ProjectedPoint {
  x: number;
  y: number;
  /** Distance along the view direction. Larger values are further from the camera. */
  depth: number;
}

export interface ProjectedBounds2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const DEFAULT_PLAN3D_WALL_HEIGHT_METERS = 2.7;

const MIN_WALL_HEIGHT_METERS = 1.8;
const MAX_WALL_HEIGHT_METERS = 12;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

const PROJECTION_PRESETS: Record<Plan3DProjection, { yawDegrees: number; pitchDegrees: number }> = {
  isometric: { yawDegrees: 45, pitchDegrees: 30 },
  dimetric: { yawDegrees: 20, pitchDegrees: 20 },
  'top-down': { yawDegrees: 0, pitchDegrees: 90 },
};

export const PLAN3D_PROJECTIONS: Plan3DProjection[] = ['isometric', 'dimetric', 'top-down'];

const PROJECTION_LABELS: Record<Plan3DProjection, string> = {
  isometric: 'Isometric',
  dimetric: 'Dimetric',
  'top-down': 'Plan view',
};

export function getPlan3DProjectionLabel(projection: Plan3DProjection): string {
  return PROJECTION_LABELS[projection] ?? PROJECTION_LABELS.isometric;
}

/** Default camera angles for a projection, used when a host switches view mode. */
export function getPlan3DProjectionPreset(projection: Plan3DProjection): {
  yawDegrees: number;
  pitchDegrees: number;
} {
  const preset = PROJECTION_PRESETS[projection] ?? PROJECTION_PRESETS.isometric;

  return { yawDegrees: preset.yawDegrees, pitchDegrees: preset.pitchDegrees };
}

export function resolvePlan3DCamera(
  overrides?: Partial<Plan3DCamera>,
  fallbackWallHeightMeters?: number,
): Plan3DCamera {
  const projection = overrides?.projection ?? 'isometric';
  const preset = PROJECTION_PRESETS[projection] ?? PROJECTION_PRESETS.isometric;
  const wallHeight = overrides?.wallHeightMeters ?? fallbackWallHeightMeters ?? DEFAULT_PLAN3D_WALL_HEIGHT_METERS;

  return {
    projection,
    yawDegrees: normaliseDegrees(overrides?.yawDegrees ?? preset.yawDegrees),
    pitchDegrees: clamp(overrides?.pitchDegrees ?? preset.pitchDegrees, 0, 90),
    zoom: clamp(overrides?.zoom ?? 1, MIN_ZOOM, MAX_ZOOM),
    wallHeightMeters: clamp(wallHeight, MIN_WALL_HEIGHT_METERS, MAX_WALL_HEIGHT_METERS),
    showCeiling: overrides?.showCeiling ?? false,
    showFloorGrid: overrides?.showFloorGrid ?? true,
    showDevices: overrides?.showDevices ?? true,
    showLabels: overrides?.showLabels ?? true,
  };
}

/**
 * Orthographic projection. The room is first spun around the vertical axis by `yawDegrees`,
 * then the camera tilts down by `pitchDegrees`. `y` on screen grows downwards, so a
 * pitch of 90 degrees reproduces a plain plan view with the world y axis pointing down.
 */
export function projectVertex(vertex: Plan3DVertex, camera: Plan3DCamera): ProjectedPoint {
  const yaw = degreesToRadians(camera.yawDegrees);
  const pitch = degreesToRadians(camera.pitchDegrees);

  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  const rotatedX = vertex.x * cosYaw - vertex.y * sinYaw;
  const rotatedY = vertex.x * sinYaw + vertex.y * cosYaw;

  return {
    x: rotatedX,
    y: sinPitch * rotatedY - cosPitch * vertex.z,
    depth: cosPitch * rotatedY - sinPitch * vertex.z,
  };
}

export function emptyProjectedBounds(): ProjectedBounds2D {
  return {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

export function expandProjectedBounds(
  bounds: ProjectedBounds2D,
  point: ProjectedPoint,
): ProjectedBounds2D {
  return {
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxY: Math.max(bounds.maxY, point.y),
  };
}

export function finaliseProjectedBounds(bounds: ProjectedBounds2D): ProjectedBounds2D {
  const valid =
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxY);

  if (!valid) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  return {
    minX: bounds.minX,
    maxX: width < 1e-4 ? bounds.minX + 0.5 : bounds.maxX,
    minY: bounds.minY,
    maxY: height < 1e-4 ? bounds.minY + 0.5 : bounds.maxY,
  };
}

/**
 * Fits the projected bounds into the viewport and returns the resolved transform.
 * `zoom` multiplies the fit scale so hosts can offer a zoom control.
 */
export function createPlan3DViewport(
  config: Partial<Plan3DViewport> | undefined,
  projectedBounds: ProjectedBounds2D,
  zoom: number,
): Plan3DViewport {
  const width = Math.max(config?.width ?? 320, 1);
  const height = Math.max(config?.height ?? 320, 1);
  const padding = clamp(config?.padding ?? 24, 0, Math.min(width, height) / 2 - 1);

  const safeBounds = finaliseProjectedBounds(projectedBounds);
  const rawWidth = Math.max(safeBounds.maxX - safeBounds.minX, 1e-3);
  const rawHeight = Math.max(safeBounds.maxY - safeBounds.minY, 1e-3);

  const availableWidth = Math.max(width - padding * 2, 1);
  const availableHeight = Math.max(height - padding * 2, 1);
  const fitScale = Math.min(availableWidth / rawWidth, availableHeight / rawHeight);
  const scale = fitScale * clamp(zoom, MIN_ZOOM, MAX_ZOOM);

  return {
    width,
    height,
    padding,
    scale,
    offsetX: (width - rawWidth * scale) / 2 - safeBounds.minX * scale,
    offsetY: (height - rawHeight * scale) / 2 - safeBounds.minY * scale,
  };
}

export function mapProjectedPoint(point: ProjectedPoint, viewport: Plan3DViewport): Plan3DPoint {
  return {
    x: point.x * viewport.scale + viewport.offsetX,
    y: point.y * viewport.scale + viewport.offsetY,
  };
}

import { clamp, type PlanBounds, type PlanPoint } from './geometry-math';

export interface PlanPoint3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
}

export interface PlanCamera {
  yaw: number;
  pitch: number;
  scale: number;
  originX: number;
  originY: number;
  centre: PlanPoint3D;
  viewportWidth: number;
  viewportHeight: number;
}

export interface PlanCameraOptions {
  yaw: number;
  pitch: number;
  zoom?: number;
  padding?: number;
  wallHeight?: number;
}

export interface PlanViewport {
  width: number;
  height: number;
}

export const DEFAULT_CAMERA_YAW = -0.62;
export const DEFAULT_CAMERA_PITCH = 0.92;
export const MIN_CAMERA_PITCH = 0.14;
export const MAX_CAMERA_PITCH = Math.PI / 2 - 0.02;
export const TOP_DOWN_PITCH = MAX_CAMERA_PITCH;
export const MIN_ZOOM = 0.55;
export const MAX_ZOOM = 2.6;

/**
 * Projects a metre-space point into screen space using an isometric-style camera.
 * `yaw` rotates around the vertical axis, `pitch` is the camera elevation above the floor.
 */
export function projectPoint3D(point: PlanPoint3D, camera: PlanCamera): ProjectedPoint {
  const dx = point.x - camera.centre.x;
  const dy = point.y - camera.centre.y;
  const dz = point.z - camera.centre.z;

  const sinYaw = Math.sin(camera.yaw);
  const cosYaw = Math.cos(camera.yaw);
  const sinPitch = Math.sin(camera.pitch);
  const cosPitch = Math.cos(camera.pitch);

  const screenX = (dx * cosYaw - dy * sinYaw) * camera.scale + camera.originX;
  const screenY =
    -(dx * sinYaw * sinPitch + dy * cosYaw * sinPitch + dz * cosPitch) * camera.scale +
    camera.originY;
  const depth = dx * sinYaw * cosPitch + dy * cosYaw * cosPitch - dz * sinPitch;

  return { x: screenX, y: screenY, depth };
}

export function projectGroundPoint(point: PlanPoint, camera: PlanCamera): ProjectedPoint {
  return projectPoint3D({ x: point.x, y: point.y, z: 0 }, camera);
}

/**
 * Screen length in pixels of one metre measured on the floor plane, taking the longer of the
 * two ground axes so the value reflects the least foreshortened direction. Used for the scale
 * bar, which would otherwise under-report whenever the camera yaw compresses an axis.
 */
export function groundMetreScreenLength(camera: PlanCamera): number {
  const origin = projectGroundPoint({ x: camera.centre.x, y: camera.centre.y }, camera);
  const alongX = projectGroundPoint({ x: camera.centre.x + 1, y: camera.centre.y }, camera);
  const alongY = projectGroundPoint({ x: camera.centre.x, y: camera.centre.y + 1 }, camera);

  return Math.max(
    Math.hypot(alongX.x - origin.x, alongX.y - origin.y),
    Math.hypot(alongY.x - origin.x, alongY.y - origin.y),
  );
}

/**
 * Inverse of {@link projectPoint3D} restricted to the floor plane (z = 0).
 * Used to translate a tap on the plan back into metre-space coordinates.
 */
export function unprojectGroundPoint(screen: PlanPoint, camera: PlanCamera): PlanPoint | null {
  const sinYaw = Math.sin(camera.yaw);
  const cosYaw = Math.cos(camera.yaw);
  const sinPitch = Math.sin(camera.pitch);
  const cosPitch = Math.cos(camera.pitch);

  if (sinPitch < 0.12) {
    return null;
  }

  const rotatedX = (screen.x - camera.originX) / camera.scale;
  const rotatedY = -(screen.y - camera.originY) / camera.scale;
  const groundOffset = -camera.centre.z;
  const depth = (rotatedY - groundOffset * cosPitch) / sinPitch;

  const dx = rotatedX * cosYaw + depth * sinYaw;
  const dy = -rotatedX * sinYaw + depth * cosYaw;

  return { x: dx + camera.centre.x, y: dy + camera.centre.y };
}

function fitScale(
  bounds: PlanBounds,
  wallHeight: number,
  viewport: PlanViewport,
  options: { yaw: number; pitch: number; padding: number },
): { scale: number; offsetX: number; offsetY: number; centre: PlanPoint3D } {
  const centre: PlanPoint3D = {
    x: bounds.minX + bounds.width / 2,
    y: bounds.minY + bounds.height / 2,
    z: wallHeight / 2,
  };

  const corners: PlanPoint3D[] = [];
  [bounds.minX, bounds.maxX].forEach((x) => {
    [bounds.minY, bounds.maxY].forEach((y) => {
      [0, wallHeight].forEach((z) => corners.push({ x, y, z }));
    });
  });

  const reference: PlanCamera = {
    yaw: options.yaw,
    pitch: options.pitch,
    scale: 1,
    originX: 0,
    originY: 0,
    centre,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  };

  const projected = corners.map((corner) => projectPoint3D(corner, reference));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const usableWidth = Math.max(viewport.width - options.padding * 2, 120);
  const usableHeight = Math.max(viewport.height - options.padding * 2, 120);
  const scale = Math.min(usableWidth / spanX, usableHeight / spanY);

  return {
    scale,
    offsetX: viewport.width / 2 - ((minX + maxX) / 2) * scale,
    offsetY: viewport.height / 2 - ((minY + maxY) / 2) * scale,
    centre,
  };
}

export function createPlanCamera(
  bounds: PlanBounds,
  viewport: PlanViewport,
  options: PlanCameraOptions,
): PlanCamera {
  const pitch = clamp(options.pitch, MIN_CAMERA_PITCH, MAX_CAMERA_PITCH);
  const zoom = clamp(options.zoom ?? 1, MIN_ZOOM, MAX_ZOOM);
  const fitted = fitScale(bounds, options.wallHeight ?? 2.7, viewport, {
    yaw: options.yaw,
    pitch,
    padding: options.padding ?? 26,
  });

  return {
    yaw: options.yaw,
    pitch,
    scale: fitted.scale * zoom,
    originX: viewport.width / 2 + (fitted.offsetX - viewport.width / 2) * zoom,
    originY: viewport.height / 2 + (fitted.offsetY - viewport.height / 2) * zoom,
    centre: fitted.centre,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  };
}

export function pointsToPath(points: PlanPoint[], close = true): string {
  if (points.length === 0) {
    return '';
  }

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  return close ? `${path} Z` : path;
}

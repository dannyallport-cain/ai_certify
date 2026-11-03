import type { DesignPoint } from './types';
import type { PolygonBounds } from './geometry';
import { clamp } from './geometry';

/**
 * Mapping between world metres and canvas pixels.
 *
 * Every floor is fitted to the same transform so the building footprint stays in the same place
 * on screen when the surveyor switches storeys: moving between floors then reads as moving up a
 * building rather than as opening a different drawing.
 */
export interface DesignViewport {
  width: number;
  height: number;
  padding: number;
  /** Pixels per metre. */
  scale: number;
  offsetX: number;
  offsetY: number;
  worldBounds: PolygonBounds;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export const DEFAULT_VIEWPORT_WIDTH = 960;
export const DEFAULT_VIEWPORT_HEIGHT = 640;
export const DEFAULT_VIEWPORT_PADDING = 40;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

/** A bounds box with no extent cannot be scaled; fall back to a one metre box. */
function safeBounds(bounds: PolygonBounds): PolygonBounds {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {
      minX: Number.isFinite(bounds.minX) ? bounds.minX : 0,
      maxX: (Number.isFinite(bounds.minX) ? bounds.minX : 0) + 1,
      minY: Number.isFinite(bounds.minY) ? bounds.minY : 0,
      maxY: (Number.isFinite(bounds.minY) ? bounds.minY : 0) + 1,
    };
  }

  return bounds;
}

export interface CreateViewportOptions {
  width?: number;
  height?: number;
  padding?: number;
  zoom?: number;
}

/**
 * Fits a bounds box into a canvas no larger than the requested size.
 *
 * The canvas then shrinks to the drawn content instead of staying a fixed landscape box, because a
 * deep, narrow site fitted into 1000 × 680 leaves most of the sheet empty and draws the plan
 * smaller than it needs to be. The requested size stays a cap, so a wide plan still gets a wide
 * sheet and the layout never jumps around while floors are switched.
 */
export function createViewport(
  bounds: PolygonBounds,
  options: CreateViewportOptions = {},
): DesignViewport {
  const maxWidth = Math.max(options.width ?? DEFAULT_VIEWPORT_WIDTH, 120);
  const maxHeight = Math.max(options.height ?? DEFAULT_VIEWPORT_HEIGHT, 120);
  const padding = clamp(
    options.padding ?? DEFAULT_VIEWPORT_PADDING,
    0,
    Math.min(maxWidth, maxHeight) / 2 - 2,
  );
  const worldBounds = safeBounds(bounds);

  const worldWidth = worldBounds.maxX - worldBounds.minX;
  const worldHeight = worldBounds.maxY - worldBounds.minY;

  const availableWidth = Math.max(maxWidth - padding * 2, 1);
  const availableHeight = Math.max(maxHeight - padding * 2, 1);
  const fitScale = Math.min(availableWidth / worldWidth, availableHeight / worldHeight);
  const scale = fitScale * clamp(options.zoom ?? 1, MIN_ZOOM, MAX_ZOOM);

  const width = Math.max(Math.min(maxWidth, worldWidth * scale + padding * 2), 120);
  const height = Math.max(Math.min(maxHeight, worldHeight * scale + padding * 2), 120);

  return {
    width,
    height,
    padding,
    scale,
    offsetX: (width - worldWidth * scale) / 2 - worldBounds.minX * scale,
    offsetY: (height - worldHeight * scale) / 2 - worldBounds.minY * scale,
    worldBounds,
  };
}

export function worldToScreen(point: DesignPoint, viewport: DesignViewport): ScreenPoint {
  return {
    x: point.x * viewport.scale + viewport.offsetX,
    y: point.y * viewport.scale + viewport.offsetY,
  };
}

export function screenToWorld(point: ScreenPoint, viewport: DesignViewport): DesignPoint {
  return {
    x: (point.x - viewport.offsetX) / viewport.scale,
    y: (point.y - viewport.offsetY) / viewport.scale,
  };
}

/** Converts a pixel distance (a hit tolerance, typically) into metres. */
export function pixelsToMeters(pixels: number, viewport: DesignViewport): number {
  return pixels / viewport.scale;
}

/** Converts the transform used for `viewBox` rendering, so React and string output agree. */
export function viewportToViewBox(viewport: DesignViewport): string {
  return `0 0 ${viewport.width} ${viewport.height}`;
}

/**
 * Device symbols are drawn at a constant pixel size regardless of zoom, because a detector is
 * an annotation rather than a physical object. This is the symbol box size in pixels.
 */
export const DEVICE_SYMBOL_PIXELS = 30;
export const MIN_DEVICE_SYMBOL_PIXELS = 20;
export const MAX_DEVICE_SYMBOL_PIXELS = 46;

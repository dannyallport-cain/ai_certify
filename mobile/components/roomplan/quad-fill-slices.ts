import type { Plan3DQuad } from '@/modules/fire-alarm-roomplan';

export interface QuadFillSlice {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface QuadFillOptions {
  /** Preferred height of each horizontal slice, in canvas pixels. */
  sliceHeight?: number;
  /** Cap on the number of slices, so a huge quad cannot flood the view tree. */
  maxSlices?: number;
}

const DEFAULT_SLICE_HEIGHT_PX = 3;
const DEFAULT_MAX_SLICES = 160;
/** A span narrower than this is a rasterisation artefact rather than real coverage. */
const MIN_SPAN_WIDTH_PX = 0.5;

type Point = { x: number; y: number };

function quadCorners(quad: Plan3DQuad): Point[] {
  const { origin, u, v } = quad;

  return [
    { x: origin.x, y: origin.y },
    { x: origin.x + u.x, y: origin.y + u.y },
    { x: origin.x + u.x + v.x, y: origin.y + u.y + v.y },
    { x: origin.x + v.x, y: origin.y + v.y },
  ];
}

/** Horizontal span of a convex polygon at one scanline, or null when the line misses it. */
function spanAt(corners: Point[], y: number): { left: number; right: number } | null {
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < corners.length; index += 1) {
    const current = corners[index];
    const next = corners[(index + 1) % corners.length];
    const crossesLine = current.y <= y !== next.y <= y;

    if (!crossesLine) {
      continue;
    }

    const x = current.x + ((y - current.y) * (next.x - current.x)) / (next.y - current.y);

    left = Math.min(left, x);
    right = Math.max(right, x);
  }

  if (!Number.isFinite(left) || !Number.isFinite(right) || right - left < MIN_SPAN_WIDTH_PX) {
    return null;
  }

  return { left, right };
}
/**
 * Rasterises a projected quad into horizontal slices.
 *
 * Native transforms cannot place an arbitrary parallelogram reliably (a 3x3 matrix is rejected
 * outright and the 4x4 form is applied in a different unit space on device), so surface fills are
 * built from plain rectangles instead: no transform support needed, identical on every platform.
 */
export function quadFillSlices(
  quad: Plan3DQuad,
  options: QuadFillOptions = {},
): QuadFillSlice[] {
  const corners = quadCorners(quad);

  if (corners.some((corner) => !Number.isFinite(corner.x) || !Number.isFinite(corner.y))) {
    return [];
  }

  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxY = Math.max(...corners.map((corner) => corner.y));
  const height = maxY - minY;

  if (height < 1) {
    return [];
  }

  const maxSlices = Math.max(options.maxSlices ?? DEFAULT_MAX_SLICES, 1);
  const sliceHeight = Math.max(
    options.sliceHeight ?? DEFAULT_SLICE_HEIGHT_PX,
    height / maxSlices,
  );
  const slices: QuadFillSlice[] = [];

  for (let top = minY; top < maxY; top += sliceHeight) {
    const span = spanAt(corners, top + sliceHeight / 2);

    if (!span) {
      continue;
    }

    slices.push({
      key: `slice-${Math.round(top * 10)}`,
      left: span.left,
      top,
      width: span.right - span.left,
      height: sliceHeight + 0.5,
    });
  }

  return slices;
}

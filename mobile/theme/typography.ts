/**
 * Type scale for the app. Text sizes are computed in points rather than taken
 * from Tailwind classes so the Settings font-size control can scale every
 * screen at once, live, without a rebuild of the stylesheet.
 */

export type FontScaleKey = 'small' | 'medium' | 'large' | 'xlarge';

export const FONT_SCALE_ORDER: FontScaleKey[] = ['small', 'medium', 'large', 'xlarge'];

export const FONT_SCALE_LABELS: Record<FontScaleKey, string> = {
  small: 'Small',
  medium: 'Default',
  large: 'Large',
  xlarge: 'Extra large',
};

/** Multiplier applied to every type role. */
export const FONT_SCALE_MULTIPLIERS: Record<FontScaleKey, number> = {
  small: 0.9,
  medium: 1,
  large: 1.15,
  xlarge: 1.3,
};

export const DEFAULT_FONT_SCALE: FontScaleKey = 'medium';

export type TypeRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption';

/** Base point sizes at the default font scale. */
const BASE_SIZES: Record<TypeRole, number> = {
  display: 26,
  title: 21,
  heading: 17,
  subheading: 15,
  body: 14,
  bodyStrong: 14,
  label: 12,
  caption: 11,
};

const LINE_HEIGHT_RATIO = 1.38;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
  letterSpacing?: number;
}

const WEIGHTS: Record<TypeRole, TypeStyle['fontWeight']> = {
  display: '800',
  title: '700',
  heading: '700',
  subheading: '600',
  body: '400',
  bodyStrong: '600',
  label: '700',
  caption: '500',
};

/** Label text is rendered in caps, so it needs a touch of tracking. */
const TRACKING: Partial<Record<TypeRole, number>> = {
  label: 0.6,
};

export function typeStyle(role: TypeRole, scale: FontScaleKey): TypeStyle {
  const multiplier = FONT_SCALE_MULTIPLIERS[scale];
  const fontSize = roundToHalf(BASE_SIZES[role] * multiplier);

  return {
    fontSize,
    lineHeight: roundToHalf(fontSize * LINE_HEIGHT_RATIO),
    fontWeight: WEIGHTS[role],
    letterSpacing: TRACKING[role],
  };
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function isFontScaleKey(value: unknown): value is FontScaleKey {
  return typeof value === 'string' && FONT_SCALE_ORDER.includes(value as FontScaleKey);
}

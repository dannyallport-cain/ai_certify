/**
 * Colours for the design drawing.
 *
 * Zone fills must stay readable as semi-transparent overlays over a light floor plan, must be
 * distinguishable from each other on a printed sheet and must not repeat the device accent
 * colours. That rules out very pale tints and anything close to the detector teal or call point
 * red, so the set below is deliberately saturated and evenly spaced around the hue wheel.
 */

export const DESIGN_ZONE_COLOURS: string[] = [
  '#F97316',
  '#0EA5E9',
  '#22C55E',
  '#A855F7',
  '#EAB308',
  '#EC4899',
  '#14B8A6',
  '#EF4444',
  '#8B5CF6',
  '#84CC16',
];

export const DEFAULT_ZONE_OPACITY = 0.22;
export const MIN_ZONE_OPACITY = 0.05;
export const MAX_ZONE_OPACITY = 0.6;

/** Keeps a zone fill translucent enough that device symbols and room names stay readable. */
export function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ZONE_OPACITY;
  }

  return Math.min(Math.max(value, MIN_ZONE_OPACITY), MAX_ZONE_OPACITY);
}

const HEX_COLOUR_PATTERN = /^#([0-9a-fA-F]{6})$/;

/**
 * Darkens a hex colour towards black.
 *
 * Zone references are printed in their own zone's colour so the key and the fill visibly belong
 * together, but a saturated fill colour as text is unreadable on its own tint. Darkening keeps the
 * hue identity and restores the contrast.
 */
export function darkenColour(colour: string, amount = 0.4): string {
  const match = HEX_COLOUR_PATTERN.exec(colour);

  if (!match) {
    return colour;
  }

  const value = match[1];
  const factor = Math.min(Math.max(1 - amount, 0), 1);
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16);

    return Math.round(channel * factor)
      .toString(16)
      .padStart(2, '0');
  });

  return `#${channels.join('')}`;
}

const FALLBACK_ZONE_COLOUR = DESIGN_ZONE_COLOURS[0];

export function getZoneColour(index: number): string {
  if (!Number.isFinite(index) || index < 0) {
    return FALLBACK_ZONE_COLOUR;
  }

  return DESIGN_ZONE_COLOURS[Math.floor(index) % DESIGN_ZONE_COLOURS.length];
}

export interface DesignDrawingPalette {
  surface: string;
  canvasBackground: string;
  grid: string;
  gridMajor: string;
  selection: string;
  drafting: string;
  text: string;
  mutedText: string;
  halo: string;
}

export const DESIGN_PALETTE: DesignDrawingPalette = {
  surface: '#FFFFFF',
  canvasBackground: '#F1F5F9',
  grid: '#E2E8F0',
  gridMajor: '#CBD5E1',
  selection: '#0F172A',
  drafting: '#2563EB',
  text: '#0F172A',
  mutedText: '#64748B',
  halo: '#FFFFFF',
};

/** Grid spacing in metres, chosen so the grid stays readable at typical building scales. */
export const DESIGN_GRID_SPACING_METERS = 1;

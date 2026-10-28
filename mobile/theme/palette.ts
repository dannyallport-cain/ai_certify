/**
 * Raw colour values for the app. Everything that paints a surface, text or
 * border should reference one of these roles rather than a literal hex, so
 * light and dark stay in step.
 */
export interface ThemePalette {
  /** Page background behind cards. */
  canvas: string;
  /** Raised card background. */
  surface: string;
  /** Inset/secondary panel inside a card. */
  surfaceAlt: string;
  /** Hairline borders and dividers. */
  line: string;
  /** Strong border for focused/selected states. */
  lineStrong: string;
  /** Primary text. */
  ink: string;
  /** Secondary text and labels. */
  inkMuted: string;
  /** Faint text, placeholders, disabled. */
  inkSoft: string;
  /** Brand blue — actions and active navigation. */
  brand: string;
  /** Tinted brand background for chips and icon wells. */
  brandSoft: string;
  /** Text placed on a solid brand fill. */
  onBrand: string;
  /** Text placed on a solid dark/brand fill in dark mode too. */
  onSolid: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  /** Scrim behind modals and drawers. */
  scrim: string;
}

export const LIGHT_PALETTE: ThemePalette = {
  canvas: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  line: '#E2E8F0',
  lineStrong: '#CBD5E1',
  ink: '#0F172A',
  inkMuted: '#52627A',
  inkSoft: '#8B9AB0',
  brand: '#0D47A1',
  brandSoft: '#E3F2FD',
  onBrand: '#FFFFFF',
  onSolid: '#FFFFFF',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  scrim: 'rgba(15, 23, 42, 0.45)',
};

export const DARK_PALETTE: ThemePalette = {
  canvas: '#0A1120',
  surface: '#131D31',
  surfaceAlt: '#1A2740',
  line: '#28374F',
  lineStrong: '#3A4C6B',
  ink: '#EAF1FB',
  inkMuted: '#A3B4CC',
  inkSoft: '#7688A3',
  brand: '#5B9BFF',
  brandSoft: '#16264A',
  onBrand: '#04101F',
  onSolid: '#FFFFFF',
  success: '#4ADE80',
  successSoft: '#123121',
  warning: '#FBBF24',
  warningSoft: '#3A2A0B',
  danger: '#F87171',
  dangerSoft: '#3B1517',
  info: '#93C5FD',
  infoSoft: '#122440',
  scrim: 'rgba(2, 6, 16, 0.7)',
};

export type ThemeScheme = 'light' | 'dark';

export function paletteFor(scheme: ThemeScheme): ThemePalette {
  return scheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

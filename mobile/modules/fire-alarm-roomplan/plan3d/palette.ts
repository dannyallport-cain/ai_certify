import type { FireAlarmDeviceType } from '../types';
import type { Plan3DColourScheme } from './plan3d-types';

export interface Plan3DPalette {
  surfaceBackground: string;
  floorFill: string;
  floorFillOpacity: number;
  floorStroke: string;
  floorGrid: string;
  floorGridOpacity: number;
  wallFill: string;
  wallFillOpacity: number;
  wallStroke: string;
  wallTopStroke: string;
  wallCorner: string;
  ceilingFill: string;
  ceilingFillOpacity: number;
  ceilingStroke: string;
  openingFill: string;
  openingFillOpacity: number;
  openingStroke: string;
  leader: string;
  leaderOpacity: number;
  roomLabel: string;
  /**
   * Device label text. Kept neutral rather than reusing the device accent because pale accents
   * (green, cyan) are unreadable as small text on a light surface.
   */
  deviceLabel: string;
  caption: string;
}

const BLUEPRINT: Plan3DPalette = {
  surfaceBackground: '#0B1727',
  floorFill: '#1D4ED8',
  floorFillOpacity: 0.22,
  floorStroke: '#7DD3FC',
  floorGrid: '#60A5FA',
  floorGridOpacity: 0.5,
  wallFill: '#27405F',
  wallFillOpacity: 0.62,
  wallStroke: '#93C5FD',
  wallTopStroke: '#DBEAFE',
  wallCorner: '#BFDBFE',
  ceilingFill: '#0F172A',
  ceilingFillOpacity: 0.4,
  ceilingStroke: '#64748B',
  openingFill: '#F59E0B',
  openingFillOpacity: 0.45,
  openingStroke: '#FCD34D',
  leader: '#94A3B8',
  leaderOpacity: 0.6,
  roomLabel: '#E2E8F0',
  deviceLabel: '#CBD8E8',
  caption: '#94A3B8',
};

const SCHEMATIC: Plan3DPalette = {
  surfaceBackground: '#FFFFFF',
  floorFill: '#DBEAFE',
  floorFillOpacity: 0.9,
  floorStroke: '#1D4ED8',
  floorGrid: '#93C5FD',
  floorGridOpacity: 0.7,
  wallFill: '#CBD5E1',
  wallFillOpacity: 0.95,
  wallStroke: '#0F172A',
  wallTopStroke: '#1E293B',
  wallCorner: '#0F172A',
  ceilingFill: '#F1F5F9',
  ceilingFillOpacity: 0.6,
  ceilingStroke: '#94A3B8',
  openingFill: '#FDE68A',
  openingFillOpacity: 1,
  openingStroke: '#B45309',
  leader: '#475569',
  leaderOpacity: 0.7,
  roomLabel: '#0F172A',
  deviceLabel: '#1E293B',
  caption: '#475569',
};

export function getPlan3DPalette(scheme: Plan3DColourScheme): Plan3DPalette {
  return scheme === 'schematic' ? SCHEMATIC : BLUEPRINT;
}

export interface Plan3DDeviceStyle {
  label: string;
  glyph: string;
  colour: string;
}

const DEVICE_STYLES: Record<FireAlarmDeviceType, Plan3DDeviceStyle> = {
  panel: { label: 'Control panel', glyph: 'FACP', colour: '#F97316' },
  sounder: { label: 'Sounder', glyph: 'SND', colour: '#22D3EE' },
  detector: { label: 'Detector', glyph: 'DET', colour: '#34D399' },
  interface: { label: 'Interface', glyph: 'INT', colour: '#38BDF8' },
  io_unit: { label: 'I/O unit', glyph: 'I/O', colour: '#FBBF24' },
  vad: { label: 'VAD / beacon', glyph: 'VAD', colour: '#F472B6' },
  unknown: { label: 'Unidentified', glyph: '?', colour: '#94A3B8' },
};

const FALLBACK_DEVICE_STYLE: Plan3DDeviceStyle = DEVICE_STYLES.unknown;

export function getPlan3DDeviceStyle(
  type: FireAlarmDeviceType | string | null | undefined,
): Plan3DDeviceStyle {
  if (!type) {
    return FALLBACK_DEVICE_STYLE;
  }

  return DEVICE_STYLES[type as FireAlarmDeviceType] ?? FALLBACK_DEVICE_STYLE;
}

export const PLAN3D_DEVICE_TYPE_ORDER: FireAlarmDeviceType[] = [
  'panel',
  'detector',
  'sounder',
  'vad',
  'interface',
  'io_unit',
  'unknown',
];

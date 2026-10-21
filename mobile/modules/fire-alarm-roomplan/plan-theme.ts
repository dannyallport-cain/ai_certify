import type { FireAlarmDeviceType } from './types';

export const PLAN_PAGE_BACKGROUND = '#F5F7FA';
export const PLAN_CANVAS_BACKGROUND = '#FFFFFF';
export const PLAN_FLOOR_FILL = '#EDF3FE';
export const PLAN_FLOOR_STROKE = '#C7D8F5';
export const PLAN_GRID_STROKE = '#E1E9F7';
export const PLAN_ROOM_LABEL = '#5C7CA6';
export const PLAN_WALL_STROKE = '#122A47';

export const PLAN_WALL_TOP_FILL = '#0D47A1';
export const PLAN_WALL_FACE_LIGHT = '#5B84B6';
export const PLAN_WALL_FACE_MID = '#3D6191';
export const PLAN_WALL_FACE_DARK = '#2C476B';

export const PLAN_COVERAGE_FILL = '#0D47A1';
export const PLAN_SELECTED_RING = '#0D47A1';
export const PLAN_UNIDENTIFIED_STROKE = '#94A3B8';

export const DEVICE_COLOURS: Record<FireAlarmDeviceType, string> = {
  panel: '#B91C1C',
  detector: '#EA580C',
  sounder: '#7C3AED',
  vad: '#DB2777',
  interface: '#0891B2',
  io_unit: '#65A30D',
  unknown: '#64748B',
};

export const OPENING_COLOURS: Record<string, string> = {
  door: '#F59E0B',
  window: '#38BDF8',
  opening: '#A78BFA',
  unknown: '#94A3B8',
};

export function deviceColour(type: FireAlarmDeviceType | undefined): string {
  if (!type) {
    return DEVICE_COLOURS.unknown;
  }

  return DEVICE_COLOURS[type] ?? DEVICE_COLOURS.unknown;
}

export function openingColour(kind: string | undefined): string {
  if (!kind) {
    return OPENING_COLOURS.unknown;
  }

  return OPENING_COLOURS[kind] ?? OPENING_COLOURS.unknown;
}

/**
 * Picks a wall shade from the angle between the wall and the camera so that surfaces
 * facing the viewer read brighter than surfaces seen almost edge-on.
 */
export function wallFaceColour(wallAngleRadians: number, cameraYaw: number): string {
  const facing = Math.abs(Math.sin(wallAngleRadians - cameraYaw));

  if (facing >= 0.72) {
    return PLAN_WALL_FACE_LIGHT;
  }

  if (facing >= 0.38) {
    return PLAN_WALL_FACE_MID;
  }

  return PLAN_WALL_FACE_DARK;
}

import type { FireAlarmDeviceDetection } from '../types';
import type { Plan3DMounting, Plan3DVertex } from './plan3d-types';

export interface Plan3DWall {
  id: string;
  roomId: string;
  start: Plan3DVertex;
  end: Plan3DVertex;
  heightMeters: number;
  lengthMeters: number;
  /** Id of the captured segment this wall came from, so openings can be matched back to it. */
  sourceSegmentId?: string | null;
}

export type Plan3DOpeningKind = 'door' | 'window' | 'opening' | 'unknown';

export interface Plan3DWallOpening {
  id: string;
  roomId: string;
  kind: Plan3DOpeningKind;
  start: Plan3DVertex;
  end: Plan3DVertex;
  sillMeters: number;
  heightMeters: number;
}

export interface Plan3DPlacedDevice {
  device: FireAlarmDeviceDetection;
  worldPosition: Plan3DVertex;
  mounting: Plan3DMounting;
  /** True when the capture gave no usable position and the plan inferred one. */
  inferredPosition: boolean;
}

export interface Plan3DRoom {
  id: string;
  name: string;
  footprint: Plan3DVertex[];
  walls: Plan3DWall[];
  openings: Plan3DWallOpening[];
  heightMeters: number;
  floorAreaSquareMeters: number;
  /** True when no usable geometry existed and a representative room was generated. */
  synthesized: boolean;
  devices: Plan3DPlacedDevice[];
}

export interface Plan3DRoomResolution {
  rooms: Plan3DRoom[];
  warnings: string[];
}

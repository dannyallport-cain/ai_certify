export type {
  FireAlarmPlan3D,
  FireAlarmPlan3DInput,
  FireAlarmPlan3DOptions,
  Plan3DBounds,
  Plan3DCamera,
  Plan3DColourScheme,
  Plan3DLayer,
  Plan3DLegendEntry,
  Plan3DMarker,
  Plan3DMounting,
  Plan3DPoint,
  Plan3DPolygon,
  Plan3DProjection,
  Plan3DQuad,
  Plan3DSegment,
  Plan3DSegmentKind,
  Plan3DStats,
  Plan3DSurfaceKind,
  Plan3DText,
  Plan3DVertex,
  Plan3DViewport,
} from './plan3d-types';

export type {
  Plan3DOpeningKind,
  Plan3DPlacedDevice,
  Plan3DRoom,
  Plan3DRoomResolution,
  Plan3DWall,
  Plan3DWallOpening,
} from './room-types';

export type { Plan3DPalette, Plan3DDeviceStyle } from './palette';

export type { FireAlarmPlan3DSvgOptions } from './svg';

export {
  generateFireAlarmPlan3D,
  generateFireAlarmPlan3DFromInput,
} from './generator';

export {
  renderFireAlarmPlan3DSvg,
  renderFireAlarmPlan3DSvgDataUri,
} from './svg';

export {
  getPlan3DDeviceStyle,
  getPlan3DPalette,
  PLAN3D_DEVICE_TYPE_ORDER,
} from './palette';

export {
  DEFAULT_PLAN3D_WALL_HEIGHT_METERS,
  PLAN3D_PROJECTIONS,
  createPlan3DViewport,
  getPlan3DProjectionLabel,
  getPlan3DProjectionPreset,
  projectVertex,
  resolvePlan3DCamera,
} from './projection';

export { resolvePlan3DRooms } from './rooms';

export {
  createVertex,
  projectPointOnSegment,
  quadFromProjectedPoints,
} from './geometry';

export { createSampleScanSession } from './sample-session';

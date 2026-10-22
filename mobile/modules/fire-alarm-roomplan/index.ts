export { FireAlarmRoomPlan } from './FireAlarmRoomPlanModule';

export type {
  FireAlarmCaptureLifecyclePhase,
  FireAlarmDeviceBoundingBox,
  FireAlarmDeviceDetection,
  FireAlarmDevicePoint,
  FireAlarmDeviceType,
  FireAlarmEvidenceFrame,
  FireAlarmFloorplan,
  FireAlarmFloorplanRoom,
  FireAlarmManufacturer,
  FireAlarmOpening,
  FireAlarmRoomPlanDetectionEvent,
  FireAlarmRoomPlanEventMap,
  FireAlarmRoomPlanExportOptions,
  FireAlarmRoomPlanProgressEvent,
  FireAlarmRoomPlanSessionEvent,
  FireAlarmRoomPlanStartOptions,
  FireAlarmRoomPlanStatusEvent,
  FireAlarmRoomPlanSubscription,
  FireAlarmRoomPlanSupportInfo,
  FireAlarmScanError,
  FireAlarmScanSession,
  FireAlarmScanSessionMetadata,
  FireAlarmScanStatus,
  FireAlarmWallSegment,
} from './types';

export type {
  FireAlarmAnalysisJob,
  FireAlarmAnalysisJobStatus,
  FireAlarmAnalysisRequest,
  FireAlarmAnalysisResult,
  FireAlarmCapturePose,
  FireAlarmDeviceCandidate,
  FireAlarmManufacturerFinding,
  FireAlarmMediaAsset,
  FireAlarmMediaAssetDimensions,
  FireAlarmMediaAssetOrigin,
  FireAlarmMediaAssetType,
  FireAlarmModelProviderMetadata,
  FireAlarmOcrTextFinding,
  FireAlarmPlacementMapping,
  FireAlarmPortableSessionPayload,
  FireAlarmRecognitionPipelineConfig,
  FireAlarmRecognitionPipelineStageConfig,
  FireAlarmReviewStatus,
  FireAlarmRoomBoundary,
  FireAlarmRoomGeometry,
  FireAlarmRoomSurface,
  FireAlarmRoomVertex,
} from './pipeline';

export type {
  FireAlarmBoundingBox,
  FireAlarmCandidateSource,
} from './pipeline-types';

export { createFireAlarmRecognitionPipelineConfig } from './config';

export { MockFireAlarmRecognitionAnalyzer } from './analyzers';

export { FireAlarmRecognitionOrchestrator } from './orchestrator';

export {
  createAnalysisJobFromSession,
  buildAnalysisRequest,
  mapFindingsToFloorplan,
  exportPortableSessionPayload,
  defaultFireAlarmRecognitionPipelineConfig,
} from './pipeline';

export type {
  FireAlarmPlan3D,
  FireAlarmPlan3DInput,
  FireAlarmPlan3DOptions,
  FireAlarmPlan3DSvgOptions,
  Plan3DBounds,
  Plan3DCamera,
  Plan3DColourScheme,
  Plan3DDeviceStyle,
  Plan3DLayer,
  Plan3DLegendEntry,
  Plan3DMarker,
  Plan3DMounting,
  Plan3DOpeningKind,
  Plan3DPalette,
  Plan3DPlacedDevice,
  Plan3DPoint,
  Plan3DPolygon,
  Plan3DProjection,
  Plan3DQuad,
  Plan3DRoom,
  Plan3DRoomResolution,
  Plan3DSegment,
  Plan3DSegmentKind,
  Plan3DStats,
  Plan3DSurfaceKind,
  Plan3DText,
  Plan3DVertex,
  Plan3DViewport,
  Plan3DWall,
  Plan3DWallOpening,
} from './plan3d';

export {
  DEFAULT_PLAN3D_WALL_HEIGHT_METERS,
  PLAN3D_PROJECTIONS,
  createPlan3DViewport,
  createSampleScanSession,
  generateFireAlarmPlan3D,
  generateFireAlarmPlan3DFromInput,
  getPlan3DDeviceStyle,
  getPlan3DPalette,
  getPlan3DProjectionLabel,
  getPlan3DProjectionPreset,
  projectVertex,
  renderFireAlarmPlan3DSvg,
  renderFireAlarmPlan3DSvgDataUri,
  resolvePlan3DCamera,
  resolvePlan3DRooms,
} from './plan3d';

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

// ── 3D plan geometry, projection and coverage ─────────────────────────────────

export {
  clamp,
  computeBounds,
  distanceBetween,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  polygonPerimeter,
  type PlanBounds,
  type PlanPoint,
} from './geometry-math';

export {
  DEFAULT_ROOM_DEPTH_METERS,
  DEFAULT_ROOM_WIDTH_METERS,
  DEFAULT_WALL_HEIGHT_METERS,
  DEFAULT_WALL_THICKNESS_METERS,
  EMPTY_PLAN_GEOMETRY,
  buildPlanGeometry,
  normalizeRoomShape,
  toPlanPoint,
  type PlanGeometry,
  type PlanGeometrySource,
  type PlanOpeningMarker,
  type PlanRoomShape,
  type PlanWallSegment,
} from './plan-geometry';

export {
  assemblePlanGeometry,
  createRectangularRoom,
  removeRoom,
  upsertRoom,
  withRooms,
  type ManualRoomInput,
} from './plan-geometry-manual';

export {
  DEFAULT_CAMERA_PITCH,
  DEFAULT_CAMERA_YAW,
  MAX_CAMERA_PITCH,
  MAX_ZOOM,
  MIN_CAMERA_PITCH,
  MIN_ZOOM,
  TOP_DOWN_PITCH,
  createPlanCamera,
  groundMetreScreenLength,
  projectGroundPoint,
  projectPoint3D,
  pointsToPath,
  unprojectGroundPoint,
  type PlanCamera,
  type PlanCameraOptions,
  type PlanPoint3D,
  type PlanViewport,
  type ProjectedPoint,
} from './projection';

export {
  DEFAULT_SAMPLE_SPACING_METERS,
  INDICATIVE_COVERAGE_PROFILES,
  analysePlanCoverage,
  coverageRadiusFor,
  type CoverageDeviceInput,
  type CoverageGap,
  type CoverageOptions,
  type CoverageProfile,
  type CoverageReport,
  type DetectorClass,
  type RoomCoverage,
} from './plan-coverage';

export {
  DEVICE_COLOURS,
  OPENING_COLOURS,
  PLAN_CANVAS_BACKGROUND,
  PLAN_FLOOR_FILL,
  PLAN_PAGE_BACKGROUND,
  deviceColour,
  openingColour,
  wallFaceColour,
} from './plan-theme';

export {
  resolveDeviceHeight,
  resolveLabelCollisions,
  toSceneDevice,
  type DeviceSceneInput,
  type DeviceSceneOutput,
} from './plan-scene-devices';

export { buildPlanScene, sortByDepthDescending, type PlanSceneOptions } from './plan-scene';

export type {
  PlanPolygonKind,
  PlanScene,
  PlanSceneClipPath,
  PlanSceneDevice,
  PlanSceneEllipse,
  PlanSceneLine,
  PlanSceneMarker,
  PlanScenePolygon,
  PlanSceneText,
} from './plan-scene-types';

export { createPlanSnapshot, type PlanSnapshot, type PlanSnapshotOptions } from './plan-service';

export {
  suggestDetectorPositions,
  type AutoPlaceOptions,
  type AutoPlaceResult,
} from './plan-autoplace';

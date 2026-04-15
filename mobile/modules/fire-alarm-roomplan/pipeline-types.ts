import type {
  FireAlarmDeviceDetection,
  FireAlarmFloorplan,
  FireAlarmScanSession,
} from './types';

export type FireAlarmMediaAssetType =
  | 'image'
  | 'video'
  | 'depth'
  | 'point-cloud'
  | 'roomplan-usdz'
  | 'roomplan-json'
  | 'metadata';

export type FireAlarmMediaAssetOrigin =
  | 'roomplan'
  | 'camera'
  | 'lidar'
  | 'manual-upload'
  | 'derived'
  | 'external';

export interface FireAlarmMediaAssetDimensions {
  width?: number;
  height?: number;
  depth?: number;
  unit?: 'px' | 'm' | 'cm' | 'mm';
}

export interface FireAlarmCapturePose {
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotationEulerDegrees?: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  quaternion?: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  timestamp?: string;
}

export interface FireAlarmMediaAsset {
  id: string;
  type: FireAlarmMediaAssetType;
  uri: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  checksum?: string;
  origin: FireAlarmMediaAssetOrigin;
  capturedAt?: string;
  dimensions?: FireAlarmMediaAssetDimensions;
  pose?: FireAlarmCapturePose;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface FireAlarmRoomVertex {
  x: number;
  y: number;
  z?: number;
}

export interface FireAlarmRoomBoundary {
  id: string;
  type: 'wall' | 'opening' | 'window' | 'door' | 'ceiling-edge' | 'floor-edge';
  start: FireAlarmRoomVertex;
  end: FireAlarmRoomVertex;
  heightMeters?: number;
  thicknessMeters?: number;
  confidence?: number;
}

export interface FireAlarmRoomSurface {
  id: string;
  type: 'wall' | 'ceiling' | 'floor';
  vertices: FireAlarmRoomVertex[];
  normal?: FireAlarmRoomVertex;
  widthMeters?: number;
  heightMeters?: number;
  areaSquareMeters?: number;
  confidence?: number;
}

export interface FireAlarmRoomGeometry {
  roomId?: string;
  source: 'roomplan' | 'manual' | 'derived';
  units: 'meters';
  origin?: FireAlarmRoomVertex;
  boundaries?: FireAlarmRoomBoundary[];
  surfaces?: FireAlarmRoomSurface[];
  floorplan?: FireAlarmFloorplan;
  metadata?: Record<string, string | number | boolean | null>;
}

export type FireAlarmCandidateSource =
  | 'vision-model'
  | 'ocr'
  | 'logo-model'
  | 'sensor-fusion'
  | 'manual-review';

export interface FireAlarmBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  normalized?: boolean;
}

export interface FireAlarmDeviceCandidate {
  id: string;
  source: FireAlarmCandidateSource;
  assetId: string;
  label: string;
  confidence: number;
  boundingBox?: FireAlarmBoundingBox;
  estimatedCategory?: FireAlarmDeviceDetection['type'] | 'unknown';
  estimatedPose?: FireAlarmCapturePose;
  evidence?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface FireAlarmOcrTextFinding {
  id: string;
  assetId: string;
  text: string;
  normalizedText?: string;
  confidence: number;
  languageCode?: string;
  boundingBox?: FireAlarmBoundingBox;
  lineIndex?: number;
  blockIndex?: number;
  matchedDeviceCandidateId?: string;
}

export interface FireAlarmManufacturerFinding {
  id: string;
  assetId: string;
  manufacturer: string;
  logoText?: string;
  confidence: number;
  boundingBox?: FireAlarmBoundingBox;
  matchedDeviceCandidateId?: string;
}

export interface FireAlarmModelProviderMetadata {
  providerId: string;
  providerName: string;
  modelName: string;
  modelVersion: string;
  pipelineStage: 'detection' | 'ocr' | 'logo' | 'mapping' | 'post-processing';
  inferenceRegion?: string;
  runtime?: 'on-device' | 'edge' | 'cloud' | 'hybrid';
  metadata?: Record<string, string | number | boolean | null>;
}

export interface FireAlarmRecognitionPipelineStageConfig {
  enabled: boolean;
  provider?: string;
  minimumConfidence?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface FireAlarmRecognitionPipelineConfig {
  version: string;
  environment?: 'development' | 'staging' | 'production';
  detection: FireAlarmRecognitionPipelineStageConfig;
  ocr: FireAlarmRecognitionPipelineStageConfig;
  manufacturerRecognition: FireAlarmRecognitionPipelineStageConfig;
  placementMapping: FireAlarmRecognitionPipelineStageConfig;
  export?: {
    includeMediaAssets?: boolean;
    includeRawFindings?: boolean;
    portableSchemaVersion?: '1.0';
  };
  review?: {
    autoApproveAboveConfidence?: number;
    requireHumanReviewForUnknownDevices?: boolean;
  };
}

export interface FireAlarmAnalysisRequest {
  jobId: string;
  sessionId: string;
  createdAt: string;
  session: FireAlarmScanSession;
  roomGeometry?: FireAlarmRoomGeometry;
  mediaAssets: FireAlarmMediaAsset[];
  existingDetections?: FireAlarmDeviceDetection[];
  hints?: {
    expectedManufacturers?: string[];
    expectedDeviceTypes?: FireAlarmDeviceDetection['type'][];
    siteName?: string;
    buildingLevel?: string;
  };
  configuration?: FireAlarmRecognitionPipelineConfig;
}

export interface FireAlarmPlacementMapping {
  candidateId: string;
  floorplanZoneId?: string;
  wallId?: string;
  position: {
    x: number;
    y: number;
    z?: number;
  };
  coordinateSpace: 'floorplan-2d' | 'room-3d' | 'image-2d';
  confidence: number;
  reasoning?: string;
}

export type FireAlarmReviewStatus =
  | 'pending'
  | 'needs-review'
  | 'approved'
  | 'rejected'
  | 'exported';

export interface FireAlarmAnalysisResult {
  jobId: string;
  sessionId: string;
  completedAt: string;
  reviewStatus: FireAlarmReviewStatus;
  deviceCandidates: FireAlarmDeviceCandidate[];
  ocrFindings: FireAlarmOcrTextFinding[];
  manufacturerFindings: FireAlarmManufacturerFinding[];
  placementMappings: FireAlarmPlacementMapping[];
  detections: FireAlarmDeviceDetection[];
  providers?: FireAlarmModelProviderMetadata[];
  summary?: {
    totalAssets: number;
    totalCandidates: number;
    totalApprovedDetections: number;
  };
  warnings?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface FireAlarmPortableSessionPayload {
  schemaVersion: '1.0';
  exportedAt: string;
  session: FireAlarmScanSession;
  floorplan?: FireAlarmFloorplan;
  roomGeometry?: FireAlarmRoomGeometry;
  mediaAssets: FireAlarmMediaAsset[];
  analysis?: FireAlarmAnalysisResult;
  configuration?: FireAlarmRecognitionPipelineConfig;
}
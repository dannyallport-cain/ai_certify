export type FireAlarmDeviceType =
  | 'panel'
  | 'sounder'
  | 'detector'
  | 'interface'
  | 'io_unit'
  | 'vad'
  | 'unknown';

export type FireAlarmManufacturer =
  | string
  | null
  | {
      name: string | null;
      confidence?: number | null;
    };

export type FireAlarmScanStatus =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'processing'
  | 'stopped'
  | 'completed'
  | 'error'
  | 'unsupported';

export type FireAlarmCaptureLifecyclePhase =
  | 'idle'
  | 'preparing'
  | 'capturing'
  | 'processing'
  | 'finalizing'
  | 'completed'
  | 'stopped'
  | 'failed';

export interface FireAlarmDevicePoint {
  x: number;
  y: number;
  z?: number;
}

export interface FireAlarmDeviceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface FireAlarmEvidenceFrame {
  id: string;
  timestamp: string;
  assetId?: string | null;
  uri?: string | null;
  source?: 'camera' | 'roomplan' | 'vision' | 'derived' | 'unknown';
  kind?: 'image' | 'video-frame' | 'depth' | 'point-cloud' | 'metadata';
  pose?: {
    position?: FireAlarmDevicePoint | null;
    yawDegrees?: number | null;
    pitchDegrees?: number | null;
    rollDegrees?: number | null;
  } | null;
  boundingBox?: FireAlarmDeviceBoundingBox | null;
  confidence?: number | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FireAlarmDeviceDetection {
  id: string;
  type: FireAlarmDeviceType;
  label?: string | null;
  manufacturer?: FireAlarmManufacturer;
  confidence?: number | null;
  location?: FireAlarmDevicePoint | null;
  boundingBox?: FireAlarmDeviceBoundingBox | null;
  notes?: string | null;
  source?: 'roomplan' | 'vision' | 'manual' | 'unknown';
  evidenceFrames?: FireAlarmEvidenceFrame[];
  roomId?: string | null;
  wallSegmentId?: string | null;
  lifecyclePhase?: FireAlarmCaptureLifecyclePhase | null;
  metadata?: Record<string, unknown> | null;
}

export interface FireAlarmWallSegment {
  id: string;
  start: FireAlarmDevicePoint;
  end: FireAlarmDevicePoint;
  height?: number | null;
  length?: number | null;
}

export interface FireAlarmOpening {
  id: string;
  kind: 'door' | 'window' | 'opening' | 'unknown';
  wallSegmentId?: string | null;
  position?: FireAlarmDevicePoint | null;
  width?: number | null;
  height?: number | null;
}

export interface FireAlarmFloorplanRoom {
  id: string;
  name?: string | null;
  level?: number | null;
  areaSquareMeters?: number | null;
  perimeterMeters?: number | null;
  outline?: FireAlarmDevicePoint[];
  wallSegments?: FireAlarmWallSegment[];
  openings?: FireAlarmOpening[];
  devices?: FireAlarmDeviceDetection[];
}

export interface FireAlarmFloorplan {
  units?: 'meters' | 'feet';
  rooms: FireAlarmFloorplanRoom[];
  deviceCount?: number;
  wallCount?: number;
}

export interface FireAlarmScanSessionMetadata {
  startedAt: string;
  endedAt?: string | null;
  durationMs?: number | null;
  platform: string;
  appVersion?: string | null;
  deviceModel?: string | null;
  osVersion?: string | null;
  scannerVersion?: string | null;
  sessionName?: string | null;
  captureState?: FireAlarmCaptureLifecyclePhase | null;
  framesCaptured?: number | null;
  roomsDetected?: number | null;
  surfacesDetected?: number | null;
  permissionState?: 'granted' | 'denied' | 'restricted' | 'not-determined' | 'unknown' | null;
  supportFlags?: Record<string, boolean> | null;
  metadata?: Record<string, unknown> | null;
}

export interface FireAlarmScanError {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface FireAlarmScanSession {
  id: string;
  status: FireAlarmScanStatus;
  metadata: FireAlarmScanSessionMetadata;
  floorplan?: FireAlarmFloorplan | null;
  devices: FireAlarmDeviceDetection[];
  rawPayload?: Record<string, unknown> | null;
  error?: FireAlarmScanError | null;
}

export interface FireAlarmRoomPlanStartOptions {
  includeMockData?: boolean;
  detectDevices?: boolean;
  detectManufacturers?: boolean;
  preferredUnits?: 'meters' | 'feet';
  roomName?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface FireAlarmRoomPlanExportOptions {
  format?: 'json';
  pretty?: boolean;
}

export interface FireAlarmRoomPlanSupportInfo {
  isSupported: boolean;
  platform: string;
  reason?: string | null;
  supportsRoomCapture?: boolean;
  supportsDevicePoseTracking?: boolean;
  supportsLiveProgressEvents?: boolean;
  supportsDetectionEvents?: boolean;
  supportsSessionExport?: boolean;
  requiredPermissions?: string[];
  metadata?: Record<string, unknown> | null;
}

export interface FireAlarmRoomPlanStatusEvent {
  status: FireAlarmScanStatus;
  sessionId?: string | null;
  timestamp: string;
  error?: FireAlarmScanError | null;
  phase?: FireAlarmCaptureLifecyclePhase | null;
  progress?: number | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FireAlarmRoomPlanProgressEvent {
  sessionId: string;
  timestamp: string;
  status: FireAlarmScanStatus;
  phase: FireAlarmCaptureLifecyclePhase;
  progress: number;
  framesCaptured?: number | null;
  roomsDetected?: number | null;
  surfacesDetected?: number | null;
  detectedDeviceCount?: number | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FireAlarmRoomPlanDetectionEvent {
  sessionId: string;
  timestamp: string;
  detection: FireAlarmDeviceDetection;
  totalDetections?: number | null;
  frameId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FireAlarmRoomPlanSessionEvent {
  session: FireAlarmScanSession;
  timestamp: string;
}

export type FireAlarmRoomPlanEventMap = {
  status: FireAlarmRoomPlanStatusEvent;
  progress: FireAlarmRoomPlanProgressEvent;
  detection: FireAlarmRoomPlanDetectionEvent;
  session: FireAlarmRoomPlanSessionEvent;
};

export interface FireAlarmRoomPlanSubscription {
  remove: () => void;
}
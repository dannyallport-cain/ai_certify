import type {
  FireAlarmAnalysisRequest,
  FireAlarmAnalysisResult,
  FireAlarmDeviceCandidate,
  FireAlarmManufacturerFinding,
  FireAlarmMediaAsset,
  FireAlarmPlacementMapping,
  FireAlarmPortableSessionPayload,
  FireAlarmRecognitionPipelineConfig,
  FireAlarmReviewStatus,
} from './pipeline-types';
import type {
  FireAlarmDeviceDetection,
  FireAlarmDevicePoint,
  FireAlarmFloorplanRoom,
  FireAlarmManufacturer,
  FireAlarmScanSession,
} from './types';

export type { FireAlarmAnalysisRequest } from './pipeline-types';
export type {
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
} from './pipeline-types';

export type FireAlarmAnalysisJobStatus =
  | 'created'
  | 'prepared'
  | 'request-built'
  | 'analyzed'
  | 'mapped'
  | 'completed'
  | 'failed';

export interface FireAlarmAnalysisJob {
  id: string;
  sessionId: string;
  createdAt: string;
  status: FireAlarmAnalysisJobStatus;
  session: FireAlarmScanSession;
  floorplan?: FireAlarmScanSession['floorplan'] | null;
  mediaAssets: FireAlarmMediaAsset[];
  config: FireAlarmRecognitionPipelineConfig;
  request?: FireAlarmAnalysisRequest;
  result?: FireAlarmAnalysisResult;
  metadata?: Record<string, unknown> | null;
}

export const defaultFireAlarmRecognitionPipelineConfig: FireAlarmRecognitionPipelineConfig = {
  version: '1.0.0',
  environment: 'production',
  detection: {
    enabled: true,
    minimumConfidence: 0.5,
  },
  ocr: {
    enabled: true,
    minimumConfidence: 0.5,
  },
  manufacturerRecognition: {
    enabled: true,
    minimumConfidence: 0.5,
  },
  placementMapping: {
    enabled: true,
    minimumConfidence: 0.5,
  },
  export: {
    includeMediaAssets: true,
    includeRawFindings: true,
    portableSchemaVersion: '1.0',
  },
  review: {
    autoApproveAboveConfidence: 0.9,
    requireHumanReviewForUnknownDevices: true,
  },
};

function createJobId(sessionId: string) {
  return `analysis-${sessionId}-${Date.now()}`;
}

function clonePoint(point?: FireAlarmDevicePoint | null): FireAlarmDevicePoint | null {
  if (!point) return null;
  return { x: point.x, y: point.y, z: point.z };
}

function normalizeConfig(
  config?: Partial<FireAlarmRecognitionPipelineConfig>,
): FireAlarmRecognitionPipelineConfig {
  return {
    ...defaultFireAlarmRecognitionPipelineConfig,
    ...config,
    detection: {
      ...defaultFireAlarmRecognitionPipelineConfig.detection,
      ...config?.detection,
    },
    ocr: {
      ...defaultFireAlarmRecognitionPipelineConfig.ocr,
      ...config?.ocr,
    },
    manufacturerRecognition: {
      ...defaultFireAlarmRecognitionPipelineConfig.manufacturerRecognition,
      ...config?.manufacturerRecognition,
    },
    placementMapping: {
      ...defaultFireAlarmRecognitionPipelineConfig.placementMapping,
      ...config?.placementMapping,
    },
    export: {
      ...defaultFireAlarmRecognitionPipelineConfig.export,
      ...config?.export,
    },
    review: {
      ...defaultFireAlarmRecognitionPipelineConfig.review,
      ...config?.review,
    },
  };
}

function normalizeManufacturer(manufacturer?: FireAlarmManufacturer): FireAlarmManufacturer {
  if (manufacturer === undefined) return null;
  return manufacturer;
}

function buildRoomGeometry(session: FireAlarmScanSession) {
  const floorplan = session.floorplan ?? null;
  const primaryRoom = floorplan?.rooms?.[0];

  if (!floorplan) {
    return undefined;
  }

  return {
    roomId: primaryRoom?.id,
    source: 'roomplan' as const,
    units: 'meters' as const,
    floorplan,
    metadata: {
      roomCount: floorplan.rooms.length,
      deviceCount: session.devices.length,
    },
  };
}

function createPlacementMap(placementMappings: FireAlarmPlacementMapping[]) {
  const placementMap = new Map<string, FireAlarmPlacementMapping>();

  placementMappings.forEach((mapping) => {
    placementMap.set(mapping.candidateId, mapping);
  });

  return placementMap;
}

function createManufacturerMap(manufacturerFindings: FireAlarmManufacturerFinding[]) {
  const manufacturerMap = new Map<string, FireAlarmManufacturer>();

  manufacturerFindings.forEach((finding) => {
    if (finding.matchedDeviceCandidateId) {
      manufacturerMap.set(finding.matchedDeviceCandidateId, finding.manufacturer);
    }
  });

  return manufacturerMap;
}

function inferRoomId(placement?: FireAlarmPlacementMapping): string | null {
  return placement?.floorplanZoneId ?? null;
}

function createMappedDetection(
  candidate: FireAlarmDeviceCandidate,
  placement: FireAlarmPlacementMapping | undefined,
  manufacturer?: FireAlarmManufacturer,
): FireAlarmDeviceDetection {
  return {
    id: candidate.id,
    type: candidate.estimatedCategory ?? 'unknown',
    label: candidate.label ?? null,
    manufacturer: normalizeManufacturer(manufacturer),
    confidence: candidate.confidence ?? placement?.confidence ?? null,
    location: placement ? { ...placement.position } : clonePoint(candidate.estimatedPose?.position),
    boundingBox: candidate.boundingBox
      ? {
          x: candidate.boundingBox.x,
          y: candidate.boundingBox.y,
          width: candidate.boundingBox.width,
          height: candidate.boundingBox.height,
        }
      : null,
    notes: candidate.evidence?.join('; ') ?? null,
    source:
      candidate.source === 'ocr' || candidate.source === 'logo-model'
        ? 'vision'
        : candidate.source === 'manual-review'
          ? 'manual'
          : 'vision',
    roomId: inferRoomId(placement),
    wallSegmentId: placement?.wallId ?? null,
    metadata: candidate.metadata ?? null,
  };
}

function determineReviewStatus(
  detections: FireAlarmDeviceDetection[],
  config: FireAlarmRecognitionPipelineConfig,
): FireAlarmReviewStatus {
  if (detections.length === 0) {
    return 'pending';
  }

  const requiresUnknownReview =
    config.review?.requireHumanReviewForUnknownDevices !== false &&
    detections.some((detection) => detection.type === 'unknown');

  if (requiresUnknownReview) {
    return 'needs-review';
  }

  const threshold = config.review?.autoApproveAboveConfidence ?? 1;
  const autoApproved =
    detections.length > 0 &&
    detections.every((detection) => (detection.confidence ?? 0) >= threshold);

  return autoApproved ? 'approved' : 'needs-review';
}

function assignDevicesToRooms(
  rooms: FireAlarmFloorplanRoom[] | undefined,
  detections: FireAlarmDeviceDetection[],
): FireAlarmFloorplanRoom[] {
  if (!rooms) {
    return [];
  }

  return rooms.map((room) => ({
    ...room,
    devices: detections.filter((detection) => detection.roomId === room.id),
  }));
}

export function createAnalysisJobFromSession(
  session: FireAlarmScanSession,
  mediaAssets: FireAlarmMediaAsset[] = [],
  config?: Partial<FireAlarmRecognitionPipelineConfig>,
): FireAlarmAnalysisJob {
  return {
    id: createJobId(session.id),
    sessionId: session.id,
    createdAt: new Date().toISOString(),
    status: 'created',
    session,
    floorplan: session.floorplan ?? null,
    mediaAssets: mediaAssets.map((asset) => ({ ...asset })),
    config: normalizeConfig(config),
    metadata: {
      sessionStatus: session.status,
      platform: session.metadata.platform,
    },
  };
}

export function buildAnalysisRequest(job: FireAlarmAnalysisJob): FireAlarmAnalysisRequest {
  const request: FireAlarmAnalysisRequest = {
    jobId: job.id,
    sessionId: job.sessionId,
    createdAt: new Date().toISOString(),
    session: job.session,
    roomGeometry: buildRoomGeometry(job.session),
    mediaAssets: job.mediaAssets.map((asset) => ({ ...asset })),
    existingDetections: job.session.devices.map((device) => ({ ...device })),
    configuration: { ...job.config },
    hints: {
      expectedDeviceTypes: job.session.devices.map((device) => device.type),
    },
  };

  job.request = request;
  job.status = 'request-built';

  return request;
}

export function mapFindingsToFloorplan(
  request: FireAlarmAnalysisRequest,
  result: Omit<FireAlarmAnalysisResult, 'summary' | 'reviewStatus'>,
): FireAlarmAnalysisResult {
  const placementMap = createPlacementMap(result.placementMappings);
  const manufacturerMap = createManufacturerMap(result.manufacturerFindings);

  const minimumConfidence = request.configuration?.detection.minimumConfidence ?? 0;
  const detections = result.deviceCandidates
    .filter((candidate) => candidate.confidence >= minimumConfidence)
    .map((candidate) =>
      createMappedDetection(candidate, placementMap.get(candidate.id), manufacturerMap.get(candidate.id)),
    );

  const floorplan = request.session.floorplan
    ? {
        ...request.session.floorplan,
        rooms: assignDevicesToRooms(request.session.floorplan.rooms, detections),
        deviceCount: detections.length,
      }
    : undefined;

  return {
    ...result,
    reviewStatus: determineReviewStatus(detections, request.configuration ?? defaultFireAlarmRecognitionPipelineConfig),
    detections,
    summary: {
      totalAssets: request.mediaAssets.length,
      totalCandidates: result.deviceCandidates.length,
      totalApprovedDetections: detections.length,
    },
    metadata: {
      ...result.metadata,
      mappedFloorplanIncluded: Boolean(floorplan),
    },
  };
}

export function exportPortableSessionPayload(
  session: FireAlarmScanSession,
  options?: {
    analysis?: FireAlarmAnalysisResult | null;
    mediaAssets?: FireAlarmMediaAsset[];
    config?: Partial<FireAlarmRecognitionPipelineConfig>;
  },
): FireAlarmPortableSessionPayload {
  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    session,
    floorplan: session.floorplan ?? undefined,
    roomGeometry: buildRoomGeometry(session),
    mediaAssets:
      options?.config?.export?.includeMediaAssets === false
        ? []
        : options?.mediaAssets?.map((asset) => ({ ...asset })) ?? [],
    analysis: options?.analysis ?? undefined,
    configuration: normalizeConfig(options?.config),
  };
}
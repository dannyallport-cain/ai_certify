import type {
  FireAlarmAnalysisRequest,
  FireAlarmAnalysisResult,
  FireAlarmModelProviderMetadata,
} from './pipeline-types';
import type { FireAlarmDeviceDetection } from './types';
import type { FireAlarmRecognitionAnalyzer } from './orchestrator';

function createResultId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

function getPrimaryRoomId(request: FireAlarmAnalysisRequest): string | undefined {
  return request.roomGeometry?.floorplan?.rooms?.[0]?.id ?? request.session.floorplan?.rooms?.[0]?.id;
}

function getPrimaryWallId(request: FireAlarmAnalysisRequest): string | undefined {
  const boundaries = request.roomGeometry?.boundaries ?? [];
  const wallBoundary = boundaries.find((boundary) => boundary.type === 'wall');

  return wallBoundary?.id ?? boundaries[0]?.id;
}

function createProviderMetadata(): FireAlarmModelProviderMetadata {
  return {
    providerId: 'mock',
    providerName: 'Mock analyzer',
    modelName: 'session-bootstrap',
    modelVersion: '1.0.0',
    pipelineStage: 'mapping',
    runtime: 'on-device',
    metadata: {
      note: 'Mock analyzer reuses current session detections to exercise the pipeline architecture.',
    },
  };
}

function normalizeManufacturerName(device: FireAlarmDeviceDetection): string {
  if (typeof device.manufacturer === 'string') {
    return device.manufacturer;
  }

  if (device.manufacturer && typeof device.manufacturer === 'object') {
    return device.manufacturer.name ?? 'Unknown';
  }

  return 'Unknown';
}

function cloneDetections(
  detections: FireAlarmDeviceDetection[],
  request: FireAlarmAnalysisRequest,
): FireAlarmDeviceDetection[] {
  const roomId = getPrimaryRoomId(request);

  return detections.map((device, index) => ({
    ...device,
    id: device.id || createResultId('candidate', index),
    label: device.label ?? `Detected ${device.type}`,
    confidence: device.confidence ?? 0.75,
    roomId: device.roomId ?? roomId,
    wallSegmentId: device.wallSegmentId ?? null,
    source: device.source ?? 'manual',
    evidenceFrames: device.evidenceFrames ?? [],
    metadata: {
      ...(device.metadata ?? {}),
      reusedFromSession: true,
    },
  }));
}

function createDeviceCandidates(
  detections: FireAlarmDeviceDetection[],
  request: FireAlarmAnalysisRequest,
) {
  return cloneDetections(detections, request).map((device, index) => ({
    id: device.id || createResultId('candidate', index),
    assetId: request.mediaAssets[index]?.id ?? request.mediaAssets[0]?.id ?? 'session-derived',
    source: 'manual-review' as const,
    label: device.label ?? `Detected ${device.type}`,
    confidence: device.confidence ?? 0.75,
    ...(device.boundingBox ? { boundingBox: device.boundingBox } : {}),
    estimatedCategory: device.type,
    estimatedPose:
      device.location != null
        ? {
            position: {
              x: device.location.x,
              y: device.location.y,
              z: device.location.z ?? 0,
            },
            timestamp: request.createdAt,
          }
        : undefined,
    evidence: device.notes ? [device.notes] : ['Derived from existing session detections.'],
    metadata: {
      reusedFromSession: true,
    },
  }));
}

function createManufacturerFindings(
  detections: FireAlarmDeviceDetection[],
  request: FireAlarmAnalysisRequest,
) {
  const enabled = request.configuration?.manufacturerRecognition?.enabled !== false;

  if (!enabled) {
    return [];
  }

  return detections
    .map((device, index) => ({ device, index }))
    .filter(({ device }) => device.manufacturer != null)
    .map(({ device, index }) => {
      const manufacturer = normalizeManufacturerName(device);

      return {
        id: createResultId('manufacturer', index),
        assetId: request.mediaAssets[index]?.id ?? request.mediaAssets[0]?.id ?? 'session-derived',
        manufacturer,
        logoText: manufacturer,
        confidence:
          typeof device.manufacturer === 'object' && device.manufacturer
            ? device.manufacturer.confidence ?? 0.7
            : 0.7,
        ...(device.boundingBox ? { boundingBox: device.boundingBox } : {}),
        matchedDeviceCandidateId: device.id,
      };
    });
}

function createOcrFindings(
  detections: FireAlarmDeviceDetection[],
  request: FireAlarmAnalysisRequest,
) {
  const enabled = request.configuration?.ocr?.enabled !== false;

  if (!enabled) {
    return [];
  }

  return detections.map((device, index) => {
    const text = device.label ?? device.type;

    return {
      id: createResultId('ocr', index),
      assetId: request.mediaAssets[index]?.id ?? request.mediaAssets[0]?.id ?? 'session-derived',
      text,
      confidence: Math.max(request.configuration?.ocr?.minimumConfidence ?? 0.5, 0.65),
      ...(device.boundingBox ? { boundingBox: device.boundingBox } : {}),
      normalizedText: text.toUpperCase(),
      matchedDeviceCandidateId: device.id,
    };
  });
}

function createPlacementMappings(
  detections: FireAlarmDeviceDetection[],
  request: FireAlarmAnalysisRequest,
) {
  return detections.map((device, index) => ({
    candidateId: device.id,
    ...(getPrimaryRoomId(request) ? { floorplanZoneId: getPrimaryRoomId(request) } : {}),
    ...(getPrimaryWallId(request) ? { wallId: getPrimaryWallId(request) } : {}),
    position:
      device.location != null
        ? {
            x: device.location.x,
            y: device.location.y,
            z: device.location.z,
          }
        : {
            x: index + 1,
            y: 1,
            z: 0,
          },
    coordinateSpace: 'floorplan-2d' as const,
    confidence: device.confidence ?? 0.8,
    reasoning: 'Mapped from existing session detections.',
  }));
}

function determineReviewStatus(request: FireAlarmAnalysisRequest, detections: FireAlarmDeviceDetection[]) {
  if (detections.length === 0) {
    return 'pending' as const;
  }

  const hasUnknownDevice =
    request.configuration?.review?.requireHumanReviewForUnknownDevices !== false &&
    detections.some((device) => device.type === 'unknown');

  if (hasUnknownDevice) {
    return 'needs-review' as const;
  }

  const threshold = request.configuration?.review?.autoApproveAboveConfidence ?? 1;
  const autoApproved = detections.every((device) => (device.confidence ?? 0) >= threshold);

  return autoApproved ? ('approved' as const) : ('needs-review' as const);
}

export class MockFireAlarmRecognitionAnalyzer implements FireAlarmRecognitionAnalyzer {
  async analyze(request: FireAlarmAnalysisRequest): Promise<FireAlarmAnalysisResult> {
    const existingDetections = request.existingDetections ?? request.session.devices ?? [];
    const detections = cloneDetections(existingDetections, request);

    return {
      jobId: request.jobId,
      sessionId: request.sessionId,
      completedAt: new Date().toISOString(),
      reviewStatus: determineReviewStatus(request, detections),
      deviceCandidates: createDeviceCandidates(existingDetections, request),
      ocrFindings: createOcrFindings(existingDetections, request),
      manufacturerFindings: createManufacturerFindings(existingDetections, request),
      placementMappings: createPlacementMappings(existingDetections, request),
      detections,
      providers: [createProviderMetadata()],
      summary: {
        totalAssets: request.mediaAssets.length,
        totalCandidates: existingDetections.length,
        totalApprovedDetections: detections.length,
      },
      warnings:
        request.mediaAssets.length === 0
          ? ['No media assets supplied; using session detections only.']
          : [],
      metadata: {
        analyzer: 'MockFireAlarmRecognitionAnalyzer',
      },
    };
  }
}

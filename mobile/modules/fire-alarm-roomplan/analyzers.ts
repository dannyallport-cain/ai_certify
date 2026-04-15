import type { FireAlarmAnalysisRequest, FireAlarmAnalysisResult } from './pipeline';
import type { FireAlarmRecognitionAnalyzer } from './orchestrator';

function createResultId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

export class MockFireAlarmRecognitionAnalyzer implements FireAlarmRecognitionAnalyzer {
  async analyze(
    request: FireAlarmAnalysisRequest,
  ): Promise<Omit<FireAlarmAnalysisResult, 'mappedDevices' | 'summary'>> {
    const deviceCandidates = request.existingDevices.map((device, index) => ({
      id: device.id || createResultId('candidate', index),
      assetId: request.mediaAssets[index]?.id ?? null,
      type: device.type,
      label: device.label ?? `Detected ${device.type}`,
      confidence: device.confidence ?? 0.75,
      boundingBox: device.boundingBox ?? null,
      estimatedLocation: device.location ?? null,
      roomId: request.roomGeometry[0]?.roomId ?? null,
      source: 'merged' as const,
      notes: device.notes ?? 'Derived from existing session detections.',
      metadata: {
        reusedFromSession: true,
      },
    }));

    const manufacturerFindings = request.config.enableManufacturerRecognition
      ? request.existingDevices
          .map((device, index) => ({
            device,
            index,
          }))
          .filter(({ device }) => device.manufacturer != null)
          .map(({ device, index }) => ({
            id: createResultId('manufacturer', index),
            assetId: request.mediaAssets[index]?.id ?? request.mediaAssets[0]?.id ?? 'session-derived',
            manufacturer: device.manufacturer ?? null,
            confidence:
              typeof device.manufacturer === 'object' && device.manufacturer
                ? device.manufacturer.confidence ?? 0.7
                : 0.7,
            boundingBox: device.boundingBox ?? null,
            logoText:
              typeof device.manufacturer === 'string'
                ? device.manufacturer
                : device.manufacturer?.name ?? null,
            candidateDeviceId: device.id,
          }))
      : [];

    const ocrFindings = request.config.enableOCR
      ? request.existingDevices.map((device, index) => ({
          id: createResultId('ocr', index),
          assetId: request.mediaAssets[index]?.id ?? request.mediaAssets[0]?.id ?? 'session-derived',
          text: device.label ?? device.type,
          confidence: Math.max(request.config.minimumTextConfidence, 0.65),
          boundingBox: device.boundingBox ?? null,
          normalizedText: (device.label ?? device.type).toUpperCase(),
          candidateDeviceId: device.id,
        }))
      : [];

    const placementMappings = request.existingDevices.map((device, index) => ({
      candidateId: device.id,
      roomId: request.roomGeometry[0]?.roomId ?? null,
      location: device.location ?? { x: index + 1, y: 1, z: 0 },
      confidence: device.confidence ?? 0.8,
      method: 'room-outline' as const,
      nearestWallSegmentId: request.roomGeometry[0]?.wallSegments?.[0]?.id ?? null,
    }));

    return {
      jobId: request.jobId,
      sessionId: request.sessionId,
      status: 'completed',
      reviewStatus: deviceCandidates.length > 0 ? 'needs-review' : 'unreviewed',
      deviceCandidates,
      ocrFindings,
      manufacturerFindings,
      placementMappings,
      providerMetadata: [
        {
          provider: 'mock',
          model: 'session-bootstrap',
          version: '1.0.0',
          task: 'mapping',
          latencyMs: 0,
          metadata: {
            note: 'Mock analyzer reuses current session detections to exercise the pipeline architecture.',
          },
        },
      ],
      warnings: request.mediaAssets.length === 0 ? ['No media assets supplied; using session detections only.'] : [],
      metadata: {
        analyzer: 'MockFireAlarmRecognitionAnalyzer',
      },
    };
  }
}
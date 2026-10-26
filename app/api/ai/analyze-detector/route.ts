import { NextResponse } from 'next/server';

import { analyseDetectorImage } from '@/lib/ai/detector-analysis';
import { resolveDetectorKind, type DetectorAnalysisResponse } from '@/lib/ai/detector-types';

/**
 * Detector photo analysis endpoint.
 *
 * Separate from `/api/ai/analyze-image`, which is a consumer-unit OCR and
 * rules pipeline. A smoke or CO alarm has no board, no circuit chart and
 * almost no text, so that pipeline can only return nonsense for it.
 *
 * The device is read by a vision model through the Vercel AI Gateway. When the
 * gateway is not configured or the call fails, the photo is still accepted and
 * the inspector confirms the device by hand — the endpoint never invents
 * details it did not read.
 */

/** Roughly 15 MB of base64 payload, which covers a full-resolution phone photo. */
const MAX_IMAGE_BASE64_LENGTH = 20_000_000;

interface AnalyzeDetectorRequest {
  imageBase64?: string;
  imageUrl?: string;
  inspectionType?: string;
  metadata?: Record<string, unknown>;
}

function buildErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return buildErrorResponse('Invalid JSON request body', 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return buildErrorResponse('Invalid detector analysis request payload', 400);
  }

  const payload = body as AnalyzeDetectorRequest;
  const detectorType = resolveDetectorKind(payload.inspectionType);

  if (!detectorType) {
    return buildErrorResponse(
      'inspectionType must identify a detector, for example "smoke_detector" or "co_detector"',
      400,
    );
  }

  const imageBase64 = payload.imageBase64;

  if (typeof imageBase64 !== 'string' || imageBase64.trim().length === 0) {
    return buildErrorResponse('imageBase64 is required', 400);
  }

  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return buildErrorResponse('Image is too large for detector analysis', 413);
  }

  try {
    const outcome = await analyseDetectorImage({
      imageBase64,
      detectorType,
      textLines: [],
    });

    const response: DetectorAnalysisResponse = {
      success: true,
      summary: outcome.summary,
      findings: {
        detector: outcome.findings,
        textDetections: [],
        observations: outcome.observations,
      },
      prefill: {
        observations: outcome.observations,
        recommendedCodes: outcome.recommendedCodes,
        detector: outcome.findings,
      },
      needsHumanReview: outcome.findings.needsHumanReview,
      modelInfo: {
        detector: outcome.vision.provider
          ? `vision:${outcome.vision.provider}`
          : 'vision:unavailable',
        ocr: 'not-used',
        extractor: 'detector-rules-v1',
        method: outcome.findings.method,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Detector analysis failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyse detector image';
    return buildErrorResponse(message, 500);
  }
}

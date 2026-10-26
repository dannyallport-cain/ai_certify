import type { PhotoQualityAssessment } from '@/components/JobStateContext';
import { isDetectorCaptureMode, type CaptureMode } from '@/services/capture-modes';
import type { AnalysisResult } from '@/services/api';

/**
 * Photo quality gating for the capture screen.
 *
 * Board photos and detector photos are judged very differently. A consumer
 * unit fills the frame and carries lots of text, so landscape framing and
 * readable text are reasonable expectations. A smoke alarm is a small round
 * device photographed from below: it is usually portrait, and its only text
 * is a few millimetres high. Judging detectors with the board rules rejects
 * perfectly good evidence, which is why the two live apart here.
 */

const MIN_BOARD_WIDTH = 1200;
const MIN_BOARD_HEIGHT = 900;

const MIN_DETECTOR_WIDTH = 800;
const MIN_DETECTOR_HEIGHT = 600;

const SUFFICIENT_SCORE = 70;

const MIN_CLASSIFY_CONFIDENCE = 0.35;

export function getTextDetectionCount(result: AnalysisResult | null | undefined): number {
  return Array.isArray(result?.textDetections) ? result.textDetections.length : 0;
}

export function getObservationCount(result: AnalysisResult | null | undefined): number {
  return Array.isArray(result?.observations) ? result.observations.length : 0;
}

export function getBrandModel(result: AnalysisResult | null | undefined): string {
  return [result?.consumerUnit?.brand, result?.consumerUnit?.model].filter(Boolean).join(' ');
}

export interface QualityAssessmentInput {
  width: number | null;
  height: number | null;
  mode: CaptureMode;
  result: AnalysisResult | null;
  /** Message from a failed analysis call, when there was one. */
  analysisError?: string | null;
}

function buildBoardQualityAssessment(input: QualityAssessmentInput): PhotoQualityAssessment {
  const { width, height, mode, result } = input;
  const reasons: string[] = [];
  let score = 100;

  const isLandscape = typeof width === 'number' && typeof height === 'number' ? width >= height : false;
  const textCount = getTextDetectionCount(result);
  const hasUsefulTextDetection = textCount >= (mode === 'circuit_label' ? 3 : 1);
  const needsHumanReview = !!result?.needsHumanReview;

  if (typeof width !== 'number' || typeof height !== 'number') {
    score -= 20;
    reasons.push('The app could not confirm the image dimensions.');
  } else {
    if (width < MIN_BOARD_WIDTH || height < MIN_BOARD_HEIGHT) {
      score -= 30;
      reasons.push('The image resolution looks low.');
    }
    if (!isLandscape) {
      score -= 10;
      reasons.push('Landscape framing is recommended.');
    }
  }

  if (!hasUsefulTextDetection && mode !== 'consumer_unit') {
    score -= 20;
    reasons.push('Very little readable text was detected.');
  }

  if (needsHumanReview) {
    score -= 15;
    reasons.push('The AI flagged this image for human review.');
  }

  return {
    isSufficient: score >= SUFFICIENT_SCORE,
    score: Math.max(0, Math.min(100, score)),
    reasons,
    checks: {
      width,
      height,
      isLandscape,
      hasUsefulTextDetection,
      needsHumanReview,
    },
  };
}

function buildDetectorQualityAssessment(input: QualityAssessmentInput): PhotoQualityAssessment {
  const { width, height, result, analysisError } = input;
  const detector = result?.detector ?? null;
  const reasons: string[] = [];
  let score = 100;

  const hasDimensions = typeof width === 'number' && typeof height === 'number';
  const isLandscape = hasDimensions ? (width as number) >= (height as number) : false;

  if (!hasDimensions) {
    score -= 15;
    reasons.push('The app could not confirm the image dimensions.');
  } else if ((width as number) < MIN_DETECTOR_WIDTH || (height as number) < MIN_DETECTOR_HEIGHT) {
    score -= 35;
    reasons.push('The image resolution looks low. Move closer to the detector.');
  }

  if (analysisError) {
    score -= 10;
    reasons.push(`Detector details could not be checked automatically: ${analysisError}`);
  }

  if (!detector) {
    score -= 5;
    reasons.push('Detector details were not read automatically. Confirm the device on the checklist.');
  } else {
    if (detector.present === false) {
      score = 0;
      reasons.push(
        'No detector is clearly visible in this photo. Retake it with the device filling most of the frame.',
      );
    }

    if (detector.confidence < MIN_CLASSIFY_CONFIDENCE && detector.present !== false) {
      score -= 15;
      reasons.push(
        'The detector could not be identified confidently. Get closer and avoid glare and shadow.',
      );
    }

    if (detector.standards.length === 0 && detector.present !== false) {
      score -= 5;
      reasons.push(
        'No product standard marking was readable. Check the device label as part of the visual inspection.',
      );
    }
  }

  return {
    isSufficient: score >= SUFFICIENT_SCORE,
    score: Math.max(0, Math.min(100, score)),
    reasons,
    checks: {
      width,
      height,
      isLandscape,
      hasUsefulTextDetection: detector?.standards?.length ? true : false,
      needsHumanReview: !!detector?.needsHumanReview,
      detectorPresent: detector?.present ?? null,
      detectorConfidence: detector?.confidence ?? null,
    },
  };
}

/**
 * Scores a captured photo for its capture mode.
 *
 * Detector modes never fail on framing, orientation or missing text — only on
 * a missing device or unusably low resolution — because the alarm itself is
 * the evidence and the AI read is advisory.
 */
export function buildQualityAssessment(input: QualityAssessmentInput): PhotoQualityAssessment {
  return isDetectorCaptureMode(input.mode)
    ? buildDetectorQualityAssessment(input)
    : buildBoardQualityAssessment(input);
}

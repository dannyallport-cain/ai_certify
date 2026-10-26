import {
  detectorLabel,
  detectorNoun,
  type DetectorAnalysisFindings,
  type DetectorKind,
} from './detector-types';
import { familyFromLabel, familyFromStandards } from './detector-family';
import { deriveDetectorTextHints } from './detector-text-hints';
import { readDetectorImage, type DetectorVisionReading } from './detector-vision';

/**
 * Analyses a detector photo and produces the findings the mobile capture
 * screen needs.
 *
 * Strategy: ask the vision provider what is in the frame, then use the OCR
 * text to fill any field the vision read missed. Both sources are additive —
 * a photo that the vision model cannot read still yields the printed standard
 * and manufacturer from OCR rather than an empty result.
 */

export interface DetectorAnalysisInput {
  imageBase64: string;
  detectorType: DetectorKind;
  textLines: string[];
}

export interface DetectorAnalysisOutcome {
  findings: DetectorAnalysisFindings;
  observations: string[];
  summary: string;
  recommendedCodes: string[];
  vision: {
    attempted: boolean;
    provider: string | null;
    model: string | null;
    error: string | null;
  };
}

const STATUTORY_STANDARD: Record<DetectorKind, string> = {
  smoke: 'BS EN 14604',
  co: 'BS EN 50291',
};

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function buildObservations(params: {
  detectorType: DetectorKind;
  vision: DetectorVisionReading | null;
  visionError: string | null;
  standards: string[];
  replaceByDate: string | null;
  present: boolean | null;
  matchesRequestedType: boolean | null;
  condition: string[];
}): string[] {
  const { detectorType, vision, visionError, standards, replaceByDate, present, matchesRequestedType, condition } = params;
  const observations: string[] = [];
  const noun = detectorNoun(detectorType);

  if (!vision) {
    observations.push(
      `The photo could not be read by the vision model${
        visionError ? ` (${visionError})` : ''
      }; detector details are limited to printed text.`,
    );
  }

  if (present === false) {
    observations.push(`No ${noun} is clearly visible in this photo.`);
  }

  if (matchesRequestedType === false) {
    const described = vision?.detectorTypeLabel ? ` (${vision.detectorTypeLabel})` : '';
    observations.push(
      `The device in this photo appears to be the other detector family${described}, not a ${noun}.`,
    );
  }

  if (standards.length > 0) {
    const unique = Array.from(new Set(standards));
    observations.push(`Product standard mark(s) visible: ${unique.join(', ')}.`);
  } else if (vision) {
    observations.push(
      `No product standard mark was legible. Confirm the device is certified to ${STATUTORY_STANDARD[detectorType]}.`,
    );
  }

  if (replaceByDate) {
    observations.push(`Printed replace-by date: ${replaceByDate}.`);
  }

  for (const note of condition) {
    observations.push(note);
  }

  return observations;
}

function buildSummary(
  findings: DetectorAnalysisFindings,
  label: string,
  vision: DetectorVisionReading | null,
): string {
  const percent = Math.round(findings.confidence * 100);

  if (findings.present === false) {
    return `${label} photo analysed (${findings.method}, ${percent}% confidence): no detector is clearly visible.`;
  }

  const parts: string[] = [];
  if (findings.detectedTypeLabel) {
    parts.push(findings.detectedTypeLabel);
  }
  if (findings.manufacturer) {
    parts.push(findings.manufacturer);
  }
  if (findings.model) {
    parts.push(findings.model);
  }

  const description = parts.length > 0 ? parts.join(' — ') : 'detector';
  const providerNote = vision ? ` via ${vision.provider}` : '';

  return `${label} photo analysed (${findings.method}${providerNote}, ${percent}% confidence): ${description}.`;
}

export async function analyseDetectorImage(
  input: DetectorAnalysisInput,
): Promise<DetectorAnalysisOutcome> {
  const { imageBase64, detectorType, textLines } = input;
  const label = detectorLabel(detectorType);

  const textHints = deriveDetectorTextHints(textLines, detectorType);

  let vision: DetectorVisionReading | null = null;
  let visionError: string | null = null;

  try {
    vision = await readDetectorImage(imageBase64, detectorType);
  } catch (error) {
    visionError = error instanceof Error ? error.message : 'vision analysis failed';
    console.error('Detector vision analysis failed:', visionError);
  }

  const standards = vision && vision.standards.length > 0 ? vision.standards : textHints.standards;
  const present = vision ? vision.detectorVisible : null;

  // The label and the printed standard are independent evidence. A model that
  // describes a smoke alarm while claiming it matches a CO request must not be
  // believed, because that would file a smoke alarm as CO evidence.
  const labelFamily = familyFromLabel(vision?.detectorTypeLabel);
  const standardFamily = familyFromStandards(standards);
  const contradictsRequest =
    (labelFamily !== null && labelFamily !== detectorType) ||
    (standardFamily !== null && standardFamily !== detectorType);

  const matchesRequestedType = contradictsRequest
    ? false
    : vision?.matchesRequestedType ??
      (textHints.matchesRequestedKind === false ? false : null);

  const condition: string[] = vision?.condition ?? [];

  const confidence = (() => {
    if (vision) {
      return vision.confidence;
    }
    const hasMarks =
      textHints.manufacturer !== null ||
      textHints.model !== null ||
      textHints.standards.length > 0;
    return hasMarks ? 0.4 : 0.15;
  })();

  const findings: DetectorAnalysisFindings = {
    detectorType,
    detectedTypeLabel: firstNonEmpty(vision?.detectorTypeLabel),
    present,
    manufacturer: firstNonEmpty(vision?.manufacturer, textHints.manufacturer),
    model: firstNonEmpty(vision?.model, textHints.model),
    powerSource: firstNonEmpty(vision?.powerSource, textHints.powerSource),
    mountingPosition: firstNonEmpty(vision?.mountingPosition),
    standards,
    replaceByDate: firstNonEmpty(vision?.replaceByDate, textHints.replaceByDate),
    condition,
    confidence,
    needsHumanReview:
      present !== true || matchesRequestedType === false || confidence < 0.7 || !vision,
    method: vision ? 'vision' : 'ocr-text',
  };

  const observations = buildObservations({
    detectorType,
    vision,
    visionError,
    standards,
    replaceByDate: findings.replaceByDate,
    present,
    matchesRequestedType,
    condition,
  });

  const recommendedCodes: string[] = [];
  if (present === false || matchesRequestedType === false) {
    recommendedCodes.push('FI');
  }

  return {
    findings,
    observations,
    summary: buildSummary(findings, label, vision),
    recommendedCodes,
    vision: {
      attempted: true,
      provider: vision?.provider ?? null,
      model: vision?.modelUsed ?? null,
      error: visionError,
    },
  };
}

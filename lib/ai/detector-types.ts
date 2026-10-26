/**
 * Shared types for smoke / carbon-monoxide detector photo analysis.
 *
 * These describe the device-level evidence inspectors capture for the
 * landlord smoke and CO alarm branch of the mobile workflow. A detector
 * photo is not a consumer-unit photo: there is no board, no circuit chart
 * and usually very little text, so the consumer-unit OCR pipeline cannot
 * describe it.
 */

/** The detector families the mobile workflow captures evidence for. */
export type DetectorKind = 'smoke' | 'co';

/** How the detector findings were produced. */
export type DetectorAnalysisMethod = 'vision' | 'ocr-text';

export interface DetectorAnalysisFindings {
  /** Requested detector family, echoed back for the client. */
  detectorType: DetectorKind;
  /**
   * What the image actually looks like, in the reviewer's language,
   * e.g. "optical smoke alarm" or "carbon monoxide alarm".
   */
  detectedTypeLabel: string | null;
  /**
   * Whether a detector is visible at all. `null` means the analysis could
   * not decide, which the client must treat as "ask the inspector".
   */
  present: boolean | null;
  manufacturer: string | null;
  model: string | null;
  /** Mains, battery, or mains with battery backup, as read from the device. */
  powerSource: string | null;
  /** Ceiling / wall / unknown mounting position of the device. */
  mountingPosition: string | null;
  /** Standards marks printed on the device, e.g. BS EN 14604, BS EN 50291. */
  standards: string[];
  /** Printed "replace by" date, if the device carries one. */
  replaceByDate: string | null;
  /** Short visual condition notes, e.g. "lens dusty", "no visible test button". */
  condition: string[];
  /** 0..1 confidence that the returned fields describe the photo. */
  confidence: number;
  /** True when the result must be confirmed by the inspector. */
  needsHumanReview: boolean;
  /** Whether a vision model read the photo, or only the OCR text was used. */
  method: DetectorAnalysisMethod;
}

/**
 * A single vision read of a detector photo.
 *
 * `provider` and `modelUsed` are carried through so a response can report
 * which path produced the reading.
 */
export interface DetectorVisionReading {
  detectorVisible: boolean | null;
  matchesRequestedType: boolean | null;
  detectorTypeLabel: string | null;
  manufacturer: string | null;
  model: string | null;
  powerSource: string | null;
  mountingPosition: string | null;
  standards: string[];
  replaceByDate: string | null;
  condition: string[];
  confidence: number;
  notes: string | null;
  provider: string;
  modelUsed: string;
}

export interface DetectorAnalysisResponse {
  success: boolean;
  summary: string;
  findings: {
    detector: DetectorAnalysisFindings;
    textDetections: string[];
    observations: string[];
  };
  prefill: {
    observations: string[];
    recommendedCodes: string[];
    detector: DetectorAnalysisFindings;
  };
  needsHumanReview: boolean;
  modelInfo: {
    detector: string;
    ocr: string;
    extractor: string;
    method: DetectorAnalysisMethod;
  };
}

/**
 * Maps an inspectionType coming from the mobile app onto a detector family.
 * Returns null for every non-detector inspection type so callers can fall
 * through to the consumer-unit pipeline.
 */
export function resolveDetectorKind(inspectionType: unknown): DetectorKind | null {
  if (typeof inspectionType !== 'string') {
    return null;
  }

  const normalised = inspectionType.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalised === 'smoke_detector' || normalised === 'smoke_alarm' || normalised === 'smoke') {
    return 'smoke';
  }

  if (
    normalised === 'co_detector' ||
    normalised === 'carbon_monoxide_detector' ||
    normalised === 'co_alarm' ||
    normalised === 'co'
  ) {
    return 'co';
  }

  return null;
}

/** Human-readable name of a detector family, used in summaries. */
export function detectorLabel(kind: DetectorKind): string {
  return kind === 'smoke' ? 'Smoke detector' : 'CO detector';
}

/**
 * Lower-case noun phrase for mid-sentence use, e.g. "not a CO alarm".
 * Avoids the "co detector" that naive lower-casing of the label produces.
 */
export function detectorNoun(kind: DetectorKind): string {
  return kind === 'smoke' ? 'smoke alarm' : 'CO alarm';
}

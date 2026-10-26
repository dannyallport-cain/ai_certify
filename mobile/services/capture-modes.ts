/**
 * Capture mode taxonomy.
 *
 * Kept free of any React Native, secure-storage or network import so that pure
 * logic — quality gating, mode routing, analysis summaries — can use it
 * without pulling the whole API client into scope.
 */

/**
 * Modes a captured photo can be analysed as. Board modes go to the
 * consumer-unit pipeline; detector modes go to the detector endpoint.
 */
export type CaptureMode =
  | 'consumer_unit'
  | 'circuit_label'
  | 'smoke_detector'
  | 'co_detector';

/** Board-level capture modes handled by the consumer-unit analysis pipeline. */
export type BoardCaptureMode = 'consumer_unit' | 'circuit_label';

/** Detector capture modes handled by the detector analysis pipeline. */
export type DetectorCaptureMode = 'smoke_detector' | 'co_detector';

export function isDetectorCaptureMode(mode: CaptureMode): mode is DetectorCaptureMode {
  return mode === 'smoke_detector' || mode === 'co_detector';
}

/** Detector family carried by a detector capture mode. */
export function toDetectorKind(mode: DetectorCaptureMode): 'smoke' | 'co' {
  return mode === 'co_detector' ? 'co' : 'smoke';
}

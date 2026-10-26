import type { DetectorKind } from './detector-types';

/**
 * Detector family evidence read from device labels and printed standards.
 *
 * A vision model can describe a device correctly while still asserting that it
 * matches the requested family. Trusting that assertion would let a smoke alarm
 * be recorded as CO evidence, so the label and the printed standard are
 * cross-checked independently of whatever the model claims.
 */

const CO_LABEL_PATTERN = /carbon\s*monoxide|\bco\s*(?:alarm|detector)\b/i;
const SMOKE_LABEL_PATTERN = /smoke|optical|ionisation|ionization|photo-?electric/i;

/** Family implied by a device description such as "optical smoke alarm". */
export function familyFromLabel(label: string | null | undefined): DetectorKind | null {
  if (typeof label !== 'string' || label.trim().length === 0) {
    return null;
  }

  if (CO_LABEL_PATTERN.test(label)) {
    return 'co';
  }

  if (SMOKE_LABEL_PATTERN.test(label)) {
    return 'smoke';
  }

  return null;
}

/** Family implied by printed standards marks. Null when unclear or mixed. */
export function familyFromStandards(standards: string[]): DetectorKind | null {
  let smoke = false;
  let co = false;

  for (const standard of standards) {
    if (/1460[46]|5446/i.test(standard)) {
      smoke = true;
    }
    if (/5029[0-9]/i.test(standard)) {
      co = true;
    }
  }

  if (smoke === co) {
    return null;
  }

  return co ? 'co' : 'smoke';
}

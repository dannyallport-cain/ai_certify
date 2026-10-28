/**
 * Turns a captured device into a row the survey table can hold.
 *
 * Kept free of database imports so it can be exercised by a plain script — the
 * rules here decide what a survey actually contains, which is exactly the kind
 * of logic that should not need a live database to verify.
 */

import type { NewFireAlarmCaptureDevice } from '@/lib/db/schema';

import type { FireAlarmSurveyDeviceInput } from './types';

/** A device row before its capture id is known. */
export type NormalizedSurveyDevice = Omit<NewFireAlarmCaptureDevice, 'captureId'>;

function normalizeManufacturer(
  value: FireAlarmSurveyDeviceInput['manufacturer'],
): { name: string | null; confidence: number | null } {
  if (!value) {
    return { name: null, confidence: null };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return { name: trimmed.length > 0 ? trimmed : null, confidence: null };
  }

  return {
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : null,
    confidence: typeof value.confidence === 'number' ? value.confidence : null,
  };
}

/**
 * A device is worth storing when the engineer has given it a real type.
 *
 * The previous save dropped everything that was not explicitly flagged as
 * user-identified, which threw away the review step's work. A device that was
 * typed by the engineer in review is exactly as real as one auto-identified.
 */
export function normalizeSurveyDevice(
  device: FireAlarmSurveyDeviceInput,
): NormalizedSurveyDevice | null {
  const type = typeof device.type === 'string' ? device.type.trim() : '';

  if (!type || type === 'unknown') {
    return null;
  }

  const manufacturer = normalizeManufacturer(device.manufacturer);

  return {
    externalDeviceId: typeof device.id === 'string' && device.id.trim() ? device.id.trim() : null,
    deviceType: type,
    label: typeof device.label === 'string' && device.label.trim() ? device.label.trim() : null,
    manufacturerName: manufacturer.name,
    manufacturerConfidence: manufacturer.confidence,
    confidence: typeof device.confidence === 'number' ? device.confidence : null,
    locationX: typeof device.location?.x === 'number' ? device.location.x : null,
    locationY: typeof device.location?.y === 'number' ? device.location.y : null,
    locationZ: typeof device.location?.z === 'number' ? device.location.z : null,
    boundingBox: device.boundingBox ?? null,
    notes: typeof device.notes === 'string' && device.notes.trim() ? device.notes.trim() : null,
    source: typeof device.source === 'string' && device.source.trim() ? device.source.trim() : null,
    roomId: typeof device.roomId === 'string' && device.roomId.trim() ? device.roomId.trim() : null,
    wallSegmentId:
      typeof device.wallSegmentId === 'string' && device.wallSegmentId.trim()
        ? device.wallSegmentId.trim()
        : null,
    identifiedByUser: device.identifiedByUser === true,
    metadata: {
      ...(device.metadata ?? {}),
      savedFromMobileCapture: true,
    },
  };
}

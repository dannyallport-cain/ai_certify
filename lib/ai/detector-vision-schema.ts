import { z } from 'zod';

import type { DetectorVisionReading } from './detector-types';

/**
 * Structured output contract for the detector vision call.
 *
 * The Vercel AI SDK validates the model response against this schema, so the
 * rest of the app never has to guard against a missing field or a stray type.
 *
 * Two schemas exist on purpose. `detectorReadingSchema` is what the model is
 * asked for and is deliberately strict, because strict schemas make models
 * reliable. `salvageDetectorReading` then rescues a reply that is *almost*
 * right — a model that forgets the free-text `notes` field should not cost the
 * inspector the manufacturer and standard it did return.
 */

export interface DetectorReadingObject {
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
}

export const detectorReadingSchema = z.object({
  detectorVisible: z
    .boolean()
    .describe('True only when an alarm or detector device is actually in the frame.'),
  matchesRequestedType: z
    .boolean()
    .nullable()
    .describe('False when the device is clearly the other detector family. Null when unknown.'),
  detectorTypeLabel: z
    .string()
    .nullable()
    .describe('Short description such as "optical smoke alarm" or "carbon monoxide alarm".'),
  manufacturer: z.string().nullable().describe('Brand printed on the device, copied exactly.'),
  model: z.string().nullable().describe('Model code printed on the device, copied exactly.'),
  powerSource: z
    .string()
    .nullable()
    .describe('Mains, battery, or mains with battery backup, as printed.'),
  mountingPosition: z.string().nullable().describe('Where the device is mounted, e.g. ceiling.'),
  standards: z
    .array(z.string())
    .describe('Printed standards marks only, e.g. "BS EN 14604", "BS EN 50291-1".'),
  replaceByDate: z.string().nullable().describe('Printed replace-by date, copied exactly.'),
  condition: z
    .array(z.string())
    .describe('Short objective visual observations about the device condition.'),
  confidence: z.number().describe('0 to 1 confidence that the returned fields describe this photo.'),
  notes: z.string().nullable().describe('Anything else worth the inspector knowing.'),
});

/** Same shape, but every field may be absent — used only to rescue a reply. */
const lenientReadingSchema = z.object({
  detectorVisible: z.boolean().nullish(),
  matchesRequestedType: z.boolean().nullish(),
  detectorTypeLabel: z.string().nullish(),
  manufacturer: z.string().nullish(),
  model: z.string().nullish(),
  powerSource: z.string().nullish(),
  mountingPosition: z.string().nullish(),
  standards: z.array(z.string()).nullish(),
  replaceByDate: z.string().nullish(),
  condition: z.array(z.string()).nullish(),
  confidence: z.number().nullish(),
  notes: z.string().nullish(),
});

const DEFAULT_CONFIDENCE = 0.5;

/**
 * Recovers a usable reading from model text that failed strict validation.
 *
 * Accepts JSON with prose fences around it, and fills absent fields with
 * neutral values. Returns null when the text is not JSON at all, so the caller
 * can move on to the next provider.
 */
export function salvageDetectorReading(text: string): DetectorReadingObject | null {
  const withoutFences = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (!withoutFences.startsWith('{')) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(withoutFences);
  } catch {
    return null;
  }

  const result = lenientReadingSchema.safeParse(parsed);

  if (!result.success) {
    return null;
  }

  const value = result.data;

  return {
    detectorVisible: value.detectorVisible ?? null,
    matchesRequestedType: value.matchesRequestedType ?? null,
    detectorTypeLabel: value.detectorTypeLabel ?? null,
    manufacturer: value.manufacturer ?? null,
    model: value.model ?? null,
    powerSource: value.powerSource ?? null,
    mountingPosition: value.mountingPosition ?? null,
    standards: value.standards ?? [],
    replaceByDate: value.replaceByDate ?? null,
    condition: value.condition ?? [],
    confidence: value.confidence ?? DEFAULT_CONFIDENCE,
    notes: value.notes ?? null,
  };
}

function cleanString(value: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== 'null' ? trimmed : null;
}

function cleanStringArray(values: string[]): string[] {
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0)
    .slice(0, 8);
}

function boundConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_CONFIDENCE;
  }

  const scaled = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, scaled));
}

/** Normalises a validated model response into the app's reading shape. */
export function toDetectorReading(
  object: DetectorReadingObject,
  provider: string,
  modelUsed: string,
): DetectorVisionReading {
  return {
    detectorVisible: object.detectorVisible,
    matchesRequestedType: object.matchesRequestedType,
    detectorTypeLabel: cleanString(object.detectorTypeLabel),
    manufacturer: cleanString(object.manufacturer),
    model: cleanString(object.model),
    powerSource: cleanString(object.powerSource),
    mountingPosition: cleanString(object.mountingPosition),
    standards: cleanStringArray(object.standards),
    replaceByDate: cleanString(object.replaceByDate),
    condition: cleanStringArray(object.condition),
    confidence: boundConfidence(object.confidence),
    notes: cleanString(object.notes),
    provider,
    modelUsed,
  };
}

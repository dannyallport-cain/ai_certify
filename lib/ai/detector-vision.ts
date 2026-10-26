import { APICallError, NoObjectGeneratedError, generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

import type { DetectorKind, DetectorVisionReading } from './detector-types';
import {
  detectorReadingSchema,
  salvageDetectorReading,
  toDetectorReading,
} from './detector-vision-schema';

/**
 * Vision reader for detector photographs, built on the Vercel AI SDK and
 * served by the Vercel AI Gateway.
 *
 * The consumer-unit pipeline is OCR only, which is the wrong tool for a smoke
 * or CO alarm: the device carries a handful of tiny marks and the rest of the
 * frame is housing, ceiling and background. `generateObject` asks a vision
 * model for exactly the fields the report needs and validates the answer
 * against the zod schema, so a malformed reply becomes a failure rather than a
 * half-populated result.
 */

export type { DetectorVisionReading };

const DEFAULT_GATEWAY_MODEL = 'openai/gpt-4o';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ERROR_LENGTH = 100;

/** Gateway credential. Absent means detector analysis runs without vision. */
function gatewayApiKey(): string | null {
  const key = process.env.AI_GATEWAY_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function gatewayBaseUrl(): string | null {
  const url = process.env.AI_GATEWAY_BASE_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/+$/, '') : null;
}

function visionModelId(): string {
  const configured = process.env.AI_GATEWAY_VISION_MODEL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_GATEWAY_MODEL;
}

/** True when the AI Gateway credential is configured. */
export function isDetectorVisionConfigured(): boolean {
  return gatewayApiKey() !== null;
}

function createVisionModel(apiKey: string): { model: LanguageModel; modelUsed: string } {
  const modelUsed = visionModelId();
  const baseUrl = gatewayBaseUrl();
  const provider = createGateway({
    apiKey,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });

  return { model: provider.chat(modelUsed), modelUsed };
}

function buildPrompt(detectorType: DetectorKind): string {
  const requested = detectorType === 'smoke' ? 'smoke alarm' : 'carbon monoxide (CO) alarm';

  return `Describe the alarm in this photo. The inspector intended to photograph a ${requested}.

Rules:
- Set detectorVisible true only when an alarm or detector device is actually in the frame. A ceiling rose, light fitting, switch or blank ceiling is not a detector.
- Set matchesRequestedType false when the device in frame is clearly the other family (for example a CO alarm photographed as a smoke alarm). Use null when the family cannot be determined.
- Copy printed text exactly for manufacturer, model, standards and replaceByDate. Use null when a value is not legible. Never invent a brand or model.
- standards lists printed standards marks only, for example "BS EN 14604" or "BS EN 50291-1".
- condition holds short objective observations, for example "dust on sensor housing" or "test button obstructed".
- Keep confidence honest: low when the image is blurred, distant or partly obscured.`;
}

interface ImagePayload {
  data: string;
  mediaType: string;
}

/** Splits a data URL into raw base64 plus its media type. */
function parseImagePayload(imageBase64: string): ImagePayload {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(imageBase64);

  if (!match) {
    return { data: imageBase64, mediaType: 'image/jpeg' };
  }

  return { data: match[2], mediaType: match[1] };
}

/** Redacts the gateway key before error text can be surfaced. */
export function redactVisionError(message: string): string {
  const key = gatewayApiKey();
  const redacted =
    key && key.length > 8
      ? message.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[redacted]')
      : message;

  return redacted.replace(/\s+/g, ' ').trim().slice(0, MAX_ERROR_LENGTH);
}

/**
 * Reduces a provider error to one short clause.
 *
 * The AI SDK wraps failures in nested retry and validation errors whose
 * messages span many lines; that text is useless on a capture screen, so only
 * the first line is kept and the retry preamble is dropped.
 */
function conciseReason(message: string): string {
  const firstLine = message.split('\n')[0].trim();

  return firstLine
    .replace(/^failed after \d+ attempts?\.\s*(last error:\s*)?/i, '')
    .replace(/^last error:\s*/i, '')
    .replace(/^[A-Za-z]+Error:\s*/i, '')
    .replace(/^invalid error response format:\s*/i, '')
    .trim();
}

function describeFailure(error: unknown): string {
  if (NoObjectGeneratedError.isInstance(error)) {
    return 'model did not return a valid detector reading';
  }

  if (APICallError.isInstance(error)) {
    return conciseReason(error.message);
  }

  return error instanceof Error ? conciseReason(error.message) : 'request failed';
}

/**
 * Reads a detector photo with the Vercel AI Gateway.
 *
 * Throws when the gateway credential is missing or the request fails, so the
 * caller records the photo without an automatic read instead of guessing.
 */
export async function readDetectorImage(
  imageBase64: string,
  detectorType: DetectorKind,
): Promise<DetectorVisionReading> {
  const apiKey = gatewayApiKey();

  if (!apiKey) {
    throw new Error('No vision provider configured for detector analysis');
  }

  const { model, modelUsed } = createVisionModel(apiKey);
  const { data, mediaType } = parseImagePayload(imageBase64);

  try {
    const { object } = await generateObject({
      model,
      schema: detectorReadingSchema,
      temperature: 0.1,
      // One retry, not the SDK default of three: the inspector is waiting on a
      // capture screen, and a dead gateway will not recover within seconds.
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildPrompt(detectorType) },
            { type: 'image', image: data, mediaType },
          ],
        },
      ],
    });

    return toDetectorReading(object, 'ai-gateway', modelUsed);
  } catch (error) {
    // A reply that is valid JSON but misses a field still carries real
    // evidence, so rescue it before reporting the failure.
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      const salvaged = salvageDetectorReading(error.text);

      if (salvaged) {
        console.warn('AI Gateway returned a partial detector reading; salvaged it.');
        return toDetectorReading(salvaged, 'ai-gateway', modelUsed);
      }
    }

    console.error('Detector vision request failed:', error);
    // Compacted and redacted: this text reaches the inspector on the capture
    // screen, so a nested retry trace is useless there.
    throw new Error(redactVisionError(describeFailure(error)));
  }
}

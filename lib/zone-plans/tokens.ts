import { randomBytes } from 'node:crypto';

/** 24 random bytes encoded as base64url is 32 characters and not guessable. */
const TOKEN_BYTES = 24;
const MIN_TOKEN_LENGTH = 16;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export function createZonePlanToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** Rejects obviously malformed tokens before they reach the database. */
export function isZonePlanToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= MIN_TOKEN_LENGTH &&
    value.length <= 64 &&
    TOKEN_PATTERN.test(value)
  );
}

export function buildZonePlanViewerPath(token: string): string {
  return `/plan/${token}`;
}

/**
 * Absolute viewer URL. `origin` comes from the request so a plan shared from a preview
 * deployment links back to that deployment rather than production.
 */
export function buildZonePlanViewerUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}${buildZonePlanViewerPath(token)}`;
}

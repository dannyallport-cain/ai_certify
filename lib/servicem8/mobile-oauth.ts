/**
 * Signed OAuth state for the mobile ServiceM8 connection flow.
 *
 * The web flow can identify the user at callback time from the dashboard
 * session cookie. The mobile app has no such cookie: it holds a bearer token
 * that never reaches the browser. So the identity travels inside the OAuth
 * `state` parameter instead, signed with a server-only secret and given a short
 * expiry so it cannot be replayed later.
 */

import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

/** How long a user has to finish authorising in ServiceM8. */
export const MOBILE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const STATE_VERSION = 1;
const MOBILE_STATE_KIND = 'mobile';

export type MobileOAuthState = {
  version: number;
  kind: typeof MOBILE_STATE_KIND;
  userId: number;
  teamId: number;
  nonce: string;
  expiresAt: number;
};

function getStateSecret() {
  const secret =
    process.env.SERVICEM8_MOBILE_STATE_SECRET?.trim() ||
    process.env.SERVICEM8_APP_SECRET?.trim();

  if (!secret) {
    throw new Error(
      'Missing ServiceM8 secret: set SERVICEM8_MOBILE_STATE_SECRET or SERVICEM8_APP_SECRET'
    );
  }

  return secret;
}

function sign(encodedPayload: string) {
  return createHmac('sha256', getStateSecret()).update(encodedPayload).digest('base64url');
}

/** Serialises the identity into a tamper-proof `state` value. */
export function createMobileOAuthState(userId: number, teamId: number): string {
  const payload: MobileOAuthState = {
    version: STATE_VERSION,
    kind: MOBILE_STATE_KIND,
    userId,
    teamId,
    nonce: randomUUID(),
    expiresAt: Date.now() + MOBILE_OAUTH_STATE_TTL_MS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

/**
 * Returns the identity carried by a mobile `state`, or null when the value is
 * not ours, has been tampered with, or has expired.
 */
export function verifyMobileOAuthState(state: string | null): MobileOAuthState | null {
  if (!state) {
    return null;
  }

  const [encodedPayload, signature] = state.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = sign(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as Partial<MobileOAuthState>;

    if (
      parsed.kind !== MOBILE_STATE_KIND ||
      parsed.version !== STATE_VERSION ||
      typeof parsed.userId !== 'number' ||
      typeof parsed.teamId !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt < Date.now()
    ) {
      return null;
    }

    return parsed as MobileOAuthState;
  } catch {
    return null;
  }
}

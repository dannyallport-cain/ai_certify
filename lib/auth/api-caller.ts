import type { NextRequest } from 'next/server';

import { getMobileUser } from '@/lib/auth/mobile';
import { getUser, getUserWithTeam } from '@/lib/db/queries';

/**
 * Identifies who is calling a shared API route.
 *
 * The `/api/ai/*` routes are called from two places: the web app, which carries
 * the `session` cookie, and the Expo app, which carries a bearer token minted by
 * `/api/auth/mobile`. Both must be accepted, but neither may be skipped — these
 * routes spend money with the AI gateway, so an anonymous caller has to be
 * turned away before any upstream request is made.
 */
export type ApiAuthSource = 'web' | 'mobile';

export interface ApiCaller {
  userId: number;
  email: string | null;
  teamId: number | null;
  source: ApiAuthSource;
}

async function resolveWebCaller(): Promise<ApiCaller | null> {
  const user = await getUser();

  if (!user) {
    return null;
  }

  // Read-only lookup: requesting a team here would provision one for an account
  // that has none, which is a surprising side effect for an analysis call.
  const membership = await getUserWithTeam(user.id);

  return {
    userId: user.id,
    email: user.email ?? null,
    teamId: membership?.teamId ?? null,
    source: 'web',
  };
}

async function resolveMobileCaller(request: NextRequest): Promise<ApiCaller | null> {
  const mobileUser = await getMobileUser(request);

  if (!mobileUser) {
    return null;
  }

  return {
    userId: mobileUser.user.id,
    email: mobileUser.user.email ?? null,
    teamId: mobileUser.team?.id ?? null,
    source: 'mobile',
  };
}

/**
 * Returns the signed-in caller, or null when the request carries no valid web
 * session and no valid mobile token.
 *
 * An `Authorization` header is treated as authoritative: if a caller presents a
 * bearer token it must be valid, and the session cookie is not consulted as a
 * fallback.
 */
export async function getApiCaller(request: NextRequest): Promise<ApiCaller | null> {
  const authorization = request.headers.get('authorization');

  if (authorization?.startsWith('Bearer ')) {
    return resolveMobileCaller(request);
  }

  return resolveWebCaller();
}

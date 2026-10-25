/**
 * Starts the ServiceM8 OAuth flow from the mobile app.
 *
 * The app cannot simply open the dashboard page: `/servicem8` sits behind the
 * web session cookie, which the bearer token does not satisfy, so the browser
 * lands on the web sign-in screen instead of ServiceM8.
 *
 * Instead the app authenticates here with its bearer token and receives the
 * ServiceM8 authorization URL to open. The user's identity then travels inside
 * the signed `state` parameter, so the callback can finish the connection
 * without a web session.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getMobileUser } from '@/lib/auth/mobile';
import { SERVICEM8_CONFIG } from '@/lib/servicem8/config';
import { createMobileOAuthState, MOBILE_OAUTH_STATE_TTL_MS } from '@/lib/servicem8/mobile-oauth';

export async function POST(request: NextRequest) {
  try {
    const mobileSession = await getMobileUser(request);

    if (!mobileSession?.user || !mobileSession.team?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const state = createMobileOAuthState(mobileSession.user.id, mobileSession.team.id);

    const authorizeUrl = new URL(SERVICEM8_CONFIG.authorizationUrl);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', SERVICEM8_CONFIG.appId);
    authorizeUrl.searchParams.set('redirect_uri', SERVICEM8_CONFIG.callbackUrl);
    authorizeUrl.searchParams.set('scope', SERVICEM8_CONFIG.scopes.join(' '));
    authorizeUrl.searchParams.set('state', state);

    return NextResponse.json({
      authorizeUrl: authorizeUrl.toString(),
      expiresInSeconds: Math.round(MOBILE_OAUTH_STATE_TTL_MS / 1000),
    });
  } catch (error) {
    console.error('Error starting mobile ServiceM8 OAuth:', error);
    return NextResponse.json(
      { error: 'Unable to start ServiceM8 sign-in' },
      { status: 500 }
    );
  }
}

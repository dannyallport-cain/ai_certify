/**
 * ServiceM8 external integration OAuth callback.
 *
 * After the user authorizes AI Certify in ServiceM8, this route exchanges the
 * returned authorization code and stores the tokens against the current user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ServiceM8Client_API, type ServiceM8TokenResponse } from '@/lib/servicem8/client';
import { db } from '@/lib/db/drizzle';
import { servicem8Connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser, getTeamForUser } from '@/lib/db/queries';

function parseServiceM8State(state: string | null): Record<string, string> {
  if (!state) {
    return {};
  }

  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) =>
        typeof value === 'string' ? [[key, value]] : []
      )
    );
  } catch {
    return {};
  }
}

function buildDashboardRedirectUrl(
  request: NextRequest,
  outcome: { success?: string; error?: string }
) {
  const url = new URL('/dashboard/servicem8', request.url);

  if (outcome.success) {
    url.searchParams.set('success', outcome.success);
  } else {
    url.searchParams.set('error', outcome.error || 'callback_failed');
  }

  return url;
}

function finishOAuthResponse(
  request: NextRequest,
  outcome: { success?: string; error?: string },
  isPopup: boolean
) {
  if (isPopup) {
    const redirectUrl = buildDashboardRedirectUrl(request, outcome).toString();
    const payload = {
      source: 'servicem8-oauth',
      ...outcome,
    };

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ServiceM8 Connection</title>
  </head>
  <body>
    <script>
      (function () {
        var payload = ${JSON.stringify(payload)};
        var redirectUrl = ${JSON.stringify(redirectUrl)};

        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, window.location.origin);
            window.close();
            setTimeout(function () {
              window.location.replace(redirectUrl);
            }, 300);
            return;
          }
        } catch (error) {
          console.error('Failed to notify opener window', error);
        }

        window.location.replace(redirectUrl);
      })();
    </script>
    <p>Completing ServiceM8 connection…</p>
  </body>
</html>`;

    const response = new NextResponse(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });

    response.cookies.delete('sm8_oauth_state');
    response.cookies.delete('sm8_pending_token');

    return response;
  }

  const response = NextResponse.redirect(buildDashboardRedirectUrl(request, outcome));
  response.cookies.delete('sm8_oauth_state');
  response.cookies.delete('sm8_pending_token');
  return response;
}

function buildPendingSignInRedirect(request: NextRequest, isPopup: boolean) {
  const signInUrl = new URL('/sign-in', request.url);
  signInUrl.searchParams.set(
    'redirect',
    isPopup ? '/api/servicem8/callback?complete_pending=1&popup=1' : '/api/servicem8/callback?complete_pending=1'
  );

  return signInUrl;
}

async function storeConnectionForCurrentUser(tokenData: ServiceM8TokenResponse) {
  const user = await getUser();
  if (!user) {
    return { ok: false as const, reason: 'no_user' };
  }

  const teamData = await getTeamForUser();
  if (!teamData) {
    return { ok: false as const, reason: 'no_team' };
  }

  const teamId = teamData.id;
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  const client = new ServiceM8Client_API(
    tokenData.access_token,
    tokenData.refresh_token,
    teamId,
    user.id
  );

  let companyName = '';
  let accountUuid = '';
  try {
    const company = await client.getCompanyInfo();
    companyName = company.name || '';
    accountUuid = company.uuid || '';
  } catch (e) {
    console.warn('Could not fetch ServiceM8 company info:', e);
  }

  const existing = await db
    .select()
    .from(servicem8Connections)
    .where(eq(servicem8Connections.userId, user.id))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(servicem8Connections)
      .set({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: expiresAt,
        servicem8CompanyName: companyName,
        servicem8AccountUuid: accountUuid,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(servicem8Connections.userId, user.id));
  } else {
    await db.insert(servicem8Connections).values({
      teamId,
      userId: user.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: expiresAt,
      servicem8CompanyName: companyName,
      servicem8AccountUuid: accountUuid,
      isActive: true,
      syncEnabled: true,
      syncDirection: 'bidirectional',
    });
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const parsedState = parseServiceM8State(state);
    const isPopup = searchParams.get('popup') === '1' || parsedState.popup === '1';

    if (error) {
      console.error('ServiceM8 OAuth error:', error);
      return finishOAuthResponse(request, { error }, isPopup);
    }

    const isCompletingPending = searchParams.get('complete_pending') === '1';
    const pendingTokenCookie = request.cookies.get('sm8_pending_token')?.value;

    if (!code && !isCompletingPending) {
      return finishOAuthResponse(request, { error: 'no_code' }, isPopup);
    }

    const storedState = request.cookies.get('sm8_oauth_state')?.value;
    if (code && state && storedState && state !== storedState) {
      return finishOAuthResponse(request, { error: 'invalid_state' }, isPopup);
    }

    const user = await getUser().catch(() => null);

    if (code) {
      const tokenData = await ServiceM8Client_API.exchangeCode(code);

      if (!user) {
        const response = NextResponse.redirect(buildPendingSignInRedirect(request, isPopup));
        response.cookies.set('sm8_pending_token', JSON.stringify(tokenData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600,
          path: '/',
        });
        response.cookies.delete('sm8_oauth_state');
        return response;
      }

      const stored = await storeConnectionForCurrentUser(tokenData);
      if (!stored.ok) {
        return finishOAuthResponse(request, { error: 'no_team' }, isPopup);
      }

      return finishOAuthResponse(request, { success: 'connected' }, isPopup);
    }

    if (isCompletingPending && pendingTokenCookie) {
      if (!user) {
        return NextResponse.redirect(buildPendingSignInRedirect(request, isPopup));
      }

      const tokenData = JSON.parse(pendingTokenCookie) as ServiceM8TokenResponse;
      const stored = await storeConnectionForCurrentUser(tokenData);
      if (!stored.ok) {
        return finishOAuthResponse(request, { error: 'no_team' }, isPopup);
      }

      return finishOAuthResponse(request, { success: 'connected' }, isPopup);
    }

    return finishOAuthResponse(request, { error: 'no_code' }, isPopup);
  } catch (error) {
    console.error('ServiceM8 callback error:', error);
    const fallbackState = request.nextUrl.searchParams.get('state');
    const parsedState = parseServiceM8State(fallbackState);
    const isPopup = request.nextUrl.searchParams.get('popup') === '1' || parsedState.popup === '1';
    return finishOAuthResponse(request, { error: 'callback_failed' }, isPopup);
  }
}

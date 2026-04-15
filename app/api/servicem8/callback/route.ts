/**
 * ServiceM8 external integration OAuth callback.
 *
 * After the user authorizes AI Certify in ServiceM8, this route exchanges the
 * returned authorization code and stores the tokens against the current team.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ServiceM8Client_API, type ServiceM8TokenResponse } from '@/lib/servicem8/client';
import { db } from '@/lib/db/drizzle';
import { servicem8Connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser, getTeamForUser } from '@/lib/db/queries';

async function storeConnectionForCurrentTeam(tokenData: ServiceM8TokenResponse) {
  const teamData = await getTeamForUser();
  if (!teamData) {
    return { ok: false as const, reason: 'no_team' };
  }

  const teamId = teamData.id;
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  const client = new ServiceM8Client_API(
    tokenData.access_token,
    tokenData.refresh_token,
    teamId
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
    .where(eq(servicem8Connections.teamId, teamId))
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
      .where(eq(servicem8Connections.teamId, teamId));
  } else {
    await db.insert(servicem8Connections).values({
      teamId,
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

    // Handle OAuth errors
    if (error) {
      console.error('ServiceM8 OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard/servicem8?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    const isCompletingPending = searchParams.get('complete_pending') === '1';
    const pendingTokenCookie = request.cookies.get('sm8_pending_token')?.value;

    if (!code && !isCompletingPending) {
      return NextResponse.redirect(
        new URL('/dashboard/servicem8?error=no_code', request.url)
      );
    }

    // Verify state to prevent CSRF only during the live OAuth callback step
    const storedState = request.cookies.get('sm8_oauth_state')?.value;
    if (code && state && storedState && state !== storedState) {
      return NextResponse.redirect(
        new URL('/dashboard/servicem8?error=invalid_state', request.url)
      );
    }

    const user = await getUser().catch(() => null);

    if (code) {
      const tokenData = await ServiceM8Client_API.exchangeCode(code);

      if (!user) {
        const response = NextResponse.redirect(
          new URL('/sign-in?redirect=/api/servicem8/callback?complete_pending=1', request.url)
        );
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

      const stored = await storeConnectionForCurrentTeam(tokenData);
      if (!stored.ok) {
        return NextResponse.redirect(
          new URL('/dashboard/servicem8?error=no_team', request.url)
        );
      }

      const response = NextResponse.redirect(
        new URL('/dashboard/servicem8?success=connected', request.url)
      );
      response.cookies.delete('sm8_oauth_state');
      response.cookies.delete('sm8_pending_token');
      return response;
    }

    if (isCompletingPending && pendingTokenCookie) {
      if (!user) {
        return NextResponse.redirect(
          new URL('/sign-in?redirect=/api/servicem8/callback?complete_pending=1', request.url)
        );
      }

      const tokenData = JSON.parse(pendingTokenCookie) as ServiceM8TokenResponse;
      const stored = await storeConnectionForCurrentTeam(tokenData);
      if (!stored.ok) {
        return NextResponse.redirect(
          new URL('/dashboard/servicem8?error=no_team', request.url)
        );
      }

      const response = NextResponse.redirect(
        new URL('/dashboard/servicem8?success=connected', request.url)
      );
      response.cookies.delete('sm8_oauth_state');
      response.cookies.delete('sm8_pending_token');
      return response;
    }

    return NextResponse.redirect(
      new URL('/dashboard/servicem8?error=no_code', request.url)
    );
  } catch (error) {
    console.error('ServiceM8 callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/servicem8?error=callback_failed', request.url)
    );
  }
}

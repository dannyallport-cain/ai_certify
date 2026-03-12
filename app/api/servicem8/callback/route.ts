/**
 * ServiceM8 OAuth Callback Endpoint
 * 
 * After the user authorizes the addon in ServiceM8, they're redirected here
 * with an authorization code. We exchange it for access/refresh tokens and
 * store them in the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ServiceM8Client_API } from '@/lib/servicem8/client';
import { db } from '@/lib/db/drizzle';
import { servicem8Connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser, getTeamForUser } from '@/lib/db/queries';

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

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/servicem8?error=no_code', request.url)
      );
    }

    // Verify state to prevent CSRF
    const storedState = request.cookies.get('sm8_oauth_state')?.value;
    if (state && storedState && state !== storedState) {
      return NextResponse.redirect(
        new URL('/dashboard/servicem8?error=invalid_state', request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenData = await ServiceM8Client_API.exchangeCode(code);

    // Get the current user and their team
    const user = await getUser();
    if (!user) {
      // Store the token temporarily and redirect to login
      // After login, we'll complete the connection
      const response = NextResponse.redirect(
        new URL('/sign-in?redirect=/dashboard/servicem8&sm8_pending=true', request.url)
      );
      response.cookies.set('sm8_pending_token', JSON.stringify(tokenData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });
      return response;
    }

    const teamData = await getTeamForUser();
    if (!teamData) {
      return NextResponse.redirect(
        new URL('/dashboard/servicem8?error=no_team', request.url)
      );
    }

    const teamId = teamData.id;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Create the API client and fetch company info
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

    // Upsert the connection (one connection per team)
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

    // Clear OAuth state cookie
    const response = NextResponse.redirect(
      new URL('/dashboard/servicem8?success=connected', request.url)
    );
    response.cookies.delete('sm8_oauth_state');

    return response;
  } catch (error) {
    console.error('ServiceM8 callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/servicem8?error=callback_failed', request.url)
    );
  }
}

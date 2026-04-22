/**
 * ServiceM8 external integration activation endpoint.
 *
 * ServiceM8 sends the user here when they click Connect from the add-on listing.
 * This route starts the OAuth flow for the standalone AI Certify web app.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SERVICEM8_CONFIG } from '@/lib/servicem8/config';
import { getUser } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    // If the user is already logged in, we can associate the connection
    // If not, we'll handle it after the OAuth callback
    const user = await getUser().catch(() => null);
    
    // Generate a state parameter for CSRF protection
    // Include our team context if available
    const isPopup = request.nextUrl.searchParams.get('popup') === '1';
    const stateData: Record<string, string> = {
      nonce: crypto.randomUUID(),
      timestamp: Date.now().toString(),
      popup: isPopup ? '1' : '0',
    };
    
    // If we have URL params from ServiceM8 activation, forward them
    const callbackUrl = request.nextUrl.searchParams.get('callback_url');
    if (callbackUrl) {
      stateData.sm8_callback = callbackUrl;
    }

    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Build the ServiceM8 OAuth authorization URL
    const authUrl = new URL(SERVICEM8_CONFIG.authorizationUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', SERVICEM8_CONFIG.appId);
    authUrl.searchParams.set('redirect_uri', SERVICEM8_CONFIG.callbackUrl);
    authUrl.searchParams.set('scope', SERVICEM8_CONFIG.scopes.join(' '));
    authUrl.searchParams.set('state', state);

    // Store state in a cookie for verification on callback
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('sm8_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('ServiceM8 activation error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=servicem8_activation_failed', request.url)
    );
  }
}

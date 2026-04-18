import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/admin';
import {
  createMobileCaptureToken,
  MOBILE_CAPTURE_TOKEN_TTL_MINUTES,
  userAssetKindSchema,
} from '@/lib/auth/mobile-capture';
import { getReachableBaseUrl } from '@/lib/utils/reachable-base-url';

const requestSchema = z.object({
  kind: userAssetKindSchema,
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsedRequest = requestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json({ error: 'Invalid capture request.' }, { status: 400 });
    }

    const token = await createMobileCaptureToken({
      userId: user.id,
      kind: parsedRequest.data.kind,
    });

    const captureUrl = new URL('/mobile-capture', getReachableBaseUrl(request));
    captureUrl.searchParams.set('token', token);

    const debug = {
      requestOrigin: request.nextUrl.origin,
      reachableBaseUrl: getReachableBaseUrl(request),
      captureUrl: captureUrl.toString(),
    };

    console.error('Mobile capture session created:', debug);

    return NextResponse.json({
      captureUrl: captureUrl.toString(),
      expiresAt: new Date(
        Date.now() + MOBILE_CAPTURE_TOKEN_TTL_MINUTES * 60 * 1000
      ).toISOString(),
      debug,
    });
  } catch (error) {
    console.error('Error creating mobile capture session:', error);
    return NextResponse.json({ error: 'Failed to create capture session.' }, { status: 500 });
  }
}

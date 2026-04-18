import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getCurrentUser } from '@/lib/auth/admin';
import { getR2BucketName, getR2Client } from '@/lib/storage/r2';

type RouteContext = {
  params: Promise<{
    kind: string;
  }>;
};

const ALLOWED_KIND_PREFIX: Record<string, string> = {
  avatar: 'users/',
  signature: 'users/',
};

function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return typeof ReadableStream !== 'undefined' && value instanceof ReadableStream;
}

function getSingleQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function isAllowedUserAssetKey(key: string, userId: number, kind: string) {
  if (!(kind in ALLOWED_KIND_PREFIX)) {
    return false;
  }

  const expectedPrefix = `users/${userId}/${kind}/`;
  return key.startsWith(expectedPrefix);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { kind } = await context.params;
    const key = getSingleQueryValue(request.nextUrl.searchParams.getAll('key'))?.trim();

    if (!key || !isAllowedUserAssetKey(key, user.id, kind)) {
      return NextResponse.json({ error: 'Invalid asset key.' }, { status: 400 });
    }

    const client = getR2Client();
    const bucket = getR2BucketName();

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body || !isReadableStream(response.Body)) {
      return NextResponse.json({ error: 'Asset data unavailable.' }, { status: 404 });
    }

    return new NextResponse(response.Body as unknown as BodyInit, {
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error proxying user asset:', error);
    return NextResponse.json({ error: 'Failed to load asset.' }, { status: 500 });
  }
}

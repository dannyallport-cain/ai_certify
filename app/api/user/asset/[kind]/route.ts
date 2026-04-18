import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, HeadObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
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

function isBodyStream(value: unknown): value is BodyInit {
  if (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream) {
    return true;
  }

  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { pipe: unknown }).pipe === 'function'
  );
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

async function resolveExistingUserAssetKey(bucket: string, key: string) {
  const client = getR2Client();
  const candidates = [key];

  if (key.endsWith('.jpg')) {
    candidates.push(`${key.slice(0, -4)}.png`);
  } else if (key.endsWith('.png')) {
    candidates.push(`${key.slice(0, -4)}.jpg`);
  }

  for (const candidate of candidates) {
    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: candidate,
        })
      );

      return candidate;
    } catch {
      // try next candidate
    }
  }

  return key;
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
    const resolvedKey = await resolveExistingUserAssetKey(bucket, key);

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: resolvedKey,
      })
    );

    if (!response.Body || !isBodyStream(response.Body)) {
      console.error('Asset body is not a supported stream:', {
        key: resolvedKey,
        bodyType: typeof response.Body,
        constructorName:
          typeof response.Body === 'object' && response.Body !== null
            ? response.Body.constructor?.name
            : null,
      });

      return NextResponse.json({ error: 'Asset data unavailable.' }, { status: 404 });
    }

    return new NextResponse(response.Body, {
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    if (error instanceof NoSuchKey || (error instanceof Error && /NoSuchKey|NotFound/i.test(error.name))) {
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }

    console.error('Error proxying user asset:', error);
    return NextResponse.json({ error: 'Failed to load asset.' }, { status: 500 });
  }
}

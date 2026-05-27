import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth/admin';
import { getR2BucketName, getR2Client } from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';

const TEST_OBJECT_PREFIX = 'integration-tests';
const TEST_IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5pD0QAAAAASUVORK5CYII=';

function buildTestObjectKey() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `${TEST_OBJECT_PREFIX}/${stamp}-${crypto.randomUUID()}.png`;
}

function toBufferFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/i);

  if (!match) {
    throw new Error('Invalid test data URL');
  }

  return Buffer.from(match[1], 'base64');
}

export async function POST() {
  let objectKey = '';

  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const bucket = getR2BucketName();
    const client = getR2Client();
    objectKey = buildTestObjectKey();
    const body = toBufferFromDataUrl(TEST_IMAGE_DATA_URL);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: body,
        ContentType: 'image/png',
      })
    );

    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    );

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    );

    return NextResponse.json({
      success: true,
      service: 'r2',
      message: 'R2 upload, verification, and cleanup completed successfully.',
      checkedAt: new Date().toISOString(),
      details: {
        bucket,
        objectKey,
        roundTrip: 'upload → head → delete',
      },
    });
  } catch (error) {
    if (objectKey) {
      try {
        const client = getR2Client();
        const bucket = getR2BucketName();

        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: objectKey,
          })
        );
      } catch {
        // Best-effort cleanup only.
      }
    }

    const message = error instanceof Error ? error.message : 'Failed to verify R2 connectivity';
    const missingConfig =
      message.startsWith('Missing required R2 environment variable') ||
      message.includes('Expected one of: R2_ACCESS_KEY_ID, R2_ACCESS_KEY, AWS_ACCESS_KEY_ID') ||
      message.includes('Expected one of: R2_SECRET_ACCESS_KEY, R2_SECRET_KEY, AWS_SECRET_ACCESS_KEY');
    const status = missingConfig ? 503 : 502;

    return NextResponse.json(
      {
        success: false,
        service: 'r2',
        message,
        hints: missingConfig
          ? [
              'Set R2_ACCOUNT_ID and R2_BUCKET.',
              'Set access key via one of: R2_ACCESS_KEY_ID, R2_ACCESS_KEY, AWS_ACCESS_KEY_ID.',
              'Set secret key via one of: R2_SECRET_ACCESS_KEY, R2_SECRET_KEY, AWS_SECRET_ACCESS_KEY.',
            ]
          : undefined,
      },
      { status }
    );
  }
}

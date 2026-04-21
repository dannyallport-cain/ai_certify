import { NextRequest, NextResponse } from 'next/server';
import { errors as joseErrors } from 'jose';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { verifyMobileCaptureToken } from '@/lib/auth/mobile-capture';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import {
  buildUserAssetKey,
  uploadDataUrlToR2,
  type R2UploadResult,
} from '@/lib/storage/r2';

const dataUrlSchema = z
  .string()
  .regex(
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i,
    'Invalid image data.'
  );

const requestSchema = z.object({
  token: z.string().min(1),
  dataUrl: dataUrlSchema,
});

const SIGNATURE_MAX_LENGTH = 2_000_000;
const AVATAR_MAX_LENGTH = 20_000_000;

function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsedRequest = requestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: 'Invalid upload payload.' },
        { status: 400 }
      );
    }

    const { token, dataUrl } = parsedRequest.data;
    const { userId, kind } = await verifyMobileCaptureToken(token);
    const now = new Date();

    console.error('Mobile capture request received:', {
      userId,
      kind,
      dataUrlLength: dataUrl.length,
      dataUrlPrefix: dataUrl.slice(0, 40),
    });

    if (kind === 'signature' && dataUrl.length > SIGNATURE_MAX_LENGTH) {
      return NextResponse.json(
        { error: 'Signature image is too large.' },
        { status: 413 }
      );
    }

    if (kind === 'avatar' && dataUrl.length > AVATAR_MAX_LENGTH) {
      return NextResponse.json(
        { error: 'Avatar image is too large.' },
        { status: 413 }
      );
    }

    const contentTypeMatch = dataUrl.match(
      /^data:(image\/(?:png|jpeg|jpg|webp));base64,/i
    );

    if (!contentTypeMatch) {
      return NextResponse.json({ error: 'Invalid image data.' }, { status: 400 });
    }

    const normalizedContentType =
      contentTypeMatch[1].toLowerCase() === 'image/jpg'
        ? 'image/jpeg'
        : contentTypeMatch[1].toLowerCase();

    const normalizedDataUrl = dataUrl.replace(
      /^data:image\/jpg;base64,/i,
      'data:image/jpeg;base64,'
    );

    console.error('Mobile capture normalized upload payload:', {
      userId,
      kind,
      normalizedContentType,
      normalizedPrefix: normalizedDataUrl.slice(0, 40),
    });

    const upload: Pick<R2UploadResult, 'url' | 'contentType'> & {
      key: string | null;
    } = isR2Configured()
      ? await uploadDataUrlToR2({
          key: buildUserAssetKey(userId, kind, normalizedContentType),
          dataUrl: normalizedDataUrl,
        })
      : {
          key: null,
          url: normalizedDataUrl,
          contentType: normalizedContentType,
        };

    console.error('Mobile capture upload succeeded:', {
      userId,
      kind,
      key: upload.key,
      url: upload.url,
      contentType: upload.contentType,
    });

    const updateValues =
      kind === 'avatar'
        ? {
            avatarUrl: upload.url,
            avatarR2Key: upload.key,
            avatarUpdatedAt: now,
            updatedAt: now,
          }
        : {
            signatureUrl: upload.url,
            signatureR2Key: upload.key,
            signatureUpdatedAt: now,
            updatedAt: now,
          };

    const [updatedUser] = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      kind,
      asset: upload,
    });
  } catch (error) {
    console.error('Error saving mobile capture asset:', error);

    if (error instanceof joseErrors.JWTExpired) {
      return NextResponse.json(
        { error: 'This mobile capture link has expired. Please generate a new one.' },
        { status: 401 }
      );
    }

    if (error instanceof joseErrors.JOSEError) {
      return NextResponse.json(
        { error: 'This mobile capture link is invalid. Please generate a new one.' },
        { status: 401 }
      );
    }

    if (error instanceof Error && /AUTH_SECRET/i.test(error.message)) {
      return NextResponse.json(
        { error: 'Mobile capture is not configured correctly on the server.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save uploaded asset.',
        debug:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack:
                  process.env.NODE_ENV === 'development'
                    ? error.stack
                    : undefined,
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}

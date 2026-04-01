import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { verifyMobileCaptureToken } from '@/lib/auth/mobile-capture';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { buildUserAssetKey, uploadDataUrlToR2 } from '@/lib/storage/r2';

const dataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i, 'Invalid image data.');

const requestSchema = z.object({
  token: z.string().min(1),
  dataUrl: dataUrlSchema,
});

const SIGNATURE_MAX_LENGTH = 800_000;
const AVATAR_MAX_LENGTH = 3_000_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsedRequest = requestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json({ error: 'Invalid upload payload.' }, { status: 400 });
    }

    const { token, dataUrl } = parsedRequest.data;
    const { userId, kind } = await verifyMobileCaptureToken(token);
    const now = new Date();

    if (kind === 'signature' && dataUrl.length > SIGNATURE_MAX_LENGTH) {
      return NextResponse.json({ error: 'Signature image is too large.' }, { status: 413 });
    }

    if (kind === 'avatar' && dataUrl.length > AVATAR_MAX_LENGTH) {
      return NextResponse.json({ error: 'Avatar image is too large.' }, { status: 413 });
    }

    const contentTypeMatch = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,/i);

    if (!contentTypeMatch) {
      return NextResponse.json({ error: 'Invalid image data.' }, { status: 400 });
    }

    const upload = await uploadDataUrlToR2({
      key: buildUserAssetKey(userId, kind, contentTypeMatch[1]),
      dataUrl,
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
    return NextResponse.json({ error: 'Failed to save uploaded asset.' }, { status: 500 });
  }
}
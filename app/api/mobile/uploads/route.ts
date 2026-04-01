import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMobileUser } from '@/lib/auth/mobile';
import { uploadBufferToR2 } from '@/lib/storage/r2';

const categorySchema = z.enum(['certificate-photo', 'user-asset']);

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getExtension(contentType: string) {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpg':
    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

export async function POST(request: NextRequest) {
  const auth = await getMobileUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!auth.team) {
    return NextResponse.json({ error: 'No team found' }, { status: 403 });
  }

  try {
    const formData = await request.formData();

    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const parsed = z
      .object({
        category: categorySchema,
        certificateNumber: z.string().trim().min(1).optional(),
        label: z.string().trim().min(1).optional(),
        type: z.string().trim().min(1).optional(),
        slotIndex: z
          .string()
          .trim()
          .regex(/^\d+$/)
          .optional(),
      })
      .safeParse({
        category: formData.get('category'),
        certificateNumber: formData.get('certificateNumber') ?? undefined,
        label: formData.get('label') ?? undefined,
        type: formData.get('type') ?? undefined,
        slotIndex: formData.get('slotIndex') ?? undefined,
      });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid upload payload' },
        { status: 400 },
      );
    }

    const { category, certificateNumber, label, type, slotIndex } = parsed.data;
    const arrayBuffer = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extension = getExtension(fileEntry.type || 'image/jpeg');
    const slotSegment = slotIndex ? `slot-${slotIndex}` : null;
    const labelSegment = label ? sanitizeSegment(label) : null;
    const typeSegment = type ? sanitizeSegment(type) : null;
    const timestamp = Date.now();
    const now = new Date();
    const yearSegment = String(now.getUTCFullYear());
    const monthSegment = String(now.getUTCMonth() + 1).padStart(2, '0');

    const key =
      category === 'certificate-photo'
        ? [
            'users',
            String(auth.user.id),
            'certificates',
            sanitizeSegment(certificateNumber ?? `mobile-${timestamp}`),
            'photos',
            typeSegment ?? labelSegment ?? 'image',
            slotSegment,
            yearSegment,
            monthSegment,
            `${timestamp}.${extension}`,
          ]
            .filter(Boolean)
            .join('/')
        : [
            'users',
            String(auth.user.id),
            'media',
            typeSegment ?? labelSegment ?? 'uploads',
            yearSegment,
            monthSegment,
            `${timestamp}.${extension}`,
          ]
            .filter(Boolean)
            .join('/');

    const upload = await uploadBufferToR2({
      body: buffer,
      contentType: fileEntry.type || 'image/jpeg',
      key,
    });

    return NextResponse.json(upload, { status: 201 });
  } catch (error) {
    console.error('Mobile upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

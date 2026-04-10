import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth/admin';
import { deleteBackupFromR2 } from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';

const deleteBackupRequestSchema = z.object({
  objectKey: z.string().min(1, 'objectKey is required'),
});



export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const payload = deleteBackupRequestSchema.parse(body);

    const result = await deleteBackupFromR2(payload.objectKey);

    return NextResponse.json({
      success: result.key.length > 0,
      objectKey: result.key,
      bucket: result.bucket,
      deletedAt: result.deletedAt,
    });
  } catch (error) {
    console.error('Error deleting database backup:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid delete request', details: error.flatten() }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'Invalid objectKey') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.startsWith('Backup not found for objectKey:')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete database backup' }, { status: 500 });
  }
}

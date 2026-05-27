import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

const restoreRequestSchema = z.object({
  objectKey: z.string().min(1, 'objectKey is required'),
});

function getWorkerConfig() {
  const workerBaseUrl = process.env.RAILWAY_BACKUP_WORKER_URL?.trim();
  const backupSharedSecret = process.env.BACKUP_SHARED_SECRET?.trim();

  if (!workerBaseUrl) {
    console.error('Missing RAILWAY_BACKUP_WORKER_URL');
    return {
      error: NextResponse.json(
        { error: 'Backup worker URL is not configured', code: 'MISSING_WORKER_URL' },
        { status: 503 }
      ),
    };
  }

  if (!backupSharedSecret) {
    console.error('Missing BACKUP_SHARED_SECRET');
    return {
      error: NextResponse.json(
        { error: 'Backup shared secret is not configured', code: 'MISSING_BACKUP_SHARED_SECRET' },
        { status: 503 }
      ),
    };
  }

  return {
    workerBaseUrl: workerBaseUrl.replace(/\/+$/, ''),
    backupSharedSecret,
  };
}

async function parseWorkerResponse(workerResponse: Response) {
  const contentType = workerResponse.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return workerResponse.json();
  }

  return {
    success: false,
    error: await workerResponse.text(),
  };
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const payload = restoreRequestSchema.parse(body);

    const config = getWorkerConfig();

    if ('error' in config) {
      return config.error;
    }

    const workerResponse = await fetch(`${config.workerBaseUrl}/restore-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Backup-Token': config.backupSharedSecret,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const responseBody = await parseWorkerResponse(workerResponse);

    return NextResponse.json(responseBody, { status: workerResponse.status });
  } catch (error) {
    console.error('Error restoring database backup:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid restore request', details: error.flatten() }, { status: 400 });
    }

    if (error instanceof TypeError) {
      return NextResponse.json(
        { error: 'Failed to reach backup worker service', code: 'WORKER_UNREACHABLE' },
        { status: 502 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to restore database backup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

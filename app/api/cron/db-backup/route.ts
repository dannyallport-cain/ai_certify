import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getCronSecretAuthorization() {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return null;
  }

  return `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  try {
    const expectedAuthorization = getCronSecretAuthorization();
    const incomingAuthorization = request.headers.get('authorization');

    if (expectedAuthorization && incomingAuthorization !== expectedAuthorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workerBaseUrl = process.env.RAILWAY_BACKUP_WORKER_URL;
    const backupSharedSecret = process.env.BACKUP_SHARED_SECRET;

    if (!workerBaseUrl) {
      console.error('Missing RAILWAY_BACKUP_WORKER_URL');
      return NextResponse.json({ error: 'Backup worker URL is not configured' }, { status: 500 });
    }

    if (!backupSharedSecret) {
      console.error('Missing BACKUP_SHARED_SECRET');
      return NextResponse.json({ error: 'Backup shared secret is not configured' }, { status: 500 });
    }

    const workerResponse = await fetch(`${workerBaseUrl}/backup-database`, {
      method: 'POST',
      headers: {
        'X-Backup-Token': backupSharedSecret,
      },
      cache: 'no-store',
    });

    const contentType = workerResponse.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json')
      ? await workerResponse.json()
      : { success: false, error: await workerResponse.text() };

    return NextResponse.json(responseBody, { status: workerResponse.status });
  } catch (error) {
    console.error('Error triggering database backup:', error);
    return NextResponse.json({ error: 'Failed to trigger database backup' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';

import { processPendingServiceM8Syncs } from '@/lib/servicem8/sync';

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

    const limitValue = process.env.SERVICEM8_SYNC_BATCH_SIZE?.trim();
    const parsedLimit = limitValue ? Number.parseInt(limitValue, 10) : NaN;
    const batchSize = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 25;

    const result = await processPendingServiceM8Syncs(batchSize);

    return NextResponse.json({
      success: true,
      batchSize,
      ...result,
    });
  } catch (error) {
    console.error('Error processing pending ServiceM8 syncs:', error);
    return NextResponse.json(
      { error: 'Failed to process pending ServiceM8 syncs' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

import { uploadBufferToR2 } from '@/lib/storage/r2';

type TrainingSampleRequest = {
  imageBase64: string;
  labels: {
    deviceType: string;
    manufacturer: string;
    mounting: string;
    visibility: string;
  };
  notes?: string;
  clarification?: string;
  metadata?: Record<string, unknown>;
  analysis?: unknown;
};

/**
 * Training samples used to be written into `ml/datasets/collected` on the local
 * filesystem. That only works on a long-lived server — the deployed runtime has
 * a read-only bundle, so samples were lost. They now go to R2 alongside the
 * other captured media.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request body' },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: 'Invalid request payload' },
      { status: 400 },
    );
  }

  const payload = body as TrainingSampleRequest;

  if (!payload.imageBase64 || !payload.labels) {
    return NextResponse.json(
      { success: false, error: 'imageBase64 and labels are required' },
      { status: 400 },
    );
  }

  try {
    const sampleId = `training-sample-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const now = new Date();
    const key = [
      'ml',
      'training-samples',
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${sampleId}.json`,
    ].join('/');

    const document = {
      id: sampleId,
      createdAt: now.toISOString(),
      labels: payload.labels,
      notes: payload.notes || null,
      clarification: payload.clarification || null,
      metadata: payload.metadata || null,
      analysis: payload.analysis || null,
      // Kept with the sample so the image always travels with its labels.
      imageBase64: payload.imageBase64,
    };

    const upload = await uploadBufferToR2({
      key,
      body: Buffer.from(JSON.stringify(document), 'utf8'),
      contentType: 'application/json',
    });

    return NextResponse.json({ success: true, sampleId, storageKey: upload.key }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save training sample';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

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
    const datasetDir = path.resolve(process.cwd(), 'ml/datasets/collected');
    await fs.mkdir(datasetDir, { recursive: true });

    const sampleId = `training-sample-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const samplePath = path.join(datasetDir, `${sampleId}.json`);

    await fs.writeFile(
      samplePath,
      JSON.stringify(
        {
          id: sampleId,
          createdAt: new Date().toISOString(),
          labels: payload.labels,
          notes: payload.notes || null,
          clarification: payload.clarification || null,
          metadata: payload.metadata || null,
          analysis: payload.analysis || null,
        },
        null,
        2,
      ),
      'utf8',
    );

    return NextResponse.json({ success: true, sampleId, samplePath }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save training sample';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

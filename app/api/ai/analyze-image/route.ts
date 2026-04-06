import { NextResponse } from 'next/server';

import type { AnalyzeImageRequest } from '@/lib/ai/railway-client';

export async function POST(request: Request) {
  const workerBaseUrl = process.env.RAILWAY_AI_WORKER_URL;

  if (!workerBaseUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'RAILWAY_AI_WORKER_URL is not configured',
      },
      { status: 500 },
    );
  }

  let body: AnalyzeImageRequest;

  try {
    body = (await request.json()) as AnalyzeImageRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request body',
      },
      { status: 400 },
    );
  }

  const endpoint = `${workerBaseUrl.replace(/\/+$/, '')}/analyze-image`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reach Railway AI worker',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 },
    );
  }
}
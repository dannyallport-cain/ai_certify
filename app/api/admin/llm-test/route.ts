import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth/admin';
import {
  analyzeImageWithRailwayWorker,
  type AnalyzeImageRequest,
  type AnalyzeImageResponse,
} from '@/lib/ai/railway-client';

function isAnalyzeImageRequest(value: unknown): value is AnalyzeImageRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  if (
    payload.imageUrl !== undefined &&
    typeof payload.imageUrl !== 'string'
  ) {
    return false;
  }

  if (
    payload.imageBase64 !== undefined &&
    typeof payload.imageBase64 !== 'string'
  ) {
    return false;
  }

  if (
    payload.reportType !== undefined &&
    typeof payload.reportType !== 'string'
  ) {
    return false;
  }

  if (
    payload.inspectionType !== undefined &&
    typeof payload.inspectionType !== 'string'
  ) {
    return false;
  }

  if (
    payload.requestedSections !== undefined &&
    (!Array.isArray(payload.requestedSections) ||
      payload.requestedSections.some((section) => typeof section !== 'string'))
  ) {
    return false;
  }

  if (
    payload.metadata !== undefined &&
    (!payload.metadata ||
      typeof payload.metadata !== 'object' ||
      Array.isArray(payload.metadata))
  ) {
    return false;
  }

  if (
    payload.certificateContext !== undefined &&
    (!payload.certificateContext ||
      typeof payload.certificateContext !== 'object' ||
      Array.isArray(payload.certificateContext))
  ) {
    return false;
  }

  return true;
}

function isWorkerConnectivityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message === 'fetch failed') {
    return true;
  }

  const cause = error.cause as {
    code?: string;
    errors?: Array<{ code?: string }>;
  } | undefined;

  if (cause?.code === 'ECONNREFUSED') {
    return true;
  }

  return cause?.errors?.some((item) => item.code === 'ECONNREFUSED') ?? false;
}

function shouldUseRailwayWorker(): boolean {
  return process.env.NODE_ENV === 'production' && Boolean(process.env.RAILWAY_AI_WORKER_URL);
}

async function analyzeImageWithLocalRoute(
  request: Request,
  payload: AnalyzeImageRequest,
): Promise<AnalyzeImageResponse> {
  const response = await fetch(new URL('/api/ai/analyze-image', request.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as AnalyzeImageResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || 'Local AI analysis failed.');
  }

  return data;
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON request body',
        },
        { status: 400 },
      );
    }

    if (!isAnalyzeImageRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid analyze image request payload',
        },
        { status: 400 },
      );
    }

    if (!body.imageUrl && !body.imageBase64) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either imageUrl or imageBase64 is required',
        },
        { status: 400 },
      );
    }

    if (!shouldUseRailwayWorker()) {
      console.warn('Using local analysis route because Railway worker is disabled in this environment.');
      const response = await analyzeImageWithLocalRoute(request, body);
      return NextResponse.json(response, { status: 200 });
    }

    try {
      const response = await analyzeImageWithRailwayWorker(body);
      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      if (!isWorkerConnectivityError(error)) {
        throw error;
      }

      console.warn('Railway AI worker unreachable; falling back to local analysis route.');
      const response = await analyzeImageWithLocalRoute(request, body);
      return NextResponse.json(response, { status: 200 });
    }
  } catch (error) {
    console.error('Error forwarding admin LLM test request:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to analyze image';

    const status =
      message === 'RAILWAY_AI_WORKER_URL is not configured'
        ? 503
        : message.startsWith('Railway AI worker request failed with status ')
          ? 502
          : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}

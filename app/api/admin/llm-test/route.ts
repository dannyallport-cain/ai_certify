import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/auth/admin';
import {
  analyzeImageWithRailwayWorker,
  type AnalyzeImageRequest,
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

    const response = await analyzeImageWithRailwayWorker(body);

    return NextResponse.json(response, { status: 200 });
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
import { NextResponse } from 'next/server';

import type { AnalyzeImageRequest } from '@/lib/ai/railway-client';

export async function POST(request: Request) {
  try {
    await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON request body',
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error:
        'AI image analysis has been disabled. External cost-based AI worker calls are not allowed in this deployment.',
    },
    { status: 503 },
  );
}

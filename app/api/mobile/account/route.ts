import { NextRequest, NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/auth/mobile';

export async function GET(request: NextRequest) {
  try {
    const auth = await getMobileUser(request);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(auth);
  } catch (error) {
    console.error('Failed to fetch mobile account overview:', error);
    return NextResponse.json({ error: 'Failed to fetch account overview' }, { status: 500 });
  }
}

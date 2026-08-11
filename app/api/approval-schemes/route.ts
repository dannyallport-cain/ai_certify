import { NextResponse } from 'next/server';
import { getApprovalSchemeTypes } from '@/lib/db/queries';

export async function GET() {
  try {
    const schemes = await getApprovalSchemeTypes();
    return NextResponse.json(schemes);
  } catch (error) {
    console.error('Error fetching approval schemes:', error);
    return NextResponse.json({ error: 'Failed to fetch approval schemes' }, { status: 500 });
  }
}

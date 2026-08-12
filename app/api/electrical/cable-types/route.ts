import { NextResponse } from 'next/server';
import { getCableTypes } from '@/lib/db/queries';

export async function GET() {
  try {
    const cableTypes = await getCableTypes();
    return NextResponse.json(cableTypes);
  } catch (error) {
    console.error('Error fetching cable types:', error);
    return NextResponse.json({ error: 'Failed to fetch cable types' }, { status: 500 });
  }
}

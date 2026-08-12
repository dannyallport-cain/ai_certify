import { NextResponse } from 'next/server';
import { getRcdRcboTypes } from '@/lib/db/queries';

export async function GET() {
  try {
    const rcdRcboTypes = await getRcdRcboTypes();
    return NextResponse.json(rcdRcboTypes);
  } catch (error) {
    console.error('Error fetching RCD/RCBO types:', error);
    return NextResponse.json({ error: 'Failed to fetch RCD/RCBO types' }, { status: 500 });
  }
}

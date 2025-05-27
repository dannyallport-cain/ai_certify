import { NextResponse } from 'next/server';
import { getCustomersForTeam } from '@/lib/db/queries';

export async function GET() {
  try {
    const customers = await getCustomersForTeam();
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

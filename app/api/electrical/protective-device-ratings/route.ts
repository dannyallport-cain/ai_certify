import { NextResponse } from 'next/server';
import { getProtectiveDeviceRatings } from '@/lib/db/queries';

export async function GET() {
  try {
    const ratings = await getProtectiveDeviceRatings();
    return NextResponse.json(ratings);
  } catch (error) {
    console.error('Error fetching protective device ratings:', error);
    return NextResponse.json({ error: 'Failed to fetch protective device ratings' }, { status: 500 });
  }
}

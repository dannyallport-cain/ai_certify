import { NextResponse } from 'next/server';
import { getMainProtectiveDevices, getCircuitProtectiveDevices } from '@/lib/db/queries';

export async function GET() {
  try {
    const [mainProtectiveDevices, circuitProtectiveDevices] = await Promise.all([
      getMainProtectiveDevices(),
      getCircuitProtectiveDevices(),
    ]);

    return NextResponse.json({
      mainProtectiveDevices,
      circuitProtectiveDevices,
    });
  } catch (error) {
    console.error('Error fetching protective device lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch protective device lists' },
      { status: 500 },
    );
  }
}

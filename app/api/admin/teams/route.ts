import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/admin';
import { getAllTeams } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const teams = await getAllTeams();
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error loading admin teams:', error);
    return NextResponse.json({ error: 'Failed to load teams' }, { status: 500 });
  }
}

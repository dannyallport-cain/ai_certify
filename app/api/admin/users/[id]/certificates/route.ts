export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/admin';
import { getCertificatesForTeamId, getUserWithTeam } from '@/lib/db/queries';

async function getRouteUserId(context: any) {
  const maybeParams = context?.params;
  const resolvedParams =
    maybeParams && typeof maybeParams.then === 'function'
      ? await maybeParams
      : maybeParams;

  const id = parseInt(String(resolvedParams?.id ?? ''), 10);
  return id;
}

export async function GET(_request: Request, context: any) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const id = await getRouteUserId(context);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const userWithTeam = await getUserWithTeam(id);

    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'User is not part of a team' }, { status: 404 });
    }

    const certificates = await getCertificatesForTeamId(userWithTeam.teamId);

    return NextResponse.json({
      userId: id,
      teamId: userWithTeam.teamId,
      certificates,
    });
  } catch (error) {
    console.error('Error loading admin user certificates:', error);
    return NextResponse.json({ error: 'Failed to load certificates' }, { status: 500 });
  }
}

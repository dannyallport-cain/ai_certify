/**
 * Fire alarm surveys collection.
 *
 * GET lists every survey for the signed-in user's team, newest first, with the
 * optional `search` and `status` filters the dashboard uses.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getTeamForUser, getUser } from '@/lib/db/queries';
import { isFireAlarmSurveyStatus } from '@/lib/fire-alarm/format';
import { listFireAlarmSurveys } from '@/lib/fire-alarm/survey-repository';

export async function GET(request: NextRequest) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const team = await getTeamForUser();

  if (!team) {
    return NextResponse.json({ error: 'No team found' }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get('status');

  try {
    const surveys = await listFireAlarmSurveys(team.id, {
      search: request.nextUrl.searchParams.get('search') ?? undefined,
      status: isFireAlarmSurveyStatus(statusParam) ? statusParam : undefined,
    });

    return NextResponse.json({ surveys, total: surveys.length });
  } catch (error) {
    console.error('[fire-alarm-surveys] listing failed:', error);
    return NextResponse.json({ error: 'Failed to load surveys' }, { status: 500 });
  }
}

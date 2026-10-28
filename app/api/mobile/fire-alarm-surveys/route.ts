/**
 * Fire alarm surveys for the mobile app.
 *
 * The web dashboard reads surveys through a cookie-authenticated route; the app
 * needs the same list with a bearer token, so it gets its own thin endpoint
 * rather than a second copy of the query.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getMobileUser } from '@/lib/auth/mobile';
import { isFireAlarmSurveyStatus } from '@/lib/fire-alarm/format';
import { listFireAlarmSurveys } from '@/lib/fire-alarm/survey-repository';

export async function GET(request: NextRequest) {
  const mobileUser = await getMobileUser(request);

  if (!mobileUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!mobileUser.team) {
    return NextResponse.json({ error: 'No team found' }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get('status');

  try {
    const surveys = await listFireAlarmSurveys(mobileUser.team.id, {
      search: request.nextUrl.searchParams.get('search') ?? undefined,
      status: isFireAlarmSurveyStatus(statusParam) ? statusParam : undefined,
    });

    return NextResponse.json({ surveys, total: surveys.length });
  } catch (error) {
    console.error('[mobile/fire-alarm-surveys] listing failed:', error);
    return NextResponse.json({ error: 'Failed to load surveys' }, { status: 500 });
  }
}

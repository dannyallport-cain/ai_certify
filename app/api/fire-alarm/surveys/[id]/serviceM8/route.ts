/**
 * Links a survey to a ServiceM8 job — the "file it in the diary" action.
 *
 * POST   resolves the job server-side, mirrors its client into `customers` so
 *        the survey inherits the client's details, stores the link and attaches
 *        the survey summary to the job.
 * DELETE clears the link without touching the survey itself.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getTeamForUser, getUser } from '@/lib/db/queries';
import { syncSurveyToJobDiary } from '@/lib/fire-alarm/diary-sync';
import { resolveSurveyJobLink } from '@/lib/fire-alarm/servicem8-link';
import {
  getFireAlarmSurvey,
  updateFireAlarmSurvey,
} from '@/lib/fire-alarm/survey-repository';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function resolveContext(context: RouteContext) {
  const { id } = await context.params;
  const surveyId = Number.parseInt(id, 10);

  if (!Number.isFinite(surveyId) || surveyId <= 0) {
    return { error: NextResponse.json({ error: 'Invalid survey id' }, { status: 400 }) };
  }

  const user = await getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  const team = await getTeamForUser();
  if (!team) {
    return { error: NextResponse.json({ error: 'No team found' }, { status: 403 }) };
  }

  return { surveyId, userId: user.id, teamId: team.id };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const resolved = await resolveContext(context);

  if ('error' in resolved) {
    return resolved.error;
  }

  const body = (await request.json().catch(() => ({}))) as { jobUuid?: unknown; syncDiary?: unknown };
  const jobUuid = typeof body.jobUuid === 'string' ? body.jobUuid.trim() : '';

  if (!jobUuid) {
    return NextResponse.json({ error: 'jobUuid is required' }, { status: 400 });
  }

  try {
    const linked = await resolveSurveyJobLink({
      teamId: resolved.teamId,
      connectionUserId: resolved.userId,
      jobUuid,
    });

    if (!linked) {
      return NextResponse.json(
        { error: 'That ServiceM8 job could not be loaded. Reconnect ServiceM8 and try again.' },
        { status: 502 },
      );
    }

    const summary = await updateFireAlarmSurvey(resolved.teamId, resolved.surveyId, {
      serviceM8: linked.link.serviceM8,
      ...(linked.link.customerId !== null ? { customerId: linked.link.customerId } : {}),
    });

    if (!summary) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Attaching the summary is what puts the survey on the job the office opens;
    // it is reported rather than thrown so a scope gap never blocks the link.
    const shouldSyncDiary = body.syncDiary !== false;
    const diary = shouldSyncDiary
      ? await (async () => {
          const detail = await getFireAlarmSurvey(resolved.teamId, resolved.surveyId);
          return detail
            ? syncSurveyToJobDiary({ userId: resolved.userId, survey: detail })
            : { status: 'skipped' as const, message: 'Survey could not be reloaded.' };
        })()
      : { status: 'skipped' as const, message: 'Diary sync was not requested.' };

    return NextResponse.json({
      survey: summary,
      customerResolved: linked.link.clientResolved,
      customerName: linked.link.customerName,
      diary,
    });
  } catch (error) {
    console.error('[fire-alarm-surveys] ServiceM8 link failed:', error);
    return NextResponse.json({ error: 'Failed to link the ServiceM8 job' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const resolved = await resolveContext(context);

  if ('error' in resolved) {
    return resolved.error;
  }

  try {
    const survey = await updateFireAlarmSurvey(resolved.teamId, resolved.surveyId, {
      serviceM8: null,
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json({ survey });
  } catch (error) {
    console.error('[fire-alarm-surveys] ServiceM8 unlink failed:', error);
    return NextResponse.json({ error: 'Failed to unlink the ServiceM8 job' }, { status: 500 });
  }
}

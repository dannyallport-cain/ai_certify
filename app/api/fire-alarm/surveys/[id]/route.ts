/**
 * A single fire alarm survey.
 *
 * GET    - the survey with its identified devices and published zone plan.
 * PATCH  - rename it, change its status, or link/unlink a customer.
 * DELETE - remove the survey and its devices.
 *
 * Linking a ServiceM8 job is a separate action (`POST .../serviceM8`) because it
 * reaches out to ServiceM8 to resolve the client instead of trusting the body.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getTeamForUser, getUser } from '@/lib/db/queries';
import { isFireAlarmSurveyStatus } from '@/lib/fire-alarm/format';
import {
  deleteFireAlarmSurvey,
  getFireAlarmSurvey,
  updateFireAlarmSurvey,
} from '@/lib/fire-alarm/survey-repository';
import type { FireAlarmSurveyUpdate } from '@/lib/fire-alarm/types';

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

export async function GET(_request: NextRequest, context: RouteContext) {
  const resolved = await resolveContext(context);

  if ('error' in resolved) {
    return resolved.error;
  }

  try {
    const survey = await getFireAlarmSurvey(resolved.teamId, resolved.surveyId);

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json({ survey });
  } catch (error) {
    console.error('[fire-alarm-surveys] detail failed:', error);
    return NextResponse.json({ error: 'Failed to load the survey' }, { status: 500 });
  }
}

function parseUpdate(body: Record<string, unknown>): FireAlarmSurveyUpdate {
  const update: FireAlarmSurveyUpdate = {};

  if ('name' in body) {
    update.name = typeof body.name === 'string' ? body.name : null;
  }

  if ('status' in body) {
    update.status = isFireAlarmSurveyStatus(body.status) ? body.status : undefined;
  }

  if ('customerId' in body) {
    update.customerId =
      typeof body.customerId === 'number' && Number.isFinite(body.customerId)
        ? body.customerId
        : null;
  }

  if ('serviceM8' in body) {
    update.serviceM8 = body.serviceM8 === null ? null : (body.serviceM8 as FireAlarmSurveyUpdate['serviceM8']);
  }

  return update;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const resolved = await resolveContext(context);

  if ('error' in resolved) {
    return resolved.error;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const survey = await updateFireAlarmSurvey(
      resolved.teamId,
      resolved.surveyId,
      parseUpdate(body),
    );

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json({ survey });
  } catch (error) {
    console.error('[fire-alarm-surveys] update failed:', error);
    return NextResponse.json({ error: 'Failed to update the survey' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const resolved = await resolveContext(context);

  if ('error' in resolved) {
    return resolved.error;
  }

  try {
    const deleted = await deleteFireAlarmSurvey(resolved.teamId, resolved.surveyId);

    if (!deleted) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[fire-alarm-surveys] delete failed:', error);
    return NextResponse.json({ error: 'Failed to delete the survey' }, { status: 500 });
  }
}

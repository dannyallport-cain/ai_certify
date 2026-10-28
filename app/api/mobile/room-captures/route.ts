/**
 * Mobile room capture endpoint.
 *
 * POST saves (or re-saves) the survey for a capture session.
 *
 * Two things matter here now that surveys are first-class records:
 *
 * 1. Every device the engineer gave a type is stored, not only the ones flagged
 *    as user-identified — the review step is part of the survey.
 * 2. The body may carry a survey name, a status and a ServiceM8 job. Passing a
 *    job uuid resolves its client, mirrors that client into `customers`, and
 *    files the survey against the job's diary entry, so the engineer never types
 *    the client's details on site.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getMobileUser } from '@/lib/auth/mobile';
import { normalizeServiceM8Link } from '@/lib/fire-alarm/format';
import { resolveSurveyJobLink } from '@/lib/fire-alarm/servicem8-link';
import { readSurveySummary } from '@/lib/fire-alarm/survey-repository';
import {
  saveFireAlarmSurvey,
  type SurveySessionInput,
} from '@/lib/fire-alarm/survey-writer';
import type {
  FireAlarmSurveyDeviceInput,
  FireAlarmSurveyServiceM8Link,
  FireAlarmSurveyStatus,
} from '@/lib/fire-alarm/types';

interface RoomCaptureBody {
  session?: SurveySessionInput | null;
  devices?: FireAlarmSurveyDeviceInput[] | null;
  metadata?: Record<string, unknown> | null;
  /** Optional survey name; falls back to the capture's session name. */
  name?: string | null;
  status?: FireAlarmSurveyStatus | null;
  /** A full link, when the caller already knows the job detail. */
  serviceM8?: unknown;
  /** A job uuid alone, resolved server-side into a link and a customer. */
  serviceM8JobUuid?: string | null;
  customerId?: number | null;
}

/**
 * Resolves the ServiceM8 half of the request into a storable link.
 *
 * A bare job uuid is preferred from the app because resolving it here also
 * mirrors the client and returns the job's address — the app never has to send
 * client details it does not have.
 */
async function resolveServiceM8Input(input: {
  teamId: number;
  userId: number;
  body: RoomCaptureBody;
}): Promise<{
  link: FireAlarmSurveyServiceM8Link | null;
  customerId: number | null;
  warning: string | null;
}> {
  const jobUuid =
    typeof input.body.serviceM8JobUuid === 'string' ? input.body.serviceM8JobUuid.trim() : '';

  if (jobUuid) {
    const resolved = await resolveSurveyJobLink({
      teamId: input.teamId,
      connectionUserId: input.userId,
      jobUuid,
    }).catch((error) => {
      console.warn('[room-captures] ServiceM8 job link failed:', error);
      return null;
    });

    if (resolved) {
      return {
        link: resolved.link.serviceM8,
        customerId: resolved.link.customerId,
        warning: resolved.link.clientResolved
          ? null
          : 'The ServiceM8 job was linked but its client could not be read.',
      };
    }

    return {
      link: null,
      customerId: null,
      warning: 'The ServiceM8 job could not be linked; the survey was saved without it.',
    };
  }

  return {
    link: normalizeServiceM8Link(input.body.serviceM8),
    customerId:
      typeof input.body.customerId === 'number' && Number.isFinite(input.body.customerId)
        ? input.body.customerId
        : null,
    warning: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mobileUser.team) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const body = (await request.json()) as RoomCaptureBody;
    const rawSession = body?.session ?? {};
    const sessionId = typeof rawSession.id === 'string' ? rawSession.id.trim() : '';
    const session: SurveySessionInput = { ...rawSession, id: sessionId };

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const { link, customerId, warning } = await resolveServiceM8Input({
      teamId: mobileUser.team.id,
      userId: mobileUser.user.id,
      body,
    });

    const hasSurveyFields =
      body.serviceM8 !== undefined ||
      typeof body.serviceM8JobUuid === 'string' ||
      typeof body.customerId === 'number' ||
      typeof body.name === 'string' ||
      body.status !== undefined;

    const saved = await saveFireAlarmSurvey({
      teamId: mobileUser.team.id,
      userId: mobileUser.user.id,
      session,
      devices: body.devices ?? [],
      metadata: body.metadata ?? {},
      update: hasSurveyFields
        ? {
            ...(typeof body.name === 'string' ? { name: body.name } : {}),
            ...(body.status ? { status: body.status } : {}),
            ...(link ? { serviceM8: link } : {}),
            ...(customerId !== null ? { customerId } : {}),
          }
        : undefined,
    });

    const survey = await readSurveySummary(mobileUser.team.id, saved.surveyId);

    return NextResponse.json({
      capture: survey,
      survey,
      surveyId: saved.surveyId,
      savedDeviceCount: saved.deviceCount,
      status: saved.status,
      linkedToServiceM8: Boolean(link),
      warning,
    });
  } catch (error) {
    console.error('Save room capture error:', error);
    return NextResponse.json({ error: 'Failed to save room capture' }, { status: 500 });
  }
}

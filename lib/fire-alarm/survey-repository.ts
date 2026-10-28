/**
 * Database access for fire alarm surveys.
 *
 * Every function is scoped by `teamId` so a survey can never be read or written
 * across tenants — the API routes pass the authenticated team in rather than
 * trusting an id alone.
 */

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { isSchemaDriftError } from '@/lib/db/errors';
import {
  customers,
  fireAlarmCaptureDevices,
  fireAlarmRoomCaptures,
  fireAlarmZonePlans,
} from '@/lib/db/schema';

import { normalizeServiceM8Link } from './format';
import { mapSurveyDetail, mapSurveySummary } from './survey-mapper';
import type {
  FireAlarmSurveyDetail,
  FireAlarmSurveySummary,
  FireAlarmSurveyUpdate,
} from './types';

export interface ListSurveysOptions {
  /** Free-text match against the name, client name and job number. */
  search?: string;
  status?: 'draft' | 'completed';
  limit?: number;
}

const DEFAULT_LIST_LIMIT = 200;

/**
 * Every survey for a team, newest first, with the client name joined in.
 *
 * A missing fire alarm table is reported as an empty list rather than an error:
 * a database that predates the migration should still render the dashboard.
 */
export async function listFireAlarmSurveys(
  teamId: number,
  options: ListSurveysOptions = {},
): Promise<FireAlarmSurveySummary[]> {
  try {
    const rows = await db
      .select({
        capture: fireAlarmRoomCaptures,
        customerName: customers.name,
        customerAddress: customers.address,
      })
      .from(fireAlarmRoomCaptures)
      .leftJoin(customers, eq(fireAlarmRoomCaptures.customerId, customers.id))
      .where(eq(fireAlarmRoomCaptures.teamId, teamId))
      .orderBy(desc(fireAlarmRoomCaptures.updatedAt))
      .limit(options.limit ?? DEFAULT_LIST_LIMIT);

    const surveys = rows.map((row) =>
      mapSurveySummary(row.capture, {
        customerName: row.customerName,
        customerAddress: row.customerAddress,
      }),
    );

    return filterSurveysLocally(surveys, options);
  } catch (error) {
    if (isSchemaDriftError(error)) {
      console.warn(
        '[fire-alarm-surveys] fire alarm tables are unavailable in this database; reporting no surveys.',
      );
      return [];
    }

    throw error;
  }
}

/**
 * Filtering happens in memory because the list is bounded and the fields being
 * matched (resolved name, job number) are partly derived rather than columns.
 */
function filterSurveysLocally(
  surveys: FireAlarmSurveySummary[],
  options: ListSurveysOptions,
): FireAlarmSurveySummary[] {
  const needle = options.search?.trim().toLowerCase() ?? '';
  const status = options.status ?? null;

  return surveys.filter((survey) => {
    if (status && survey.status !== status) {
      return false;
    }

    if (!needle) {
      return true;
    }

    const haystack = [
      survey.name,
      survey.customerName,
      survey.serviceM8?.companyName,
      survey.serviceM8?.jobNumber,
      survey.serviceM8?.jobAddress,
      survey.sessionId,
    ]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
}

/** Looks a survey up by the mobile capture session that produced it. */
export async function findSurveyBySessionId(
  teamId: number,
  sessionId: string,
): Promise<FireAlarmSurveyDetail | null> {
  const rows = await db
    .select({ id: fireAlarmRoomCaptures.id })
    .from(fireAlarmRoomCaptures)
    .where(
      and(
        eq(fireAlarmRoomCaptures.teamId, teamId),
        eq(fireAlarmRoomCaptures.externalSessionId, sessionId),
      ),
    )
    .limit(1);

  if (!rows[0]) {
    return null;
  }

  return getFireAlarmSurvey(teamId, rows[0].id);
}

/** One survey with its identified devices and, if published, its zone plan. */
export async function getFireAlarmSurvey(
  teamId: number,
  surveyId: number,
): Promise<FireAlarmSurveyDetail | null> {
  const rows = await db
    .select({
      capture: fireAlarmRoomCaptures,
      customerName: customers.name,
      customerAddress: customers.address,
    })
    .from(fireAlarmRoomCaptures)
    .leftJoin(customers, eq(fireAlarmRoomCaptures.customerId, customers.id))
    .where(
      and(eq(fireAlarmRoomCaptures.id, surveyId), eq(fireAlarmRoomCaptures.teamId, teamId)),
    )
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  const devices = await db
    .select({
      id: fireAlarmCaptureDevices.id,
      externalDeviceId: fireAlarmCaptureDevices.externalDeviceId,
      deviceType: fireAlarmCaptureDevices.deviceType,
      label: fireAlarmCaptureDevices.label,
      manufacturerName: fireAlarmCaptureDevices.manufacturerName,
      locationX: fireAlarmCaptureDevices.locationX,
      locationY: fireAlarmCaptureDevices.locationY,
      locationZ: fireAlarmCaptureDevices.locationZ,
      notes: fireAlarmCaptureDevices.notes,
      roomId: fireAlarmCaptureDevices.roomId,
    })
    .from(fireAlarmCaptureDevices)
    .where(eq(fireAlarmCaptureDevices.captureId, row.capture.id))
    .orderBy(fireAlarmCaptureDevices.id);

  const zonePlanRows = await db
    .select({
      id: fireAlarmZonePlans.id,
      title: fireAlarmZonePlans.title,
      shareToken: fireAlarmZonePlans.shareToken,
      emailedTo: fireAlarmZonePlans.emailedTo,
      updatedAt: fireAlarmZonePlans.updatedAt,
    })
    .from(fireAlarmZonePlans)
    .where(
      and(
        eq(fireAlarmZonePlans.teamId, teamId),
        eq(fireAlarmZonePlans.externalSessionId, row.capture.externalSessionId),
      ),
    )
    .orderBy(desc(fireAlarmZonePlans.updatedAt))
    .limit(1);

  const zonePlan = zonePlanRows[0];

  return mapSurveyDetail({
    capture: row.capture,
    context: { customerName: row.customerName, customerAddress: row.customerAddress },
    devices,
    zonePlan: zonePlan
      ? {
          id: zonePlan.id,
          title: zonePlan.title,
          shareToken: zonePlan.shareToken,
          viewerPath: `/plan/${zonePlan.shareToken}`,
          emailedTo: zonePlan.emailedTo,
          updatedAt: zonePlan.updatedAt.toISOString(),
        }
      : null,
  });
}

/** Short summary after a write, used by the PATCH and mobile save responses. */
export async function readSurveySummary(
  teamId: number,
  surveyId: number,
): Promise<FireAlarmSurveySummary | null> {
  const detail = await getFireAlarmSurvey(teamId, surveyId);

  if (!detail) {
    return null;
  }

  const { devices: _devices, zonePlan: _zonePlan, ...summary } = detail;
  return summary;
}

/**
 * Applies a rename, status change and/or ServiceM8 link.
 *
 * Returns null when the survey does not belong to the team, so the route can
 * answer 404 without leaking whether the id exists elsewhere.
 */
export async function updateFireAlarmSurvey(
  teamId: number,
  surveyId: number,
  update: FireAlarmSurveyUpdate,
): Promise<FireAlarmSurveySummary | null> {
  const values: Partial<typeof fireAlarmRoomCaptures.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (update.name !== undefined) {
    values.sessionName = update.name?.trim() || null;
  }

  if (update.status !== undefined) {
    values.surveyStatus = update.status;
    values.completedAt = update.status === 'completed' ? new Date() : null;
  }

  if (update.customerId !== undefined) {
    values.customerId = update.customerId;
  }

  if (update.serviceM8 !== undefined) {
    const link = normalizeServiceM8Link(update.serviceM8);

    values.servicem8CompanyUuid = link?.companyUuid ?? null;
    values.servicem8CompanyName = link?.companyName ?? null;
    values.servicem8JobUuid = link?.jobUuid ?? null;
    values.servicem8JobNumber = link?.jobNumber ?? null;
    values.servicem8JobDate = link?.jobDate ?? null;
    values.servicem8JobAddress = link?.jobAddress ?? null;
  }

  const updated = await db
    .update(fireAlarmRoomCaptures)
    .set(values)
    .where(
      and(eq(fireAlarmRoomCaptures.id, surveyId), eq(fireAlarmRoomCaptures.teamId, teamId)),
    )
    .returning({ id: fireAlarmRoomCaptures.id });

  if (!updated[0]) {
    return null;
  }

  return readSurveySummary(teamId, surveyId);
}

/** Deletes a survey and its devices. Returns false when nothing matched. */
export async function deleteFireAlarmSurvey(
  teamId: number,
  surveyId: number,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: fireAlarmRoomCaptures.id })
      .from(fireAlarmRoomCaptures)
      .where(
        and(eq(fireAlarmRoomCaptures.id, surveyId), eq(fireAlarmRoomCaptures.teamId, teamId)),
      )
      .limit(1);

    if (!owned[0]) {
      return false;
    }

    await tx
      .delete(fireAlarmCaptureDevices)
      .where(eq(fireAlarmCaptureDevices.captureId, surveyId));

    await tx.delete(fireAlarmRoomCaptures).where(eq(fireAlarmRoomCaptures.id, surveyId));

    return true;
  });
}

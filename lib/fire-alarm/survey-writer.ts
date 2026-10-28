/**
 * Writes a captured session into a fire alarm survey.
 *
 * This is the single path that turns what the phone captured into a survey row,
 * so saving from the mobile export step and saving a room capture both land in
 * exactly the same columns. It is idempotent on the capture session id: a
 * re-save updates the existing survey and replaces its devices rather than
 * creating a duplicate.
 */

import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { fireAlarmCaptureDevices, fireAlarmRoomCaptures } from '@/lib/db/schema';

import { normalizeSurveyDevice, type NormalizedSurveyDevice } from './device-normalizer';
import { normalizeServiceM8Link } from './format';
import type {
  FireAlarmSurveyDeviceInput,
  FireAlarmSurveyServiceM8Link,
  FireAlarmSurveyStatus,
  FireAlarmSurveyUpdate,
} from './types';

export { normalizeSurveyDevice } from './device-normalizer';

export interface SurveySessionInput {
  id?: string | null;
  status?: string | null;
  metadata?: {
    sessionName?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    [key: string]: unknown;
  } | null;
  floorplan?: {
    units?: string | null;
    rooms?: unknown[];
    deviceCount?: number | null;
    wallCount?: number | null;
  } | null;
}

export interface SaveSurveyInput {
  teamId: number;
  userId: number | null;
  session: SurveySessionInput;
  devices?: FireAlarmSurveyDeviceInput[] | null;
  /** Extra capture metadata merged into the stored `metadata` blob. */
  metadata?: Record<string, unknown> | null;
  update?: FireAlarmSurveyUpdate;
}

export interface SavedSurvey {
  surveyId: number;
  sessionId: string;
  deviceCount: number;
  status: FireAlarmSurveyStatus;
}

function toNullableTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildLinkColumns(
  link: FireAlarmSurveyServiceM8Link | null,
): Pick<
  typeof fireAlarmRoomCaptures.$inferInsert,
  | 'servicem8CompanyUuid'
  | 'servicem8CompanyName'
  | 'servicem8JobUuid'
  | 'servicem8JobNumber'
  | 'servicem8JobDate'
  | 'servicem8JobAddress'
> {
  return {
    servicem8CompanyUuid: link?.companyUuid ?? null,
    servicem8CompanyName: link?.companyName ?? null,
    servicem8JobUuid: link?.jobUuid ?? null,
    servicem8JobNumber: link?.jobNumber ?? null,
    servicem8JobDate: link?.jobDate ?? null,
    servicem8JobAddress: link?.jobAddress ?? null,
  };
}

function resolveStatus(
  sessionStatus: string | null | undefined,
  update: FireAlarmSurveyUpdate | undefined,
): FireAlarmSurveyStatus {
  if (update?.status) {
    return update.status;
  }

  return sessionStatus === 'completed' ? 'completed' : 'draft';
}

/**
 * Creates or updates the survey for a capture session and replaces its device
 * list. Returns the survey id so the caller can respond with a direct link.
 */
export async function saveFireAlarmSurvey(input: SaveSurveyInput): Promise<SavedSurvey> {
  const { teamId, userId, session, update } = input;
  const sessionId = typeof session?.id === 'string' ? session.id.trim() : '';

  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  const normalizedDevices: NormalizedSurveyDevice[] = Array.isArray(input.devices)
    ? input.devices
        .map(normalizeSurveyDevice)
        .filter((device): device is NormalizedSurveyDevice => Boolean(device))
    : [];

  const roomCount = Array.isArray(session.floorplan?.rooms) ? session.floorplan.rooms.length : 0;
  const status = resolveStatus(session.status, update);
  const serviceM8Link =
    update?.serviceM8 !== undefined ? normalizeServiceM8Link(update.serviceM8) : null;
  const explicitName = update?.name !== undefined ? update.name?.trim() || null : null;
  const sessionName =
    explicitName ??
    (typeof session.metadata?.sessionName === 'string' && session.metadata.sessionName.trim()
      ? session.metadata.sessionName.trim()
      : null);

  const now = new Date();

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: fireAlarmRoomCaptures.id })
      .from(fireAlarmRoomCaptures)
      .where(
        and(
          eq(fireAlarmRoomCaptures.teamId, teamId),
          eq(fireAlarmRoomCaptures.externalSessionId, sessionId),
        ),
      )
      .limit(1);

    const metadata = {
      ...(input.metadata ?? {}),
      roomCount,
      floorplanDeviceCount:
        typeof session.floorplan?.deviceCount === 'number' ? session.floorplan.deviceCount : null,
      wallCount:
        typeof session.floorplan?.wallCount === 'number' ? session.floorplan.wallCount : null,
      sessionMetadata: session.metadata ?? null,
      savedDeviceCount: normalizedDevices.length,
      source: 'expo-mobile-roomplan',
      savedAt: now.toISOString(),
    };

    const baseValues = {
      teamId,
      externalSessionId: sessionId,
      sessionName,
      captureStatus:
        typeof session.status === 'string' && session.status.trim()
          ? session.status.trim()
          : 'completed',
      units:
        typeof session.floorplan?.units === 'string' && session.floorplan.units.trim()
          ? session.floorplan.units.trim()
          : null,
      startedAt: toNullableTimestamp(session.metadata?.startedAt),
      endedAt: toNullableTimestamp(session.metadata?.endedAt),
      deviceCount: normalizedDevices.length,
      metadata,
      surveyStatus: status,
      updatedAt: now,
      ...(status === 'completed' ? { completedAt: now } : {}),
      ...(update?.customerId !== undefined ? { customerId: update.customerId } : {}),
      ...(update?.serviceM8 !== undefined ? buildLinkColumns(serviceM8Link) : {}),
    };

    let surveyId: number;

    if (existing) {
      surveyId = existing.id;

      await tx
        .update(fireAlarmRoomCaptures)
        .set(baseValues)
        .where(eq(fireAlarmRoomCaptures.id, surveyId));

      await tx
        .delete(fireAlarmCaptureDevices)
        .where(eq(fireAlarmCaptureDevices.captureId, surveyId));
    } else {
      const [created] = await tx
        .insert(fireAlarmRoomCaptures)
        .values({
          ...baseValues,
          createdBy: userId,
          createdAt: now,
        })
        .returning({ id: fireAlarmRoomCaptures.id });

      if (!created) {
        throw new Error('Failed to create the fire alarm survey');
      }

      surveyId = created.id;
    }

    if (normalizedDevices.length > 0) {
      await tx.insert(fireAlarmCaptureDevices).values(
        normalizedDevices.map((device) => ({
          ...device,
          captureId: surveyId,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    return {
      surveyId,
      sessionId,
      deviceCount: normalizedDevices.length,
      status,
    };
  });
}

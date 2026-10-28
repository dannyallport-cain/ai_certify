/**
 * Maps database rows onto the survey API shapes.
 *
 * Keeping the mapping in one place means the web dashboard, the web API and the
 * mobile API all describe the same survey identically — which matters because
 * the mobile app reads back the surveys it saved through the same route shape.
 */

import type { FireAlarmRoomCapture } from '@/lib/db/schema';

import { isFireAlarmSurveyStatus, resolveSurveyName } from './format';
import type {
  FireAlarmSurveyDetail,
  FireAlarmSurveyDevice,
  FireAlarmSurveyServiceM8Link,
  FireAlarmSurveySummary,
} from './types';

/** Room count is written into `metadata` by the capture route at save time. */
function readRoomCount(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 0;
  }

  const roomCount = (metadata as { roomCount?: unknown }).roomCount;

  return typeof roomCount === 'number' && Number.isFinite(roomCount) ? roomCount : 0;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildServiceM8Link(capture: FireAlarmRoomCapture): FireAlarmSurveyServiceM8Link | null {
  const hasAnyValue = Boolean(
    capture.servicem8JobUuid ||
      capture.servicem8JobNumber ||
      capture.servicem8CompanyUuid ||
      capture.servicem8CompanyName,
  );

  if (!hasAnyValue) {
    return null;
  }

  return {
    companyUuid: capture.servicem8CompanyUuid ?? null,
    companyName: capture.servicem8CompanyName ?? null,
    jobUuid: capture.servicem8JobUuid ?? null,
    jobNumber: capture.servicem8JobNumber ?? null,
    jobDate: capture.servicem8JobDate ?? null,
    jobAddress: capture.servicem8JobAddress ?? null,
  };
}

export interface SurveyMappingContext {
  customerName?: string | null;
  customerAddress?: string | null;
}

export function mapSurveySummary(
  capture: FireAlarmRoomCapture,
  context: SurveyMappingContext = {},
): FireAlarmSurveySummary {
  const serviceM8 = buildServiceM8Link(capture);
  const customerName = context.customerName?.trim() || null;
  const status = isFireAlarmSurveyStatus(capture.surveyStatus)
    ? capture.surveyStatus
    : 'draft';

  return {
    id: capture.id,
    sessionId: capture.externalSessionId,
    name: resolveSurveyName({
      name: capture.sessionName,
      customerName,
      serviceM8,
      startedAt: toIsoString(capture.startedAt),
      createdAt: toIsoString(capture.createdAt),
    }),
    status,
    deviceCount: capture.deviceCount ?? 0,
    roomCount: readRoomCount(capture.metadata),
    units: capture.units ?? null,
    customerId: capture.customerId ?? null,
    customerName,
    serviceM8,
    startedAt: toIsoString(capture.startedAt),
    completedAt: toIsoString(capture.completedAt),
    createdAt: toIsoString(capture.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(capture.updatedAt) ?? new Date(0).toISOString(),
  };
}

export interface SurveyDeviceRow {
  id: number;
  externalDeviceId: string | null;
  deviceType: string;
  label: string | null;
  manufacturerName: string | null;
  locationX: number | null;
  locationY: number | null;
  locationZ: number | null;
  notes: string | null;
  roomId: string | null;
}

export function mapSurveyDevice(device: SurveyDeviceRow): FireAlarmSurveyDevice {
  return {
    id: device.id,
    externalDeviceId: device.externalDeviceId ?? null,
    deviceType: device.deviceType,
    label: device.label ?? null,
    manufacturerName: device.manufacturerName ?? null,
    locationX: device.locationX ?? null,
    locationY: device.locationY ?? null,
    locationZ: device.locationZ ?? null,
    notes: device.notes ?? null,
    roomId: device.roomId ?? null,
  };
}

export function mapSurveyDetail(input: {
  capture: FireAlarmRoomCapture;
  context?: SurveyMappingContext;
  devices: SurveyDeviceRow[];
  zonePlan?: FireAlarmSurveyDetail['zonePlan'];
}): FireAlarmSurveyDetail {
  return {
    ...mapSurveySummary(input.capture, input.context ?? {}),
    devices: input.devices.map(mapSurveyDevice),
    zonePlan: input.zonePlan ?? null,
  };
}

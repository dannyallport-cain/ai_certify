/**
 * Mobile client for fire alarm surveys.
 *
 * Saving is the important half: the export step uses this to push the finished
 * survey — devices, name, status and the ServiceM8 job it was filed against — so
 * the office sees it in the dashboard without the engineer typing client details.
 */

import type {
  FireAlarmDeviceDetection,
  FireAlarmScanSession,
} from '@/modules/fire-alarm-roomplan/types';

import { getApiBaseUrl, getToken } from './api';

export type MobileSurveyStatus = 'draft' | 'completed';

export interface MobileSurveySummary {
  id: number;
  sessionId: string;
  name: string;
  status: MobileSurveyStatus;
  deviceCount: number;
  roomCount: number;
  units: string | null;
  customerId: number | null;
  customerName: string | null;
  serviceM8: {
    companyUuid: string | null;
    companyName: string | null;
    jobUuid: string | null;
    jobNumber: string | null;
    jobDate: string | null;
    jobAddress: string | null;
  } | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSurveyInput {
  session: FireAlarmScanSession;
  devices: FireAlarmDeviceDetection[];
  name?: string | null;
  status?: MobileSurveyStatus;
  /** The chosen ServiceM8 job; resolved server-side into client and diary data. */
  serviceM8JobUuid?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SaveSurveyResult {
  survey: MobileSurveySummary | null;
  surveyId: number;
  savedDeviceCount: number;
  status: MobileSurveyStatus;
  linkedToServiceM8: boolean;
  warning: string | null;
}

export class SurveyApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SurveyApiError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSummary(value: unknown): MobileSurveySummary | null {
  if (!isRecord(value) || typeof value.id !== 'number') {
    return null;
  }

  const serviceM8 = isRecord(value.serviceM8)
    ? {
        companyUuid: typeof value.serviceM8.companyUuid === 'string' ? value.serviceM8.companyUuid : null,
        companyName: typeof value.serviceM8.companyName === 'string' ? value.serviceM8.companyName : null,
        jobUuid: typeof value.serviceM8.jobUuid === 'string' ? value.serviceM8.jobUuid : null,
        jobNumber: typeof value.serviceM8.jobNumber === 'string' ? value.serviceM8.jobNumber : null,
        jobDate: typeof value.serviceM8.jobDate === 'string' ? value.serviceM8.jobDate : null,
        jobAddress: typeof value.serviceM8.jobAddress === 'string' ? value.serviceM8.jobAddress : null,
      }
    : null;

  return {
    id: value.id,
    sessionId: typeof value.sessionId === 'string' ? value.sessionId : '',
    name: typeof value.name === 'string' ? value.name : 'Fire alarm survey',
    status: value.status === 'completed' ? 'completed' : 'draft',
    deviceCount: typeof value.deviceCount === 'number' ? value.deviceCount : 0,
    roomCount: typeof value.roomCount === 'number' ? value.roomCount : 0,
    units: typeof value.units === 'string' ? value.units : null,
    customerId: typeof value.customerId === 'number' ? value.customerId : null,
    customerName: typeof value.customerName === 'string' ? value.customerName : null,
    serviceM8,
    startedAt: typeof value.startedAt === 'string' ? value.startedAt : null,
    completedAt: typeof value.completedAt === 'string' ? value.completedAt : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  };
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);

  if (isRecord(body) && typeof body.error === 'string' && body.error.trim()) {
    return body.error;
  }

  return fallback;
}

async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

/**
 * Saves the finished survey.
 *
 * The server is idempotent on the capture session id, so calling this again
 * after a review edit updates the same survey instead of creating a second one.
 */
export async function saveSurveyToServer(input: SaveSurveyInput): Promise<SaveSurveyResult> {
  const response = await authorizedFetch('/api/mobile/room-captures', {
    method: 'POST',
    body: JSON.stringify({
      session: input.session,
      devices: input.devices,
      name: input.name ?? null,
      status: input.status ?? 'completed',
      serviceM8JobUuid: input.serviceM8JobUuid ?? null,
      metadata: input.metadata ?? {},
    }),
  });

  if (!response.ok) {
    throw new SurveyApiError(
      await readErrorMessage(response, 'Failed to save the survey'),
      response.status,
    );
  }

  const body: unknown = await response.json();

  if (!isRecord(body)) {
    throw new SurveyApiError('The server did not confirm the save', 500);
  }

  return {
    survey: parseSummary(body.survey),
    surveyId: typeof body.surveyId === 'number' ? body.surveyId : 0,
    savedDeviceCount:
      typeof body.savedDeviceCount === 'number' ? body.savedDeviceCount : 0,
    status: body.status === 'completed' ? 'completed' : 'draft',
    linkedToServiceM8: body.linkedToServiceM8 === true,
    warning: typeof body.warning === 'string' && body.warning.trim() ? body.warning : null,
  };
}

/** Every survey this team has saved, newest first. */
export async function listFireAlarmSurveys(): Promise<MobileSurveySummary[]> {
  const response = await authorizedFetch('/api/mobile/fire-alarm-surveys');

  if (!response.ok) {
    throw new SurveyApiError(
      await readErrorMessage(response, 'Failed to load surveys'),
      response.status,
    );
  }

  const body: unknown = await response.json();

  if (!isRecord(body) || !Array.isArray(body.surveys)) {
    return [];
  }

  return body.surveys
    .map(parseSummary)
    .filter((survey): survey is MobileSurveySummary => Boolean(survey));
}

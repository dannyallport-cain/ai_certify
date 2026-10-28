import {
  FIRE_ALARM_STEP_IDS,
  type FireAlarmStepId,
} from '../modules/fire-alarm-flow/steps';
import { DRAFT_TTL_MS } from './draft-payload';

/**
 * The serialisable half of fire alarm flow persistence.
 *
 * The flow remembers which scan session is open, which steps are done, the
 * survey name the engineer gave it and the ServiceM8 job it is being filed
 * against. The last two matter because they are chosen on one screen and used on
 * another, and losing them on navigation would mean picking the job twice.
 *
 * Version 2 added the survey name and job; version 1 files are still read and
 * simply arrive without them.
 */

export const FIRE_ALARM_FLOW_VERSION = 2;

/** The ServiceM8 job a survey is being filed against, as shown on the phone. */
export interface PersistedSurveyJob {
  uuid: string;
  jobNumber: string | null;
  jobDate: string | null;
  companyUuid: string | null;
  companyName: string | null;
  address: string | null;
}

export interface PersistedFireAlarmFlow {
  version: number;
  savedAt: string;
  sessionId: string | null;
  completedSteps: FireAlarmStepId[];
  surveyName: string | null;
  serviceM8Job: PersistedSurveyJob | null;
}

export function buildPersistedFireAlarmFlow(
  sessionId: string | null,
  completedSteps: FireAlarmStepId[],
  options: {
    savedAt?: Date;
    surveyName?: string | null;
    serviceM8Job?: PersistedSurveyJob | null;
  } = {},
): PersistedFireAlarmFlow {
  return {
    version: FIRE_ALARM_FLOW_VERSION,
    savedAt: (options.savedAt ?? new Date()).toISOString(),
    sessionId,
    completedSteps,
    surveyName: normalizeName(options.surveyName),
    serviceM8Job: normalizeJob(options.serviceM8Job),
  };
}

function normalizeName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimmedOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeJob(value: PersistedSurveyJob | null | undefined): PersistedSurveyJob | null {
  const uuid = trimmedOrNull(value?.uuid);

  if (!uuid) {
    return null;
  }

  return {
    uuid,
    jobNumber: trimmedOrNull(value?.jobNumber),
    jobDate: trimmedOrNull(value?.jobDate),
    companyUuid: trimmedOrNull(value?.companyUuid),
    companyName: trimmedOrNull(value?.companyName),
    address: trimmedOrNull(value?.address),
  };
}

/** True when there is a flow worth writing at all. */
export function hasMeaningfulFireAlarmFlow(
  sessionId: string | null,
  completedSteps: FireAlarmStepId[],
  surveyName: string | null = null,
  serviceM8Job: PersistedSurveyJob | null = null,
): boolean {
  return (
    sessionId !== null ||
    completedSteps.length > 0 ||
    Boolean(surveyName) ||
    Boolean(serviceM8Job)
  );
}

export type FireAlarmFlowReadResult =
  | { status: 'ok'; flow: PersistedFireAlarmFlow }
  | { status: 'invalid' }
  | { status: 'expired' };

/**
 * Validates stored flow state. Unknown step ids are dropped rather than trusted,
 * so a flow saved by an older build cannot mark a step that no longer exists.
 */
export function parseStoredFireAlarmFlow(
  raw: string,
  now = Date.now(),
): FireAlarmFlowReadResult {
  let parsed: Partial<PersistedFireAlarmFlow>;

  try {
    parsed = JSON.parse(raw) as Partial<PersistedFireAlarmFlow>;
  } catch {
    return { status: 'invalid' };
  }

  // Version 1 predates the survey name and job; it is still readable.
  if ((parsed.version !== FIRE_ALARM_FLOW_VERSION && parsed.version !== 1) || !parsed.savedAt) {
    return { status: 'invalid' };
  }

  const savedAt = new Date(parsed.savedAt).getTime();

  if (!Number.isFinite(savedAt) || savedAt > now || now - savedAt > DRAFT_TTL_MS) {
    return { status: 'expired' };
  }

  const completedSteps = Array.isArray(parsed.completedSteps)
    ? FIRE_ALARM_STEP_IDS.filter((id) => parsed.completedSteps?.includes(id))
    : [];

  const sessionId =
    typeof parsed.sessionId === 'string' && parsed.sessionId.length > 0
      ? parsed.sessionId
      : null;

  const surveyName = normalizeName(parsed.surveyName);
  const serviceM8Job =
    parsed.version === 1
      ? null
      : normalizeJob(parsed.serviceM8Job as PersistedSurveyJob | null | undefined);

  if (!sessionId && completedSteps.length === 0 && !surveyName && !serviceM8Job) {
    return { status: 'invalid' };
  }

  return {
    status: 'ok',
    flow: {
      version: FIRE_ALARM_FLOW_VERSION,
      savedAt: parsed.savedAt,
      sessionId,
      completedSteps,
      surveyName,
      serviceM8Job,
    },
  };
}

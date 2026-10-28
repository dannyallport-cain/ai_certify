/**
 * Display and normalisation helpers for fire alarm surveys.
 *
 * Kept free of database and React imports so the dashboard components and the
 * API routes can share exactly the same rules for naming, dating and describing
 * a survey.
 */

import type {
  FireAlarmSurveyServiceM8Link,
  FireAlarmSurveyStatus,
} from './types';

export const SURVEY_STATUSES: FireAlarmSurveyStatus[] = ['draft', 'completed'];

export const SURVEY_STATUS_LABELS: Record<FireAlarmSurveyStatus, string> = {
  draft: 'Draft',
  completed: 'Completed',
};

export const DEFAULT_SURVEY_NAME = 'Fire alarm survey';

export function isFireAlarmSurveyStatus(value: unknown): value is FireAlarmSurveyStatus {
  return value === 'draft' || value === 'completed';
}

function trimmedOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The name shown for a survey, in order of what the user would recognise: the
 * name they typed, then the client, then the job, then the capture date.
 *
 * Never returns an empty string — the dashboard always has something to show,
 * which is what keeps a list of unnamed captures readable.
 */
export function resolveSurveyName(candidate: {
  name?: string | null;
  customerName?: string | null;
  serviceM8?: FireAlarmSurveyServiceM8Link | null;
  startedAt?: string | null;
  createdAt?: string | null;
}): string {
  const explicit = trimmedOrNull(candidate.name);
  if (explicit) {
    return explicit;
  }

  const customer = trimmedOrNull(candidate.customerName);
  const jobNumber = trimmedOrNull(candidate.serviceM8?.jobNumber);
  const companyName = trimmedOrNull(candidate.serviceM8?.companyName);

  if (customer && jobNumber) {
    return `${customer} · Job ${jobNumber}`;
  }

  if (customer) {
    return `${customer} fire alarm survey`;
  }

  if (companyName && jobNumber) {
    return `${companyName} · Job ${jobNumber}`;
  }

  if (companyName) {
    return `${companyName} fire alarm survey`;
  }

  const date = formatSurveyDate(candidate.startedAt ?? candidate.createdAt ?? null);
  return date ? `${DEFAULT_SURVEY_NAME} · ${date}` : DEFAULT_SURVEY_NAME;
}

/** `16 Oct 2026`, or null when the value is missing or unparseable. */
export function formatSurveyDate(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** `16 Oct 2026, 14:32`, or null. */
export function formatSurveyDateTime(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Coerces an untrusted ServiceM8 link payload into the stored shape.
 *
 * The mobile app posts this straight from a picker, so every field is treated as
 * optional and blanked rather than rejected — a survey linked to a job with no
 * address is still a linked survey.
 */
export function normalizeServiceM8Link(
  value: unknown,
): FireAlarmSurveyServiceM8Link | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  const link: FireAlarmSurveyServiceM8Link = {
    companyUuid: trimmedOrNull(record.companyUuid),
    companyName: trimmedOrNull(record.companyName),
    jobUuid: trimmedOrNull(record.jobUuid),
    jobNumber: trimmedOrNull(record.jobNumber),
    jobDate: trimmedOrNull(record.jobDate),
    jobAddress: trimmedOrNull(record.jobAddress),
  };

  const hasAnyValue = Object.values(link).some((entry) => entry !== null);

  return hasAnyValue ? link : null;
}

/**
 * One line naming the ServiceM8 job, e.g. `Job 1234 · 16 Oct 2026`.
 * Returns null when the survey is not linked, so callers can render nothing.
 */
export function describeServiceM8Job(
  link: FireAlarmSurveyServiceM8Link | null | undefined,
): string | null {
  if (!link?.jobUuid && !link?.jobNumber) {
    return null;
  }

  const parts = [
    link.jobNumber ? `Job ${link.jobNumber}` : 'ServiceM8 job',
    formatSurveyDate(link.jobDate),
  ].filter((part): part is string => Boolean(part));

  return parts.join(' · ');
}

/** Best available address for a survey: the job's site, else the client's. */
export function resolveSurveyAddress(candidate: {
  serviceM8?: FireAlarmSurveyServiceM8Link | null;
  customerAddress?: string | null;
}): string | null {
  return (
    trimmedOrNull(candidate.serviceM8?.jobAddress) ??
    trimmedOrNull(candidate.customerAddress)
  );
}

/** `3 devices · 2 rooms`, or `No devices captured yet`. */
export function describeSurveyContents(deviceCount: number, roomCount: number): string {
  if (deviceCount === 0) {
    return 'No devices captured yet';
  }

  const deviceLabel = `${deviceCount} device${deviceCount === 1 ? '' : 's'}`;

  if (roomCount <= 0) {
    return deviceLabel;
  }

  return `${deviceLabel} · ${roomCount} room${roomCount === 1 ? '' : 's'}`;
}

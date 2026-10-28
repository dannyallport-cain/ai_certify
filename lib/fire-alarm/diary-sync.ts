/**
 * Files a survey into its ServiceM8 job's diary.
 *
 * The job already has a diary slot; what it does not have is a record of the
 * survey. Uploading a short summary as a job attachment puts the survey on the
 * job the office already looks at, without touching the job's own fields.
 *
 * This is best-effort by design: a survey must never fail to link because
 * ServiceM8 refused a file, so every failure is reported rather than thrown.
 */

import { ServiceM8ApiError, ServiceM8Client_API } from '@/lib/servicem8';

import { buildDiarySummary } from './diary-summary';
import type { FireAlarmSurveyDetail } from './types';

export { buildDiarySummary } from './diary-summary';

export type DiarySyncStatus = 'synced' | 'skipped' | 'failed';

export interface DiarySyncResult {
  status: DiarySyncStatus;
  message: string;
  attachmentUuid?: string;
}

/**
 * Uploads the survey summary to the linked job.
 *
 * Returns `skipped` when write access is not enabled for this deployment, so the
 * dashboard can say why nothing was attached rather than implying a failure.
 */
export async function syncSurveyToJobDiary(input: {
  userId: number;
  survey: FireAlarmSurveyDetail;
}): Promise<DiarySyncResult> {
  const jobUuid = input.survey.serviceM8?.jobUuid;

  if (!jobUuid) {
    return { status: 'skipped', message: 'This survey is not linked to a ServiceM8 job.' };
  }

  const client = await ServiceM8Client_API.fromUserId(input.userId).catch(() => null);

  if (!client) {
    return { status: 'skipped', message: 'ServiceM8 is not connected for this account.' };
  }

  const summary = buildDiarySummary(input.survey);
  const fileName = `fire-alarm-survey-${input.survey.id}.txt`;
  const bytes = new TextEncoder().encode(summary);

  try {
    const attachment = await client.uploadJobAttachment(
      jobUuid,
      bytes,
      fileName,
      'text/plain',
    );

    return {
      status: 'synced',
      message: 'Survey summary attached to the ServiceM8 job.',
      attachmentUuid: attachment.uuid,
    };
  } catch (error) {
    const message =
      error instanceof ServiceM8ApiError && error.isPermissionError
        ? 'Reconnect ServiceM8 to grant attachment write access, then link again.'
        : error instanceof Error
          ? error.message
          : 'ServiceM8 rejected the attachment.';

    console.warn('[fire-alarm-surveys] diary sync failed:', message);

    return { status: 'failed', message };
  }
}

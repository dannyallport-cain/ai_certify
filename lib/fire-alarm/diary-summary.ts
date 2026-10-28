/**
 * The plain-text summary that is filed against a ServiceM8 job.
 *
 * Split out from the upload path so the wording can be checked without a live
 * ServiceM8 connection: what the office reads on the job should be the same
 * whether it was attached today or six months ago.
 */

import { describeSurveyContents } from './format';
import type { FireAlarmSurveyDetail } from './types';

/** Builds the summary attached to the job when a survey is linked. */
export function buildDiarySummary(survey: FireAlarmSurveyDetail): string {
  const lines = [
    `Fire alarm survey #${survey.id}`,
    survey.name,
    `Status: ${survey.status}`,
    describeSurveyContents(survey.deviceCount, survey.roomCount),
  ];

  if (survey.serviceM8?.jobNumber) {
    lines.push(`ServiceM8 job: ${survey.serviceM8.jobNumber}`);
  }

  if (survey.customerName) {
    lines.push(`Client: ${survey.customerName}`);
  }

  if (survey.zonePlan) {
    lines.push(`Zone plan: /plan/${survey.zonePlan.shareToken}`);
  }

  lines.push('');
  lines.push('Devices');

  if (survey.devices.length === 0) {
    lines.push('  (none identified)');
  } else {
    for (const device of survey.devices) {
      const label = device.label ?? device.deviceType;
      const manufacturer = device.manufacturerName ? ` — ${device.manufacturerName}` : '';
      const room = device.roomId ? ` [${device.roomId}]` : '';
      lines.push(`  ${device.deviceType}: ${label}${manufacturer}${room}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

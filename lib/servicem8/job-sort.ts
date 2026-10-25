/**
 * Job ordering shared by the ServiceM8 API routes.
 *
 * The app wants "newest first", but ServiceM8 returns jobs in an internal order
 * and its `$sort` parameter cannot be combined with the cursor pagination this
 * integration relies on. Sorting here, after the full set has been loaded,
 * keeps the order correct and independent of the page size.
 */

import type { ServiceM8JobRecord } from './types';

/** ServiceM8 zero-dates (`0000-00-00 00:00:00`) must not sort as "ancient". */
export function getJobDateTimestamp(job: ServiceM8JobRecord): number | null {
  const candidates = [
    job.date,
    job.quoteDate,
    job.workOrderDate,
    job.completionDate,
    job.editDate,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const trimmed = candidate.trim();
    if (!trimmed || trimmed.startsWith('0000-00-00')) {
      continue;
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

/**
 * Newest first, with undated jobs last. Ties fall back to the job number so the
 * order is stable between requests.
 */
export function compareJobsByDateDesc(
  left: ServiceM8JobRecord,
  right: ServiceM8JobRecord
): number {
  const leftAt = getJobDateTimestamp(left) ?? 0;
  const rightAt = getJobDateTimestamp(right) ?? 0;

  if (leftAt !== rightAt) {
    return rightAt - leftAt;
  }

  return (right.generatedJobId ?? '').localeCompare(left.generatedJobId ?? '');
}

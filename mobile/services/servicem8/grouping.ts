import type { ServiceM8JobRecord } from '@/services/api';

/** A customer (ServiceM8 company) with their jobs, newest first. */
export interface CustomerJobGroup {
  /** Stable identity: company uuid, or a normalised name when the uuid is missing. */
  key: string;
  customerName: string;
  contactName: string | null;
  jobs: ServiceM8JobRecord[];
  /** Newest job date in the group, used to order the customer list. */
  latestAt: number | null;
}

export interface StatusOption {
  status: string;
  count: number;
}

const UNNAMED_CUSTOMER = 'Unnamed customer';

function trimmedOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * ServiceM8 dates are `yyyy-MM-dd` (sometimes with a time). `Date.parse` reads
 * those as UTC midnight, which is what the sorting wants.
 */
function toTimestamp(value: string | null | undefined): number | null {
  const raw = trimmedOrNull(value);
  if (!raw) {
    return null;
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * The date a surveyor cares about: when the work happened. Jobs in different
 * states populate different columns, so fall back through them in order of
 * usefulness rather than showing a blank row.
 */
export function getJobDateTimestamp(job: ServiceM8JobRecord): number | null {
  return (
    toTimestamp(job.date) ??
    toTimestamp(job.quoteDate) ??
    toTimestamp(job.workOrderDate) ??
    toTimestamp(job.completionDate) ??
    toTimestamp(job.editDate)
  );
}

/** `16 Oct 2026`, or null when the job carries no usable date. */
export function formatJobDate(job: ServiceM8JobRecord): string | null {
  const timestamp = getJobDateTimestamp(job);
  if (timestamp === null) {
    return null;
  }

  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getJobReference(job: ServiceM8JobRecord): string {
  return job.generatedJobId ? `Job ${job.generatedJobId}` : 'ServiceM8 job';
}

/** Business name first: that is what a surveyor recognises on site. */
export function getJobCustomerName(job: ServiceM8JobRecord): string {
  const business = trimmedOrNull(job.companyName);
  if (business) {
    return business;
  }

  const customer = trimmedOrNull(job.customerName);
  if (customer) {
    return customer;
  }

  const contact = [trimmedOrNull(job.firstName), trimmedOrNull(job.lastName)]
    .filter((part): part is string => part !== null)
    .join(' ');

  return trimmedOrNull(contact) ?? UNNAMED_CUSTOMER;
}

function getJobContactName(job: ServiceM8JobRecord): string | null {
  const explicit = trimmedOrNull(job.billingContactName);
  if (explicit) {
    return explicit;
  }

  const contact = [trimmedOrNull(job.firstName), trimmedOrNull(job.lastName)]
    .filter((part): part is string => part !== null)
    .join(' ');

  return trimmedOrNull(contact);
}

function getGroupKey(job: ServiceM8JobRecord): string {
  const uuid = trimmedOrNull(job.companyUuid);
  if (uuid) {
    return uuid;
  }

  return `name:${getJobCustomerName(job).toLowerCase()}`;
}

/** Case-insensitive match across everything a surveyor might type. */
export function jobMatchesSearch(job: ServiceM8JobRecord, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const haystack = [
    job.generatedJobId,
    job.companyName,
    job.customerName,
    job.billingContactName,
    job.firstName,
    job.lastName,
    job.address,
    job.description,
    job.workDoneDescription,
    job.status,
    job.email,
    job.phone,
    job.mobile,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

export function jobMatchesStatus(job: ServiceM8JobRecord, status: string | null): boolean {
  if (!status) {
    return true;
  }

  return (trimmedOrNull(job.status) ?? '').toLowerCase() === status.toLowerCase();
}

/**
 * Distinct statuses present in the jobs the user can actually see, so the filter
 * never offers a status that would return nothing.
 */
export function collectStatusOptions(jobs: ServiceM8JobRecord[]): StatusOption[] {
  const counts = new Map<string, number>();

  for (const job of jobs) {
    const status = trimmedOrNull(job.status);
    if (!status) {
      continue;
    }

    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count || left.status.localeCompare(right.status));
}

/**
 * Filters and groups jobs per customer.
 *
 * Customers are ordered by their newest matching job, and the jobs inside each
 * customer are ordered the same way, so "most recent first" holds at both
 * levels and survives status/search filtering.
 */
export function groupJobsByCustomer(
  jobs: ServiceM8JobRecord[],
  options: { search?: string; status?: string | null } = {}
): CustomerJobGroup[] {
  const search = options.search ?? '';
  const status = options.status ?? null;
  const groups = new Map<string, CustomerJobGroup>();

  for (const job of jobs) {
    if (!jobMatchesSearch(job, search) || !jobMatchesStatus(job, status)) {
      continue;
    }

    const key = getGroupKey(job);
    const timestamp = getJobDateTimestamp(job);
    const existing = groups.get(key);

    if (existing) {
      existing.jobs.push(job);
      if (timestamp !== null && (existing.latestAt === null || timestamp > existing.latestAt)) {
        existing.latestAt = timestamp;
      }
      continue;
    }

    groups.set(key, {
      key,
      customerName: getJobCustomerName(job),
      contactName: getJobContactName(job),
      jobs: [job],
      latestAt: timestamp,
    });
  }

  const result = [...groups.values()];

  for (const group of result) {
    group.jobs.sort((left, right) => {
      const leftAt = getJobDateTimestamp(left) ?? 0;
      const rightAt = getJobDateTimestamp(right) ?? 0;
      return rightAt - leftAt;
    });
  }

  return result.sort((left, right) => {
    const leftAt = left.latestAt ?? 0;
    const rightAt = right.latestAt ?? 0;

    return rightAt - leftAt || left.customerName.localeCompare(right.customerName);
  });
}

/**
 * Trims the grouped list to a bounded number of job rows.
 *
 * Rendering every row of a busy account is wasteful on a phone, so the screen
 * shows a first page and grows it on demand. Groups keep their order and are cut
 * mid-way when the limit falls inside one.
 */
export function limitGroupsToJobs(
  groups: CustomerJobGroup[],
  maxJobs: number
): CustomerJobGroup[] {
  if (maxJobs <= 0) {
    return [];
  }

  const limited: CustomerJobGroup[] = [];
  let remaining = maxJobs;

  for (const group of groups) {
    if (remaining <= 0) {
      break;
    }

    if (group.jobs.length <= remaining) {
      limited.push(group);
      remaining -= group.jobs.length;
      continue;
    }

    const visibleJobs = group.jobs.slice(0, remaining);
    limited.push({
      ...group,
      jobs: visibleJobs,
      latestAt: getJobDateTimestamp(visibleJobs[0]) ?? group.latestAt,
    });
    remaining = 0;
  }

  return limited;
}

/** Total job rows across the groups, used for "X of Y" counters. */
export function countGroupedJobs(groups: CustomerJobGroup[]): number {
  return groups.reduce((total, group) => total + group.jobs.length, 0);
}

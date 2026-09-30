/**
 * Bulk ServiceM8 data loading.
 *
 * The previous implementation issued one `companycontact.json` request *per
 * client*. ServiceM8 throttles at 180 requests/minute, so listing a few hundred
 * clients produced 429s and every later contact lookup silently returned null -
 * which is why client names, emails and phone numbers came back blank.
 *
 * Here every collection is downloaded in full (following the `x-next-cursor`
 * cursor) and joined in memory, so listing clients costs three paginated
 * requests in total, regardless of how many clients exist.
 */

import type { ServiceM8Client_API } from './client';
import {
  groupAttachmentsByObject,
  groupContactsByCompany,
  normalizeServiceM8Client,
  normalizeServiceM8Job,
} from './normalize';
import type {
  ServiceM8AttachmentRecord,
  ServiceM8ClientRecord,
  ServiceM8Company,
  ServiceM8CompanyContact,
  ServiceM8ContactRecord,
  ServiceM8Job,
  ServiceM8JobRecord,
} from './types';

/** How long a loaded directory stays warm before it is fetched again. */
const DIRECTORY_CACHE_TTL_MS = 60_000;

export interface ServiceM8ClientDirectory {
  clients: ServiceM8ClientRecord[];
  byUuid: Map<string, ServiceM8ClientRecord>;
  /** Non-fatal problems encountered while loading (typically missing scopes). */
  warnings: string[];
  loadedAt: number;
}

export interface LoadDirectoryOptions {
  /** OData filter for the company sweep. Defaults to active clients. */
  filter?: string;
  includeContacts?: boolean;
  includeImages?: boolean;
}

interface CacheEntry {
  value: ServiceM8ClientDirectory;
  expiresAt: number;
}

const directoryCache = new Map<string, CacheEntry>();

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sortClientsByName(clients: ServiceM8ClientRecord[]): ServiceM8ClientRecord[] {
  return [...clients].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

/**
 * Downloads every client, then joins contact details and image attachments.
 * Contacts and images are best-effort: a missing scope degrades the record
 * rather than failing the whole call.
 */
export async function loadServiceM8ClientDirectory(
  client: ServiceM8Client_API,
  options: LoadDirectoryOptions = {},
): Promise<ServiceM8ClientDirectory> {
  const includeContacts = options.includeContacts !== false;
  const includeImages = options.includeImages !== false;
  const warnings: string[] = [];

  const companies: ServiceM8Company[] = await client.getClients(
    options.filter ?? 'active eq 1',
  );

  let contactsByCompany = new Map<string, ServiceM8ContactRecord[]>();

  if (includeContacts) {
    try {
      const contacts: ServiceM8CompanyContact[] = await client.getCompanyContacts();
      contactsByCompany = groupContactsByCompany(contacts);
    } catch (error) {
      warnings.push(
        `Client contact details could not be loaded (${describeError(error)}). ` +
          'Reconnect ServiceM8 so the read_customer_contacts scope is granted.',
      );
    }
  }

  let attachmentsByCompany = new Map<string, ServiceM8AttachmentRecord[]>();

  if (includeImages) {
    try {
      const attachments = await client.getAttachments("related_object eq 'company'");
      attachmentsByCompany = groupAttachmentsByObject(attachments, 'company');
    } catch (error) {
      warnings.push(
        `Client images could not be loaded (${describeError(error)}). ` +
          'Reconnect ServiceM8 so the read_attachments scope is granted.',
      );
    }
  }

  const clients = sortClientsByName(
    companies.map((company) =>
      normalizeServiceM8Client(company, {
        contacts: contactsByCompany.get(company.uuid) ?? [],
        attachments: attachmentsByCompany.get(company.uuid) ?? [],
      }),
    ),
  );

  return {
    clients,
    byUuid: new Map(clients.map((record) => [record.uuid, record])),
    warnings,
    loadedAt: Date.now(),
  };
}

/**
 * Cached variant for request handlers. The cache lives in the server process, so
 * a cold start simply refetches.
 */
export async function getServiceM8ClientDirectory(
  client: ServiceM8Client_API,
  options: LoadDirectoryOptions = {},
): Promise<ServiceM8ClientDirectory> {
  const cacheKey = [
    client.team,
    options.filter ?? 'active eq 1',
    options.includeContacts !== false,
    options.includeImages !== false,
  ].join(':');

  const cached = directoryCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await loadServiceM8ClientDirectory(client, options);
  directoryCache.set(cacheKey, { value, expiresAt: Date.now() + DIRECTORY_CACHE_TTL_MS });

  return value;
}

/** Drops cached directory data, e.g. straight after an import. */
export function invalidateServiceM8DirectoryCache(teamId?: number): void {
  if (teamId === undefined) {
    directoryCache.clear();
    return;
  }

  for (const key of directoryCache.keys()) {
    if (key.startsWith(`${teamId}:`)) {
      directoryCache.delete(key);
    }
  }
}

export interface LoadJobsOptions {
  filter?: string;
  /** Attach the owning client's contact details and addresses. */
  enrich?: boolean;
  directory?: ServiceM8ClientDirectory;
}

/**
 * Loads jobs and, when asked, joins them against the client directory so the
 * customer name, contact details and addresses are populated.
 */
export async function loadServiceM8Jobs(
  client: ServiceM8Client_API,
  options: LoadJobsOptions = {},
): Promise<{ jobs: ServiceM8JobRecord[]; directory: ServiceM8ClientDirectory | null }> {
  const rawJobs: ServiceM8Job[] = await client.getJobs(options.filter ?? 'active eq 1');

  if (options.enrich === false) {
    return {
      jobs: rawJobs.map((job) => normalizeServiceM8Job(job, { client: null })),
      directory: options.directory ?? null,
    };
  }

  // Only build the directory when a job actually references a client.
  const needsDirectory = rawJobs.some((job) => Boolean(job.company_uuid));

  const directory =
    options.directory ??
    (needsDirectory ? await getServiceM8ClientDirectory(client) : null);

  const jobs = rawJobs.map((job) => {
    const companyUuid = job.company_uuid ?? null;
    const linkedClient =
      companyUuid && directory ? directory.byUuid.get(companyUuid) ?? null : null;

    return normalizeServiceM8Job(job, { client: linkedClient });
  });

  return { jobs, directory };
}

/** Looks a single client up by UUID, loading the directory on demand. */
export async function findServiceM8Client(
  client: ServiceM8Client_API,
  companyUuid: string,
): Promise<ServiceM8ClientRecord | null> {
  const directory = await getServiceM8ClientDirectory(client);
  return directory.byUuid.get(companyUuid) ?? null;
}

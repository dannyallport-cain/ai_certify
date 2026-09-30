/**
 * Shared helpers for the mobile ServiceM8 API routes.
 *
 * This module used to carry its own copies of the client normalisers, which
 * drifted from the web routes and (because the Company endpoint returns no
 * contact fields) produced blank names, emails and phone numbers. All
 * normalisation now lives in `lib/servicem8` so both surfaces agree.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getMobileUser } from '@/lib/auth/mobile';
import { ServiceM8Client_API } from '@/lib/servicem8/client';
import {
  getServiceM8ClientDirectory,
  type ServiceM8ClientDirectory,
} from '@/lib/servicem8/directory';
import { normalizeServiceM8Attachment, normalizeServiceM8Job } from '@/lib/servicem8/normalize';
import type {
  ServiceM8Attachment,
  ServiceM8AttachmentRecord,
  ServiceM8ClientRecord,
  ServiceM8JobRecord,
} from '@/lib/servicem8/types';

export type {
  ServiceM8AttachmentRecord,
  ServiceM8ClientRecord,
  ServiceM8CompanyContact,
  ServiceM8Job,
  ServiceM8JobRecord,
} from '@/lib/servicem8/types';

export {
  buildServiceM8Address,
  buildServiceM8ContactName,
  normalizeServiceM8Attachment,
  normalizeServiceM8Client,
  normalizeServiceM8Job,
} from '@/lib/servicem8/normalize';

export interface ServiceM8ConnectionStatus {
  connected: boolean;
  connection: {
    teamId: number;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
}

export interface MobileServiceM8Context {
  serviceM8Client: ServiceM8Client_API;
  teamId: number;
  userId: number;
}

export type MobileServiceM8Result = MobileServiceM8Context | { error: NextResponse };

export async function getMobileServiceM8Client(
  request: NextRequest,
): Promise<MobileServiceM8Result> {
  const mobileSession = await getMobileUser(request);

  if (!mobileSession?.user || !mobileSession.team?.id) {
    return {
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }

  const client =
    (mobileSession.user.id != null
      ? await ServiceM8Client_API.fromUserId(mobileSession.user.id)
      : null) ?? (await ServiceM8Client_API.fromTeamId(mobileSession.team.id));

  if (!client) {
    return {
      error: NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 400 }),
    };
  }

  return {
    serviceM8Client: client,
    teamId: mobileSession.team.id,
    userId: mobileSession.user.id,
  };
}

/** Narrows the auth result so route handlers can bail out early. */
export function isServiceM8Context(
  result: MobileServiceM8Result,
): result is MobileServiceM8Context {
  return !('error' in result);
}

/**
 * Loads every ServiceM8 client once and joins contacts, so list screens cost a
 * fixed number of requests instead of one per client.
 */
export async function loadMobileClientDirectory(
  client: ServiceM8Client_API,
): Promise<ServiceM8ClientDirectory> {
  return getServiceM8ClientDirectory(client);
}

export interface MobileJobDetail {
  job: ServiceM8JobRecord;
  customer: ServiceM8ClientRecord | null;
  attachments: ServiceM8AttachmentRecord[];
}

/** Newest first, falling back to the edit date when no timestamp is present. */
function byNewestAttachment(
  left: ServiceM8AttachmentRecord,
  right: ServiceM8AttachmentRecord,
): number {
  const leftTime = new Date(left.createdAt ?? left.updatedAt ?? 0).getTime();
  const rightTime = new Date(right.createdAt ?? right.updatedAt ?? 0).getTime();

  return rightTime - leftTime;
}

/**
 * Loads one job with its linked client and attachments.
 *
 * The client must come from the shared directory, not `getClient()`, because the
 * Company endpoint returns no names, email or phone - which is exactly why job
 * detail screens used to show a blank customer.
 */
export async function loadMobileJobDetail(
  serviceM8Client: ServiceM8Client_API,
  jobUuid: string,
): Promise<MobileJobDetail> {
  const job = await serviceM8Client.getJob(jobUuid);
  const companyUuid = job.company_uuid ?? null;

  const [directory, rawAttachments] = await Promise.all([
    companyUuid
      ? getServiceM8ClientDirectory(serviceM8Client).catch(() => null)
      : Promise.resolve(null),
    serviceM8Client.getJobAttachments(jobUuid).catch((error) => {
      console.warn('Failed to load ServiceM8 job attachments', error);
      return [] as ServiceM8Attachment[];
    }),
  ]);

  const customer =
    (companyUuid && directory ? directory.byUuid.get(companyUuid) ?? null : null) ?? null;

  const attachments = rawAttachments
    .map((attachment) => normalizeServiceM8Attachment(attachment))
    .sort(byNewestAttachment);

  return {
    job: normalizeServiceM8Job(job, { client: customer }),
    customer,
    attachments,
  };
}

/** Case-insensitive substring match across the fields a user can search. */
export function matchesText(haystack: Array<string | null | undefined>, needle: string): boolean {
  const search = needle.trim().toLowerCase();

  if (!search) {
    return true;
  }

  return haystack
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase()
    .includes(search);
}

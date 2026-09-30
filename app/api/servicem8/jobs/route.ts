/**
 * ServiceM8 Jobs API.
 *
 * GET  - List jobs from ServiceM8, enriched with their client's details.
 * POST - Link or create a ServiceM8 job for a certificate, then process sync.
 *
 * Enrichment previously called `getClient` plus a contact lookup *per job*, which
 * burned the 180 requests/minute budget on any realistic page size and silently
 * returned blank customer names once throttled. The client directory is now
 * loaded once per request and reused for every job.
 */

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { certificates, servicem8JobMappings } from '@/lib/db/schema';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { ServiceM8Client_API } from '@/lib/servicem8/client';
import {
  getServiceM8ClientDirectory,
  type ServiceM8ClientDirectory,
} from '@/lib/servicem8/directory';
import { normalizeServiceM8Job } from '@/lib/servicem8/normalize';
import type { ServiceM8JobPickerRecord } from '@/lib/servicem8/picker';
import type { ServiceM8Job } from '@/lib/servicem8/types';
import { processServiceM8JobMapping } from '@/lib/servicem8/sync';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_REMOTE_PAGES_PER_REQUEST = 10;
const ALLOWED_SORT_FIELDS = new Set(['date', 'generated_job_id', 'job_description', 'status']);

type JobsQuery = {
  search: string;
  status: string;
  cursor: string;
  sort: string;
  order: 'asc' | 'desc';
  limit: number;
};

async function getServiceM8Context(): Promise<{ userId: number; teamId: number } | null> {
  const user = await getUser();
  if (!user) return null;

  const team = await getTeamForUser();
  if (!team) return null;

  return { userId: user.id, teamId: team.id };
}

function escapeFilterValue(value: string) {
  return value.replace(/'/g, "''");
}

function parsePageSize(value: string | null) {
  const parsed = Number(value ?? String(DEFAULT_PAGE_SIZE));

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.max(1, Math.min(Math.trunc(parsed), MAX_PAGE_SIZE));
}

function parseJobsQuery(request: NextRequest): JobsQuery {
  const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
  const status = request.nextUrl.searchParams.get('status')?.trim() ?? '';
  const cursor = request.nextUrl.searchParams.get('cursor')?.trim() || '-1';
  const requestedSort = request.nextUrl.searchParams.get('sort')?.trim() || 'date';
  const sort = ALLOWED_SORT_FIELDS.has(requestedSort) ? requestedSort : 'date';
  const order = request.nextUrl.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const limit = parsePageSize(request.nextUrl.searchParams.get('limit'));

  return { search, status, cursor, sort, order, limit };
}

function matchesJobSearch(job: ServiceM8Job, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const haystack = [
    job.uuid,
    job.generated_job_id,
    job.job_address,
    job.job_description,
    job.work_done_description,
    job.status,
    job.date,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

function shouldUsePagedMode(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return (
    params.has('paged') ||
    params.has('cursor') ||
    params.has('limit') ||
    params.has('search') ||
    params.has('status') ||
    params.has('sort') ||
    params.has('order')
  );
}

/**
 * Joins jobs against the already-loaded client directory. No per-job requests.
 */
function enrichJobs(
  jobs: ServiceM8Job[],
  directory: ServiceM8ClientDirectory | null,
): ServiceM8JobPickerRecord[] {
  return jobs.map((job) => {
    const companyUuid = job.company_uuid ?? null;
    const linkedClient =
      companyUuid && directory ? directory.byUuid.get(companyUuid) ?? null : null;

    const normalizedJob = normalizeServiceM8Job(job, { client: linkedClient });

    return {
      ...job,
      ...normalizedJob,
      first_name: normalizedJob.firstName,
      last_name: normalizedJob.lastName,
      job_address: normalizedJob.workAddress ?? job.job_address ?? null,
      customer_name: normalizedJob.customerName ?? normalizedJob.billingContactName,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const context = await getServiceM8Context();
    if (!context) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await ServiceM8Client_API.fromUserId(context.userId);
    if (!client) {
      return NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 400 });
    }

    if (!shouldUsePagedMode(request)) {
      const jobs = await client.getJobs('active eq 1');
      const directory = jobs.some((job) => job.company_uuid)
        ? await getServiceM8ClientDirectory(client)
        : null;

      return NextResponse.json({
        jobs: enrichJobs(jobs, directory),
        total: jobs.length,
        warnings: directory?.warnings ?? [],
      });
    }

    const query = parseJobsQuery(request);

    const filterParts = ['active eq 1'];
    if (query.status) {
      filterParts.push(`status eq '${escapeFilterValue(query.status)}'`);
    }

    const filter = filterParts.join(' and ');
    const collectedJobs: ServiceM8Job[] = [];
    let currentCursor = query.cursor || '-1';
    let nextCursor: string | null = null;

    for (let pageCount = 0; pageCount < MAX_REMOTE_PAGES_PER_REQUEST; pageCount += 1) {
      const result = await client.getJobsPage(filter, {
        cursor: currentCursor,
        sort: query.sort,
        order: query.order,
      });

      nextCursor = result.nextCursor;

      const matches = query.search
        ? result.jobs.filter((job) => matchesJobSearch(job, query.search))
        : result.jobs;

      collectedJobs.push(...matches);

      if (collectedJobs.length >= query.limit || !nextCursor) {
        break;
      }

      currentCursor = nextCursor;
    }

    const pageJobs = collectedJobs.slice(0, query.limit);
    const directory = pageJobs.some((job) => job.company_uuid)
      ? await getServiceM8ClientDirectory(client)
      : null;

    return NextResponse.json({
      jobs: enrichJobs(pageJobs, directory),
      nextCursor,
      pageSize: query.limit,
      sort: query.sort,
      order: query.order,
      warnings: directory?.warnings ?? [],
    });
  } catch (error) {
    console.error('Error fetching ServiceM8 jobs:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch jobs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getServiceM8Context();
    if (!context) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const client = await ServiceM8Client_API.fromUserId(context.userId);
    if (!client) {
      return NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 400 });
    }

    const body = await request.json();
    const { certificateId, servicem8JobUuid, action } = body;

    if (action === 'link') {
      if (!certificateId || !servicem8JobUuid) {
        return NextResponse.json(
          { error: 'certificateId and servicem8JobUuid required' },
          { status: 400 },
        );
      }

      const existing = await db
        .select({ id: servicem8JobMappings.id })
        .from(servicem8JobMappings)
        .where(
          and(
            eq(servicem8JobMappings.teamId, context.teamId),
            eq(servicem8JobMappings.certificateId, certificateId),
          ),
        )
        .limit(1);

      let mappingId: number;

      if (existing.length > 0) {
        mappingId = existing[0].id;

        await db
          .update(servicem8JobMappings)
          .set({
            servicem8ConnectionUserId: context.userId,
            servicem8JobUuid,
            syncStatus: 'pending',
            lastSyncAt: null,
            updatedAt: new Date(),
          })
          .where(eq(servicem8JobMappings.id, mappingId));
      } else {
        const inserted = await db
          .insert(servicem8JobMappings)
          .values({
            teamId: context.teamId,
            servicem8ConnectionUserId: context.userId,
            certificateId,
            servicem8JobUuid,
            syncStatus: 'pending',
            lastSyncAt: null,
          })
          .returning({ id: servicem8JobMappings.id });

        mappingId = inserted[0].id;
      }

      const syncResult = await processServiceM8JobMapping(mappingId);

      return NextResponse.json({
        success: syncResult.syncStatus !== 'error',
        message: 'Job linked',
        sync: syncResult,
      });
    }

    if (action === 'create') {
      if (!certificateId) {
        return NextResponse.json({ error: 'certificateId required' }, { status: 400 });
      }

      const cert = await db
        .select()
        .from(certificates)
        .where(
          and(eq(certificates.id, certificateId), eq(certificates.teamId, context.teamId)),
        )
        .limit(1);

      if (cert.length === 0) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }

      const certificate = cert[0];

      const jobData: Record<string, unknown> = {
        job_address: certificate.siteAddress || '',
        job_description: `${certificate.certificateType} - ${certificate.certificateNumber}`,
        status: certificate.status === 'completed' ? 'Completed' : 'Quote',
      };

      if (certificate.inspectionDate) {
        jobData.date = certificate.inspectionDate;
      }

      const result = await client.createJob(jobData);

      const inserted = await db
        .insert(servicem8JobMappings)
        .values({
          teamId: context.teamId,
          servicem8ConnectionUserId: context.userId,
          certificateId,
          servicem8JobUuid: result.uuid,
          syncStatus: 'pending',
          lastSyncAt: null,
        })
        .returning({ id: servicem8JobMappings.id });

      const syncResult = await processServiceM8JobMapping(inserted[0].id);

      return NextResponse.json({
        success: syncResult.syncStatus !== 'error',
        jobUuid: result.uuid,
        sync: syncResult,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing ServiceM8 job:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

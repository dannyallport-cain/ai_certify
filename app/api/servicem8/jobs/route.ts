/**
 * ServiceM8 Jobs API
 *
 * GET - List jobs from ServiceM8
 * POST - Link or create a ServiceM8 job for a certificate, then process sync
 */

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { certificates, servicem8JobMappings } from '@/lib/db/schema';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { ServiceM8Client_API, type ServiceM8Job } from '@/lib/servicem8/client';
import {
  loadServiceM8ContactDetails,
  normalizeServiceM8Client,
  normalizeServiceM8Job,
  type ServiceM8ClientRecord,
  type ServiceM8JobRecord,
} from '@/app/api/mobile/servicem8/_shared';
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

type ServiceM8JobPickerRecord = ServiceM8Job &
  ServiceM8JobRecord & {
    customer_name: string | null;
  };

async function getServiceM8Context(): Promise<{ userId: number; teamId: number } | null> {
  const user = await getUser();
  if (!user) return null;

  const team = await getTeamForUser();
  if (!team) return null;

  return {
    userId: user.id,
    teamId: team.id,
  };
}

function escapeFilterValue(value: string) {
  return value.replace(/'/g, "''");
}

function parsePageSize(value: string | null) {
  const parsed = Number(value ?? String(DEFAULT_PAGE_SIZE));

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.max(1, Math.min(parsed, MAX_PAGE_SIZE));
}

function parseJobsQuery(request: NextRequest): JobsQuery {
  const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
  const status = request.nextUrl.searchParams.get('status')?.trim() ?? '';
  const cursor = request.nextUrl.searchParams.get('cursor')?.trim() || '-1';
  const requestedSort = request.nextUrl.searchParams.get('sort')?.trim() || 'date';
  const sort = ALLOWED_SORT_FIELDS.has(requestedSort) ? requestedSort : 'date';
  const order = request.nextUrl.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const limit = parsePageSize(request.nextUrl.searchParams.get('limit'));

  return {
    search,
    status,
    cursor,
    sort,
    order,
    limit,
  };
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
    job.first_name,
    job.last_name,
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

async function enrichJobs(
  client: ServiceM8Client_API,
  jobs: ServiceM8Job[],
): Promise<ServiceM8JobPickerRecord[]> {
  const clientCache = new Map<string, ServiceM8ClientRecord | null>();

  const getClientRecord = async (companyUuid: string | null | undefined) => {
    if (!companyUuid) {
      return null;
    }

    const cached = clientCache.get(companyUuid);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const rawClient = await client.getClient(companyUuid);
      const contactDetails = await loadServiceM8ContactDetails(client, companyUuid);
      const normalizedClient = normalizeServiceM8Client(rawClient, contactDetails);
      clientCache.set(companyUuid, normalizedClient);
      return normalizedClient;
    } catch (error) {
      console.warn(`Failed to load ServiceM8 client ${companyUuid} for jobs API`, error);
      clientCache.set(companyUuid, null);
      return null;
    }
  };

  return Promise.all(
    jobs.map(async (job) => {
      const clientRecord = await getClientRecord(job.company_uuid);
      const normalizedJob = normalizeServiceM8Job(job, clientRecord);

      return {
        ...job,
        ...normalizedJob,
        first_name: normalizedJob.firstName,
        last_name: normalizedJob.lastName,
        job_address: normalizedJob.workAddress ?? job.job_address ?? null,
        customer_name: normalizedJob.billingContactName,
      };
    }),
  );
}

async function fetchPagedJobs(
  client: ServiceM8Client_API,
  query: JobsQuery,
): Promise<{ jobs: ServiceM8JobPickerRecord[]; nextCursor: string | null }> {
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
    const matches = query.search ? result.jobs.filter((job) => matchesJobSearch(job, query.search)) : result.jobs;

    collectedJobs.push(...matches);

    if (collectedJobs.length >= query.limit || !nextCursor) {
      break;
    }

    currentCursor = nextCursor;
  }

  return {
    jobs: await enrichJobs(client, collectedJobs.slice(0, query.limit)),
    nextCursor,
  };
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
      return NextResponse.json({ jobs: await enrichJobs(client, jobs) });
    }

    const query = parseJobsQuery(request);
    const { jobs, nextCursor } = await fetchPagedJobs(client, query);

    return NextResponse.json({
      jobs,
      nextCursor,
      pageSize: query.limit,
      sort: query.sort,
      order: query.order,
    });
  } catch (error) {
    console.error('Error fetching ServiceM8 jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
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
          { status: 400 }
        );
      }

      const existing = await db
        .select({ id: servicem8JobMappings.id })
        .from(servicem8JobMappings)
        .where(
          and(
            eq(servicem8JobMappings.teamId, context.teamId),
            eq(servicem8JobMappings.certificateId, certificateId)
          )
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
      // Create a new ServiceM8 job from a certificate
      if (!certificateId) {
        return NextResponse.json({ error: 'certificateId required' }, { status: 400 });
      }

      const cert = await db
        .select()
        .from(certificates)
        .where(
          and(
            eq(certificates.id, certificateId),
            eq(certificates.teamId, context.teamId)
          )
        )
        .limit(1);

      if (cert.length === 0) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }

      const certificate = cert[0];

      // Build the job data
      const jobData: Record<string, any> = {
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
    return NextResponse.json({ error: 'Failed to sync job' }, { status: 500 });
  }
}

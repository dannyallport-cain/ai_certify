/**
 * Mobile ServiceM8 jobs.
 *
 * Jobs are enriched from the shared client directory, so the customer name and
 * contact details are always populated instead of relying on the Company record
 * (which has no contact fields) or issuing a request per job.
 */

import { NextRequest, NextResponse } from 'next/server';

import { loadServiceM8Jobs } from '@/lib/servicem8/directory';

import { getMobileServiceM8Client, isServiceM8Context, matchesText } from '../_shared';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? String(DEFAULT_LIMIT));

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(Math.trunc(parsed), MAX_LIMIT));
}

function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "''");
}

export async function GET(request: NextRequest) {
  try {
    const result = await getMobileServiceM8Client(request);

    if (!isServiceM8Context(result)) {
      return result.error;
    }

    const search = request.nextUrl.searchParams.get('search') ?? '';
    const status = request.nextUrl.searchParams.get('status')?.trim() ?? '';
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'));

    const filters = ['active eq 1'];

    if (status) {
      filters.push(`status eq '${escapeFilterValue(status)}'`);
    }

    const { jobs, directory } = await loadServiceM8Jobs(result.serviceM8Client, {
      filter: filters.join(' and '),
    });

    const filtered = jobs.filter((job) =>
      matchesText(
        [
          job.generatedJobId,
          job.address,
          job.description,
          job.workDoneDescription,
          job.status,
          job.customerName,
          job.firstName,
          job.lastName,
          job.email,
          job.phone,
          job.mobile,
        ],
        search,
      ),
    );

    return NextResponse.json({
      jobs: filtered.slice(0, limit),
      total: filtered.length,
      warnings: directory?.warnings ?? [],
    });
  } catch (error) {
    console.error('Error fetching mobile ServiceM8 jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch ServiceM8 jobs' }, { status: 500 });
  }
}

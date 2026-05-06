import { NextRequest, NextResponse } from 'next/server';
import { getMobileServiceM8Client, normalizeServiceM8Job } from '../_shared';

export async function GET(request: NextRequest) {
  try {
    const result = await getMobileServiceM8Client(request);

    if ('error' in result) {
      return result.error;
    }

    const search = request.nextUrl.searchParams.get('search')?.trim();
    const status = request.nextUrl.searchParams.get('status')?.trim();
    const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? '50');
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, 100))
      : 50;

    const filters: string[] = ['active eq 1'];
    if (status) {
      filters.push(`status eq '${status.replace(/'/g, "''")}'`);
    }

    const jobs = await result.serviceM8Client.getJobs(filters.join(' and '));

    const filteredJobs = jobs
      .filter((job) => {
        if (!search) return true;

        const haystack = [
          job.generated_job_id,
          job.job_address,
          job.job_description,
          job.work_done_description,
          job.first_name,
          job.last_name,
          job.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(search.toLowerCase());
      })
      .slice(0, limit)
      .map((job) => normalizeServiceM8Job(job));

    return NextResponse.json({ jobs: filteredJobs });
  } catch (error) {
    console.error('Error fetching mobile ServiceM8 jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch ServiceM8 jobs' }, { status: 500 });
  }
}

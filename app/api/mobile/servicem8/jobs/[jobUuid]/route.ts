/**
 * Mobile ServiceM8 job detail.
 *
 * The customer used to be fetched with `getClient(company_uuid)`, but the Company
 * endpoint returns no contact details at all - so job detail screens showed a
 * nameless customer. The client now comes from the shared directory, which joins
 * in CompanyContact records.
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  getMobileServiceM8Client,
  isServiceM8Context,
  loadMobileJobDetail,
} from '../../_shared';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobUuid: string }> },
) {
  try {
    const result = await getMobileServiceM8Client(request);

    if (!isServiceM8Context(result)) {
      return result.error;
    }

    const { jobUuid } = await context.params;

    if (!jobUuid) {
      return NextResponse.json({ error: 'Job id is required' }, { status: 400 });
    }

    const detail = await loadMobileJobDetail(result.serviceM8Client, jobUuid);

    return NextResponse.json({
      job: {
        ...detail.job,
        customer: detail.customer,
        attachments: detail.attachments,
      },
    });
  } catch (error) {
    console.error('Error fetching mobile ServiceM8 job:', error);
    return NextResponse.json({ error: 'Failed to fetch ServiceM8 job' }, { status: 500 });
  }
}

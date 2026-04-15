import { NextRequest, NextResponse } from 'next/server';
import {
  getMobileServiceM8Client,
  normalizeServiceM8Attachment,
  normalizeServiceM8Client,
  normalizeServiceM8Job,
} from '../../_shared';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobUuid: string }> },
) {
  try {
    const result = await getMobileServiceM8Client(request);

    if ('error' in result) {
      return result.error;
    }

    const { jobUuid } = await context.params;
    const job = await result.serviceM8Client.getJob(jobUuid);

    const [customer, attachmentRecords] = await Promise.all([
      (async () => {
        if (!job.company_uuid) {
          return null;
        }

        try {
          const company = await result.serviceM8Client.getClient(job.company_uuid);
          return normalizeServiceM8Client(company);
        } catch (error) {
          console.warn('Failed to fetch ServiceM8 job customer for mobile route', error);
          return null;
        }
      })(),
      (async () => {
        try {
          const attachments = await result.serviceM8Client.getJobAttachments(jobUuid);
          const normalizedAttachments = await Promise.all(
            attachments.map((attachment) =>
              normalizeServiceM8Attachment(result.serviceM8Client, attachment),
            ),
          );

          return normalizedAttachments.sort((a, b) => {
            const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
            const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
            return bTime - aTime;
          });
        } catch (error) {
          console.warn('Failed to fetch ServiceM8 job attachments for mobile route', error);
          return [];
        }
      })(),
    ]);

    return NextResponse.json({
      job: {
        ...normalizeServiceM8Job(job),
        customer,
        attachments: attachmentRecords,
      },
    });
  } catch (error) {
    console.error('Error fetching mobile ServiceM8 job:', error);
    return NextResponse.json({ error: 'Failed to fetch ServiceM8 job' }, { status: 500 });
  }
}
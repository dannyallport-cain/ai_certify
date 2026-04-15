import { NextRequest, NextResponse } from 'next/server';
import {
  getMobileServiceM8Client,
  normalizeServiceM8Attachment,
} from '../../../_shared';

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
    const attachments = await result.serviceM8Client.getJobAttachments(jobUuid);
    const normalized = await Promise.all(
      attachments.map((attachment) =>
        normalizeServiceM8Attachment(result.serviceM8Client, attachment),
      ),
    );

    const sorted = normalized.sort((a, b) => {
      const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({
      attachments: sorted,
      images: sorted.filter((attachment) => attachment.isImage),
    });
  } catch (error) {
    console.error('Error fetching mobile ServiceM8 job attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ServiceM8 job attachments' },
      { status: 500 },
    );
  }
}

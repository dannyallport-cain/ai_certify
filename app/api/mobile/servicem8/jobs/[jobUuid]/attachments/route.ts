/**
 * Mobile ServiceM8 job attachments.
 *
 * Attachments come from `/attachment.json` scoped by `related_object`, and each
 * record carries a same-origin `fileUrl` that the mobile app can load without
 * needing the OAuth token.
 */

import { NextRequest, NextResponse } from 'next/server';

import { normalizeServiceM8Attachment } from '@/lib/servicem8/normalize';
import type { ServiceM8AttachmentRecord } from '@/lib/servicem8/types';

import { getMobileServiceM8Client, isServiceM8Context } from '../../../_shared';

function byNewest(left: ServiceM8AttachmentRecord, right: ServiceM8AttachmentRecord): number {
  const leftTime = new Date(left.createdAt ?? left.updatedAt ?? 0).getTime();
  const rightTime = new Date(right.createdAt ?? right.updatedAt ?? 0).getTime();

  return rightTime - leftTime;
}

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

    const records = await result.serviceM8Client.getJobAttachments(jobUuid);
    const attachments = records
      .map((attachment) => normalizeServiceM8Attachment(attachment))
      .sort(byNewest);

    return NextResponse.json({
      attachments,
      images: attachments.filter((attachment) => attachment.isImage),
    });
  } catch (error) {
    console.error('Error fetching mobile ServiceM8 job attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ServiceM8 job attachments' },
      { status: 500 },
    );
  }
}

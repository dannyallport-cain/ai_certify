import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { sendCertificateEmail } from '@/lib/certificates/email';
import { getTeamForUser, getUser } from '@/lib/db/queries';

const sendCertificateEmailSchema = z.object({
  recipientEmail: z.string().email().optional().or(z.literal('')),
  subject: z.string().optional().or(z.literal('')),
  message: z.string().optional().or(z.literal('')),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'User not part of a team' }, { status: 403 });
    }

    const resolvedParams = await params;
    const certificateId = Number.parseInt(resolvedParams.id, 10);
    if (Number.isNaN(certificateId) || certificateId <= 0) {
      return NextResponse.json({ error: 'Invalid certificate ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = sendCertificateEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const result = await sendCertificateEmail({
      certificateId,
      teamId: team.id,
      recipientEmail: parsed.data.recipientEmail,
      subject: parsed.data.subject || undefined,
      message: parsed.data.message || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending certificate email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send certificate email' },
      { status: 500 }
    );
  }
}

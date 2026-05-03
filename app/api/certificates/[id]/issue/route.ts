import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { cloneCertificateForNewIssue } from '@/lib/certificates/clone';
import { getTeamForUser, getUser } from '@/lib/db/queries';

const issueCertificateSchema = z.object({
  inspectionDate: z.string().min(1, 'Inspection date is required'),
  changesNeeded: z.boolean().optional().default(false),
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
    const sourceCertificateId = Number.parseInt(resolvedParams.id, 10);
    if (Number.isNaN(sourceCertificateId) || sourceCertificateId <= 0) {
      return NextResponse.json({ error: 'Invalid certificate ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = issueCertificateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const result = await cloneCertificateForNewIssue({
      sourceCertificateId,
      teamId: team.id,
      userId: user.id,
      inspectionDate: parsed.data.inspectionDate,
    });

    return NextResponse.json({
      certificateId: result.certificate.id,
      certificateNumber: result.certificate.certificateNumber,
      certificateType: result.certificate.certificateType,
      inspectionDate: result.certificate.inspectionDate,
      detailPath: result.detailPath,
      editPath: result.editPath,
      isEditable: result.isEditable,
      changesNeeded: parsed.data.changesNeeded,
    });
  } catch (error) {
    console.error('Error issuing certificate copy:', error);
    return NextResponse.json(
      { error: 'Failed to create certificate copy' },
      { status: 500 }
    );
  }
}

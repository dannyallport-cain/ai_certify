import { NextRequest, NextResponse } from 'next/server';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { getCertificatePdfData, getCertificatePdfBytes } from '@/lib/certificates/pdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const disposition = request.nextUrl.searchParams.get('disposition') === 'inline'
      ? 'inline'
      : 'attachment';

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'User not part of a team' }, { status: 403 });
    }

    const resolvedParams = await params;
    const certificateId = parseInt(resolvedParams.id, 10);
    if (Number.isNaN(certificateId)) {
      return NextResponse.json({ error: 'Invalid certificate ID' }, { status: 400 });
    }

    const certificateData = await getCertificatePdfData(certificateId, team.id);
    if (!certificateData) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const pdfBytes = await getCertificatePdfBytes(certificateId, team.id);
    if (!pdfBytes) {
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }

    const pdfBuffer = Buffer.from(pdfBytes);
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set(
      'Content-Disposition',
      `${disposition}; filename="certificate-${certificateData.certificateNumber}.pdf"`
    );
    headers.set('Content-Length', pdfBuffer.length.toString());
    headers.set('Cache-Control', 'private, no-store, max-age=0');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reportDisseminatorTemplates } from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { isAdminRole } from '@/lib/auth/roles';
import { sanitizeStoredPdfBase64 } from '@/lib/report-disseminator/pdf-sanitize';
import { stripe } from '@/lib/payments/stripe';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const resolveTeamId = async () => {
  const team = await getTeamForUser();
  if (team?.id) {
    return team.id;
  }
  return 1;
};

const stripPreviewValuesFromWizardData = (wizardData: Record<string, unknown> | null | undefined) => {
  if (!wizardData || typeof wizardData !== 'object' || !('previewValues' in wizardData)) {
    return {
      wizardData,
      changed: false,
    };
  }

  const nextWizardData = { ...wizardData };
  delete nextWizardData.previewValues;

  return {
    wizardData: nextWizardData,
    changed: true,
  };
};

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = await resolveTeamId();

    const templates = await db
      .select({
        id: reportDisseminatorTemplates.id,
        teamId: reportDisseminatorTemplates.teamId,
        name: reportDisseminatorTemplates.name,
        description: reportDisseminatorTemplates.description,
        status: reportDisseminatorTemplates.status,
        version: reportDisseminatorTemplates.version,
        sourceFileName: reportDisseminatorTemplates.sourceFileName,
        sourceMimeType: reportDisseminatorTemplates.sourceMimeType,
        wizardData: reportDisseminatorTemplates.wizardData,
        publishedAt: reportDisseminatorTemplates.publishedAt,
        archivedAt: reportDisseminatorTemplates.archivedAt,
        parentTemplateId: reportDisseminatorTemplates.parentTemplateId,
        createdAt: reportDisseminatorTemplates.createdAt,
        updatedAt: reportDisseminatorTemplates.updatedAt,
      })
      .from(reportDisseminatorTemplates)
      .where(eq(reportDisseminatorTemplates.teamId, teamId))
      .orderBy(desc(reportDisseminatorTemplates.createdAt));

    const dirtyTemplateIds = templates
      .filter((template) => stripPreviewValuesFromWizardData(template.wizardData as Record<string, unknown> | null | undefined).changed)
      .map((template) => template.id);

    if (dirtyTemplateIds.length > 0) {
      await Promise.all(
        templates
          .filter((template) => dirtyTemplateIds.includes(template.id))
          .map((template) => {
            const sanitized = stripPreviewValuesFromWizardData(template.wizardData as Record<string, unknown> | null | undefined);
            return db
              .update(reportDisseminatorTemplates)
              .set({
                wizardData: sanitized.wizardData as typeof reportDisseminatorTemplates.$inferInsert.wizardData,
                updatedAt: new Date(),
              })
              .where(eq(reportDisseminatorTemplates.id, template.id));
          })
      );
    }

    const responseTemplates = templates.map(({ teamId: _teamId, wizardData: _wizardData, ...template }) => template);

    return NextResponse.json(responseTemplates, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching report disseminator templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Non-admin users must pay £5 per template creation
    if (!isAdminRole(user.role)) {
      const paymentSessionId = request.headers.get('x-payment-session-id');
      if (!paymentSessionId) {
        return NextResponse.json({ error: 'Payment required', code: 'PAYMENT_REQUIRED' }, { status: 402 });
      }
      const session = await stripe.checkout.sessions.retrieve(paymentSessionId);
      if (
        session.payment_status !== 'paid' ||
        session.metadata?.type !== 'template_creation' ||
        session.metadata?.userId !== user.id.toString()
      ) {
        return NextResponse.json({ error: 'Invalid or unpaid payment session' }, { status: 402 });
      }
    }

    const teamId = await resolveTeamId();

    const formData = await request.formData();
    const name = String(formData.get('name') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const file = formData.get('file');

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'PDF exceeds 10MB upload limit' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uploadedPdfBase64 = Buffer.from(arrayBuffer).toString('base64');
    const sanitizedPdf = await sanitizeStoredPdfBase64(uploadedPdfBase64);
    const sourcePdfBase64 = sanitizedPdf.base64;

    const created = await db
      .insert(reportDisseminatorTemplates)
      .values({
        teamId,
        createdBy: user.id,
        name,
        description: description || null,
        status: 'draft',
        version: 1,
        sourceFileName: file.name,
        sourceMimeType: file.type,
        sourcePdfBase64,
        fields: [],
        wizardData: {
          currentStep: 1,
          notes: '',
          aiSuggestionsEnabled: true,
        },
      })
      .returning({
        id: reportDisseminatorTemplates.id,
        name: reportDisseminatorTemplates.name,
        description: reportDisseminatorTemplates.description,
        status: reportDisseminatorTemplates.status,
        version: reportDisseminatorTemplates.version,
        sourceFileName: reportDisseminatorTemplates.sourceFileName,
        sourceMimeType: reportDisseminatorTemplates.sourceMimeType,
        createdAt: reportDisseminatorTemplates.createdAt,
        updatedAt: reportDisseminatorTemplates.updatedAt,
      });

    return NextResponse.json(created[0], { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error creating report disseminator template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

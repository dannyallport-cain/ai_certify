import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reportDisseminatorReports, reportDisseminatorTemplates } from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { isAdminRole } from '@/lib/auth/roles';
import { enrichFieldsWithAcroFormPlacements } from '@/lib/report-disseminator/pdf-acroform';
import { sanitizeStoredPdfBase64 } from '@/lib/report-disseminator/pdf-sanitize';
import { type ReportDisseminatorField, reportDisseminatorReportSchema } from '@/lib/report-disseminator/schema';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const resolveTeamId = async () => {
  const team = await getTeamForUser();
  return team?.id ?? null;
};

const normalizeValues = (fields: ReportDisseminatorField[], values: Record<string, string>) => {
  const nextValues: Record<string, string> = {};

  for (const field of fields) {
    nextValues[field.id] = typeof values[field.id] === 'string' ? values[field.id] : '';

    const compositePrefix = `${field.id}_`;
    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith(compositePrefix) && typeof value === 'string') {
        nextValues[key] = value;
      }
    }
  }

  return nextValues;
};

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teamId = await resolveTeamId();
    if (!teamId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reports = await db
      .select({
        id: reportDisseminatorReports.id,
        templateId: reportDisseminatorReports.templateId,
        templateName: reportDisseminatorReports.templateName,
        templateVersion: reportDisseminatorReports.templateVersion,
        name: reportDisseminatorReports.name,
        description: reportDisseminatorReports.description,
        status: reportDisseminatorReports.status,
        createdAt: reportDisseminatorReports.createdAt,
        updatedAt: reportDisseminatorReports.updatedAt,
      })
      .from(reportDisseminatorReports)
      .where(eq(reportDisseminatorReports.teamId, teamId))
      .orderBy(desc(reportDisseminatorReports.updatedAt), desc(reportDisseminatorReports.createdAt));

    return NextResponse.json(reports, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching report disseminator reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teamId = await resolveTeamId();
    if (!teamId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = reportDisseminatorReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const template = await db
      .select()
      .from(reportDisseminatorTemplates)
      .where(
        and(
          eq(reportDisseminatorTemplates.id, parsed.data.templateId),
          eq(reportDisseminatorTemplates.teamId, teamId)
        )
      )
      .limit(1);

    if (!template.length) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const currentTemplate = template[0];
    const sanitizedPdf = await sanitizeStoredPdfBase64(currentTemplate.sourcePdfBase64);
    const enrichedFields = await enrichFieldsWithAcroFormPlacements(
      (currentTemplate.fields ?? []) as ReportDisseminatorField[],
      sanitizedPdf.base64,
    );
    const snapshot = parsed.data.snapshot ?? {
      templateName: currentTemplate.name,
      templateVersion: currentTemplate.version,
      sourceFileName: currentTemplate.sourceFileName,
      sourceMimeType: currentTemplate.sourceMimeType,
      sourcePdfBase64: sanitizedPdf.base64,
      fields: enrichedFields.fields,
    };

    if (!Array.isArray(snapshot.fields) || snapshot.fields.length === 0) {
      return NextResponse.json(
        { error: 'Save the template with extracted fields before creating a report.' },
        { status: 400 }
      );
    }

    const normalizedValues = normalizeValues(snapshot.fields, parsed.data.values || {});
    const completedAt = parsed.data.status === 'completed' ? new Date() : null;
    const archivedAt = parsed.data.status === 'archived' ? new Date() : null;

    const created = await db
      .insert(reportDisseminatorReports)
      .values({
        teamId,
        templateId: currentTemplate.id,
        createdBy: user.id,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        status: parsed.data.status,
        templateVersion: snapshot.templateVersion,
        templateName: snapshot.templateName,
        sourceFileName: snapshot.sourceFileName,
        sourceMimeType: snapshot.sourceMimeType,
        sourcePdfBase64: snapshot.sourcePdfBase64,
        fields: snapshot.fields,
        values: normalizedValues,
        notes: parsed.data.notes?.trim() || null,
        completedAt,
        archivedAt,
      })
      .returning();

    return NextResponse.json(created[0], { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error creating report disseminator report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

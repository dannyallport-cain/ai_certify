import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { reportDisseminatorTemplates } from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { isAdminRole } from '@/lib/auth/roles';
import { enrichFieldsWithAcroFormPlacements } from '@/lib/report-disseminator/pdf-acroform';
import { sanitizeStoredPdfBase64 } from '@/lib/report-disseminator/pdf-sanitize';
import { reportDisseminatorUpdateSchema } from '@/lib/report-disseminator/schema';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const resolveTeamId = async () => {
  const team = await getTeamForUser();
  return team?.id ?? null;
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

const updateSchema = reportDisseminatorUpdateSchema.extend({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const id = Number.parseInt(resolvedParams.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid template id' }, { status: 400 });
    }

    const template = await db
      .select()
      .from(reportDisseminatorTemplates)
      .where(and(eq(reportDisseminatorTemplates.id, id), eq(reportDisseminatorTemplates.teamId, teamId)))
      .limit(1);

    if (!template.length) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const sanitized = stripPreviewValuesFromWizardData(template[0].wizardData as Record<string, unknown> | null | undefined);
    const sanitizedPdf = await sanitizeStoredPdfBase64(template[0].sourcePdfBase64);
    const enrichedFields = await enrichFieldsWithAcroFormPlacements(template[0].fields as any, sanitizedPdf.base64);

    if (sanitized.changed || sanitizedPdf.changed || enrichedFields.changed) {
      const cleaned = await db
        .update(reportDisseminatorTemplates)
        .set({
          fields: enrichedFields.fields,
          wizardData: sanitized.wizardData as typeof reportDisseminatorTemplates.$inferInsert.wizardData,
          sourcePdfBase64: sanitizedPdf.base64,
          updatedAt: new Date(),
        })
        .where(and(eq(reportDisseminatorTemplates.id, id), eq(reportDisseminatorTemplates.teamId, teamId)))
        .returning();

      return NextResponse.json(cleaned[0], { headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(
      {
        ...template[0],
        fields: enrichedFields.fields,
        sourcePdfBase64: sanitizedPdf.base64,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error fetching report disseminator template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const id = Number.parseInt(resolvedParams.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid template id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(reportDisseminatorTemplates)
      .where(and(eq(reportDisseminatorTemplates.id, id), eq(reportDisseminatorTemplates.teamId, teamId)))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const current = existing[0];
    const intent = (body?.intent as string | undefined) || 'update';

    if (intent === 'save_as') {
      const nextName = parsed.data.name?.trim();
      if (!nextName) {
        return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
      }

      const nextStatus = parsed.data.status ?? current.status;

      const sameNameVersions = await db
        .select({
          version: reportDisseminatorTemplates.version,
        })
        .from(reportDisseminatorTemplates)
        .where(and(eq(reportDisseminatorTemplates.teamId, teamId), eq(reportDisseminatorTemplates.name, nextName)))
        .orderBy(desc(reportDisseminatorTemplates.version));

      const nextVersion = (sameNameVersions[0]?.version || 0) + 1;

      const created = await db
        .insert(reportDisseminatorTemplates)
        .values({
          teamId,
          createdBy: user.id,
          name: nextName,
          description: parsed.data.description !== undefined ? parsed.data.description || null : current.description,
          status: nextStatus,
          version: nextVersion,
          sourceFileName: current.sourceFileName,
          sourceMimeType: current.sourceMimeType,
          sourcePdfBase64: current.sourcePdfBase64,
          fields: parsed.data.fields ?? current.fields,
          wizardData: stripPreviewValuesFromWizardData((parsed.data.wizardData ?? current.wizardData) as Record<string, unknown> | null | undefined).wizardData,
          parentTemplateId: current.id,
          publishedAt: nextStatus === 'published' ? new Date() : null,
          archivedAt: nextStatus === 'archived' ? new Date() : null,
          storageProvider: current.storageProvider,
          storageKey: current.storageKey,
        })
        .returning();

      return NextResponse.json(created[0], { status: 201, headers: NO_STORE_HEADERS });
    }

    if (intent === 'clone') {
      const sameNameVersions = await db
        .select({
          version: reportDisseminatorTemplates.version,
        })
        .from(reportDisseminatorTemplates)
        .where(and(eq(reportDisseminatorTemplates.teamId, teamId), eq(reportDisseminatorTemplates.name, current.name)))
        .orderBy(desc(reportDisseminatorTemplates.version));

      const nextVersion = (sameNameVersions[0]?.version || current.version || 0) + 1;

      const cloned = await db
        .insert(reportDisseminatorTemplates)
        .values({
          teamId,
          createdBy: user.id,
          name: current.name,
          description: current.description,
          status: 'draft',
          version: nextVersion,
          sourceFileName: current.sourceFileName,
          sourceMimeType: current.sourceMimeType,
          sourcePdfBase64: current.sourcePdfBase64,
          fields: current.fields,
          wizardData: stripPreviewValuesFromWizardData(current.wizardData as Record<string, unknown> | null | undefined).wizardData,
          parentTemplateId: current.id,
          storageProvider: current.storageProvider,
          storageKey: current.storageKey,
        })
        .returning();

      await db
        .update(reportDisseminatorTemplates)
        .set({
          status: 'archived',
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(reportDisseminatorTemplates.id, current.id), eq(reportDisseminatorTemplates.teamId, teamId)));

      return NextResponse.json(cloned[0], { status: 201, headers: NO_STORE_HEADERS });
    }

    if (intent === 'archive') {
      if (current.status === 'published' || current.status === 'review' || current.status === 'draft') {
        const archived = await db
          .update(reportDisseminatorTemplates)
          .set({
            status: 'archived',
            archivedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(reportDisseminatorTemplates.id, id), eq(reportDisseminatorTemplates.teamId, teamId)))
          .returning();

        return NextResponse.json(archived[0], { headers: NO_STORE_HEADERS });
      }
    }

    if (current.status === 'archived') {
      return NextResponse.json(
        { error: 'Archived templates are read-only. Clone to create a new editable version.' },
        { status: 409 }
      );
    }

    if (current.status === 'published') {
      return NextResponse.json(
        { error: 'Published templates are immutable. Clone to create a new editable version.' },
        { status: 409 }
      );
    }

    const updates: Partial<typeof reportDisseminatorTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description || null;
    if (parsed.data.fields !== undefined) updates.fields = parsed.data.fields;
    if (parsed.data.wizardData !== undefined) {
      updates.wizardData = stripPreviewValuesFromWizardData(parsed.data.wizardData as Record<string, unknown> | null | undefined).wizardData as typeof reportDisseminatorTemplates.$inferInsert.wizardData;
    }

    if (parsed.data.status !== undefined) {
      const nextStatus = parsed.data.status;
      const allowedToPublish = current.status === 'draft' || current.status === 'review';
      if (nextStatus === 'published' && !allowedToPublish) {
        return NextResponse.json(
          { error: `Cannot publish template from status "${current.status}"` },
          { status: 400 }
        );
      }
      if (nextStatus === 'draft' && current.status === 'review') {
        updates.status = nextStatus;
      } else if (nextStatus === 'review' && current.status === 'draft') {
        updates.status = nextStatus;
      } else if (nextStatus === 'published' && allowedToPublish) {
        updates.status = 'published';
        updates.publishedAt = new Date();
      } else if (nextStatus === current.status) {
        updates.status = current.status;
      } else {
        return NextResponse.json(
          { error: `Invalid status transition from "${current.status}" to "${nextStatus}"` },
          { status: 400 }
        );
      }
    }

    if (parsed.data.fields !== undefined || parsed.data.wizardData !== undefined) {
      updates.version = current.version + 1;
    }

    const updated = await db
      .update(reportDisseminatorTemplates)
      .set(updates)
      .where(and(eq(reportDisseminatorTemplates.id, id), eq(reportDisseminatorTemplates.teamId, teamId)))
      .returning();

    return NextResponse.json(updated[0], { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error updating report disseminator template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

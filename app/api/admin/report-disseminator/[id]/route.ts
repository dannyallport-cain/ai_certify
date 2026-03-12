import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { reportDisseminatorTemplates } from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { reportDisseminatorUpdateSchema } from '@/lib/report-disseminator/schema';

const ALLOWED_ADMIN_ROLES = new Set(['supersystemAdmin', 'systemAdmin', 'owner']);

const resolveTeamId = async () => {
  const team = await getTeamForUser();
  if (team?.id) {
    return team.id;
  }
  return 1;
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

    if (!ALLOWED_ADMIN_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teamId = await resolveTeamId();

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

    return NextResponse.json(template[0]);
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

    if (!ALLOWED_ADMIN_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teamId = await resolveTeamId();

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
      .select({
        id: reportDisseminatorTemplates.id,
        version: reportDisseminatorTemplates.version,
      })
      .from(reportDisseminatorTemplates)
      .where(and(eq(reportDisseminatorTemplates.id, id), eq(reportDisseminatorTemplates.teamId, teamId)))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const updates: Partial<typeof reportDisseminatorTemplates.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description || null;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.fields !== undefined) updates.fields = parsed.data.fields;
    if (parsed.data.wizardData !== undefined) updates.wizardData = parsed.data.wizardData;

    if (parsed.data.fields !== undefined || parsed.data.wizardData !== undefined) {
      updates.version = existing[0].version + 1;
    }

    const updated = await db
      .update(reportDisseminatorTemplates)
      .set(updates)
      .where(and(eq(reportDisseminatorTemplates.id, id), eq(reportDisseminatorTemplates.teamId, teamId)))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating report disseminator template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reportDisseminatorReports } from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import {
  type ReportDisseminatorField,
  reportDisseminatorReportUpdateSchema,
} from '@/lib/report-disseminator/schema';

const ALLOWED_ADMIN_ROLES = new Set(['supersystemAdmin', 'systemAdmin', 'owner']);
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const resolveTeamId = async () => {
  const team = await getTeamForUser();
  if (team?.id) {
    return team.id;
  }
  return 1;
};

const normalizeValues = (fields: ReportDisseminatorField[], values: Record<string, string>) => {
  const nextValues: Record<string, string> = {};

  for (const field of fields) {
    nextValues[field.id] = typeof values[field.id] === 'string' ? values[field.id] : '';
  }

  return nextValues;
};

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
      return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
    }

    const report = await db
      .select()
      .from(reportDisseminatorReports)
      .where(and(eq(reportDisseminatorReports.id, id), eq(reportDisseminatorReports.teamId, teamId)))
      .limit(1);

    if (!report.length) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report[0], { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching report disseminator report:', error);
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
      return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = reportDisseminatorReportUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(reportDisseminatorReports)
      .where(and(eq(reportDisseminatorReports.id, id), eq(reportDisseminatorReports.teamId, teamId)))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const current = existing[0];
    const fields = (current.fields ?? []) as ReportDisseminatorField[];

    const updates: Partial<typeof reportDisseminatorReports.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) updates.description = parsed.data.description?.trim() || null;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes?.trim() || null;
    if (parsed.data.values !== undefined) updates.values = normalizeValues(fields, parsed.data.values);

    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status;

      if (parsed.data.status === 'draft') {
        updates.completedAt = null;
        updates.archivedAt = null;
      }

      if (parsed.data.status === 'completed') {
        updates.completedAt = current.completedAt ?? new Date();
        updates.archivedAt = null;
      }

      if (parsed.data.status === 'archived') {
        updates.archivedAt = current.archivedAt ?? new Date();
      }
    }

    const updated = await db
      .update(reportDisseminatorReports)
      .set(updates)
      .where(and(eq(reportDisseminatorReports.id, id), eq(reportDisseminatorReports.teamId, teamId)))
      .returning();

    return NextResponse.json(updated[0], { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error updating report disseminator report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

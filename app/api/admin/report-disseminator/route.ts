import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reportDisseminatorTemplates } from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';

const ALLOWED_ADMIN_ROLES = new Set(['supersystemAdmin', 'systemAdmin', 'owner']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const resolveTeamId = async () => {
  const team = await getTeamForUser();
  if (team?.id) {
    return team.id;
  }
  return 1;
};

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ALLOWED_ADMIN_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const teamId = await resolveTeamId();

    const templates = await db
      .select({
        id: reportDisseminatorTemplates.id,
        name: reportDisseminatorTemplates.name,
        description: reportDisseminatorTemplates.description,
        status: reportDisseminatorTemplates.status,
        version: reportDisseminatorTemplates.version,
        sourceFileName: reportDisseminatorTemplates.sourceFileName,
        sourceMimeType: reportDisseminatorTemplates.sourceMimeType,
        createdAt: reportDisseminatorTemplates.createdAt,
        updatedAt: reportDisseminatorTemplates.updatedAt,
      })
      .from(reportDisseminatorTemplates)
      .where(eq(reportDisseminatorTemplates.teamId, teamId))
      .orderBy(desc(reportDisseminatorTemplates.createdAt));

    return NextResponse.json(templates, { headers: NO_STORE_HEADERS });
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

    if (!ALLOWED_ADMIN_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const sourcePdfBase64 = Buffer.from(arrayBuffer).toString('base64');

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

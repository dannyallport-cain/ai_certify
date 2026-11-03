import { NextRequest, NextResponse } from 'next/server';

import { getTeamForUser, getUser } from '@/lib/db/queries';
import { sanitiseDesign } from '@/lib/design/sanitise';
import {
  deleteDesign,
  getDesign,
  publishDesign,
  saveDesign,
} from '@/lib/design/store';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function resolveTeam() {
  const user = await getUser();

  if (!user) {
    return { user: null, team: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const team = await getTeamForUser();

  if (!team) {
    return { user, team: null, response: NextResponse.json({ error: 'No team found' }, { status: 403 }) };
  }

  return { user, team, response: null };
}

function parseId(value: string): number | null {
  const id = Number.parseInt(value, 10);

  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { team, response } = await resolveTeam();

  if (!team) {
    return response;
  }

  const { id } = await context.params;
  const designId = parseId(id);

  if (!designId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const design = await getDesign(designId, team.id);

    if (!design) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ design });
  } catch (error) {
    console.error('Read design error:', error);
    return NextResponse.json({ error: 'Failed to load the design' }, { status: 500 });
  }
}

interface PatchBody {
  design?: unknown;
  publish?: unknown;
  editEnabled?: unknown;
}

/**
 * Saves the whole design document, or issues a share link when `publish` is set.
 *
 * The document is validated on the way in: the editor runs in the browser, so nothing about its
 * payload can be trusted, and a malformed save must not corrupt a stored building.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { team, response } = await resolveTeam();

  if (!team) {
    return response;
  }

  const { id } = await context.params;
  const designId = parseId(id);

  if (!designId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null;

  if (body === null) {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  try {
    if (body.publish === true) {
      const published = await publishDesign(designId, team.id, body.editEnabled === true);

      if (!published) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json({ published });
    }

    const design = sanitiseDesign(body.design);

    if (!design) {
      return NextResponse.json({ error: 'That design is not valid' }, { status: 400 });
    }

    const saved = await saveDesign(designId, team.id, design);

    if (!saved) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ design: saved });
  } catch (error) {
    console.error('Save design error:', error);
    return NextResponse.json({ error: 'Failed to save the design' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { team, response } = await resolveTeam();

  if (!team) {
    return response;
  }

  const { id } = await context.params;
  const designId = parseId(id);

  if (!designId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const deleted = await deleteDesign(designId, team.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Delete design error:', error);
    return NextResponse.json({ error: 'Failed to delete the design' }, { status: 500 });
  }
}

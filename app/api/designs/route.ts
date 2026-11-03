import { NextRequest, NextResponse } from 'next/server';

import { getTeamForUser, getUser } from '@/lib/db/queries';
import { createDesignFromCapture } from '@/lib/design/capture-import';
import { createEmptyDesign } from '@/lib/design/defaults';
import { sanitiseDesign } from '@/lib/design/sanitise';
import { createDesign, listDesigns } from '@/lib/design/store';
import type { FireAlarmScanSession } from '@/mobile/modules/fire-alarm-roomplan/types';

/**
 * Team-scoped design collection.
 *
 * A design can be created blank (the surveyor draws from scratch), from a stored design document
 * supplied by the client, or from a captured session, which is the route the mobile app uses when
 * a scan is opened for editing on the web.
 */

export async function GET() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const team = await getTeamForUser();

  if (!team) {
    return NextResponse.json({ error: 'No team found' }, { status: 403 });
  }

  try {
    const designs = await listDesigns(team.id);

    return NextResponse.json({ designs });
  } catch (error) {
    console.error('List designs error:', error);
    return NextResponse.json({ error: 'Failed to load designs' }, { status: 500 });
  }
}

interface CreateDesignBody {
  name?: unknown;
  design?: unknown;
  session?: unknown;
}

function asSession(value: unknown): FireAlarmScanSession | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as { id?: unknown; devices?: unknown };

  return typeof candidate.id === 'string' && Array.isArray(candidate.devices)
    ? (value as FireAlarmScanSession)
    : null;
}

export async function POST(request: NextRequest) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const team = await getTeamForUser();

  if (!team) {
    return NextResponse.json({ error: 'No team found' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as CreateDesignBody | null;

  if (body === null) {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  try {
    const session = asSession(body.session);
    const supplied = sanitiseDesign(body.design);

    let design = supplied;

    if (!design && session) {
      design = createDesignFromCapture(session, typeof body.name === 'string' ? body.name : undefined);
    }

    if (!design) {
      design = createEmptyDesign(typeof body.name === 'string' ? body.name : 'New design');
    }

    const created = await createDesign({
      teamId: team.id,
      userId: user.id,
      externalSessionId: session?.id ?? design.sourceSessionId,
      design,
    });

    return NextResponse.json({ design: created }, { status: 201 });
  } catch (error) {
    console.error('Create design error:', error);
    return NextResponse.json({ error: 'Failed to create the design' }, { status: 500 });
  }
}

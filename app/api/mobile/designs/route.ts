import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { fireAlarmRoomCaptures } from '@/lib/db/schema';
import { getMobileUser } from '@/lib/auth/mobile';
import { getReachableBaseUrl } from '@/lib/utils/reachable-base-url';
import { adoptCaptureZones, createDesignFromCapture } from '@/lib/design/capture-import';
import type { Plan3DZone } from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';
import { sanitiseDesign } from '@/lib/design/sanitise';
import {
  getDesign,
  publishDesign,
  upsertDesignFromCapture,
} from '@/lib/design/store';
import type { FireAlarmScanSession } from '@/mobile/modules/fire-alarm-roomplan/types';

/**
 * Publishes a captured session as an editable building design.
 *
 * This is the handover point between the two apps: RoomPlan captures the building on the phone,
 * the design is assembled from the captured storeys and saved here, and the response carries the
 * web editor link the surveyor opens to drag devices, draw external areas and label everything.
 *
 * A caller may also post a `design` document it has already edited on the device; it is validated
 * with the same sanitiser the web editor's save uses, so the two paths cannot diverge.
 */

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
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mobileUser.team) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          session?: unknown;
          design?: unknown;
          zones?: unknown;
          name?: unknown;
          editEnabled?: unknown;
        }
      | null;

    if (body === null) {
      return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 });
    }

    const session = asSession(body.session);

    if (!session) {
      return NextResponse.json({ error: 'A captured session is required' }, { status: 400 });
    }

    const supplied = sanitiseDesign(body.design);
    const captured =
      supplied ??
      createDesignFromCapture(session, typeof body.name === 'string' ? body.name : undefined);

    // Zones drawn on the phone replace the auto-generated room zones on the storeys they cover,
    // so a surveyor who marks out compartments before publishing does not lose that work.
    const design = adoptCaptureZones(
      captured,
      Array.isArray(body.zones) ? (body.zones as Plan3DZone[]) : null,
    );

    const [capture] = await db
      .select({ id: fireAlarmRoomCaptures.id })
      .from(fireAlarmRoomCaptures)
      .where(
        and(
          eq(fireAlarmRoomCaptures.teamId, mobileUser.team.id),
          eq(fireAlarmRoomCaptures.externalSessionId, session.id),
        ),
      )
      .limit(1);

    const saved = await upsertDesignFromCapture({
      teamId: mobileUser.team.id,
      userId: mobileUser.user.id,
      captureId: capture?.id ?? null,
      externalSessionId: session.id,
      design,
    });

    // A share token is only minted when the surveyor asked for a shared link; otherwise the
    // design stays private and the web editor can issue a link later.
    const published =
      body.editEnabled === true
        ? await publishDesign(saved.id, mobileUser.team.id, true)
        : null;

    const origin = getReachableBaseUrl(request);
    const editorPath = `/designs/${saved.id}`;
    const sharePath = published ? `/designs/share/${published.shareToken}` : null;

    return NextResponse.json(
      {
        design: {
          id: saved.id,
          name: saved.name,
          floorCount: saved.floorCount,
          deviceCount: saved.deviceCount,
          zoneCount: saved.zoneCount,
          editorPath,
          editorUrl: `${origin.replace(/\/+$/, '')}${editorPath}`,
          sharePath,
          shareUrl: sharePath ? `${origin.replace(/\/+$/, '')}${sharePath}` : null,
          updatedAt: saved.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Publish mobile design error:', error);
    return NextResponse.json({ error: 'Failed to publish the design' }, { status: 500 });
  }
}

/** Designs for the signed-in mobile user's team, so the phone can reopen one on the web. */
export async function GET(request: NextRequest) {
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser?.team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listDesigns } = await import('@/lib/design/store');
    const designs = await listDesigns(mobileUser.team.id);

    return NextResponse.json({ designs });
  } catch (error) {
    console.error('List mobile designs error:', error);
    return NextResponse.json({ error: 'Failed to load designs' }, { status: 500 });
  }
}

/** Single design, used when the phone wants to show what is currently published. */
export async function PUT(request: NextRequest) {
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser?.team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    const id = typeof body?.id === 'number' ? body.id : Number.parseInt(String(body?.id ?? ''), 10);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'A design id is required' }, { status: 400 });
    }

    const design = await getDesign(id, mobileUser.team.id);

    if (!design) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ design });
  } catch (error) {
    console.error('Read mobile design error:', error);
    return NextResponse.json({ error: 'Failed to load the design' }, { status: 500 });
  }
}

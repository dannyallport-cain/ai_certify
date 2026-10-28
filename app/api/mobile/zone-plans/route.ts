import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { fireAlarmRoomCaptures } from '@/lib/db/schema';
import { getMobileUser } from '@/lib/auth/mobile';
import { sendZonePlanEmail } from '@/lib/email/zone-plan-email';
import { getReachableBaseUrl } from '@/lib/utils/reachable-base-url';
import { normaliseEmailAddress, normaliseZonePlanPayload } from '@/lib/zone-plans/payload';
import { markZonePlanEmailed, publishZonePlan } from '@/lib/zone-plans/store';
import { buildZonePlanViewerPath, buildZonePlanViewerUrl } from '@/lib/zone-plans/tokens';

/**
 * Publishes a zone plan to the hosted viewer.
 *
 * The response always carries the viewer link, even when the email could not be sent: the surveyor
 * can then copy the link or share it another way, and the reason the email failed is returned so
 * the app can show it instead of failing the whole publish.
 */
export async function POST(request: NextRequest) {
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mobileUser.team) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const body: unknown = await request.json().catch(() => null);
    const { payload, error } = normaliseZonePlanPayload(body);

    if (!payload) {
      return NextResponse.json({ error: error ?? 'Invalid plan' }, { status: 400 });
    }

    const rawBody = body as { recipientEmail?: unknown; editEnabled?: unknown; captureId?: unknown };
    const recipientEmail = normaliseEmailAddress(rawBody.recipientEmail);
    const editEnabled = rawBody.editEnabled !== false;

    const [capture] = await db
      .select({ id: fireAlarmRoomCaptures.id })
      .from(fireAlarmRoomCaptures)
      .where(
        and(
          eq(fireAlarmRoomCaptures.teamId, mobileUser.team.id),
          eq(fireAlarmRoomCaptures.externalSessionId, payload.sessionId),
        ),
      )
      .limit(1);

    const plan = await publishZonePlan({
      teamId: mobileUser.team.id,
      userId: mobileUser.user.id,
      captureId: capture?.id ?? null,
      payload,
      editEnabled,
    });

    const origin = getReachableBaseUrl(request);
    const viewerUrl = buildZonePlanViewerUrl(origin, plan.shareToken);

    let emailResult: { sent: boolean; error: string | null } = { sent: false, error: null };

    if (recipientEmail) {
      const sent = await sendZonePlanEmail({
        recipientEmail,
        viewerUrl,
        planTitle: payload.legend.planTitle,
        siteName: payload.legend.siteName,
        jobReference: payload.legend.jobReference,
        zoneCount: payload.zones.length,
        deviceCount: plan.session ? countSessionDevices(plan.session) : 0,
        senderName: payload.legend.preparedBy,
        companyName: payload.legend.company.name || mobileUser.team.name || '',
        canEdit: plan.editEnabled,
      });

      emailResult = { sent: sent.sent, error: sent.error };

      if (sent.sent) {
        await markZonePlanEmailed(plan.id, recipientEmail);
      }
    }

    return NextResponse.json(
      {
        plan: {
          id: plan.id,
          token: plan.shareToken,
          viewerPath: buildZonePlanViewerPath(plan.shareToken),
          viewerUrl,
          updatedAt: plan.updatedAt.toISOString(),
          emailedTo: emailResult.sent ? recipientEmail : null,
          editEnabled: plan.editEnabled,
        },
        email: emailResult,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Publish zone plan error:', error);
    return NextResponse.json({ error: 'Failed to publish the zone plan' }, { status: 500 });
  }
}

/** Device count straight off the stored session, which the generator derives the plan from. */
function countSessionDevices(sessionValue: unknown): number {
  if (typeof sessionValue !== 'object' || sessionValue === null) {
    return 0;
  }

  const devices = (sessionValue as { devices?: unknown }).devices;

  return Array.isArray(devices) ? devices.length : 0;
}

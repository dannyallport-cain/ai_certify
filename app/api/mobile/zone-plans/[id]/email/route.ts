import { NextRequest, NextResponse } from 'next/server';

import { getMobileUser } from '@/lib/auth/mobile';
import { sendZonePlanEmail } from '@/lib/email/zone-plan-email';
import { getReachableBaseUrl } from '@/lib/utils/reachable-base-url';
import { normaliseEmailAddress } from '@/lib/zone-plans/payload';
import { getZonePlanForTeam, markZonePlanEmailed } from '@/lib/zone-plans/store';
import { buildZonePlanViewerUrl } from '@/lib/zone-plans/tokens';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Resends the hosted viewer link for a plan the team already published, so a second recipient can
 * be given access without republishing the plan and rotating nothing.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mobileUser.team) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const { id } = await context.params;
    const planId = Number.parseInt(id, 10);

    if (!Number.isInteger(planId) || planId <= 0) {
      return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });
    }

    const body: unknown = await request.json().catch(() => null);
    const email = normaliseEmailAddress((body as { email?: unknown } | null)?.email);

    if (!email) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const plan = await getZonePlanForTeam(planId, mobileUser.team.id);

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (plan.revokedAt) {
      return NextResponse.json({ error: 'This viewer link has been revoked' }, { status: 410 });
    }

    const legend = plan.legend as {
      planTitle?: string;
      siteName?: string;
      jobReference?: string;
      preparedBy?: string;
      company?: { name?: string };
    };
    const zones = Array.isArray(plan.zones) ? plan.zones : [];
    const session = plan.session as { devices?: unknown[] };
    const viewerUrl = buildZonePlanViewerUrl(getReachableBaseUrl(request), plan.shareToken);

    const result = await sendZonePlanEmail({
      recipientEmail: email,
      viewerUrl,
      planTitle: legend.planTitle ?? '',
      siteName: legend.siteName ?? '',
      jobReference: legend.jobReference ?? '',
      zoneCount: zones.length,
      deviceCount: Array.isArray(session?.devices) ? session.devices.length : 0,
      senderName: legend.preparedBy ?? '',
      companyName: legend.company?.name || mobileUser.team.name || '',
      canEdit: plan.editEnabled,
    });

    if (!result.sent) {
      return NextResponse.json(
        { error: result.error ?? 'Failed to send the viewer link' },
        { status: 502 },
      );
    }

    await markZonePlanEmailed(plan.id, email);

    return NextResponse.json({ emailedTo: email, viewerUrl });
  } catch (error) {
    console.error('Email zone plan error:', error);
    return NextResponse.json({ error: 'Failed to send the viewer link' }, { status: 500 });
  }
}

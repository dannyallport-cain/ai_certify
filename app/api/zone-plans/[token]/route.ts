import { NextRequest, NextResponse } from 'next/server';

import { normaliseZonePlanEdits } from '@/lib/zone-plans/payload';
import { getZonePlanByToken, updateZonePlanEdits } from '@/lib/zone-plans/store';
import { isZonePlanToken } from '@/lib/zone-plans/tokens';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * Public read of a published zone plan.
 *
 * The token is the credential, so the response contains exactly what the drawing needs and nothing
 * about the team, the customer or the capture record.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  if (!isZonePlanToken(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const plan = await getZonePlanByToken(token);

    if (!plan) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      token: plan.shareToken,
      title: plan.title,
      sessionId: plan.externalSessionId,
      session: plan.session,
      zones: plan.zones,
      legend: plan.legend,
      editEnabled: plan.editEnabled,
      updatedAt: plan.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Read zone plan error:', error);
    return NextResponse.json({ error: 'Failed to load the plan' }, { status: 500 });
  }
}

/**
 * Saves edits made in the hosted viewer. Only zones, the legend and the title can change, and only
 * while the link was published as editable — the session geometry is immutable here.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  if (!isZonePlanToken(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const plan = await getZonePlanByToken(token);

    if (!plan) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!plan.editEnabled) {
      return NextResponse.json(
        { error: 'This link is view only, so the plan cannot be saved' },
        { status: 403 },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const edits = normaliseZonePlanEdits(body);

    if (edits.error) {
      return NextResponse.json({ error: edits.error }, { status: 400 });
    }

    const updated = await updateZonePlanEdits(plan.id, {
      zones: edits.zones,
      legend: edits.legend,
      title: edits.title ?? plan.title,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to save the plan' }, { status: 500 });
    }

    return NextResponse.json({
      zones: updated.zones,
      legend: updated.legend,
      title: updated.title,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Save zone plan error:', error);
    return NextResponse.json({ error: 'Failed to save the plan' }, { status: 500 });
  }
}

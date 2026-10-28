import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { fireAlarmZonePlans, type FireAlarmZonePlan } from '@/lib/db/schema';
import type {
  Plan3DLegendConfig,
  Plan3DZone,
} from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';
import type { FireAlarmScanSession } from '@/mobile/modules/fire-alarm-roomplan/types';
import type { NormalisedZonePlanPayload } from './payload';
import { createZonePlanToken } from './tokens';

export interface PublishZonePlanOptions {
  teamId: number;
  userId: number | null;
  captureId: number | null;
  payload: NormalisedZonePlanPayload;
  editEnabled: boolean;
}

/**
 * Creates or refreshes the published plan for a captured session.
 *
 * One plan per session per team: republishing a session updates the existing row and keeps its
 * share token, so a link that has already been emailed keeps working after an edit.
 */
export async function publishZonePlan(
  options: PublishZonePlanOptions,
): Promise<FireAlarmZonePlan> {
  const { teamId, userId, captureId, payload, editEnabled } = options;

  const [existing] = await db
    .select()
    .from(fireAlarmZonePlans)
    .where(
      and(
        eq(fireAlarmZonePlans.teamId, teamId),
        eq(fireAlarmZonePlans.externalSessionId, payload.sessionId),
      ),
    )
    .limit(1);

  const values = {
    teamId,
    createdBy: userId,
    captureId,
    externalSessionId: payload.sessionId,
    title: payload.title,
    session: payload.session,
    zones: payload.zones,
    legend: payload.legend,
    editEnabled,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(fireAlarmZonePlans)
      .set(values)
      .where(eq(fireAlarmZonePlans.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(fireAlarmZonePlans)
    .values({ ...values, shareToken: createZonePlanToken() })
    .returning();

  return created;
}

/** Loads a published plan by its public token, ignoring revoked links. */
export async function getZonePlanByToken(token: string): Promise<FireAlarmZonePlan | null> {
  const [plan] = await db
    .select()
    .from(fireAlarmZonePlans)
    .where(and(eq(fireAlarmZonePlans.shareToken, token), isNull(fireAlarmZonePlans.revokedAt)))
    .limit(1);

  return plan ?? null;
}

/** Team-scoped lookup used by the mobile resend-email endpoint. */
export async function getZonePlanForTeam(
  id: number,
  teamId: number,
): Promise<FireAlarmZonePlan | null> {
  const [plan] = await db
    .select()
    .from(fireAlarmZonePlans)
    .where(and(eq(fireAlarmZonePlans.id, id), eq(fireAlarmZonePlans.teamId, teamId)))
    .limit(1);

  return plan ?? null;
}

export async function updateZonePlanEdits(
  id: number,
  edits: { zones: Plan3DZone[]; legend: Plan3DLegendConfig; title: string | null },
): Promise<FireAlarmZonePlan | null> {
  const [updated] = await db
    .update(fireAlarmZonePlans)
    .set({
      zones: edits.zones,
      legend: edits.legend,
      title: edits.title,
      updatedAt: new Date(),
    })
    .where(eq(fireAlarmZonePlans.id, id))
    .returning();

  return updated ?? null;
}

export async function markZonePlanEmailed(id: number, email: string): Promise<void> {
  await db
    .update(fireAlarmZonePlans)
    .set({ emailedTo: email, emailedAt: new Date() })
    .where(eq(fireAlarmZonePlans.id, id));
}

/**
 * Records a viewer open. Failures are swallowed on purpose: a plan that cannot record a view must
 * still render, so tracking never breaks the page.
 */
export async function recordZonePlanView(id: number): Promise<void> {
  try {
    await db
      .update(fireAlarmZonePlans)
      .set({ lastViewedAt: new Date() })
      .where(eq(fireAlarmZonePlans.id, id));
  } catch {
    // View tracking is best effort.
  }
}

/** Session payload stored with the plan, as the generator expects it. */
export function readPlanSession(plan: FireAlarmZonePlan): FireAlarmScanSession {
  return plan.session as FireAlarmScanSession;
}

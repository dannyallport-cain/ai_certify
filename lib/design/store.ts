import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

import { db } from '@/lib/db/drizzle';
import {
  fireAlarmBuildingDesigns,
  type FireAlarmBuildingDesign,
} from '@/lib/db/schema';

import { sanitiseDesign } from './sanitise';
import type { BuildingDesign } from './types';

/**
 * Server-side persistence for building designs.
 *
 * The whole design document is stored as one JSON column: the editor saves atomically, a design
 * can never be half-written, and reading it back needs a single row. The denormalised counts are
 * maintained here so the designs list does not have to deserialize every plan it renders.
 */

const TOKEN_BYTES = 24;
const MIN_TOKEN_LENGTH = 16;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface DesignSummary {
  id: number;
  name: string;
  siteName: string | null;
  floorCount: number;
  deviceCount: number;
  zoneCount: number;
  status: string;
  shareToken: string | null;
  updatedAt: string;
}

export interface DesignWithDocument extends DesignSummary {
  design: BuildingDesign;
  editEnabled: boolean;
}

function createShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function isDesignShareToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= MIN_TOKEN_LENGTH &&
    value.length <= 64 &&
    TOKEN_PATTERN.test(value)
  );
}

function summarise(row: FireAlarmBuildingDesign): DesignSummary {
  return {
    id: row.id,
    name: row.name,
    siteName: row.siteName,
    floorCount: row.floorCount,
    deviceCount: row.deviceCount,
    zoneCount: row.zoneCount,
    status: row.status,
    shareToken: row.shareToken,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Counts written alongside the document so list queries never parse the JSON. */
function countsOf(design: BuildingDesign): {
  floorCount: number;
  deviceCount: number;
  zoneCount: number;
} {
  return {
    floorCount: design.floors.length,
    deviceCount: design.devices.length,
    zoneCount: design.zones.length,
  };
}

export async function listDesigns(teamId: number): Promise<DesignSummary[]> {
  const rows = await db
    .select()
    .from(fireAlarmBuildingDesigns)
    .where(and(eq(fireAlarmBuildingDesigns.teamId, teamId), isNull(fireAlarmBuildingDesigns.revokedAt)))
    .orderBy(desc(fireAlarmBuildingDesigns.updatedAt));

  return rows.map(summarise);
}

export async function getDesign(id: number, teamId: number): Promise<DesignWithDocument | null> {
  const [row] = await db
    .select()
    .from(fireAlarmBuildingDesigns)
    .where(and(eq(fireAlarmBuildingDesigns.id, id), eq(fireAlarmBuildingDesigns.teamId, teamId)))
    .limit(1);

  if (!row) {
    return null;
  }

  const design = sanitiseDesign(row.design);

  if (!design) {
    return null;
  }

  return {
    ...summarise(row),
    design: { ...design, id: String(row.id), name: row.name },
    editEnabled: row.editEnabled,
  };
}

/** Public read for a shared design link. The token is the only credential. */
export async function getDesignByToken(token: string): Promise<DesignWithDocument | null> {
  if (!isDesignShareToken(token)) {
    return null;
  }

  const [row] = await db
    .select()
    .from(fireAlarmBuildingDesigns)
    .where(
      and(
        eq(fireAlarmBuildingDesigns.shareToken, token),
        isNull(fireAlarmBuildingDesigns.revokedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const design = sanitiseDesign(row.design);

  if (!design) {
    return null;
  }

  return {
    ...summarise(row),
    design: { ...design, id: String(row.id), name: row.name },
    editEnabled: row.editEnabled,
  };
}

export interface CreateDesignOptions {
  teamId: number;
  userId: number | null;
  captureId?: number | null;
  externalSessionId?: string | null;
  design: BuildingDesign;
}

export async function createDesign(options: CreateDesignOptions): Promise<DesignSummary> {
  const { teamId, userId, captureId, externalSessionId, design } = options;

  const [row] = await db
    .insert(fireAlarmBuildingDesigns)
    .values({
      teamId,
      createdBy: userId,
      captureId: captureId ?? null,
      externalSessionId: externalSessionId ?? design.sourceSessionId ?? null,
      name: design.name,
      siteName: design.sheet.siteName || null,
      design,
      ...countsOf(design),
      status: 'draft',
      updatedAt: new Date(),
    })
    .returning();

  return summarise(row);
}

export async function saveDesign(
  id: number,
  teamId: number,
  design: BuildingDesign,
): Promise<DesignSummary | null> {
  const [row] = await db
    .update(fireAlarmBuildingDesigns)
    .set({
      name: design.name,
      siteName: design.sheet.siteName || null,
      design,
      ...countsOf(design),
      updatedAt: new Date(),
    })
    .where(and(eq(fireAlarmBuildingDesigns.id, id), eq(fireAlarmBuildingDesigns.teamId, teamId)))
    .returning();

  return row ? summarise(row) : null;
}

export async function deleteDesign(id: number, teamId: number): Promise<boolean> {
  const [row] = await db
    .delete(fireAlarmBuildingDesigns)
    .where(and(eq(fireAlarmBuildingDesigns.id, id), eq(fireAlarmBuildingDesigns.teamId, teamId)))
    .returning({ id: fireAlarmBuildingDesigns.id });

  return Boolean(row);
}

/**
 * Issues (or reuses) the public share token for a design. Reusing the token means a link already
 * sent to a client keeps working after the plan is edited.
 */
export async function publishDesign(
  id: number,
  teamId: number,
  editEnabled: boolean,
): Promise<{ shareToken: string; editEnabled: boolean } | null> {
  const [existing] = await db
    .select({ shareToken: fireAlarmBuildingDesigns.shareToken })
    .from(fireAlarmBuildingDesigns)
    .where(and(eq(fireAlarmBuildingDesigns.id, id), eq(fireAlarmBuildingDesigns.teamId, teamId)))
    .limit(1);

  if (!existing) {
    return null;
  }

  const shareToken = existing.shareToken ?? createShareToken();

  const [row] = await db
    .update(fireAlarmBuildingDesigns)
    .set({
      shareToken,
      editEnabled,
      status: 'issued',
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(fireAlarmBuildingDesigns.id, id), eq(fireAlarmBuildingDesigns.teamId, teamId)))
    .returning({
      shareToken: fireAlarmBuildingDesigns.shareToken,
      editEnabled: fireAlarmBuildingDesigns.editEnabled,
    });

  return row?.shareToken ? { shareToken: row.shareToken, editEnabled: row.editEnabled } : null;
}

/**
 * Creates or refreshes the design for a captured session.
 *
 * One design per session per team: re-publishing a scan updates the existing plan rather than
 * spawning a duplicate, which is what lets a surveyor scan, design on the web, then re-scan one
 * storey and publish again.
 */
export async function upsertDesignFromCapture(options: {
  teamId: number;
  userId: number | null;
  captureId: number | null;
  externalSessionId: string;
  design: BuildingDesign;
}): Promise<DesignSummary> {
  const { teamId, userId, captureId, externalSessionId, design } = options;

  const [existing] = await db
    .select({ id: fireAlarmBuildingDesigns.id })
    .from(fireAlarmBuildingDesigns)
    .where(
      and(
        eq(fireAlarmBuildingDesigns.teamId, teamId),
        eq(fireAlarmBuildingDesigns.externalSessionId, externalSessionId),
        isNull(fireAlarmBuildingDesigns.revokedAt),
      ),
    )
    .limit(1);

  if (existing) {
    const saved = await saveDesign(existing.id, teamId, design);

    if (saved) {
      return saved;
    }
  }

  return createDesign({
    teamId,
    userId,
    captureId,
    externalSessionId,
    design,
  });
}

/** Records a shared-view open. Tracking failures must never break the page. */
export async function recordDesignView(id: number): Promise<void> {
  try {
    await db
      .update(fireAlarmBuildingDesigns)
      .set({ lastViewedAt: new Date() })
      .where(eq(fireAlarmBuildingDesigns.id, id));
  } catch {
    // Best effort only.
  }
}

import type { FireAlarmScanSession } from '@/mobile/modules/fire-alarm-roomplan/types';
import type {
  Plan3DLegendConfig,
  Plan3DZone,
} from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';
import { sanitiseZones } from '@/mobile/modules/fire-alarm-roomplan/plan3d/zone-model';
import { normaliseLegendConfig } from '@/mobile/modules/fire-alarm-roomplan/plan3d/legend-config';

/** A session with a large frame payload is not something the viewer can draw; reject it early. */
const MAX_SESSION_BYTES = 4_000_000;
const MAX_ZONES = 200;
const MAX_ZONE_VERTICES = 400;
const MAX_TITLE_LENGTH = 255;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface NormalisedZonePlanPayload {
  session: FireAlarmScanSession;
  sessionId: string;
  zones: Plan3DZone[];
  legend: Plan3DLegendConfig;
  title: string | null;
}

function normaliseSession(value: unknown): FireAlarmScanSession | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    return null;
  }

  if (typeof value.status !== 'string' || !isRecord(value.metadata)) {
    return null;
  }

  if (!Array.isArray(value.devices)) {
    return null;
  }

  // The devices and floorplan are consumed by the generator, which tolerates missing fields, so
  // only the shape the generator relies on is enforced here.
  return value as unknown as FireAlarmScanSession;
}

function normaliseTitle(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, MAX_TITLE_LENGTH) : null;
}

function isZonesWithinLimits(zones: Plan3DZone[]): boolean {
  if (zones.length > MAX_ZONES) {
    return false;
  }

  return zones.every((zone) => zone.polygon.length <= MAX_ZONE_VERTICES);
}

/**
 * Validates and normalises everything a published plan carries.
 *
 * Both the mobile app and the public viewer post here, so nothing is trusted: the session shape
 * is checked, oversized payloads are refused and the zones and legend are rebuilt from scratch by
 * the same normalisers the drawing uses.
 */
export function normaliseZonePlanPayload(body: unknown): {
  payload: NormalisedZonePlanPayload | null;
  error: string | null;
} {
  if (!isRecord(body)) {
    return { payload: null, error: 'Expected a JSON body' };
  }

  const session = normaliseSession(body.session);

  if (!session) {
    return { payload: null, error: 'A captured session is required' };
  }

  const sessionBytes = Buffer.byteLength(JSON.stringify(body.session), 'utf8');

  if (sessionBytes > MAX_SESSION_BYTES) {
    return { payload: null, error: 'That session is too large to publish' };
  }

  const zones = sanitiseZones(body.zones as Plan3DZone[] | undefined);

  if (!isZonesWithinLimits(zones)) {
    return { payload: null, error: 'Too many zones or zone vertices' };
  }

  return {
    payload: {
      session,
      sessionId: session.id,
      zones,
      legend: normaliseLegendConfig(body.legend),
      title: normaliseTitle(body.title),
    },
    error: null,
  };
}

/** Zones and legend only, used by the viewer's own save endpoint. */
export function normaliseZonePlanEdits(body: unknown): {
  zones: Plan3DZone[];
  legend: Plan3DLegendConfig;
  title: string | null;
  error: string | null;
} {
  if (!isRecord(body)) {
    return {
      zones: [],
      legend: normaliseLegendConfig(null),
      title: null,
      error: 'Expected a JSON body',
    };
  }

  const zones = sanitiseZones(body.zones as Plan3DZone[] | undefined);

  if (!isZonesWithinLimits(zones)) {
    return {
      zones: [],
      legend: normaliseLegendConfig(body.legend),
      title: null,
      error: 'Too many zones or zone vertices',
    };
  }

  return {
    zones,
    legend: normaliseLegendConfig(body.legend),
    title: normaliseTitle(body.title),
    error: null,
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normaliseEmailAddress(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();

  return EMAIL_PATTERN.test(trimmed) && trimmed.length <= 320 ? trimmed : null;
}

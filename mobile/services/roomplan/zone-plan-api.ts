import type { FireAlarmScanSession } from '../../modules/fire-alarm-roomplan/types';
import type {
  Plan3DLegendConfig as LegendConfig,
  Plan3DZone as Zone,
} from '../../modules/fire-alarm-roomplan/plan3d/plan3d-types';
import { getApiBaseUrl, getToken } from '../api';

export interface PublishZonePlanInput {
  session: FireAlarmScanSession;
  zones: Zone[];
  legend: LegendConfig;
  recipientEmail?: string | null;
  editEnabled?: boolean;
}

export interface PublishedZonePlan {
  id: number;
  token: string;
  viewerPath: string;
  viewerUrl: string;
  updatedAt: string;
  emailedTo: string | null;
  editEnabled: boolean;
}

/** Thrown for any non-2xx response, carrying the server's message when it sent one. */
export class ZonePlanApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ZonePlanApiError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePublishedPlan(value: unknown): PublishedZonePlan {
  if (!isRecord(value) || typeof value.token !== 'string') {
    throw new ZonePlanApiError('The server did not return a viewer link', 500);
  }

  return {
    id: typeof value.id === 'number' ? value.id : 0,
    token: value.token,
    viewerPath: typeof value.viewerPath === 'string' ? value.viewerPath : `/plan/${value.token}`,
    viewerUrl: typeof value.viewerUrl === 'string' ? value.viewerUrl : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    emailedTo: typeof value.emailedTo === 'string' && value.emailedTo ? value.emailedTo : null,
    editEnabled: value.editEnabled !== false,
  };
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);

  if (isRecord(body) && typeof body.error === 'string' && body.error.trim()) {
    return body.error;
  }

  return fallback;
}

/**
 * Publishes a zone plan to the hosted viewer and returns its share link.
 *
 * The whole session travels with the request: the viewer re-generates the plan from the same
 * generator the app uses, so what a client opens in the browser is the drawing the surveyor saw.
 */
export async function publishZonePlan(input: PublishZonePlanInput): Promise<PublishedZonePlan> {
  const token = await getToken();
  const response = await fetch(`${getApiBaseUrl()}/api/mobile/zone-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      session: input.session,
      zones: input.zones,
      legend: input.legend,
      recipientEmail: input.recipientEmail ?? null,
      editEnabled: input.editEnabled !== false,
    }),
  });

  if (!response.ok) {
    throw new ZonePlanApiError(
      await readErrorMessage(response, 'Unable to create the hosted viewer link'),
      response.status,
    );
  }

  const body: unknown = await response.json();

  return parsePublishedPlan(isRecord(body) ? body.plan : null);
}

/** Resends the viewer link to an address for an already published plan. */
export async function emailZonePlanLink(planId: number, email: string): Promise<void> {
  const token = await getToken();
  const response = await fetch(`${getApiBaseUrl()}/api/mobile/zone-plans/${planId}/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new ZonePlanApiError(
      await readErrorMessage(response, 'Unable to send the viewer link'),
      response.status,
    );
  }
}

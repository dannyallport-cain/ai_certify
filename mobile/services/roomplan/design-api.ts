import { getApiBaseUrl, getToken } from '../api';
import { buildPublishDesignBody, type PublishDesignInput } from './design-payload';

export type { PublishDesignInput } from './design-payload';

/**
 * Hands a captured session to the web design studio.
 *
 * This is the bridge the task asked for: a building is scanned with RoomPlan on the phone, the
 * session is posted here, the server assembles the multi-floor design from the captured storeys,
 * and the response carries the editor URL the surveyor opens on the web app to drag detectors
 * onto the plan, draw external areas and label every device.
 */

export interface PublishedDesign {
  id: number;
  name: string;
  floorCount: number;
  deviceCount: number;
  zoneCount: number;
  editorPath: string;
  editorUrl: string;
  sharePath: string | null;
  shareUrl: string | null;
  updatedAt: string;
}

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

/** Thrown for any non-2xx response, carrying the server's message when it sent one. */
export class DesignApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DesignApiError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parsePublishedDesign(value: unknown): PublishedDesign {
  if (!isRecord(value) || typeof value.id !== 'number') {
    throw new DesignApiError('The server did not return a design link', 500);
  }

  const editorPath = readString(value.editorPath, `/designs/${value.id}`);
  const sharePath = typeof value.sharePath === 'string' && value.sharePath ? value.sharePath : null;

  return {
    id: value.id,
    name: readString(value.name, 'Building design'),
    floorCount: readNumber(value.floorCount),
    deviceCount: readNumber(value.deviceCount),
    zoneCount: readNumber(value.zoneCount),
    editorPath,
    editorUrl: readString(value.editorUrl),
    sharePath,
    shareUrl: sharePath ? readString(value.shareUrl) : null,
    updatedAt: readString(value.updatedAt, new Date().toISOString()),
  };
}

function parseDesignSummary(value: unknown): DesignSummary | null {
  if (!isRecord(value) || typeof value.id !== 'number') {
    return null;
  }

  return {
    id: value.id,
    name: readString(value.name, 'Building design'),
    siteName: typeof value.siteName === 'string' && value.siteName ? value.siteName : null,
    floorCount: readNumber(value.floorCount),
    deviceCount: readNumber(value.deviceCount),
    zoneCount: readNumber(value.zoneCount),
    status: readString(value.status, 'draft'),
    shareToken: typeof value.shareToken === 'string' && value.shareToken ? value.shareToken : null,
    updatedAt: readString(value.updatedAt, new Date().toISOString()),
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
 * Publishes a captured session as an editable design and returns the web editor link.
 *
 * Republishing the same session updates the existing design rather than creating a second one, so
 * re-scanning a single storey and publishing again refines the plan instead of duplicating it.
 */
export async function publishDesign(input: PublishDesignInput): Promise<PublishedDesign> {
  const token = await getToken();
  const response = await fetch(`${getApiBaseUrl()}/api/mobile/designs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(buildPublishDesignBody(input)),
  });

  if (!response.ok) {
    throw new DesignApiError(
      await readErrorMessage(response, 'Unable to send the design to the web app'),
      response.status,
    );
  }

  const body: unknown = await response.json();

  return parsePublishedDesign(isRecord(body) ? body.design : null);
}

/** Designs already published for this team, so the phone can reopen one on the web. */
export async function listPublishedDesigns(): Promise<DesignSummary[]> {
  const token = await getToken();
  const response = await fetch(`${getApiBaseUrl()}/api/mobile/designs`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new DesignApiError(
      await readErrorMessage(response, 'Unable to load the published designs'),
      response.status,
    );
  }

  const body: unknown = await response.json();
  const designs = isRecord(body) && Array.isArray(body.designs) ? body.designs : [];

  return designs
    .map(parseDesignSummary)
    .filter((design): design is DesignSummary => design !== null);
}

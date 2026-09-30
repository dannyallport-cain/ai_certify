/**
 * ServiceM8 REST API client.
 *
 * Corrections applied here versus the previous implementation:
 *
 * 1. CURSOR PAGINATION. ServiceM8 returns at most 1,000 records per request and
 *    signals more with an `x-next-cursor` response header (see
 *    https://developer.servicem8.com/docs/pagination). Every list method now
 *    follows that cursor to completion instead of silently returning page one.
 *
 * 2. CORRECT ATTACHMENT ENDPOINT. Attachments live on `/attachment.json` and are
 *    scoped by `related_object` / `related_object_uuid`. There is no
 *    `/jobattachment.json` endpoint - the previous client called one and got a
 *    404 for every attachment, which is why job and client images never loaded.
 *
 * 3. RATE LIMIT AWARENESS. The account is limited to 180 requests/minute and
 *    20,000/day; exceeding it returns HTTP 429. A process-wide limiter paces
 *    requests and 429/5xx responses are retried with backoff.
 *
 * 4. NO N+1 CONTACT FETCHES. Callers should use `lib/servicem8/directory.ts`,
 *    which downloads every company, contact and attachment in three paginated
 *    sweeps rather than one request per client.
 */

import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { servicem8Connections } from '@/lib/db/schema';

import { SERVICEM8_CONFIG } from './config';
import { getServiceM8FileExtension } from './normalize';
import type {
  ServiceM8Attachment,
  ServiceM8Company,
  ServiceM8CompanyContact,
  ServiceM8CompanyInfo,
  ServiceM8Job,
  ServiceM8JobCategory,
  ServiceM8JobMaterial,
  ServiceM8Page,
  ServiceM8Staff,
} from './types';

export type {
  ServiceM8Attachment,
  ServiceM8AttachmentRecord,
  ServiceM8Address,
  ServiceM8ClientRecord,
  ServiceM8Company,
  ServiceM8CompanyContact,
  ServiceM8ContactRecord,
  ServiceM8Job,
  ServiceM8JobCategory,
  ServiceM8JobMaterial,
  ServiceM8JobRecord,
  ServiceM8Page,
  ServiceM8Staff,
} from './types';

/** Backwards-compatible alias: attachments come from `/attachment.json`. */
export type ServiceM8JobAttachment = ServiceM8Attachment;
/** Backwards-compatible alias for the raw Company ("Client") record. */
export type ServiceM8Client = ServiceM8Company;

export interface ServiceM8TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
}

export interface ServiceM8AttachmentDownloadInfo {
  url: string | null;
  mimeType: string | null;
  contentLength: number | null;
  fileName: string | null;
}

export interface ServiceM8JobPageOptions {
  cursor?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

interface ServiceM8RequestOptions {
  /** OData-style `$filter` expression, unencoded. */
  filter?: string | null;
  query?: Record<string, string | number | boolean | null | undefined>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip the automatic 401 refresh retry (used by the refresh call itself). */
  skipAuthRetry?: boolean;
  accept?: string;
}

/** ServiceM8 throttles at 180 requests per minute per add-on per account. */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 170;

/** The API returns at most 1,000 records per page. */
export const SERVICEM8_PAGE_SIZE = 1000;

/** Safety valve so a cursor bug cannot spin forever. */
const MAX_PAGES_PER_SWEEP = 200;

const MAX_RETRY_ATTEMPTS = 4;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 15_000;

const REQUEST_TIMEOUT_MS = 30_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Process-wide sliding-window limiter. Next.js may run several workers, so this
 * is best-effort pacing on top of the retry logic rather than a hard guarantee.
 */
class ServiceM8RateLimiter {
  private timestamps: number[] = [];
  private queue: Promise<void> = Promise.resolve();

  acquire(): Promise<void> {
    this.queue = this.queue.then(() => this.waitForSlot());
    return this.queue;
  }

  private async waitForSlot(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter(
        (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
      );

      if (this.timestamps.length < RATE_LIMIT_MAX_REQUESTS) {
        this.timestamps.push(now);
        return;
      }

      const oldest = this.timestamps[0] ?? now;
      const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldest) + 50;
      await delay(Math.max(waitMs, 50));
    }
  }
}

const rateLimiter = new ServiceM8RateLimiter();

function buildQueryString(
  query?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export class ServiceM8ApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly body: string | null;

  constructor(message: string, status: number, endpoint: string, body: string | null) {
    super(message);
    this.name = 'ServiceM8ApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }

  /** True when the failure is a missing OAuth scope rather than bad data. */
  get isPermissionError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export class ServiceM8Client_API {
  private accessToken: string;
  private refreshToken: string;
  private readonly teamId: number;
  private readonly connectionUserId: number;

  constructor(accessToken: string, refreshToken: string, teamId: number, connectionUserId: number) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.teamId = teamId;
    this.connectionUserId = connectionUserId;
  }

  get team(): number {
    return this.teamId;
  }

  get connectedUserId(): number {
    return this.connectionUserId;
  }

  static buildAuthorizationUrl(options: { state?: string; popup?: boolean } = {}): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SERVICEM8_CONFIG.appId,
      redirect_uri: SERVICEM8_CONFIG.callbackUrl,
      scope: SERVICEM8_CONFIG.scopes.join(' '),
    });

    if (options.state) {
      params.set('state', options.state);
    }

    if (options.popup) {
      params.set('popup', '1');
    }

    return `${SERVICEM8_CONFIG.authorizationUrl}?${params.toString()}`;
  }

  private static async fromConnectionRow(
    row: typeof servicem8Connections.$inferSelect,
  ): Promise<ServiceM8Client_API | null> {
    if (!row.accessToken || !row.refreshToken) {
      return null;
    }

    if (row.userId == null || row.teamId == null) {
      return null;
    }

    const client = new ServiceM8Client_API(
      row.accessToken,
      row.refreshToken,
      row.teamId,
      row.userId,
    );

    // Renew proactively so the first real call does not pay the 401 round trip.
    if (row.tokenExpiresAt && row.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      await client.refreshAccessToken().catch(() => false);
    }

    return client;
  }

  static async fromUserId(userId: number): Promise<ServiceM8Client_API | null> {
    const rows = await db
      .select()
      .from(servicem8Connections)
      .where(
        and(eq(servicem8Connections.userId, userId), eq(servicem8Connections.isActive, true)),
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return ServiceM8Client_API.fromConnectionRow(rows[0]);
  }

  static async fromTeamId(teamId: number): Promise<ServiceM8Client_API | null> {
    const rows = await db
      .select()
      .from(servicem8Connections)
      .where(
        and(eq(servicem8Connections.teamId, teamId), eq(servicem8Connections.isActive, true)),
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return ServiceM8Client_API.fromConnectionRow(rows[0]);
  }

  static async exchangeCode(code: string): Promise<ServiceM8TokenResponse> {
    const response = await fetch(SERVICEM8_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SERVICEM8_CONFIG.appId,
        client_secret: SERVICEM8_CONFIG.appSecret,
        code,
        redirect_uri: SERVICEM8_CONFIG.callbackUrl,
      }).toString(),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ServiceM8ApiError(
        `ServiceM8 token exchange failed (${response.status})`,
        response.status,
        'oauth/access_token',
        body,
      );
    }

    return (await response.json()) as ServiceM8TokenResponse;
  }

  /**
   * Exchanges the refresh token for a new access token and persists both.
   * Returns false when the connection can no longer be refreshed.
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    let response: Response;

    try {
      response = await fetch(SERVICEM8_CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: SERVICEM8_CONFIG.appId,
          client_secret: SERVICEM8_CONFIG.appSecret,
          refresh_token: this.refreshToken,
        }).toString(),
      });
    } catch (error) {
      console.error('ServiceM8 token refresh request failed', error);
      return false;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`ServiceM8 token refresh failed (${response.status}): ${body}`);
      return false;
    }

    const tokenData = (await response.json()) as ServiceM8TokenResponse;

    if (!tokenData.access_token) {
      console.error('ServiceM8 token refresh returned no access token');
      return false;
    }

    this.accessToken = tokenData.access_token;
    // ServiceM8 rotates refresh tokens; always persist the new one when present.
    this.refreshToken = tokenData.refresh_token || this.refreshToken;

    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000);

    try {
      await db
        .update(servicem8Connections)
        .set({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(servicem8Connections.userId, this.connectionUserId),
            eq(servicem8Connections.teamId, this.teamId),
          ),
        );
    } catch (error) {
      console.error('Failed to persist refreshed ServiceM8 tokens', error);
    }

    return true;
  }

  private buildUrl(endpoint: string, options: Pick<ServiceM8RequestOptions, 'filter' | 'query'>) {
    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const query: Record<string, string | number | boolean | null | undefined> = {
      ...(options.query ?? {}),
    };

    if (options.filter) {
      query.$filter = options.filter;
    }

    return `${SERVICEM8_CONFIG.apiBaseUrl}${normalized}${buildQueryString(query)}`;
  }

  private static parseRetryAfter(response: Response, attempt: number): number {
    const header = response.headers.get('retry-after');
    if (header) {
      const seconds = Number(header);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
      }
    }

    const backoff = INITIAL_RETRY_DELAY_MS * 2 ** attempt;
    return Math.min(backoff, MAX_RETRY_DELAY_MS);
  }

  /**
   * Performs a single API request with rate-limit pacing, 429/5xx retries and a
   * one-shot refresh-and-retry on 401.
   */
  private async request<T>(
    endpoint: string,
    options: ServiceM8RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options);
    const method = options.method ?? 'GET';

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
      await rateLimiter.acquire();

      let response: Response;

      try {
        response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: options.accept ?? 'application/json',
            ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers ?? {}),
          },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        if (attempt === MAX_RETRY_ATTEMPTS - 1) {
          throw new ServiceM8ApiError(
            `ServiceM8 request to ${endpoint} failed: ${
              error instanceof Error ? error.message : 'network error'
            }`,
            0,
            endpoint,
            null,
          );
        }

        await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }

      if (response.status === 401 && !options.skipAuthRetry) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          continue;
        }
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          await delay(ServiceM8Client_API.parseRetryAfter(response, attempt));
          continue;
        }
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ServiceM8ApiError(
          ServiceM8Client_API.describeFailure(response.status, method, endpoint, body),
          response.status,
          endpoint,
          body,
        );
      }

      const text = await response.text();

      if (!text) {
        return null as T;
      }

      return JSON.parse(text) as T;
    }

    throw new ServiceM8ApiError(
      `ServiceM8 request to ${endpoint} exhausted its retries`,
      0,
      endpoint,
      null,
    );
  }

  private static describeFailure(
    status: number,
    method: string,
    endpoint: string,
    body: string,
  ): string {
    if (status === 403 || (status === 401 && body.includes('scope'))) {
      return `ServiceM8 denied ${method} ${endpoint} - the connection is missing a required OAuth scope. Reconnect ServiceM8 to grant access.`;
    }

    if (status === 404) {
      return `ServiceM8 endpoint ${endpoint} was not found.`;
    }

    if (status === 429) {
      return 'ServiceM8 rate limit exceeded. Try again shortly.';
    }

    return `ServiceM8 ${method} ${endpoint} failed with status ${status}${
      body ? `: ${body.slice(0, 300)}` : ''
    }`;
  }

  // ─── Paginated reads ──────────────────────────────────────────────────────

  /**
   * Fetches a single page of a list endpoint and reports the cursor for the
   * next page (`x-next-cursor`). A `null` cursor means this was the last page.
   */
  private async requestPage<T>(
    endpoint: string,
    options: ServiceM8RequestOptions = {},
  ): Promise<ServiceM8Page<T>> {
    const url = this.buildUrl(endpoint, options);

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
      await rateLimiter.acquire();

      let response: Response;

      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: 'application/json',
            ...(options.headers ?? {}),
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        if (attempt === MAX_RETRY_ATTEMPTS - 1) {
          throw new ServiceM8ApiError(
            `ServiceM8 request to ${endpoint} failed: ${
              error instanceof Error ? error.message : 'network error'
            }`,
            0,
            endpoint,
            null,
          );
        }

        await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }

      if (response.status === 401 && !options.skipAuthRetry) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          continue;
        }
      }

      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < MAX_RETRY_ATTEMPTS - 1
      ) {
        await delay(ServiceM8Client_API.parseRetryAfter(response, attempt));
        continue;
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ServiceM8ApiError(
          ServiceM8Client_API.describeFailure(response.status, 'GET', endpoint, body),
          response.status,
          endpoint,
          body,
        );
      }

      const text = await response.text();
      const payload = text ? (JSON.parse(text) as unknown) : [];
      const nextCursor = response.headers.get('x-next-cursor');

      return {
        records: Array.isArray(payload) ? (payload as T[]) : [],
        nextCursor: nextCursor && nextCursor.length > 0 ? nextCursor : null,
      };
    }

    throw new ServiceM8ApiError(
      `ServiceM8 request to ${endpoint} exhausted its retries`,
      0,
      endpoint,
      null,
    );
  }

  /**
   * Walks every page of a list endpoint until ServiceM8 stops sending an
   * `x-next-cursor` header, so callers always receive the complete collection.
   */
  private async requestAllPages<T>(
    endpoint: string,
    filter?: string | null,
  ): Promise<T[]> {
    const collected: T[] = [];
    let cursor = '-1';

    for (let pageIndex = 0; pageIndex < MAX_PAGES_PER_SWEEP; pageIndex += 1) {
      const page = await this.requestPage<T>(endpoint, {
        filter: filter ?? null,
        query: { cursor },
      });

      collected.push(...page.records);

      if (!page.nextCursor) {
        return collected;
      }

      cursor = page.nextCursor;
    }

    console.warn(
      `ServiceM8 ${endpoint}: stopped after ${MAX_PAGES_PER_SWEEP} pages; result may be incomplete.`,
    );

    return collected;
  }

  // ─── Clients (Company) ────────────────────────────────────────────────────

  async getClients(filter = 'active eq 1'): Promise<ServiceM8Company[]> {
    return this.requestAllPages<ServiceM8Company>('/company.json', filter);
  }

  async getClient(uuid: string): Promise<ServiceM8Company> {
    return this.request<ServiceM8Company>(`/company/${uuid}.json`);
  }

  // ─── Company contacts (names, email, phone, mobile) ───────────────────────

  /**
   * Companies carry no contact details at all; every name, email and phone
   * number lives on the CompanyContact endpoint. This requires the
   * `read_customer_contacts` OAuth scope.
   */
  async getCompanyContacts(filter?: string): Promise<ServiceM8CompanyContact[]> {
    return this.requestAllPages<ServiceM8CompanyContact>('/companycontact.json', filter);
  }

  // ─── Attachments (images, PDFs, signatures) ───────────────────────────────

  /**
   * The single attachment collection. There is no `/jobattachment.json`; pass a
   * `related_object` filter to narrow it down.
   */
  async getAttachments(filter?: string): Promise<ServiceM8Attachment[]> {
    return this.requestAllPages<ServiceM8Attachment>('/attachment.json', filter);
  }

  async getJobAttachments(jobUuid: string): Promise<ServiceM8Attachment[]> {
    return this.getAttachments(
      `related_object eq 'job' and related_object_uuid eq '${escapeFilterValue(jobUuid)}'`,
    );
  }

  async getCompanyAttachments(companyUuid: string): Promise<ServiceM8Attachment[]> {
    return this.getAttachments(
      `related_object eq 'company' and related_object_uuid eq '${escapeFilterValue(companyUuid)}'`,
    );
  }

  async getStaffAttachments(staffUuid: string): Promise<ServiceM8Attachment[]> {
    return this.getAttachments(
      `related_object eq 'staff' and related_object_uuid eq '${escapeFilterValue(staffUuid)}'`,
    );
  }

  // ─── Jobs ─────────────────────────────────────────────────────────────────

  async getJobs(filter = 'active eq 1'): Promise<ServiceM8Job[]> {
    return this.requestAllPages<ServiceM8Job>('/job.json', filter);
  }

  /** One page of jobs plus the cursor for the next page. */
  async getJobsPage(
    filter: string | null,
    options: ServiceM8JobPageOptions = {},
  ): Promise<{ jobs: ServiceM8Job[]; nextCursor: string | null }> {
    const page = await this.requestPage<ServiceM8Job>('/job.json', {
      filter: filter ?? null,
      query: {
        cursor: options.cursor ?? '-1',
        ...(options.sort ? { $sort: options.sort } : {}),
        ...(options.order ? { $order: options.order } : {}),
      },
    });

    return { jobs: page.records, nextCursor: page.nextCursor };
  }

  async getJob(uuid: string): Promise<ServiceM8Job> {
    return this.request<ServiceM8Job>(`/job/${uuid}.json`);
  }

  // ─── Supporting collections ───────────────────────────────────────────────

  async getStaff(): Promise<ServiceM8Staff[]> {
    return this.requestAllPages<ServiceM8Staff>('/staff.json', 'active eq 1');
  }

  async getJobCategories(): Promise<ServiceM8JobCategory[]> {
    return this.requestAllPages<ServiceM8JobCategory>('/jobcategory.json', 'active eq 1');
  }

  async getJobMaterials(jobUuid?: string): Promise<ServiceM8JobMaterial[]> {
    const filter = jobUuid
      ? `job_uuid eq '${escapeFilterValue(jobUuid)}' and active eq 1`
      : 'active eq 1';

    return this.requestAllPages<ServiceM8JobMaterial>('/jobmaterial.json', filter);
  }

  /**
   * The connected account's own business details.
   *
   * This endpoint is optional - a connection without the `vendor` scope returns
   * an empty record rather than throwing, so profile import can still run.
   */
  async getCompanyInfo(): Promise<ServiceM8CompanyInfo> {
    const empty: ServiceM8CompanyInfo = {
      uuid: null,
      name: null,
      email: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      postcode: null,
      country: null,
    };

    try {
      const info = await this.request<Partial<ServiceM8CompanyInfo>>('/companycontactinfo.json');
      return { ...empty, ...info };
    } catch (error) {
      console.warn('ServiceM8 company contact info unavailable', error);
      return empty;
    }
  }

  // ─── Attachment files ─────────────────────────────────────────────────────

  /**
   * Resolves the short-lived signed URL for an attachment's bytes.
   *
   * `/attachment/{uuid}.file` answers with a 302 whose `Location` points at
   * storage. ServiceM8 explicitly warns not to forward API credentials to that
   * host, so the redirect is read manually and never followed with the token.
   */
  async getAttachmentDownloadUrl(uuid: string): Promise<string> {
    const endpoint = `/attachment/${uuid}.file`;

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
      await rateLimiter.acquire();

      const response = await fetch(`${SERVICEM8_CONFIG.apiBaseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: '*/*',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status === 401 && attempt < MAX_RETRY_ATTEMPTS - 1) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          continue;
        }
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');

        if (location) {
          return new URL(location, `${SERVICEM8_CONFIG.apiBaseUrl}${endpoint}`).toString();
        }

        throw new ServiceM8ApiError(
          `ServiceM8 returned a ${response.status} for ${endpoint} without a Location header.`,
          response.status,
          endpoint,
          null,
        );
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ServiceM8ApiError(
          ServiceM8Client_API.describeFailure(response.status, 'GET', endpoint, body),
          response.status,
          endpoint,
          body,
        );
      }

      throw new ServiceM8ApiError(
        `ServiceM8 did not redirect ${endpoint}; the file cannot be linked directly.`,
        response.status,
        endpoint,
        null,
      );
    }

    throw new ServiceM8ApiError(
      `ServiceM8 request to ${endpoint} exhausted its retries`,
      0,
      endpoint,
      null,
    );
  }

  /**
   * Downloads attachment bytes, following ServiceM8's redirect without sending
   * the OAuth token to the storage host.
   */
  async fetchAttachment(uuid: string): Promise<{
    body: ArrayBuffer;
    contentType: string;
    fileName: string | null;
    contentLength: number | null;
  }> {
    const endpoint = `/attachment/${uuid}.file`;
    const apiUrl = `${SERVICEM8_CONFIG.apiBaseUrl}${endpoint}`;

    await rateLimiter.acquire();

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: '*/*',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok && !(response.status >= 300 && response.status < 400)) {
      const body = await response.text().catch(() => '');
      throw new ServiceM8ApiError(
        ServiceM8Client_API.describeFailure(response.status, 'GET', endpoint, body),
        response.status,
        endpoint,
        body,
      );
    }

    let fileResponse = response;

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');

      if (!location) {
        throw new ServiceM8ApiError(
          `ServiceM8 returned a ${response.status} for ${endpoint} without a Location header.`,
          response.status,
          endpoint,
          null,
        );
      }

      const signedUrl = new URL(location, apiUrl).toString();
      // Deliberately no Authorization header - the signed URL is self-authorising.
      fileResponse = await fetch(signedUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    }

    if (!fileResponse.ok) {
      throw new ServiceM8ApiError(
        `ServiceM8 attachment download failed with status ${fileResponse.status}.`,
        fileResponse.status,
        endpoint,
        null,
      );
    }

    const contentLengthHeader = fileResponse.headers.get('content-length');
    const parsedLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;

    return {
      body: await fileResponse.arrayBuffer(),
      contentType:
        fileResponse.headers.get('content-type')?.split(';')[0]?.trim() ??
        'application/octet-stream',
      fileName: ServiceM8Client_API.extractFileNameFromHeaders(
        fileResponse.headers.get('content-disposition'),
      ),
      contentLength: Number.isFinite(parsedLength) ? parsedLength : null,
    };
  }

  /**
   * Attachment metadata plus a resolvable download URL, used by the profile
   * import to fetch the account logo.
   */
  async getJobAttachmentDownloadInfo(uuid: string): Promise<ServiceM8AttachmentDownloadInfo> {
    const url = await this.getAttachmentDownloadUrl(uuid);
    return this.probeRemoteFile(url, null);
  }

  /**
   * The connected account's logo, taken from its own company attachments.
   *
   * Requires `read_attachments`; throws a descriptive error when the account has
   * no logo attached yet.
   */
  async getCompanyLogoDownloadInfo(): Promise<ServiceM8AttachmentDownloadInfo> {
    const companyInfo = await this.getCompanyInfo();
    const companyUuid = companyInfo.uuid;

    if (!companyUuid) {
      throw new ServiceM8ApiError(
        'ServiceM8 account details are unavailable, so the company logo cannot be located.',
        0,
        '/companycontactinfo.json',
        null,
      );
    }

    const attachments = await this.getCompanyAttachments(companyUuid);
    const logo =
      attachments.find(
        (attachment) =>
          attachment.active !== 0 &&
          (attachment.file_type ?? '').toLowerCase() !== '.pdf' &&
          ServiceM8Client_API.looksLikeImage(attachment.file_type, attachment.attachment_name),
      ) ?? null;

    if (!logo) {
      throw new ServiceM8ApiError(
        'No image attachment was found on the ServiceM8 company record.',
        404,
        '/attachment.json',
        null,
      );
    }

    const url = await this.getAttachmentDownloadUrl(logo.uuid);
    return this.probeRemoteFile(url, logo.attachment_name ?? null);
  }

  private async probeRemoteFile(
    url: string,
    fallbackFileName: string | null,
  ): Promise<ServiceM8AttachmentDownloadInfo> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const contentLengthHeader = response.headers.get('content-length');
        const parsedLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;

        return {
          url,
          mimeType: response.headers.get('content-type')?.split(';')[0]?.trim() ?? null,
          contentLength: Number.isFinite(parsedLength) ? parsedLength : null,
          fileName:
            ServiceM8Client_API.extractFileNameFromHeaders(
              response.headers.get('content-disposition'),
            ) ?? fallbackFileName,
        };
      }
    } catch {
      // A failed HEAD probe is not fatal: the caller can still download the URL.
    }

    return { url, mimeType: null, contentLength: null, fileName: fallbackFileName };
  }

  private static looksLikeImage(
    fileType: string | null | undefined,
    fileName: string | null | undefined,
  ): boolean {
    const candidate = `${fileType ?? ''} ${fileName ?? ''}`.toLowerCase();
    return /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)\b/.test(candidate);
  }

  private static extractFileNameFromHeaders(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1].trim());
      } catch {
        return utf8Match[1].trim();
      }
    }

    const plainMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
    return plainMatch?.[1]?.trim() ?? null;
  }

  // ─── Writes ───────────────────────────────────────────────────────────────

  /**
   * Creates a client and, when contact details are supplied, its primary
   * contact.
   *
   * ServiceM8 stores names, email and phone on CompanyContact, not on Company,
   * so exporting a local customer with contact details needs two requests.
   */
  async createClient(payload: ServiceM8ClientWritePayload): Promise<{ uuid: string }> {
    const { email, phone, mobile, first_name, last_name, ...companyFields } = payload;

    const created = await this.request<{ uuid?: string } | null>('/company.json', {
      method: 'POST',
      body: companyFields,
    });

    const uuid = created?.uuid;

    if (!uuid) {
      throw new ServiceM8ApiError(
        'ServiceM8 did not return a UUID for the newly created client.',
        0,
        '/company.json',
        null,
      );
    }

    if (email || phone || mobile || first_name || last_name) {
      await this.request('/companycontact.json', {
        method: 'POST',
        body: {
          company_uuid: uuid,
          first: first_name ?? companyFields.name ?? '',
          last: last_name ?? '',
          email: email ?? '',
          phone: phone ?? '',
          mobile: mobile ?? '',
          type: 'BILLING',
          is_primary_contact: '1',
          active: 1,
        },
      }).catch((error) => {
        console.warn(
          `ServiceM8 client ${uuid} was created but its contact details could not be saved`,
          error,
        );
      });
    }

    return { uuid };
  }

  async updateClient(uuid: string, payload: ServiceM8ClientWritePayload): Promise<void> {
    const { email, phone, mobile, first_name, last_name, ...companyFields } = payload;

    await this.request(`/company/${uuid}.json`, {
      method: 'PUT',
      body: companyFields,
    });

    if (!email && !phone && !mobile && !first_name && !last_name) {
      return;
    }

    const existingContacts = await this.getCompanyContacts(
      `company_uuid eq '${escapeFilterValue(uuid)}' and active eq 1`,
    ).catch(() => []);

    const primary =
      existingContacts.find((contact) => parseBooleanFlag(contact.is_primary_contact)) ??
      existingContacts[0] ??
      null;

    const contactBody = {
      company_uuid: uuid,
      first: first_name ?? primary?.first ?? '',
      last: last_name ?? primary?.last ?? '',
      email: email ?? primary?.email ?? '',
      phone: phone ?? primary?.phone ?? '',
      mobile: mobile ?? primary?.mobile ?? '',
      type: primary?.type ?? 'BILLING',
      is_primary_contact: '1',
      active: 1,
    };

    await this.request(
      primary ? `/companycontact/${primary.uuid}.json` : '/companycontact.json',
      {
        method: primary ? 'PUT' : 'POST',
        body: contactBody,
      },
    );
  }

  async createJob(payload: ServiceM8JobWritePayload): Promise<{ uuid: string }> {
    const created = await this.request<{ uuid?: string } | null>('/job.json', {
      method: 'POST',
      body: stripUndefined(payload),
    });

    const uuid = created?.uuid;

    if (!uuid) {
      throw new ServiceM8ApiError(
        'ServiceM8 did not return a UUID for the newly created job.',
        0,
        '/job.json',
        null,
      );
    }

    return { uuid };
  }

  async updateJob(uuid: string, payload: ServiceM8JobWritePayload): Promise<void> {
    await this.request(`/job/${uuid}.json`, {
      method: 'PUT',
      body: stripUndefined(payload),
    });
  }

  /**
   * Creates the attachment record, which tells ServiceM8 the file's type and
   * which object it belongs to. The UUID is returned in the `x-record-uuid`
   * response header.
   */
  async createAttachmentMetadata(payload: {
    relatedObject: string;
    relatedObjectUuid: string;
    fileName: string;
    fileType?: string | null;
    tags?: string | null;
  }): Promise<{ uuid: string }> {
    const endpoint = '/attachment.json';
    const extension = getServiceM8FileExtension(payload.fileName, payload.fileType ?? null);

    await rateLimiter.acquire();

    const response = await fetch(`${SERVICEM8_CONFIG.apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        related_object: payload.relatedObject,
        related_object_uuid: payload.relatedObjectUuid,
        attachment_name: payload.fileName,
        file_type: extension ?? '',
        ...(payload.tags ? { tags: payload.tags } : {}),
        active: 1,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ServiceM8ApiError(
        ServiceM8Client_API.describeFailure(response.status, 'POST', endpoint, body),
        response.status,
        endpoint,
        body,
      );
    }

    const headerUuid = response.headers.get('x-record-uuid');

    if (headerUuid) {
      return { uuid: headerUuid };
    }

    const text = await response.text().catch(() => '');

    if (text) {
      try {
        const parsed = JSON.parse(text) as { uuid?: string };
        if (parsed.uuid) {
          return { uuid: parsed.uuid };
        }
      } catch {
        // Non-JSON success responses are expected from the legacy workflow.
      }
    }

    throw new ServiceM8ApiError(
      'ServiceM8 created the attachment but did not return its UUID.',
      0,
      endpoint,
      text || null,
    );
  }

  /** Uploads the bytes for an attachment created by `createAttachmentMetadata`. */
  async uploadAttachmentFile(
    uuid: string,
    bytes: Uint8Array,
    mimeType = 'application/octet-stream',
  ): Promise<void> {
    const endpoint = `/attachment/${uuid}.file`;

    if (bytes.byteLength === 0) {
      throw new ServiceM8ApiError(
        'Refusing to upload an empty attachment file.',
        0,
        endpoint,
        null,
      );
    }

    await rateLimiter.acquire();

    const response = await fetch(`${SERVICEM8_CONFIG.apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': mimeType,
        Accept: 'application/json',
      },
      body: toArrayBuffer(bytes),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ServiceM8ApiError(
        ServiceM8Client_API.describeFailure(response.status, 'POST', endpoint, body),
        response.status,
        endpoint,
        body,
      );
    }
  }

  /**
   * Convenience wrapper: create the attachment record then upload its bytes.
   * Requires the `manage_attachments` OAuth scope.
   */
  async uploadJobAttachment(
    jobUuid: string,
    bytes: Uint8Array,
    fileName: string,
    mimeType = 'application/octet-stream',
  ): Promise<{ uuid: string }> {
    const { uuid } = await this.createAttachmentMetadata({
      relatedObject: 'job',
      relatedObjectUuid: jobUuid,
      fileName,
    });

    await this.uploadAttachmentFile(uuid, bytes, mimeType);

    return { uuid };
  }
}

export default ServiceM8Client_API;

/** Fields accepted when creating or updating a ServiceM8 client. */
export type ServiceM8ClientWritePayload = Omit<
  Partial<ServiceM8Company>,
  'uuid' | 'active' | 'edit_date'
> & {
  /** Contact details are written to the client's primary CompanyContact. */
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

/** Fields accepted when creating or updating a ServiceM8 job. */
export type ServiceM8JobWritePayload = Omit<Partial<ServiceM8Job>, 'uuid' | 'active' | 'edit_date'>;

function stripUndefined<T extends Record<string, unknown>>(payload: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function parseBooleanFlag(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }

  return false;
}

/** Escapes a value for use inside an OData `$filter` string literal. */
function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Copies a typed array into a plain ArrayBuffer.
 *
 * `fetch` rejects `Uint8Array<ArrayBufferLike>` because a view may be backed by a
 * SharedArrayBuffer, so the bytes are copied into an ArrayBuffer first.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

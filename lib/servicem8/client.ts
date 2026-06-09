/**
 * ServiceM8 API Client
 *
 * Handles authenticated requests to the ServiceM8 REST API.
 * Supports automatic token refresh when access tokens expire.
 */

import { SERVICEM8_CONFIG } from './config';
import { db } from '@/lib/db/drizzle';
import { servicem8Connections, teamMembers } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ServiceM8TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface ServiceM8Job {
  uuid: string;
  status: string | null;
  job_address: string | null;
  job_description: string | null;
  work_done_description: string | null;
  generated_job_id: string | null;
  date: string | null;
  completion_date: string | null;
  category_uuid: string | null;
  company_uuid: string | null;
  company_name?: string | null;
  address?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
  billing_address?: string | null;
  billing_attention?: string | null;
  billing_address2?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postcode?: string | null;
  billing_country?: string | null;
  active: number;
  badge: string | null;
  total_invoice_amount: number | null;
  total_paid_amount: number | null;
  edit_date: string | null;
  first_name: string | null;
  last_name: string | null;
  job_is_scheduled: number | null;
}

export interface ServiceM8Client {
  uuid: string;
  name: string | null;
  abn_number?: string | null;
  address: string | null;
  billing_address: string | null;
  is_individual?: number | null;
  parent_company_uuid?: string | null;
  website?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
  fax_number?: string | null;
  badges?: string | null;
  tax_rate_uuid?: string | null;
  billing_attention?: string | null;
  payment_terms?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  billing_address2?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postcode?: string | null;
  billing_country?: string | null;
  active: number;
  edit_date: string | null;
}

export interface ServiceM8Staff {
  uuid: string;
  first: string;
  last: string;
  email: string;
  mobile: string;
  active: number;
}

export interface ServiceM8Company {
  uuid: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
}

export interface ServiceM8JobCategory {
  uuid: string;
  name: string;
  active: number;
}

export interface ServiceM8CompanyContact {
  uuid: string;
  company_uuid: string;
  first: string | null;
  last: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  type: string | null;
  is_primary_contact: string | null;
  active: number;
  edit_date: string | null;
}

export interface ServiceM8JobMaterial {
  uuid: string;
  job_uuid: string;
  name: string;
  qty: number;
  unit_cost: number;
  total_cost: number;
  active: number;
}

export interface ServiceM8JobAttachment {
  uuid: string;
  job_uuid: string | null;
  file_type: string | null;
  file_name: string | null;
  attachment_name: string | null;
  related_object_uuid: string | null;
  active: number | null;
  edit_date: string | null;
  timestamp: string | null;
}

export interface ServiceM8RequestOptions {
  query?: Record<string, string | number | boolean | null | undefined>;
  raw?: boolean;
}

export interface ServiceM8AttachmentDownloadInfo {
  url: string;
  mimeType: string | null;
  contentLength: number | null;
  fileName: string | null;
}

// ─── Client Class ────────────────────────────────────────────────────────────

export class ServiceM8Client_API {
  private accessToken: string;
  private refreshToken: string;
  private teamId: number;
  private connectionUserId: number;

  constructor(accessToken: string, refreshToken: string, teamId: number, connectionUserId: number) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.teamId = teamId;
    this.connectionUserId = connectionUserId;
  }

  private static async fromConnectionRow(
    conn: typeof servicem8Connections.$inferSelect,
  ): Promise<ServiceM8Client_API | null> {
    const client = new ServiceM8Client_API(
      conn.accessToken,
      conn.refreshToken,
      conn.teamId,
      conn.userId,
    );

    if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) {
      const refreshed = await client.refreshAccessToken();
      if (!refreshed) return null;
    }

    return client;
  }

  /**
   * Create a ServiceM8 client from a user's stored connection
   *
   * Falls back to the user's team connection so any team member can use the
   * integration once it has been connected by one member.
   */
  static async fromUserId(userId: number): Promise<ServiceM8Client_API | null> {
    const userConnections = await db
      .select()
      .from(servicem8Connections)
      .where(eq(servicem8Connections.userId, userId))
      .orderBy(desc(servicem8Connections.updatedAt))
      .limit(1);

    if (userConnections.length > 0) {
      return ServiceM8Client_API.fromConnectionRow(userConnections[0]);
    }

    const teamMemberships = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .limit(1);

    const teamId = teamMemberships[0]?.teamId;
    if (!teamId) return null;

    const teamConnections = await db
      .select()
      .from(servicem8Connections)
      .where(eq(servicem8Connections.teamId, teamId))
      .orderBy(desc(servicem8Connections.updatedAt))
      .limit(1);

    if (teamConnections.length === 0) return null;

    return ServiceM8Client_API.fromConnectionRow(teamConnections[0]);
  }

  /**
   * Create a ServiceM8 client from a team's stored connection
   *
   * Kept for compatibility while routes are migrated to per-user resolution.
   */
  static async fromTeamId(teamId: number): Promise<ServiceM8Client_API | null> {
    const connections = await db
      .select()
      .from(servicem8Connections)
      .where(eq(servicem8Connections.teamId, teamId))
      .orderBy(desc(servicem8Connections.updatedAt))
      .limit(1);

    if (connections.length === 0) return null;

    return ServiceM8Client_API.fromConnectionRow(connections[0]);
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  static async exchangeCode(code: string): Promise<ServiceM8TokenResponse> {
    const response = await fetch(SERVICEM8_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SERVICEM8_CONFIG.appId,
        client_secret: SERVICEM8_CONFIG.appSecret,
        code,
        redirect_uri: SERVICEM8_CONFIG.callbackUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ServiceM8 token exchange failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(SERVICEM8_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: SERVICEM8_CONFIG.appId,
          client_secret: SERVICEM8_CONFIG.appSecret,
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        console.error('ServiceM8 token refresh failed:', response.status);
        return false;
      }

      const data: ServiceM8TokenResponse = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;

      // Update stored tokens
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      await db
        .update(servicem8Connections)
        .set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(servicem8Connections.userId, this.connectionUserId));

      return true;
    } catch (error) {
      console.error('ServiceM8 token refresh error:', error);
      return false;
    }
  }

  private buildEndpoint(endpoint: string, query?: Record<string, string | number | boolean | null | undefined>) {
    if (!query) {
      return endpoint;
    }

    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      searchParams.set(key, String(value));
    }

    const queryString = searchParams.toString();
    if (!queryString) {
      return endpoint;
    }

    return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`;
  }

  /**
   * Make an authenticated request to the ServiceM8 API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requestOptions: ServiceM8RequestOptions = {},
  ): Promise<T> {
    const finalEndpoint = this.buildEndpoint(endpoint, requestOptions.query);
    const url = `${SERVICEM8_CONFIG.apiBaseUrl}${finalEndpoint}`;

    const executeFetch = async () =>
      fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

    let response = await executeFetch();

    // If unauthorized, try refreshing token
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        throw new Error('ServiceM8 authentication failed - token refresh unsuccessful');
      }

      response = await executeFetch();
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ServiceM8 API error: ${response.status} ${errorText}`);
    }

    if (requestOptions.raw) {
      return response as T;
    }

    return response.json();
  }

  // ─── Jobs ────────────────────────────────────────────────────────────────

  async getJobs(filter?: string): Promise<ServiceM8Job[]> {
    return this.request<ServiceM8Job[]>('/job.json', {}, filter ? { query: { $filter: filter } } : {});
  }

  async getJobsPage(
    filter?: string,
    options: {
      cursor?: string;
      sort?: string;
      order?: 'asc' | 'desc';
    } = {},
  ): Promise<{ jobs: ServiceM8Job[]; nextCursor: string | null }> {
    const response = await this.request<Response>(
      '/job.json',
      {},
      {
        raw: true,
        query: {
          ...(filter ? { $filter: filter } : {}),
          cursor: options.cursor ?? '-1',
          ...(options.sort ? { $sort: `${options.sort} ${options.order ?? 'desc'}` } : {}),
        },
      },
    );

    const jobs = (await response.json()) as ServiceM8Job[];
    const nextCursor = response.headers.get('x-next-cursor');

    return {
      jobs,
      nextCursor,
    };
  }

  async getJob(uuid: string): Promise<ServiceM8Job> {
    return this.request<ServiceM8Job>(`/job/${uuid}.json`);
  }

  async createJob(data: Partial<ServiceM8Job> & { company_name?: string | null }): Promise<{ uuid: string }> {
    return this.request<{ uuid: string }>('/job.json', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJob(uuid: string, data: Partial<ServiceM8Job>): Promise<void> {
    await this.request(`/job/${uuid}.json`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Clients ─────────────────────────────────────────────────────────────

  async getClients(filter?: string): Promise<ServiceM8Client[]> {
    return this.request<ServiceM8Client[]>(
      '/company.json',
      {},
      filter ? { query: { $filter: filter } } : {},
    );
  }

  async getClient(uuid: string): Promise<ServiceM8Client> {
    return this.request<ServiceM8Client>(`/company/${uuid}.json`);
  }

  async createClient(data: Partial<ServiceM8Client>): Promise<{ uuid: string }> {
    return this.request<{ uuid: string }>('/company.json', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(uuid: string, data: Partial<ServiceM8Client>): Promise<void> {
    await this.request(`/company/${uuid}.json`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ─── Staff ───────────────────────────────────────────────────────────────

  async getStaff(): Promise<ServiceM8Staff[]> {
    return this.request<ServiceM8Staff[]>('/staff.json');
  }

  // ─── Company ─────────────────────────────────────────────────────────────

  async getCompanyInfo(): Promise<ServiceM8Company> {
    return this.request<ServiceM8Company>('/companycontactinfo.json');
  }

  async getCompanyLogoDownloadInfo(): Promise<ServiceM8AttachmentDownloadInfo> {
    const response = await this.request<Response>(
      '/companycontactinfo/logo.file',
      {},
      { raw: true },
    );

    return {
      url: response.url,
      mimeType: response.headers.get('content-type'),
      contentLength: Number(response.headers.get('content-length') ?? '') || null,
      fileName: this.extractFileNameFromHeaders(response.headers.get('content-disposition')),
    };
  }

  async getCompanyContacts(filter?: string): Promise<ServiceM8CompanyContact[]> {
    return this.request<ServiceM8CompanyContact[]>(
      '/companycontact.json',
      {},
      filter ? { query: { $filter: filter } } : {},
    );
  }

  // ─── Job Categories ──────────────────────────────────────────────────────

  async getJobCategories(): Promise<ServiceM8JobCategory[]> {
    return this.request<ServiceM8JobCategory[]>('/jobcategory.json');
  }

  // ─── Job Materials ───────────────────────────────────────────────────────

  async getJobMaterials(jobUuid: string): Promise<ServiceM8JobMaterial[]> {
    return this.request<ServiceM8JobMaterial[]>('/jobmaterial.json', {
    }, {
      query: {
        $filter: `job_uuid eq '${jobUuid}'`,
      },
    });
  }

  // ─── Attachments ─────────────────────────────────────────────────────────

  async getJobAttachments(jobUuid: string): Promise<ServiceM8JobAttachment[]> {
    return this.request<ServiceM8JobAttachment[]>('/jobattachment.json', {}, {
      query: {
        $filter: `job_uuid eq '${jobUuid}'`,
      },
    });
  }

  async getJobAttachmentDownloadInfo(uuid: string): Promise<ServiceM8AttachmentDownloadInfo> {
    const response = await this.request<Response>(
      `/jobattachment/${uuid}.file`,
      {},
      { raw: true },
    );

    return {
      url: response.url,
      mimeType: response.headers.get('content-type'),
      contentLength: Number(response.headers.get('content-length') ?? '') || null,
      fileName: this.extractFileNameFromHeaders(response.headers.get('content-disposition')),
    };
  }

  private extractFileNameFromHeaders(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        return utf8Match[1];
      }
    }

    const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return basicMatch?.[1] ?? null;
  }

  async uploadJobAttachment(
    jobUuid: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ uuid: string }> {
    const url = `${SERVICEM8_CONFIG.apiBaseUrl}/jobattachment.json`;

    const formData = new FormData();
    formData.append('job_uuid', jobUuid);
    formData.append('file', new Blob([new Uint8Array(file)], { type: mimeType }), fileName);
    formData.append('active', '1');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload attachment: ${response.status}`);
    }

    return response.json();
  }
}

/**
 * ServiceM8 API Client
 * 
 * Handles authenticated requests to the ServiceM8 REST API.
 * Supports automatic token refresh when access tokens expire.
 */

import { SERVICEM8_CONFIG } from './config';
import { db } from '@/lib/db/drizzle';
import { servicem8Connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ServiceM8TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface ServiceM8Job {
  uuid: string;
  status: string;
  job_address: string;
  job_description: string;
  work_done_description: string;
  generated_job_id: string;
  date: string;
  completion_date: string;
  category_uuid: string;
  company_uuid: string;
  active: number;
  badge: string;
  total_invoice_amount: number;
  total_paid_amount: number;
  edit_date: string;
  first_name: string;
  last_name: string;
  job_is_scheduled: number;
}

export interface ServiceM8Client {
  uuid: string;
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  billing_address: string;
  billing_address2: string;
  billing_city: string;
  billing_state: string;
  billing_postcode: string;
  billing_country: string;
  active: number;
  edit_date: string;
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
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface ServiceM8JobCategory {
  uuid: string;
  name: string;
  active: number;
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

// ─── Client Class ────────────────────────────────────────────────────────────

export class ServiceM8Client_API {
  private accessToken: string;
  private refreshToken: string;
  private teamId: number;

  constructor(accessToken: string, refreshToken: string, teamId: number) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.teamId = teamId;
  }

  /**
   * Create a ServiceM8 client from a team's stored connection
   */
  static async fromTeamId(teamId: number): Promise<ServiceM8Client_API | null> {
    const connections = await db
      .select()
      .from(servicem8Connections)
      .where(eq(servicem8Connections.teamId, teamId))
      .limit(1);

    if (connections.length === 0) return null;

    const conn = connections[0];
    
    // Check if token is expired
    if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) {
      // Token expired, try to refresh
      const client = new ServiceM8Client_API(
        conn.accessToken,
        conn.refreshToken,
        teamId
      );
      const refreshed = await client.refreshAccessToken();
      if (!refreshed) return null;
      return client;
    }

    return new ServiceM8Client_API(
      conn.accessToken,
      conn.refreshToken,
      teamId
    );
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
        .where(eq(servicem8Connections.teamId, this.teamId));

      return true;
    } catch (error) {
      console.error('ServiceM8 token refresh error:', error);
      return false;
    }
  }

  /**
   * Make an authenticated request to the ServiceM8 API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${SERVICEM8_CONFIG.apiBaseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // If unauthorized, try refreshing token
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        if (!retryResponse.ok) {
          throw new Error(`ServiceM8 API error: ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
      throw new Error('ServiceM8 authentication failed - token refresh unsuccessful');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ServiceM8 API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  // ─── Jobs ────────────────────────────────────────────────────────────────

  async getJobs(filter?: string): Promise<ServiceM8Job[]> {
    const query = filter ? `?$filter=${encodeURIComponent(filter)}` : '';
    return this.request<ServiceM8Job[]>(`/job.json${query}`);
  }

  async getJob(uuid: string): Promise<ServiceM8Job> {
    return this.request<ServiceM8Job>(`/job/${uuid}.json`);
  }

  async createJob(data: Partial<ServiceM8Job>): Promise<{ uuid: string }> {
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
    const query = filter ? `?$filter=${encodeURIComponent(filter)}` : '';
    return this.request<ServiceM8Client[]>(`/company.json${query}`);
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

  // ─── Job Categories ──────────────────────────────────────────────────────

  async getJobCategories(): Promise<ServiceM8JobCategory[]> {
    return this.request<ServiceM8JobCategory[]>('/jobcategory.json');
  }

  // ─── Job Materials ───────────────────────────────────────────────────────

  async getJobMaterials(jobUuid: string): Promise<ServiceM8JobMaterial[]> {
    return this.request<ServiceM8JobMaterial[]>(
      `/jobmaterial.json?$filter=job_uuid eq '${jobUuid}'`
    );
  }

  // ─── Attachments ─────────────────────────────────────────────────────────

  async getJobAttachments(jobUuid: string): Promise<any[]> {
    return this.request<any[]>(
      `/jobattachment.json?$filter=job_uuid eq '${jobUuid}'`
    );
  }

  async uploadJobAttachment(
    jobUuid: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ uuid: string }> {
    const url = `${SERVICEM8_CONFIG.apiBaseUrl}/jobattachment.json`;
    
    const formData = new FormData();
    formData.append('job_uuid', jobUuid);
    formData.append('file', new Blob([file], { type: mimeType }), fileName);
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

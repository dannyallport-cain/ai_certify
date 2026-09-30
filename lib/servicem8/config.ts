/**
 * ServiceM8 Integration Configuration
 */

const getBaseUrl = () => {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:4000'
  );
};

function getRequiredEnv(name: 'SERVICEM8_APP_ID' | 'SERVICEM8_APP_SECRET') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required ServiceM8 environment variable: ${name}`);
  }
  return value;
}

/**
 * Read-only scopes the integration needs.
 *
 * These map one-to-one onto the endpoints we call, and every one is required:
 *
 * - `read_customers`          -> /company.json           (client records)
 * - `read_customer_contacts`  -> /companycontact.json    (names, email, phone)
 * - `read_jobs`               -> /job.json
 * - `read_job_categories`     -> /jobcategory.json
 * - `read_job_materials`      -> /jobmaterial.json
 * - `read_attachments`        -> /attachment.json        (client and job images)
 * - `vendor`                  -> /companycontactinfo.json (account details)
 *
 * Client contact details and attachments were previously missing because
 * `read_customer_contacts` and `read_attachments` were never requested: the
 * calls returned 403 and the code silently fell back to blank values.
 */
export const SERVICEM8_READ_SCOPES = [
  'read_customers',
  'read_customer_contacts',
  'read_jobs',
  'read_job_categories',
  'read_job_materials',
  'read_attachments',
  'vendor',
] as const;

/** Scopes required to write back to ServiceM8. */
export const SERVICEM8_WRITE_SCOPES = ['manage_jobs', 'manage_attachments'] as const;

export const SERVICEM8_CONFIG = {
  get appId() {
    return getRequiredEnv('SERVICEM8_APP_ID');
  },
  get appSecret() {
    return getRequiredEnv('SERVICEM8_APP_SECRET');
  },

  /**
   * Enables pushing data back to ServiceM8 (certificate PDFs, created jobs).
   * Requires the write scopes to have been granted on the connection.
   */
  get writeJobsEnabled() {
    return process.env.SERVICEM8_ENABLE_WRITE_JOBS === 'true';
  },

  // OAuth endpoints
  authorizationUrl: 'https://go.servicem8.com/oauth/authorize',
  tokenUrl: 'https://go.servicem8.com/oauth/access_token',

  // API base URL
  apiBaseUrl: 'https://api.servicem8.com/api_1.0',

  // OAuth callback URL for the external integration flow.
  get callbackUrl() {
    return process.env.SERVICEM8_CALLBACK_URL || `${getBaseUrl()}/api/servicem8/callback`;
  },

  // Activation URL used by the ServiceM8 listing to begin OAuth.
  get activationUrl() {
    return process.env.SERVICEM8_ACTIVATION_URL || `${getBaseUrl()}/api/servicem8/activate`;
  },

  /**
   * OAuth scopes requested during authorisation.
   *
   * ServiceM8 rejects unknown scopes with `invalid_scope`, so this list must only
   * ever contain names from the published scope table.
   */
  get scopes() {
    const scopes: string[] = [...SERVICEM8_READ_SCOPES];

    if (process.env.SERVICEM8_ENABLE_WRITE_JOBS === 'true') {
      scopes.push(...SERVICEM8_WRITE_SCOPES);
    }

    return scopes;
  },
} as const;

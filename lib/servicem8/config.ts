/**
 * ServiceM8 Integration Configuration
 */

const INVALID_HOST_PATTERNS = [/your-railway-host/i, /\.railway\.internal$/i];

function parseSafeUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    const host = parsed.hostname.toLowerCase();
    if (INVALID_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

const getBaseUrl = () => {
  return (
    parseSafeUrl(process.env.NEXTAUTH_URL) ||
    parseSafeUrl(process.env.BASE_URL) ||
    parseSafeUrl(process.env.NEXT_PUBLIC_APP_URL) ||
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

export const SERVICEM8_CONFIG = {
  get appId() {
    return getRequiredEnv('SERVICEM8_APP_ID');
  },
  get appSecret() {
    return getRequiredEnv('SERVICEM8_APP_SECRET');
  },

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

  // OAuth scopes needed for integration.
  // Keep read-only access as the default because ServiceM8 rejects unsupported scopes
  // with `invalid_scope`. Enable write scope explicitly only after the addon permissions
  // are granted in the ServiceM8 developer configuration.
  get scopes() {
    const scopes = ['read_jobs', 'read_customers'];

    if (process.env.SERVICEM8_ENABLE_WRITE_JOBS === 'true') {
      scopes.push('write_jobs');
    }

    return scopes;
  },
} as const;

/**
 * ServiceM8 Integration Configuration
 */

const getBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BASE_URL ||
    process.env.NEXTAUTH_URL ||
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
  // Keep this minimal because ServiceM8 rejects unsupported scopes with `invalid_scope`.
  // Additional write/manage scopes can be reintroduced later once confirmed against the
  // exact app/addon permissions enabled in the ServiceM8 developer configuration.
  scopes: [
    'read_jobs',
    'read_customers',
  ],
} as const;

/**
 * ServiceM8 Integration Configuration
 * 
 * ServiceM8 App Id: 337875
 * Addon Type: External Integration
 */

const getBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:4000'
  );
};

export const SERVICEM8_CONFIG = {
  appId: process.env.SERVICEM8_APP_ID || '337875',
  appSecret: process.env.SERVICEM8_APP_SECRET || '',
  
  // OAuth endpoints
  authorizationUrl: 'https://go.servicem8.com/oauth/authorize',
  tokenUrl: 'https://go.servicem8.com/oauth/access_token',
  
  // API base URL
  apiBaseUrl: 'https://api.servicem8.com/api_1.0',
  
  // Callback URL (set in env for different environments)
  get callbackUrl() {
    return process.env.SERVICEM8_CALLBACK_URL || `${getBaseUrl()}/api/servicem8/callback`;
  },
  
  // Activation URL - the URL ServiceM8 redirects to when a user activates the addon
  get activationUrl() {
    return process.env.SERVICEM8_ACTIVATION_URL || `${getBaseUrl()}/api/servicem8/activate`;
  },
  
  // OAuth scopes needed for integration.
  // Keep this minimal because ServiceM8 rejects unsupported scopes with `invalid_scope`.
  // Additional write/manage scopes can be reintroduced later once confirmed against the
  // exact app/addon permissions enabled in the ServiceM8 developer configuration.
  scopes: [
    'read_jobs',
    'read_clients',
    'read_staff',
    'read_company',
  ],
} as const;

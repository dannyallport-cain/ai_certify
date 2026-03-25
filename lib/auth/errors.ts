export const SESSION_EXPIRED_ERROR = 'Your session has expired. Please sign in again.';

export function isSessionExpiredError(error?: string | null): boolean {
  return error === SESSION_EXPIRED_ERROR;
}

export function getSignInRedirectPath(path: string): string {
  return `/sign-in?redirect=${encodeURIComponent(path)}`;
}
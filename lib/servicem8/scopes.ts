/**
 * OAuth scope bookkeeping.
 *
 * Existing ServiceM8 connections were authorised with only `read_jobs` and
 * `read_customers`. The contact and attachment scopes were missing, so those
 * endpoints returned 403 and the UI showed blank names, emails, phone numbers
 * and no images. Because scopes can only be granted by re-authorising, the app
 * has to be able to tell the user their connection needs reconnecting rather
 * than silently showing empty fields.
 */

import { SERVICEM8_READ_SCOPES } from './config';

/** ServiceM8 returns granted scopes space- or comma-separated. */
export function parseGrantedScopes(raw: string | null | undefined): string[] {
  if (typeof raw !== 'string') {
    return [];
  }

  return raw
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

/** Scopes the connection was asked for but was not granted. */
export function getMissingServiceM8Scopes(
  granted: string | null | undefined,
  required: readonly string[] = SERVICEM8_READ_SCOPES,
): string[] {
  const grantedScopes = new Set(parseGrantedScopes(granted));

  // A connection predating this check has no record of its scopes at all. Treat
  // that as needing a reconnect rather than assuming it is fine.
  if (grantedScopes.size === 0) {
    return [...required];
  }

  return required.filter((scope) => !grantedScopes.has(scope));
}

/** Human-readable explanation of a scope gap, or null when nothing is missing. */
export function describeServiceM8ScopeGap(missing: string[]): string | null {
  if (missing.length === 0) {
    return null;
  }

  const includesContacts = missing.includes('read_customer_contacts');
  const includesAttachments = missing.includes('read_attachments');

  if (includesContacts && includesAttachments) {
    return 'Reconnect ServiceM8 to grant access to client contact details and images.';
  }

  if (includesContacts) {
    return 'Reconnect ServiceM8 to grant access to client contact details (names, email, phone).';
  }

  if (includesAttachments) {
    return 'Reconnect ServiceM8 to grant access to client and job images.';
  }

  return `Reconnect ServiceM8 to grant the missing permissions: ${missing.join(', ')}.`;
}

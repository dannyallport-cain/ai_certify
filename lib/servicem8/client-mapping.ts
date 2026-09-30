/**
 * Maps a normalised ServiceM8 client onto the local `customers` table.
 *
 * ServiceM8 is the source of truth for a client's profile, so this is the single
 * place that decides which remote field lands in which column. Keeping it here
 * (rather than inline in the import route) means the web and mobile import paths
 * cannot drift apart.
 */

import type { ServiceM8ClientRecord } from './types';

export interface ServiceM8CustomerMapping {
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  postcode: string | null;
  contactPerson: string | null;
  firstName: string | null;
  lastName: string | null;
  website: string | null;
  abnNumber: string | null;
  billingAddress: string | null;
  billingPostcode: string | null;
  billingAttention: string | null;
}

/**
 * ServiceM8 will happily return a client with no contact attached at all, and a
 * client may legitimately have no email. Deriving the contact person from the
 * attached contacts (rather than assuming the fields are populated) is what
 * fixes the blank-name-on-import problem.
 */
export function mapServiceM8ClientToCustomer(
  record: ServiceM8ClientRecord,
): ServiceM8CustomerMapping {
  // `??` would not work here: `join` always returns a string, so an empty
  // join would be stored as '' rather than null.
  const contactPerson =
    record.billingContactName ||
    [record.firstName, record.lastName].filter(Boolean).join(' ') ||
    null;

  return {
    name: record.name,
    email: record.email,
    phone: record.phone,
    mobile: record.mobile,
    address: record.address,
    postcode: record.postcode,
    contactPerson,
    firstName: record.firstName,
    lastName: record.lastName,
    website: record.website,
    abnNumber: record.abnNumber,
    billingAddress: record.billingAddress,
    billingPostcode: record.billingPostcode,
    billingAttention: record.billingAttention,
  };
}

/**
 * Reports which contact fields ServiceM8 returned blank for a client.
 *
 * ServiceM8 frequently holds a client with no contact record at all, so the UI
 * needs to say "ServiceM8 has no email for this client" rather than silently
 * showing an empty field and implying the integration failed.
 */
export function getMissingServiceM8ClientFields(record: ServiceM8ClientRecord): string[] {
  const missing: string[] = [];

  if (!record.email) missing.push('email address');
  if (!record.phone && !record.mobile) missing.push('phone number');
  if (!record.address && !record.addressDetails.formatted) missing.push('address');
  if (!record.firstName && !record.lastName && record.contacts.length === 0) {
    missing.push('contact name');
  }
  if (record.images.length === 0) missing.push('images');

  return missing;
}

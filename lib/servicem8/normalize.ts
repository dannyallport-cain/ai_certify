/**
 * Pure transformations from raw ServiceM8 API records to normalised domain
 * records. No network or database access lives here so it can be unit tested
 * and reused by every route.
 */

import type {
  ServiceM8Address,
  ServiceM8Attachment,
  ServiceM8AttachmentRecord,
  ServiceM8ClientRecord,
  ServiceM8Company,
  ServiceM8CompanyContact,
  ServiceM8ContactRecord,
  ServiceM8Job,
  ServiceM8JobRecord,
} from './types';

const UNNAMED_CLIENT = 'Unnamed ServiceM8 client';

/** Extensions we treat as previewable images when ServiceM8 omits a MIME type. */
const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.heif',
  '.bmp',
  '.tif',
  '.tiff',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
};

export const EMPTY_SERVICEM8_ADDRESS: ServiceM8Address = {
  formatted: null,
  raw: null,
  street: null,
  city: null,
  state: null,
  postcode: null,
  country: null,
  latitude: null,
  longitude: null,
};

export function trimmedOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** ServiceM8 flags arrive as either 0/1 numbers or '0'/'1'/'true'/'yes' strings. */
export function parseServiceM8Flag(value: unknown): boolean {
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

export function parseServiceM8Number(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/** `badges` is a JSON array of Badge UUIDs serialised into a string column. */
export function parseServiceM8Badges(raw: string | null | undefined): string[] {
  const value = trimmedOrNull(raw);
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim()))
        .filter((entry) => entry.length > 0);
    }
  } catch {
    // Fall through - a few records store a comma separated list instead of JSON.
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Collapses the multi-line address text blobs into a single display line. */
export function flattenAddressText(raw: string | null | undefined): string | null {
  const value = trimmedOrNull(raw);
  if (!value) {
    return null;
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(', ');
}

function joinParts(parts: Array<string | null | undefined>, separator = ', '): string | null {
  const cleaned = parts
    .map((part) => trimmedOrNull(part ?? null))
    .filter((part): part is string => part !== null);

  return cleaned.length > 0 ? cleaned.join(separator) : null;
}

export interface StructuredAddressInput {
  raw: string | null | undefined;
  street?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  postcode?: string | null | undefined;
  country?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

/**
 * Builds the structured address used across the API responses.
 *
 * ServiceM8 stores both a flattened multi-line address and, for clients and
 * geocoded jobs, the individual components. We prefer the components (they are
 * what forms need) and fall back to the flattened value.
 */
export function buildServiceM8Address(input: StructuredAddressInput): ServiceM8Address {
  const raw = trimmedOrNull(input.raw ?? null);
  const street = trimmedOrNull(input.street ?? null);
  const city = trimmedOrNull(input.city ?? null);
  const state = trimmedOrNull(input.state ?? null);
  const postcode = trimmedOrNull(input.postcode ?? null);
  const country = trimmedOrNull(input.country ?? null);

  const fromComponents = joinParts([street, city, state, postcode, country]);
  const fromRaw = flattenAddressText(raw);

  return {
    formatted: fromComponents ?? fromRaw,
    raw,
    street,
    city,
    state,
    postcode,
    country,
    latitude: parseServiceM8Number(input.latitude ?? null),
    longitude: parseServiceM8Number(input.longitude ?? null),
  };
}

export function buildServiceM8ContactName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null {
  return joinParts([firstName ?? null, lastName ?? null], ' ');
}

export function normalizeServiceM8Contact(contact: ServiceM8CompanyContact): ServiceM8ContactRecord {
  const firstName = trimmedOrNull(contact.first);
  const lastName = trimmedOrNull(contact.last);

  return {
    uuid: contact.uuid,
    firstName,
    lastName,
    fullName: buildServiceM8ContactName(firstName, lastName),
    email: trimmedOrNull(contact.email),
    phone: trimmedOrNull(contact.phone),
    mobile: trimmedOrNull(contact.mobile),
    type: trimmedOrNull(contact.type),
    isPrimary: parseServiceM8Flag(contact.is_primary_contact),
    active: contact.active ?? 1,
    editDate: trimmedOrNull(contact.edit_date),
  };
}

/**
 * Picks the contact that should represent a client: the flagged primary
 * contact, else the billing contact, else the first job contact, else any
 * contact that actually carries reachable details.
 */
export function selectPrimaryServiceM8Contact(
  contacts: ServiceM8ContactRecord[],
): ServiceM8ContactRecord | null {
  if (contacts.length === 0) {
    return null;
  }

  const byType = (type: string) =>
    contacts.find((contact) => contact.type?.trim().toUpperCase() === type);

  return (
    contacts.find((contact) => contact.isPrimary) ??
    byType('BILLING') ??
    byType('JOB') ??
    contacts.find((contact) => contact.email || contact.phone || contact.mobile) ??
    contacts[0] ??
    null
  );
}

export function getServiceM8FileExtension(
  fileName: string | null | undefined,
  fileType: string | null | undefined,
): string | null {
  const explicit = trimmedOrNull(fileType ?? null);
  if (explicit) {
    return explicit.startsWith('.') ? explicit.toLowerCase() : `.${explicit.toLowerCase()}`;
  }

  const name = trimmedOrNull(fileName ?? null);
  if (!name) {
    return null;
  }

  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return null;
  }

  return name.slice(dotIndex).toLowerCase();
}

export function normalizeServiceM8Attachment(
  attachment: ServiceM8Attachment,
): ServiceM8AttachmentRecord {
  const fileName = trimmedOrNull(attachment.attachment_name);
  const extension = getServiceM8FileExtension(fileName, attachment.file_type);
  const isImage = extension !== null && IMAGE_EXTENSIONS.has(extension);
  const mimeType = extension ? MIME_BY_EXTENSION[extension] ?? null : null;

  return {
    uuid: attachment.uuid,
    relatedObject: trimmedOrNull(attachment.related_object),
    relatedObjectUuid: trimmedOrNull(attachment.related_object_uuid),
    name: fileName,
    fileName,
    extension,
    mimeType,
    isImage,
    width: parseServiceM8Number(attachment.photo_width),
    height: parseServiceM8Number(attachment.photo_height),
    latitude: parseServiceM8Number(attachment.lat),
    longitude: parseServiceM8Number(attachment.lng),
    tags: (trimmedOrNull(attachment.tags) ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
    source: trimmedOrNull(attachment.attachment_source),
    isFavourite: parseServiceM8Flag(attachment.is_favourite),
    createdByStaffUuid: trimmedOrNull(attachment.created_by_staff_uuid),
    createdAt: trimmedOrNull(attachment.timestamp),
    updatedAt: trimmedOrNull(attachment.edit_date),
    fileUrl: `/api/servicem8/attachments/${attachment.uuid}/file`,
  };
}

export interface NormalizeClientInput {
  contacts?: ServiceM8ContactRecord[];
  attachments?: ServiceM8AttachmentRecord[];
}

/**
 * Merges a Company record with its contacts and attachments.
 *
 * Contact values win over company values for email/phone, because the Company
 * record does not carry contact details at all.
 */
export function normalizeServiceM8Client(
  company: ServiceM8Company,
  input: NormalizeClientInput = {},
): ServiceM8ClientRecord {
  const contacts = input.contacts ?? [];
  const primaryContact = selectPrimaryServiceM8Contact(contacts);

  const companyName = trimmedOrNull(company.name);
  const firstName = primaryContact?.firstName ?? null;
  const lastName = primaryContact?.lastName ?? null;
  const contactName = primaryContact?.fullName ?? buildServiceM8ContactName(firstName, lastName);

  const addressDetails = buildServiceM8Address({
    raw: company.address,
    street: company.address_street,
    city: company.address_city,
    state: company.address_state,
    postcode: company.address_postcode,
    country: company.address_country,
  });

  const billingAddressDetails = buildServiceM8Address({
    raw: company.billing_address,
  });

  return {
    uuid: company.uuid,
    name: companyName ?? contactName ?? UNNAMED_CLIENT,
    companyName,
    firstName,
    lastName,
    billingContactName: contactName,
    email: primaryContact?.email ?? null,
    phone: primaryContact?.phone ?? primaryContact?.mobile ?? null,
    mobile: primaryContact?.mobile ?? null,
    faxNumber: trimmedOrNull(company.fax_number),
    website: trimmedOrNull(company.website),
    abnNumber: trimmedOrNull(company.abn_number),
    isIndividual: parseServiceM8Flag(company.is_individual),
    parentCompanyUuid: trimmedOrNull(company.parent_company_uuid),
    address: addressDetails.formatted,
    billingAddress: billingAddressDetails.formatted,
    addressDetails,
    billingAddressDetails,
    postcode: addressDetails.postcode ?? billingAddressDetails.postcode,
    billingPostcode: billingAddressDetails.postcode,
    billingAttention: trimmedOrNull(company.billing_attention),
    paymentTerms: trimmedOrNull(company.payment_terms),
    taxRateUuid: trimmedOrNull(company.tax_rate_uuid),
    depositPercent: parseServiceM8Number(company.deposit_percent),
    badges: parseServiceM8Badges(company.badges),
    active: company.active ?? 1,
    editDate: trimmedOrNull(company.edit_date),
    contacts,
    images: (input.attachments ?? []).filter((attachment) => attachment.isImage),
    openInServiceM8Url: `https://go.servicem8.com/OpenClient/${company.uuid}`,
  };
}

export interface NormalizeJobInput {
  client?: ServiceM8ClientRecord | null;
}

/**
 * Normalises a job, optionally enriching it with the linked client's details.
 *
 * The job's own work address always wins for the site address; the client is
 * only used to fill in the customer/contact fields and as an address fallback.
 */
export function normalizeServiceM8Job(
  job: ServiceM8Job,
  input: NormalizeJobInput = {},
): ServiceM8JobRecord {
  const client = input.client ?? null;

  const geoNumber = trimmedOrNull(job.geo_number);
  const geoStreet = trimmedOrNull(job.geo_street);

  const jobWorkAddress = buildServiceM8Address({
    raw: job.job_address,
    street: geoNumber && geoStreet ? `${geoNumber} ${geoStreet}` : geoStreet,
    city: job.geo_city,
    state: job.geo_state,
    postcode: job.geo_postcode,
    country: job.geo_country,
    latitude: job.lat,
    longitude: job.lng,
  });

  const resolvedWorkAddress = jobWorkAddress.formatted ?? client?.addressDetails.formatted ?? null;

  const jobBillingAddress = buildServiceM8Address({ raw: job.billing_address });
  const billingAddressDetails =
    jobBillingAddress.formatted !== null
      ? jobBillingAddress
      : client?.billingAddressDetails ?? EMPTY_SERVICEM8_ADDRESS;

  const contactName =
    client?.billingContactName ??
    buildServiceM8ContactName(client?.firstName ?? null, client?.lastName ?? null);

  const companyName = client?.companyName ?? client?.name ?? null;
  const badges = parseServiceM8Badges(job.badges);
  const companyUuid = trimmedOrNull(job.company_uuid);

  return {
    uuid: job.uuid,
    generatedJobId: trimmedOrNull(job.generated_job_id),
    status: trimmedOrNull(job.status),
    address: resolvedWorkAddress,
    billingAddress: billingAddressDetails.formatted,
    workAddress: resolvedWorkAddress,
    postcode: jobWorkAddress.postcode ?? client?.postcode ?? null,
    billingPostcode: billingAddressDetails.postcode ?? client?.billingPostcode ?? null,
    workAddressDetails: {
      ...jobWorkAddress,
      formatted: resolvedWorkAddress,
    },
    billingAddressDetails,
    description: trimmedOrNull(job.job_description),
    workDoneDescription: trimmedOrNull(job.work_done_description),
    date: trimmedOrNull(job.date),
    completionDate: trimmedOrNull(job.completion_date),
    quoteDate: trimmedOrNull(job.quote_date),
    workOrderDate: trimmedOrNull(job.work_order_date),
    invoiceDate: trimmedOrNull(job.invoice_date),
    unsuccessfulDate: trimmedOrNull(job.unsuccessful_date),
    editDate: trimmedOrNull(job.edit_date),
    jobIsScheduledUntil: trimmedOrNull(job.job_is_scheduled_until_stamp),
    companyUuid,
    companyName,
    categoryUuid: trimmedOrNull(job.category_uuid),
    badge: badges[0] ?? null,
    badges,
    firstName: client?.firstName ?? null,
    lastName: client?.lastName ?? null,
    email: client?.email ?? null,
    phone: client?.phone ?? null,
    mobile: client?.mobile ?? null,
    billingContactName: contactName,
    customerName: contactName ?? companyName,
    customerUuid: companyUuid,
    purchaseOrderNumber: trimmedOrNull(job.purchase_order_number),
    totalInvoiceAmount: parseServiceM8Number(job.total_invoice_amount),
    paymentReceived: parseServiceM8Flag(job.payment_received),
    invoiceSent: parseServiceM8Flag(job.invoice_sent),
    quoteSent: parseServiceM8Flag(job.quote_sent),
    active: job.active ?? 1,
    openInServiceM8Url: `https://go.servicem8.com/OpenJob/${job.uuid}`,
  };
}

/** Groups a flat contact list by `company_uuid` for O(1) client lookups. */
export function groupContactsByCompany(
  contacts: ServiceM8CompanyContact[],
): Map<string, ServiceM8ContactRecord[]> {
  const grouped = new Map<string, ServiceM8ContactRecord[]>();

  for (const contact of contacts) {
    const companyUuid = trimmedOrNull(contact.company_uuid);
    if (!companyUuid) {
      continue;
    }

    const normalized = normalizeServiceM8Contact(contact);
    const bucket = grouped.get(companyUuid);
    if (bucket) {
      bucket.push(normalized);
    } else {
      grouped.set(companyUuid, [normalized]);
    }
  }

  return grouped;
}

/** Groups a flat attachment list by `related_object_uuid`. */
export function groupAttachmentsByObject(
  attachments: ServiceM8Attachment[],
  relatedObject?: string,
): Map<string, ServiceM8AttachmentRecord[]> {
  const grouped = new Map<string, ServiceM8AttachmentRecord[]>();

  for (const attachment of attachments) {
    if (relatedObject && trimmedOrNull(attachment.related_object) !== relatedObject) {
      continue;
    }

    const objectUuid = trimmedOrNull(attachment.related_object_uuid);
    if (!objectUuid) {
      continue;
    }

    const normalized = normalizeServiceM8Attachment(attachment);
    const bucket = grouped.get(objectUuid);
    if (bucket) {
      bucket.push(normalized);
    } else {
      grouped.set(objectUuid, [normalized]);
    }
  }

  return grouped;
}

/** Human readable size, used by attachment listings. */
export function formatByteSize(bytes: number | null | undefined): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = value >= 10 || unitIndex === 0 ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded} ${units[unitIndex]}`;
}

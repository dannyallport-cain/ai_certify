import { NextRequest, NextResponse } from 'next/server';
import {
  ServiceM8Client,
  ServiceM8Client_API,
  ServiceM8CompanyContact,
  ServiceM8Job,
  ServiceM8JobAttachment,
} from '@/lib/servicem8/client';
import { getMobileUser } from '@/lib/auth/mobile';

export interface ServiceM8ConnectionStatus {
  connected: boolean;
  connection: {
    teamId: number;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
}

export interface ServiceM8ClientRecord {
  uuid: string;
  name: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  billingContactName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  billingAddress: string | null;
  postcode: string | null;
  billingPostcode: string | null;
}

export interface ServiceM8ContactDetails {
  email: string | null;
  phone: string | null;
  mobile: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface ServiceM8JobRecord {
  uuid: string;
  generatedJobId: string | null;
  status: string | null;
  address: string | null;
  billingAddress: string | null;
  workAddress: string | null;
  postcode: string | null;
  billingPostcode: string | null;
  description: string | null;
  workDoneDescription: string | null;
  date: string | null;
  completionDate: string | null;
  companyUuid: string | null;
  companyName: string | null;
  categoryUuid: string | null;
  badge: string | null;
  firstName: string | null;
  lastName: string | null;
  billingContactName: string | null;
  customerName: string | null;
  customerUuid: string | null;
}

export interface ServiceM8AttachmentRecord {
  uuid: string;
  jobUuid: string | null;
  name: string | null;
  fileName: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  downloadUrl: string | null;
  previewUrl: string | null;
  isImage: boolean;
}

export interface ServiceM8JobDetail extends ServiceM8JobRecord {
  customer: ServiceM8ClientRecord | null;
  attachments: ServiceM8AttachmentRecord[];
}

export async function getMobileServiceM8Client(request: NextRequest) {
  const mobileSession = await getMobileUser(request);

  if (!mobileSession?.user || !mobileSession.team?.id) {
    return {
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }

  const serviceM8Client =
    (mobileSession.user.id != null
      ? await ServiceM8Client_API.fromUserId(mobileSession.user.id)
      : null) ?? (await ServiceM8Client_API.fromTeamId(mobileSession.team.id));

  if (!serviceM8Client) {
    return {
      error: NextResponse.json({ error: 'ServiceM8 not connected' }, { status: 400 }),
    };
  }

  return {
    mobileSession,
    teamId: mobileSession.team.id,
    serviceM8Client,
  };
}

export function buildServiceM8DisplayName(input: {
  name?: string | null;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const name = input.name?.trim();
  if (name) return name;

  const companyName = input.companyName?.trim();
  if (companyName) return companyName;

  const personName = [input.firstName?.trim(), input.lastName?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();

  return personName || 'Unnamed ServiceM8 customer';
}

export function buildServiceM8ContactName(firstName?: string | null, lastName?: string | null) {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ').trim() || null;
}

export function buildServiceM8Address(input: {
  address?: string | null;
  street?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
}) {
  const line1 = [input.street?.trim(), input.address2?.trim()].filter(Boolean).join(' ').trim();
  const cityOrState = input.city?.trim() || input.state?.trim() || '';
  const postcode = input.postcode?.trim() || '';

  const structuredAddress = [line1, cityOrState, postcode].filter(Boolean).join(', ');
  if (structuredAddress) {
    return structuredAddress;
  }

  return input.address?.trim() || null;
}

function isPrimaryCompanyContact(contact: ServiceM8CompanyContact) {
  const value = contact.is_primary_contact?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export function selectPrimaryServiceM8Contact(contacts: ServiceM8CompanyContact[]) {
  return (
    contacts.find((contact) => isPrimaryCompanyContact(contact)) ??
    contacts.find((contact) => contact.type?.trim().toUpperCase() === 'BILLING') ??
    contacts.find((contact) => contact.type?.trim().toUpperCase() === 'JOB') ??
    contacts[0] ??
    null
  );
}

export function extractServiceM8ContactDetails(
  contact: ServiceM8CompanyContact | null,
): ServiceM8ContactDetails {
  return {
    email: contact?.email || null,
    phone: contact?.phone || contact?.mobile || null,
    mobile: contact?.mobile || null,
    firstName: contact?.first || null,
    lastName: contact?.last || null,
  };
}

export async function loadServiceM8ContactDetails(
  serviceM8Client: ServiceM8Client_API,
  companyUuid: string,
): Promise<ServiceM8ContactDetails> {
  try {
    const contacts = await serviceM8Client.getCompanyContacts(
      `company_uuid eq '${companyUuid}' and active eq 1`,
    );
    return extractServiceM8ContactDetails(selectPrimaryServiceM8Contact(contacts));
  } catch (error) {
    console.warn('Failed to load ServiceM8 company contacts', error);
    return {
      email: null,
      phone: null,
      mobile: null,
      firstName: null,
      lastName: null,
    };
  }
}

export function normalizeServiceM8Client(
  client: ServiceM8Client,
  contactDetails?: ServiceM8ContactDetails,
): ServiceM8ClientRecord {
  const firstName = contactDetails?.firstName ?? client.first_name ?? null;
  const lastName = contactDetails?.lastName ?? client.last_name ?? null;
  const billingContactName = buildServiceM8ContactName(firstName, lastName);

  return {
    uuid: client.uuid,
    name: buildServiceM8DisplayName({
      name: client.name,
      companyName: client.company_name,
      firstName,
      lastName,
    }),
    companyName: client.company_name ?? client.name ?? null,
    firstName,
    lastName,
    billingContactName,
    email: contactDetails?.email ?? client.email ?? null,
    phone: contactDetails?.phone ?? client.phone ?? client.mobile ?? null,
    mobile: contactDetails?.mobile ?? client.mobile ?? null,
    address: buildServiceM8Address({
      address: client.address,
      street: client.address_street,
      city: client.address_city,
      state: client.address_state,
      postcode: client.address_postcode,
      country: client.address_country,
    }),
    billingAddress: buildServiceM8Address({
      address: client.billing_address,
      street: client.billing_address2,
      city: client.billing_city,
      state: client.billing_state,
      postcode: client.billing_postcode,
      country: client.billing_country,
    }),
    postcode: client.address_postcode || client.billing_postcode || null,
    billingPostcode: client.billing_postcode || null,
  };
}

export function normalizeServiceM8Job(job: ServiceM8Job, client: ServiceM8ClientRecord | null = null): ServiceM8JobRecord {
  const billingContactName =
    client?.billingContactName ||
    buildServiceM8ContactName(client?.firstName ?? job.first_name ?? null, client?.lastName ?? job.last_name ?? null);

  const workAddress = client?.address ?? job.job_address ?? null;
  const billingAddress = client?.billingAddress ?? null;

  return {
    uuid: job.uuid,
    generatedJobId: job.generated_job_id || null,
    status: job.status || null,
    address: workAddress,
    billingAddress,
    workAddress,
    postcode: client?.postcode ?? null,
    billingPostcode: client?.billingPostcode ?? null,
    description: job.job_description || null,
    workDoneDescription: job.work_done_description || null,
    date: job.date || null,
    completionDate: job.completion_date || null,
    companyUuid: job.company_uuid || null,
    companyName: client?.companyName ?? client?.name ?? null,
    categoryUuid: job.category_uuid || null,
    badge: job.badge || null,
    firstName: client?.firstName ?? job.first_name ?? null,
    lastName: client?.lastName ?? job.last_name ?? null,
    billingContactName,
    customerName: billingContactName,
    customerUuid: job.company_uuid || null,
  };
}

function getExtensionFromName(name: string | null) {
  if (!name) {
    return null;
  }

  const parts = name.split('.');
  if (parts.length < 2) {
    return null;
  }

  return parts[parts.length - 1]?.toLowerCase() || null;
}

function isImageAttachment(input: { fileName: string | null; mimeType: string | null }) {
  if (input.mimeType?.toLowerCase().startsWith('image/')) {
    return true;
  }

  const extension = getExtensionFromName(input.fileName);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tif', 'tiff'].includes(
    extension ?? '',
  );
}

export async function normalizeServiceM8Attachment(
  serviceM8Client: ServiceM8Client_API,
  attachment: ServiceM8JobAttachment,
): Promise<ServiceM8AttachmentRecord> {
  const download = await serviceM8Client.getJobAttachmentDownloadInfo(attachment.uuid);
  const fileName = download.fileName || attachment.file_name || attachment.attachment_name || null;
  const mimeType = download.mimeType || attachment.file_type || null;
  const isImage = isImageAttachment({ fileName, mimeType });

  return {
    uuid: attachment.uuid,
    jobUuid: attachment.job_uuid || null,
    name: attachment.attachment_name || fileName,
    fileName,
    mimeType,
    extension: getExtensionFromName(fileName),
    sizeBytes: download.contentLength,
    createdAt: attachment.timestamp || null,
    updatedAt: attachment.edit_date || null,
    downloadUrl: download.url,
    previewUrl: isImage ? download.url : null,
    isImage,
  };
}

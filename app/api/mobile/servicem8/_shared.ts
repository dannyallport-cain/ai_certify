import { NextRequest, NextResponse } from 'next/server';
import {
  ServiceM8Client,
  ServiceM8Client_API,
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
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  postcode: string | null;
}

export interface ServiceM8JobRecord {
  uuid: string;
  generatedJobId: string | null;
  status: string | null;
  address: string | null;
  description: string | null;
  workDoneDescription: string | null;
  date: string | null;
  completionDate: string | null;
  companyUuid: string | null;
  categoryUuid: string | null;
  badge: string | null;
  firstName: string | null;
  lastName: string | null;
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

  const serviceM8Client = await ServiceM8Client_API.fromTeamId(mobileSession.team.id);

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
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const companyName = input.companyName?.trim();
  if (companyName) return companyName;

  const personName = [input.firstName?.trim(), input.lastName?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();

  return personName || 'Unnamed ServiceM8 customer';
}

export function buildServiceM8Address(input: {
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
}) {
  const value = [
    input.address?.trim(),
    input.address2?.trim(),
    input.city?.trim(),
    input.state?.trim(),
    input.postcode?.trim(),
    input.country?.trim(),
  ]
    .filter(Boolean)
    .join(', ');

  return value || null;
}

export function normalizeServiceM8Client(client: ServiceM8Client): ServiceM8ClientRecord {
  return {
    uuid: client.uuid,
    name: buildServiceM8DisplayName({
      companyName: client.company_name,
      firstName: client.first_name,
      lastName: client.last_name,
    }),
    companyName: client.company_name || null,
    firstName: client.first_name || null,
    lastName: client.last_name || null,
    email: client.email || null,
    phone: client.phone || client.mobile || null,
    mobile: client.mobile || null,
    address: buildServiceM8Address({
      address: client.billing_address,
      address2: client.billing_address2,
      city: client.billing_city,
      state: client.billing_state,
      postcode: client.billing_postcode,
      country: client.billing_country,
    }),
    postcode: client.billing_postcode || null,
  };
}

export function normalizeServiceM8Job(job: ServiceM8Job): ServiceM8JobRecord {
  const customerName = buildServiceM8DisplayName({
    companyName: null,
    firstName: job.first_name,
    lastName: job.last_name,
  });

  return {
    uuid: job.uuid,
    generatedJobId: job.generated_job_id || null,
    status: job.status || null,
    address: job.job_address || null,
    description: job.job_description || null,
    workDoneDescription: job.work_done_description || null,
    date: job.date || null,
    completionDate: job.completion_date || null,
    companyUuid: job.company_uuid || null,
    categoryUuid: job.category_uuid || null,
    badge: job.badge || null,
    firstName: job.first_name || null,
    lastName: job.last_name || null,
    customerName: customerName === 'Unnamed ServiceM8 customer' ? null : customerName,
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
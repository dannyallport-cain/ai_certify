import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  certificates,
  certificateItems,
  customers,
  servicem8Connections,
  servicem8JobMappings,
  teams,
} from '@/lib/db/schema';
import { generateCertificatePDF, type CertificateData } from '@/lib/pdf/generator';

import { ServiceM8Client_API, type ServiceM8Job } from './client';
import { SERVICEM8_CONFIG } from './config';

type ProcessServiceM8JobMappingResult = {
  mappingId: number;
  certificateId: number;
  servicem8JobUuid: string;
  syncStatus: 'synced' | 'error' | 'skipped';
  uploadedPdf: boolean;
  reason?: string;
};

function normalizeDateString(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 10);
}

function buildCertificateAttachmentFileName(certificateData: CertificateData) {
  const fallbackName = `certificate-${certificateData.id}`;
  const rawName = (certificateData.certificateNumber || fallbackName).trim();

  const safeName = rawName
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeName || fallbackName}.pdf`;
}

async function getCertificateForPDF(certificateId: number): Promise<CertificateData | null> {
  try {
    const certificateWithDetails = await db
      .select({
        certificate: certificates,
        customer: customers,
        team: teams,
      })
      .from(certificates)
      .leftJoin(customers, eq(certificates.customerId, customers.id))
      .leftJoin(teams, eq(certificates.teamId, teams.id))
      .where(eq(certificates.id, certificateId))
      .limit(1);

    if (certificateWithDetails.length === 0) {
      return null;
    }

    const { certificate, customer, team } = certificateWithDetails[0];

    if (!customer) {
      return null;
    }

    const items = await db
      .select()
      .from(certificateItems)
      .where(eq(certificateItems.certificateId, certificateId))
      .orderBy(certificateItems.sortOrder);

    return {
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      certificateType: certificate.certificateType,
      siteName: certificate.siteName,
      siteAddress: certificate.siteAddress,
      inspectionDate: certificate.inspectionDate,
      nextInspectionDate: certificate.nextInspectionDate,
      inspectorName: certificate.inspectorName,
      status: certificate.status,
      formData: certificate.formData as Record<string, any> | undefined,
      teamLogo: team?.logoDataUri || null,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        postcode: customer.postcode,
        contactPerson: customer.contactPerson,
      },
      items: items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        location: item.location,
        description: item.description,
        status: item.status,
        defects: item.defects,
        recommendations: item.recommendations,
      })),
    };
  } catch (error) {
    console.error('Error fetching certificate for ServiceM8 PDF sync:', error);
    return null;
  }
}

async function syncCertificateFieldsFromServiceM8Job(
  certificateId: number,
  certificate: typeof certificates.$inferSelect,
  job: ServiceM8Job,
) {
  const patch: Partial<typeof certificates.$inferInsert> & { updatedAt?: Date } = {};

  if (!certificate.siteAddress && job.job_address) {
    patch.siteAddress = job.job_address;
  }

  if (!certificate.inspectionDate) {
    const normalizedInspectionDate = normalizeDateString(job.date);
    if (normalizedInspectionDate) {
      patch.inspectionDate = normalizedInspectionDate;
    }
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  await db
    .update(certificates)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(certificates.id, certificateId));
}

async function uploadCompletedCertificatePdfIfNeeded({
  serviceM8Client,
  certificateId,
  servicem8JobUuid,
  pdfBytes,
}: {
  serviceM8Client: ServiceM8Client_API;
  certificateId: number;
  servicem8JobUuid: string;
  pdfBytes?: Uint8Array | null;
}) {
  if (!SERVICEM8_CONFIG.writeJobsEnabled) {
    return {
      uploaded: false,
      reason: 'write_jobs scope not enabled',
    };
  }

  const certificateData = await getCertificateForPDF(certificateId);
  if (!certificateData) {
    return {
      uploaded: false,
      reason: 'certificate PDF data unavailable',
    };
  }

  const fileName = buildCertificateAttachmentFileName(certificateData);
  const attachments = await serviceM8Client.getJobAttachments(servicem8JobUuid);

  const alreadyUploaded = attachments.some((attachment) => {
    const candidateName = attachment.file_name || attachment.attachment_name;
    return candidateName?.trim().toLowerCase() === fileName.toLowerCase();
  });

  if (alreadyUploaded) {
    return {
      uploaded: false,
      reason: 'attachment already exists',
    };
  }

  const bytesToUpload = pdfBytes ?? await generateCertificatePDF(certificateData);

  await serviceM8Client.uploadJobAttachment(
    servicem8JobUuid,
    Buffer.from(bytesToUpload),
    fileName,
    'application/pdf',
  );

  return {
    uploaded: true,
    reason: undefined,
  };
}

export async function processServiceM8JobMapping(
  mappingId: number,
  options: {
    pdfBytes?: Uint8Array | null;
  } = {},
): Promise<ProcessServiceM8JobMappingResult> {
  const rows = await db
    .select({
      mapping: servicem8JobMappings,
      certificate: certificates,
    })
    .from(servicem8JobMappings)
    .innerJoin(certificates, eq(servicem8JobMappings.certificateId, certificates.id))
    .where(eq(servicem8JobMappings.id, mappingId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw new Error(`ServiceM8 job mapping ${mappingId} not found`);
  }

  const { mapping, certificate } = row;

  const connectionUserId = mapping.servicem8ConnectionUserId;
  const connectionRows =
    connectionUserId != null
      ? await db
          .select()
          .from(servicem8Connections)
          .where(
            and(
              eq(servicem8Connections.userId, connectionUserId),
              eq(servicem8Connections.teamId, mapping.teamId),
            ),
          )
          .limit(1)
      : await db
          .select()
          .from(servicem8Connections)
          .where(eq(servicem8Connections.teamId, mapping.teamId))
          .limit(1);

  const connection = connectionRows[0];

  if (!connection) {
    await db
      .update(servicem8JobMappings)
      .set({
        syncStatus: 'error',
        updatedAt: new Date(),
      })
      .where(eq(servicem8JobMappings.id, mapping.id));

    return {
      mappingId: mapping.id,
      certificateId: mapping.certificateId,
      servicem8JobUuid: mapping.servicem8JobUuid,
      syncStatus: 'error',
      uploadedPdf: false,
      reason: 'ServiceM8 connection unavailable',
    };
  }

  if (!connection.syncEnabled) {
    await db
      .update(servicem8JobMappings)
      .set({
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(servicem8JobMappings.id, mapping.id));

    return {
      mappingId: mapping.id,
      certificateId: mapping.certificateId,
      servicem8JobUuid: mapping.servicem8JobUuid,
      syncStatus: 'skipped',
      uploadedPdf: false,
      reason: 'sync disabled for user connection',
    };
  }

  const serviceM8Client =
    connectionUserId != null
      ? await ServiceM8Client_API.fromUserId(connectionUserId)
      : await ServiceM8Client_API.fromTeamId(mapping.teamId);

  if (!serviceM8Client) {
    await db
      .update(servicem8JobMappings)
      .set({
        syncStatus: 'error',
        updatedAt: new Date(),
      })
      .where(eq(servicem8JobMappings.id, mapping.id));

    return {
      mappingId: mapping.id,
      certificateId: mapping.certificateId,
      servicem8JobUuid: mapping.servicem8JobUuid,
      syncStatus: 'error',
      uploadedPdf: false,
      reason: 'ServiceM8 connection unavailable',
    };
  }

  try {
    const allowPull =
      connection.syncDirection === 'from_servicem8' || connection.syncDirection === 'bidirectional';
    const allowPush =
      connection.syncDirection === 'to_servicem8' || connection.syncDirection === 'bidirectional';

    const job = await serviceM8Client.getJob(mapping.servicem8JobUuid);

    if (allowPull) {
      await syncCertificateFieldsFromServiceM8Job(mapping.certificateId, certificate, job);
    }

    let uploadedPdf = false;

    if (allowPush && certificate.status === 'completed') {
      const uploadResult = await uploadCompletedCertificatePdfIfNeeded({
        serviceM8Client,
        certificateId: mapping.certificateId,
        servicem8JobUuid: mapping.servicem8JobUuid,
        pdfBytes: options.pdfBytes,
      });
      uploadedPdf = uploadResult.uploaded;
    }

    await db
      .update(servicem8JobMappings)
      .set({
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(servicem8JobMappings.id, mapping.id));

    await db
      .update(servicem8Connections)
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        connectionUserId != null
          ? eq(servicem8Connections.userId, connectionUserId)
          : eq(servicem8Connections.teamId, mapping.teamId)
      );

    return {
      mappingId: mapping.id,
      certificateId: mapping.certificateId,
      servicem8JobUuid: mapping.servicem8JobUuid,
      syncStatus: 'synced',
      uploadedPdf,
    };
  } catch (error) {
    console.error(`Error processing ServiceM8 job mapping ${mapping.id}:`, error);

    await db
      .update(servicem8JobMappings)
      .set({
        syncStatus: 'error',
        updatedAt: new Date(),
      })
      .where(eq(servicem8JobMappings.id, mapping.id));

    return {
      mappingId: mapping.id,
      certificateId: mapping.certificateId,
      servicem8JobUuid: mapping.servicem8JobUuid,
      syncStatus: 'error',
      uploadedPdf: false,
      reason: error instanceof Error ? error.message : 'unknown sync error',
    };
  }
}

export async function processPendingServiceM8Syncs(limit = 25) {
  const pendingMappings = await db
    .select({ id: servicem8JobMappings.id })
    .from(servicem8JobMappings)
    .where(eq(servicem8JobMappings.syncStatus, 'pending'))
    .orderBy(asc(servicem8JobMappings.updatedAt), asc(servicem8JobMappings.id))
    .limit(limit);

  const results: ProcessServiceM8JobMappingResult[] = [];

  for (const pendingMapping of pendingMappings) {
    const result = await processServiceM8JobMapping(pendingMapping.id);
    results.push(result);
  }

  return {
    processed: results.length,
    synced: results.filter((result) => result.syncStatus === 'synced').length,
    errors: results.filter((result) => result.syncStatus === 'error').length,
    skipped: results.filter((result) => result.syncStatus === 'skipped').length,
    uploadedPdfs: results.filter((result) => result.uploadedPdf).length,
    results,
  };
}

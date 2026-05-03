import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  certificateItems,
  certificates,
  customers,
  servicem8JobMappings,
  type Certificate,
  type CertificateItem,
  type NewCertificate,
  type NewCertificateItem,
  type NewServiceM8JobMapping,
} from '@/lib/db/schema';
import { ActivityType } from '@/lib/db/schema';
import { logActivity } from '@/lib/db/queries';
import { getCertificateDetailPath, getCertificateEditPath } from './routes';


export type CertificateCloneResult = {
  certificate: Certificate;
  detailPath: string;
  editPath: string | null;
  isEditable: boolean;
};

const CERTIFICATE_EDITABLE_DATE_FIELDS = new Set([
  'inspectionDate',
  'dateOfLastInspection',
  'inspection_date',
  'date_of_last_inspection',
]);

function normalizeCertificateType(type: string) {
  return type.trim().replace(/-/g, '_').toUpperCase();
}

function generateCertificateNumber(certificateType: string) {
  const date = new Date();
  const year = date.getFullYear();
  const yearShort = String(year).slice(-2);
  const yearFirst = yearShort.charAt(0);
  const yearLast = yearShort.charAt(1);

  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const certTypeLetter = certificateType.charAt(0).toUpperCase();
  const certTypeNumber = Math.floor(Math.random() * 9) + 1;
  const twoRand = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  const randNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');

  return `${certTypeLetter}${certTypeNumber}${String(dayOfYear).padStart(3, '0')}${yearFirst}${twoRand}${yearLast}${randNum}`;
}

function cloneFormData(
  formData: Record<string, unknown> | null | undefined,
  inspectionDate: string
): Record<string, unknown> {
  const nextFormData = formData ? JSON.parse(JSON.stringify(formData)) as Record<string, unknown> : {};

  Object.keys(nextFormData).forEach((key) => {
    if (!CERTIFICATE_EDITABLE_DATE_FIELDS.has(key)) {
      return;
    }

    nextFormData[key] = inspectionDate;
  });

  if (typeof nextFormData.inspectionDate !== 'string') {
    nextFormData.inspectionDate = inspectionDate;
  }

  return nextFormData;
}

async function getSourceCertificateForTeam(sourceCertificateId: number, teamId: number) {
  const rows = await db
    .select({
      certificate: certificates,
      customer: {
        id: customers.id,
        name: customers.name,
      },
    })
    .from(certificates)
    .leftJoin(customers, eq(certificates.customerId, customers.id))
    .where(and(eq(certificates.id, sourceCertificateId), eq(certificates.teamId, teamId)))
    .limit(1);

  return rows[0] ?? null;
}

async function getSourceItems(certificateId: number) {
  return db
    .select()
    .from(certificateItems)
    .where(eq(certificateItems.certificateId, certificateId))
    .orderBy(certificateItems.sortOrder);
}

async function getSourceServiceM8Mapping(certificateId: number, teamId: number) {
  const mappings = await db
    .select()
    .from(servicem8JobMappings)
    .where(
      and(
        eq(servicem8JobMappings.certificateId, certificateId),
        eq(servicem8JobMappings.teamId, teamId)
      )
    )
    .orderBy(desc(servicem8JobMappings.updatedAt), desc(servicem8JobMappings.id))
    .limit(1);

  return mappings[0] ?? null;
}

export async function cloneCertificateForNewIssue({
  sourceCertificateId,
  teamId,
  userId,
  inspectionDate,
}: {
  sourceCertificateId: number;
  teamId: number;
  userId: number;
  inspectionDate: string;
}): Promise<CertificateCloneResult> {
  const source = await getSourceCertificateForTeam(sourceCertificateId, teamId);

  if (!source) {
    throw new Error('Certificate not found');
  }

  const sourceItems = await getSourceItems(source.certificate.id);
  const sourceMapping = await getSourceServiceM8Mapping(source.certificate.id, teamId);

  const newFormData = cloneFormData(
    source.certificate.formData as Record<string, unknown> | null | undefined,
    inspectionDate
  );

  const [newCertificate] = await db
    .insert(certificates)
    .values({
      customerId: source.certificate.customerId,
      certificateType: source.certificate.certificateType,
      certificateNumber: generateCertificateNumber(source.certificate.certificateType),
      siteName: source.certificate.siteName,
      siteAddress: source.certificate.siteAddress,
      inspectionDate,
      nextInspectionDate: source.certificate.nextInspectionDate,
      inspectorName: source.certificate.inspectorName,
      inspectorSignature: source.certificate.inspectorSignature,
      formData: newFormData,
      teamId,
      status: 'draft',
    } satisfies NewCertificate)
    .returning();

  if (!newCertificate) {
    throw new Error('Failed to create certificate copy');
  }

  if (sourceItems.length > 0) {
    await db.insert(certificateItems).values(
      sourceItems.map((item: CertificateItem, index) => ({
        certificateId: newCertificate.id,
        itemType: item.itemType,
        location: item.location,
        description: item.description,
        status: item.status,
        defects: item.defects,
        recommendations: item.recommendations,
        sortOrder: item.sortOrder ?? index,
      }) satisfies NewCertificateItem)
    );
  }

  if (sourceMapping) {
    await db.insert(servicem8JobMappings).values({
      teamId,
      servicem8ConnectionUserId: sourceMapping.servicem8ConnectionUserId,
      certificateId: newCertificate.id,
      servicem8JobUuid: sourceMapping.servicem8JobUuid,
      lastSyncAt: sourceMapping.lastSyncAt ?? null,
      syncStatus: 'pending',
    } satisfies NewServiceM8JobMapping);
  }

  await logActivity(teamId, userId, ActivityType.ISSUE_CERTIFICATE);

  const editPath = getCertificateEditPath(
    normalizeCertificateType(newCertificate.certificateType),
    newCertificate.id
  );

  return {
    certificate: newCertificate,
    detailPath: getCertificateDetailPath(newCertificate.id),
    editPath,
    isEditable: Boolean(editPath),
  };
}

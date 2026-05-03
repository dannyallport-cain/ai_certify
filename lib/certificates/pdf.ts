import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { certificates, certificateItems, certificateTemplates, customers } from '@/lib/db/schema';
import { generateCertificatePDF, type CertificateData, type TemplateConfig } from '@/lib/pdf/generator';

export async function getCertificatePdfData(
  certificateId: number,
  teamId?: number
): Promise<CertificateData | null> {
  const conditions = [eq(certificates.id, certificateId)];
  if (typeof teamId === 'number') {
    conditions.push(eq(certificates.teamId, teamId));
  }

  const certificateWithDetails = await db
    .select({
      certificate: certificates,
      customer: customers,
    })
    .from(certificates)
    .leftJoin(customers, eq(certificates.customerId, customers.id))
    .where(and(...conditions))
    .limit(1);

  if (certificateWithDetails.length === 0) {
    return null;
  }

  const { certificate, customer } = certificateWithDetails[0];

  if (!customer) {
    return null;
  }

  const items = await db
    .select()
    .from(certificateItems)
    .where(eq(certificateItems.certificateId, certificateId))
    .orderBy(certificateItems.sortOrder);

  let templateConfig: TemplateConfig | undefined;
  try {
    const templates = await db
      .select()
      .from(certificateTemplates)
      .where(
        and(
          eq(certificateTemplates.certificateType, certificate.certificateType),
          eq(certificateTemplates.isActive, true)
        )
      )
      .orderBy(certificateTemplates.createdAt)
      .limit(1);

    if (templates.length > 0 && templates[0].template) {
      const tpl = templates[0].template as Record<string, any>;
      if (tpl.colors) {
        templateConfig = {
          colors: tpl.colors,
          fonts: tpl.fonts,
          layout: tpl.layout,
        };
      }
    }
  } catch (error) {
    console.warn('Could not load template config for PDF:', error);
  }

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
    templateConfig,
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
}

export async function getCertificatePdfBytes(certificateId: number, teamId?: number) {
  const certificateData = await getCertificatePdfData(certificateId, teamId);
  if (!certificateData) {
    return null;
  }

  return generateCertificatePDF(certificateData);
}

import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { certificates, certificateItems, certificateTemplates, customers, teams, users, approvalSchemeTypes } from '@/lib/db/schema';
import { generateCertificatePDF, type CertificateData, type TemplateConfig } from '@/lib/pdf/generator';
import { getApprovalSchemeIds, normalizeApprovalSchemeInfo } from '@/lib/approval-schemes';

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
      user: {
        eicrProfileDefaults: users.eicrProfileDefaults,
      },
      team: {
        logoDataUri: teams.logoDataUri,
      },
    })
    .from(certificates)
    .leftJoin(customers, eq(certificates.customerId, customers.id))
    .leftJoin(users, eq(certificates.teamId, users.teamId))
    .leftJoin(teams, eq(certificates.teamId, teams.id))
    .where(and(...conditions))
    .limit(1);

  if (certificateWithDetails.length === 0) {
    return null;
  }

  const { certificate, customer, user, team } = certificateWithDetails[0];

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

  const profileDefaultsApprovalSchemes = getApprovalSchemeIds(
    user?.eicrProfileDefaults?.approvalSchemes
  );

  const certificateFormData = (certificate.formData as Record<string, any> | undefined) ?? {};
  const certificateLevelApprovalSchemes = getApprovalSchemeIds(certificateFormData.approvalSchemes);

  const selectedApprovalSchemes =
    certificateLevelApprovalSchemes.length > 0 ? certificateLevelApprovalSchemes : profileDefaultsApprovalSchemes;

  const schemeRecords =
    selectedApprovalSchemes.length > 0
      ? await db
          .select()
          .from(approvalSchemeTypes)
          .where(eq(approvalSchemeTypes.isActive, true))
      : [];

  const selectedApprovalSchemeDetails = selectedApprovalSchemes
    .map((selected) => {
      const normalizedSelected = selected.trim().toLowerCase();
      const found = schemeRecords.find((scheme) => {
        const byLabel = scheme.label?.trim().toLowerCase() === normalizedSelected;
        const byCode = scheme.code?.trim().toLowerCase() === normalizedSelected;
        return byLabel || byCode;
      });

      if (!found) return null;

      return normalizeApprovalSchemeInfo({
        id: found.label,
        code: found.code,
        label: found.label,
        shortLabel: found.shortLabel,
        description: found.description ?? '',
        accentColor: found.accentColor,
        textColor: found.textColor,
        symbol: found.symbol,
        logoSrc: found.logoSrc ?? undefined,
        logoAlt: found.logoAlt ?? undefined,
      });
    })
    .filter((scheme): scheme is NonNullable<typeof scheme> => Boolean(scheme));

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
    formData: {
      ...certificateFormData,
      approvalSchemes: selectedApprovalSchemes,
      approvalSchemeDetails: selectedApprovalSchemeDetails,
    },
    templateConfig,
    teamLogo: team?.logoDataUri ?? null,
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

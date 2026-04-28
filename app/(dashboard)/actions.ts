'use server';

import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { customers, certificates, certificateItems, teams, servicem8JobMappings, ActivityType, NewCertificate } from '@/lib/db/schema';
import { getUser, getTeamForUser } from '@/lib/db/queries'; // Keep other imports from @/lib/db/queries
import { logActivity } from '../../lib/db/queries'; // Use relative path for logActivity
import { redirect } from 'next/navigation';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { and, desc, eq } from 'drizzle-orm';
import { generateCertificatePDF, CertificateData } from '@/lib/pdf/generator';
import { processServiceM8JobMapping } from '@/lib/servicem8/sync';

// Customer schemas and actions
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  postcode: z.string().max(20).optional().or(z.literal('')),
  contactPerson: z.string().max(255).optional().or(z.literal(''))
});

export const createCustomer = validatedActionWithUser(
  createCustomerSchema,
  async (data, _, user) => {
    const team = await getTeamForUser();
    if (!team) {
      throw new Error('User not part of a team');
    }

    const [customer] = await db
      .insert(customers)
      .values({
        ...data,
        teamId: team.id,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        postcode: data.postcode || null,
        contactPerson: data.contactPerson || null
      })
      .returning();

    await logActivity(team.id, user.id, ActivityType.CREATE_CUSTOMER);

    redirect('/customers');
  }
);

const updateCustomerSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Customer name is required').max(255),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  postcode: z.string().max(20).optional().or(z.literal('')),
  contactPerson: z.string().max(255).optional().or(z.literal(''))
});

export const updateCustomer = validatedActionWithUser(
  updateCustomerSchema,
  async (data, _, user) => {
    const team = await getTeamForUser();
    if (!team) {
      throw new Error('User not part of a team');
    }

    const { id, ...updateData } = data;

    await db
      .update(customers)
      .set({
        ...updateData,
        email: updateData.email || null,
        phone: updateData.phone || null,
        address: updateData.address || null,
        postcode: updateData.postcode || null,
        contactPerson: updateData.contactPerson || null,
        updatedAt: new Date()
      })
      .where(eq(customers.id, id));

    await logActivity(team.id, user.id, ActivityType.UPDATE_CUSTOMER);

    return { success: 'Customer updated successfully' };
  }
);

// Certificate schemas and actions
const createCertificateSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().optional().or(z.literal('')),
  certificateType: z.string(),
  certificateNumber: z.string().min(1, 'Certificate number is required'),
  siteName: z.string().optional().or(z.literal('')),
  siteAddress: z.string().optional().or(z.literal('')),
  inspectionDate: z.string().optional().or(z.literal('')),
  nextInspectionDate: z.string().optional().or(z.literal('')),
  inspectorName: z.string().optional().or(z.literal('')),
  formData: z.record(z.any()).optional()
});

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

function extractServiceM8JobUuid(formValues?: Record<string, any>) {
  const rawValue = formValues?.servicem8JobUuid;

  if (typeof rawValue !== 'string') {
    return null;
  }

  const trimmedValue = rawValue.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

async function syncCertificateServiceM8JobMapping({
  teamId,
  servicem8ConnectionUserId,
  certificateId,
  servicem8JobUuid,
}: {
  teamId: number;
  servicem8ConnectionUserId: number;
  certificateId: number;
  servicem8JobUuid: string | null;
}) {
  const existingMappings = await db
    .select({ id: servicem8JobMappings.id })
    .from(servicem8JobMappings)
    .where(
      and(
        eq(servicem8JobMappings.teamId, teamId),
        eq(servicem8JobMappings.certificateId, certificateId)
      )
    )
    .limit(1);

  const existingMapping = existingMappings[0];

  if (!servicem8JobUuid) {
    if (existingMapping) {
      await db
        .delete(servicem8JobMappings)
        .where(
          and(
            eq(servicem8JobMappings.teamId, teamId),
            eq(servicem8JobMappings.certificateId, certificateId)
          )
        );
    }
    return;
  }

  if (existingMapping) {
    await db
      .update(servicem8JobMappings)
      .set({
        servicem8ConnectionUserId,
        servicem8JobUuid,
        syncStatus: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(servicem8JobMappings.id, existingMapping.id));
    return;
  }

  await db.insert(servicem8JobMappings).values({
    teamId,
    servicem8ConnectionUserId,
    certificateId,
    servicem8JobUuid,
    syncStatus: 'pending',
    lastSyncAt: null,
  });
}

async function processLatestServiceM8JobMapping({
  teamId,
  certificateId,
  pdfBytes,
}: {
  teamId: number;
  certificateId: number;
  pdfBytes?: Uint8Array | null;
}) {
  const [mapping] = await db
    .select({ id: servicem8JobMappings.id })
    .from(servicem8JobMappings)
    .where(
      and(
        eq(servicem8JobMappings.teamId, teamId),
        eq(servicem8JobMappings.certificateId, certificateId)
      )
    )
    .orderBy(desc(servicem8JobMappings.updatedAt), desc(servicem8JobMappings.id))
    .limit(1);

  if (!mapping) {
    return null;
  }

  return processServiceM8JobMapping(mapping.id, { pdfBytes });
}

export const createCertificate = validatedActionWithUser(
  createCertificateSchema,
  async (data, formData, user) => {
    const team = await getTeamForUser();
    if (!team) {
      throw new Error('User not part of a team');
    }

    // Collect all form fields into formData object
    const collectedFormData: Record<string, any> = {};
    const skipFields = ['customerId', 'customerName', 'certificateType', 'certificateNumber', 'siteName', 'siteAddress', 'inspectionDate', 'nextInspectionDate', 'inspectorName'];
    const profileDefaults = user.eicrProfileDefaults ?? {};
    
    if (formData) {
      for (const [key, value] of formData.entries()) {
        // Skip the main certificate fields that are stored separately
        if (!skipFields.includes(key)) {
          // Store all other fields as-is (inspectionSchedule, circuits, items should be JSON strings)
          collectedFormData[key] = value;
        }
      }
    }

    const rawCustomerId = (data.customerId || '').trim();
    const rawCustomerName = (data.customerName || '').trim();
    const customerNameFromLegacyField = /^[0-9]+$/.test(rawCustomerId) ? '' : rawCustomerId;
    const resolvedCustomerName = rawCustomerName || customerNameFromLegacyField;

    let resolvedCustomerId: number | null = null;

    if (/^[0-9]+$/.test(rawCustomerId)) {
      const numericCustomerId = parseInt(rawCustomerId, 10);
      const existingById = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.id, numericCustomerId), eq(customers.teamId, team.id)))
        .limit(1);

      if (existingById.length > 0) {
        resolvedCustomerId = existingById[0].id;
      }
    }

    if (!resolvedCustomerId) {
      if (!resolvedCustomerName) {
        return { error: 'Customer name is required' };
      }

      const existingByName = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.teamId, team.id), eq(customers.name, resolvedCustomerName)))
        .limit(1);

      if (existingByName.length > 0) {
        resolvedCustomerId = existingByName[0].id;
      } else {
        const [createdCustomer] = await db
          .insert(customers)
          .values({
            teamId: team.id,
            name: resolvedCustomerName,
          })
          .returning({ id: customers.id });
        resolvedCustomerId = createdCustomer.id;
      }
    }

    const newCertificateData: NewCertificate = {
      customerId: resolvedCustomerId,
      certificateType: data.certificateType,
      certificateNumber: data.certificateNumber,
      siteName: data.siteName || null,
      siteAddress: data.siteAddress || null,
      inspectionDate: data.inspectionDate || null, // Pass string directly
      nextInspectionDate: data.nextInspectionDate || null, // Pass string directly
      inspectorName: data.inspectorName || user.name || null,
      formData: {
        ...profileDefaults,
        ...collectedFormData,
      },
      teamId: team.id,
      status: 'draft'
    };

    const [certificate] = await db
      .insert(certificates)
      .values(newCertificateData)
      .returning();

    await syncCertificateServiceM8JobMapping({
      teamId: team.id,
      servicem8ConnectionUserId: user.id,
      certificateId: certificate.id,
      servicem8JobUuid: extractServiceM8JobUuid(collectedFormData),
    });

    try {
      await processLatestServiceM8JobMapping({
        teamId: team.id,
        certificateId: certificate.id,
      });
    } catch (error) {
      console.error('Error processing ServiceM8 mapping after certificate creation:', error);
    }

    // Insert observations/items submitted via the form into the certificateItems table
    const rawItems = collectedFormData.items;
    if (rawItems) {
      try {
        const parsedItems: Array<Record<string, any>> = typeof rawItems === 'string'
          ? JSON.parse(rawItems)
          : rawItems;
        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          await db.insert(certificateItems).values(
            parsedItems.map((item, idx) => ({
              certificateId: certificate.id,
              itemType: item.itemType || 'observation',
              location: item.location || null,
              description: item.description || null,
              status: item.status || 'satisfactory',
              defects: item.defects || null,
              recommendations: item.recommendations || null,
              sortOrder: idx,
            }))
          );
        }
      } catch {
        // Non-critical – proceed without items if parsing fails
      }
    }

    await logActivity(team.id, user.id, ActivityType.CREATE_CERTIFICATE);

    redirect(`/certificates/${certificate.id}`);
  }
);

const duplicateCertificateSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function duplicateCertificate(formData: FormData) {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const parsed = duplicateCertificateSchema.safeParse({
    id: formData.get('id'),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || 'Invalid certificate id');
  }

  const team = await getTeamForUser();
  if (!team) {
    throw new Error('User not part of a team');
  }

  const [sourceCertificate] = await db
    .select()
    .from(certificates)
    .where(and(eq(certificates.id, parsed.data.id), eq(certificates.teamId, team.id)))
    .limit(1);

  if (!sourceCertificate) {
    throw new Error('Certificate not found');
  }

  const sourceItems = await db
    .select()
    .from(certificateItems)
    .where(eq(certificateItems.certificateId, sourceCertificate.id))
    .orderBy(certificateItems.sortOrder);

  const [certificate] = await db
    .insert(certificates)
    .values({
      customerId: sourceCertificate.customerId,
      certificateType: sourceCertificate.certificateType,
      certificateNumber: generateCertificateNumber(sourceCertificate.certificateType),
      siteName: sourceCertificate.siteName,
      siteAddress: sourceCertificate.siteAddress,
      inspectionDate: sourceCertificate.inspectionDate,
      nextInspectionDate: sourceCertificate.nextInspectionDate,
      inspectorName: sourceCertificate.inspectorName,
      inspectorSignature: sourceCertificate.inspectorSignature,
      formData: sourceCertificate.formData || {},
      teamId: team.id,
      status: 'draft',
    })
    .returning();

  if (sourceItems.length > 0) {
    await db.insert(certificateItems).values(
      sourceItems.map((item) => ({
        certificateId: certificate.id,
        itemType: item.itemType,
        location: item.location,
        description: item.description,
        status: item.status,
        defects: item.defects,
        recommendations: item.recommendations,
        sortOrder: item.sortOrder,
      }))
    );
  }

  await logActivity(team.id, user.id, ActivityType.CREATE_CERTIFICATE);

  redirect(`/certificates/${certificate.id}`);
}

const updateCertificateSchema = z.object({
  id: z.number(),
  certificateNumber: z.string().min(1, 'Certificate number is required'),
  siteName: z.string().optional().or(z.literal('')),
  siteAddress: z.string().optional().or(z.literal('')),
  inspectionDate: z.string().optional().or(z.literal('')),
  nextInspectionDate: z.string().optional().or(z.literal('')),
  inspectorName: z.string().optional().or(z.literal('')),
  formData: z.record(z.any()).optional(),
  status: z.string().optional()
});

export const updateCertificate = validatedActionWithUser(
  updateCertificateSchema,
  async (data, formData, user) => {
    const team = await getTeamForUser();
    if (!team) {
      throw new Error('User not part of a team');
    }

    const { id, ...updateData } = data;

    const collectedFormData: Record<string, any> = {};
    const skipFields = [
      'customerId',
      'customerName',
      'certificateType',
      'certificateNumber',
      'siteName',
      'siteAddress',
      'inspectionDate',
      'nextInspectionDate',
      'inspectorName'
    ];

    if (formData) {
      for (const [key, value] of formData.entries()) {
        if (!skipFields.includes(key)) {
          collectedFormData[key] = value;
        }
      }
    }

    const resolvedFormData =
      Object.keys(collectedFormData).length > 0 ? collectedFormData : (updateData.formData || {});

    // Get the current certificate to check status change
    const currentCertificate = await db
      .select({ status: certificates.status })
      .from(certificates)
      .where(eq(certificates.id, id))
      .limit(1);

    const wasCompleted = currentCertificate[0]?.status === 'completed';
    const isNowCompleted = updateData.status === 'completed';

    await db
      .update(certificates)
      .set({
        ...updateData,
        siteName: updateData.siteName || null,
        siteAddress: updateData.siteAddress || null,
        inspectionDate: updateData.inspectionDate || null,
        nextInspectionDate: updateData.nextInspectionDate || null,
        inspectorName: updateData.inspectorName || null,
        formData: resolvedFormData,
        updatedAt: new Date()
      })
      .where(eq(certificates.id, id));

    await syncCertificateServiceM8JobMapping({
      teamId: team.id,
      servicem8ConnectionUserId: user.id,
      certificateId: id,
      servicem8JobUuid: extractServiceM8JobUuid(resolvedFormData),
    });

    await db.delete(certificateItems).where(eq(certificateItems.certificateId, id));

    const rawItems = resolvedFormData.items;
    if (rawItems) {
      try {
        const parsedItems: Array<Record<string, any>> = typeof rawItems === 'string'
          ? JSON.parse(rawItems)
          : rawItems;
        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          await db.insert(certificateItems).values(
            parsedItems.map((item, idx) => ({
              certificateId: id,
              itemType: item.itemType || 'observation',
              location: item.location || null,
              description: item.description || null,
              status: item.status || 'satisfactory',
              defects: item.defects || null,
              recommendations: item.recommendations || null,
              sortOrder: idx,
            }))
          );
        }
      } catch {
        // Non-critical – proceed without items if parsing fails
      }
    }

    await logActivity(team.id, user.id, ActivityType.UPDATE_CERTIFICATE);

    let completedPdfBytes: Uint8Array | null = null;

    // Auto-generate PDF when certificate is completed for the first time
    if (!wasCompleted && isNowCompleted) {
      try {
        const certificateData = await getCertificateForPDF(id);
        if (certificateData) {
          completedPdfBytes = generateCertificatePDF(certificateData);
          await logActivity(team.id, user.id, ActivityType.EXPORT_CERTIFICATE);
        }
      } catch (error) {
        console.error('Error auto-generating PDF:', error);
        // Don't fail the update if PDF generation fails
      }
    }

    try {
      await processLatestServiceM8JobMapping({
        teamId: team.id,
        certificateId: id,
        pdfBytes: completedPdfBytes,
      });
    } catch (error) {
      console.error('Error processing ServiceM8 mapping after certificate update:', error);
    }

    return { success: 'Certificate updated successfully' };
  }
);

const addCertificateItemSchema = z.object({
  certificateId: z.number(),
  itemType: z.string(),
  location: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  status: z.string(),
  defects: z.string().optional().or(z.literal('')),
  recommendations: z.string().optional().or(z.literal('')),
  sortOrder: z.number().optional()
});

export const addCertificateItem = validatedActionWithUser(
  addCertificateItemSchema,
  async (data, _, user) => {
    const team = await getTeamForUser();
    if (!team) {
      throw new Error('User not part of a team');
    }

    await db
      .insert(certificateItems)
      .values({
        ...data,
        location: data.location || null,
        description: data.description || null,
        defects: data.defects || null,
        recommendations: data.recommendations || null,
        sortOrder: data.sortOrder || 0
      });

    return { success: 'Item added successfully' };
  }
);

// Helper function to get certificate data for PDF generation
async function getCertificateForPDF(certificateId: number): Promise<CertificateData | null> {
  try {
    // Fetch certificate with customer and team
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

    // Fetch certificate items
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
      items: items.map(item => ({
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
    console.error('Error fetching certificate for PDF:', error);
    return null;
  }
}

// Export certificate as PDF action
const exportCertificatePDFSchema = z.object({
  certificateId: z.number()
});

export const exportCertificatePDF = validatedActionWithUser(
  exportCertificatePDFSchema,
  async (data, _, user) => {
    const team = await getTeamForUser();
    if (!team) {
      throw new Error('User not part of a team');
    }

    const certificateData = await getCertificateForPDF(data.certificateId);
    if (!certificateData) {
      return { error: 'Certificate not found' };
    }

    try {
      // Generate PDF
      const pdfBytes = generateCertificatePDF(certificateData);
      
      // You can save the PDF to a file system or return it as needed
      // For now, we'll return a success message
      await logActivity(team.id, user.id, ActivityType.EXPORT_CERTIFICATE);
      
      return { 
        success: 'PDF generated successfully',
        filename: `certificate-${certificateData.certificateNumber}.pdf`
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      return { error: 'Failed to generate PDF' };
    }
  }
);

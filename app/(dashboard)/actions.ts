'use server';

import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { customers, certificates, certificateItems, teams, ActivityType, NewCertificate } from '@/lib/db/schema';
import { getUser, getTeamForUser } from '@/lib/db/queries'; // Keep other imports from @/lib/db/queries
import { logActivity } from '../../lib/db/queries'; // Use relative path for logActivity
import { redirect } from 'next/navigation';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { and, eq } from 'drizzle-orm';
import { generateCertificatePDF, CertificateData } from '@/lib/pdf/generator';

// Customer schemas and actions
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
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
  name: z.string().min(1, 'Company name is required').max(255),
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
      inspectorName: data.inspectorName || null,
      formData: collectedFormData,
      teamId: team.id,
      status: 'draft'
    };

    const [certificate] = await db
      .insert(certificates)
      .values(newCertificateData)
      .returning();

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
  async (data, _, user) => {
    const team = await getTeamForUser();
    if (!team) {
      throw new Error('User not part of a team');
    }

    const { id, ...updateData } = data;

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
        formData: updateData.formData || {},
        updatedAt: new Date()
      })
      .where(eq(certificates.id, id));

    await logActivity(team.id, user.id, ActivityType.UPDATE_CERTIFICATE);

    // Auto-generate PDF when certificate is completed for the first time
    if (!wasCompleted && isNowCompleted) {
      try {
        const certificateData = await getCertificateForPDF(id);
        if (certificateData) {
          const pdfBytes = generateCertificatePDF(certificateData);
          await logActivity(team.id, user.id, ActivityType.EXPORT_CERTIFICATE);
        }
      } catch (error) {
        console.error('Error auto-generating PDF:', error);
        // Don't fail the update if PDF generation fails
      }
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

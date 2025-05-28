'use server';

import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { customers, certificates, certificateItems, ActivityType, NewCertificate } from '@/lib/db/schema';
import { getUser, getTeamForUser } from '@/lib/db/queries'; // Keep other imports from @/lib/db/queries
import { logActivity } from '../../lib/db/queries'; // Use relative path for logActivity
import { redirect } from 'next/navigation';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

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

    redirect(`/customers/${customer.id}`);
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
  customerId: z.string().transform((val) => parseInt(val, 10)),
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
  async (data, _, user) => {
    const team = await getTeamForUser();
    if (!team) {
      throw new Error('User not part of a team');
    }

    const newCertificateData: NewCertificate = {
      customerId: data.customerId,
      certificateType: data.certificateType,
      certificateNumber: data.certificateNumber,
      siteName: data.siteName || null,
      siteAddress: data.siteAddress || null,
      inspectionDate: data.inspectionDate || null, // Pass string directly
      nextInspectionDate: data.nextInspectionDate || null, // Pass string directly
      inspectorName: data.inspectorName || null,
      formData: data.formData || {},
      teamId: team.id,
      status: 'draft'
    };

    const [certificate] = await db
      .insert(certificates)
      .values(newCertificateData)
      .returning();

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

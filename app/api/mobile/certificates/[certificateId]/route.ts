import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { certificates, customers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getMobileUser } from '@/lib/auth/mobile';

type MobileCertificateCustomer = {
  id: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type MobileCertificateRecord = {
  id: number;
  certificateNumber: string;
  status: string;
  siteAddress: string | null;
  inspectionDate: string | null;
  inspectorName: string | null;
  formData: unknown;
  customer: MobileCertificateCustomer | null;
};

function normalizeFormData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function formatMobileCertificate(certificate: MobileCertificateRecord) {
  const customer =
    certificate.customer?.id && certificate.customer.name
      ? {
          id: certificate.customer.id,
          name: certificate.customer.name,
          email: certificate.customer.email,
          phone: certificate.customer.phone,
          address: certificate.customer.address,
        }
      : null;

  return {
    id: certificate.id,
    certificateNumber: certificate.certificateNumber,
    status: certificate.status,
    siteAddress: certificate.siteAddress,
    inspectionDate: certificate.inspectionDate,
    inspectorName: certificate.inspectorName,
    customer,
    formData: normalizeFormData(certificate.formData),
  };
}

async function getDraftCertificate(
  teamId: number,
  certificateId: number,
): Promise<MobileCertificateRecord | undefined> {
  const [certificate] = await db
    .select({
      id: certificates.id,
      certificateNumber: certificates.certificateNumber,
      status: certificates.status,
      siteAddress: certificates.siteAddress,
      inspectionDate: certificates.inspectionDate,
      inspectorName: certificates.inspectorName,
      formData: certificates.formData,
      customer: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
      },
    })
    .from(certificates)
    .leftJoin(customers, eq(certificates.customerId, customers.id))
    .where(
      and(
        eq(certificates.id, certificateId),
        eq(certificates.teamId, teamId),
        eq(certificates.certificateType, 'EICR'),
      ),
    )
    .limit(1);

  return certificate;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { certificateId } = await params;
    const parsedCertificateId = Number(certificateId);

    if (!Number.isInteger(parsedCertificateId) || parsedCertificateId <= 0) {
      return NextResponse.json({ error: 'Invalid certificate ID' }, { status: 400 });
    }

    if (!mobileUser.team) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const certificate = await getDraftCertificate(mobileUser.team.id, parsedCertificateId);

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json(formatMobileCertificate(certificate));
  } catch (error) {
    console.error('Error fetching mobile certificate:', error);
    return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { certificateId } = await params;
    const parsedCertificateId = Number(certificateId);

    if (!Number.isInteger(parsedCertificateId) || parsedCertificateId <= 0) {
      return NextResponse.json({ error: 'Invalid certificate ID' }, { status: 400 });
    }

    if (!mobileUser.team) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const existingCertificate = await getDraftCertificate(mobileUser.team.id, parsedCertificateId);

    if (!existingCertificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    if (existingCertificate.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft certificates can be edited' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const updates: {
      siteAddress?: string | null;
      inspectionDate?: string | null;
      inspectorName?: string | null;
      formData?: Record<string, unknown>;
    } = {};

    if ('siteAddress' in body) {
      updates.siteAddress = body.siteAddress ?? null;
    }

    if ('inspectionDate' in body) {
      updates.inspectionDate =
        typeof body.inspectionDate === 'string' && body.inspectionDate.trim()
          ? body.inspectionDate
          : null;
    }

    if ('inspectorName' in body) {
      updates.inspectorName = body.inspectorName ?? null;
    }

    if ('formData' in body) {
      const existingFormData = normalizeFormData(existingCertificate.formData);
      const incomingFormData = normalizeFormData(body.formData);

      updates.formData = {
        ...existingFormData,
        ...incomingFormData,
        _updatedFromMobile: true,
      };
    } else {
      updates.formData = {
        ...normalizeFormData(existingCertificate.formData),
        _updatedFromMobile: true,
      };
    }

    await db
      .update(certificates)
      .set(updates)
      .where(
        and(
          eq(certificates.id, parsedCertificateId),
          eq(certificates.teamId, mobileUser.team.id),
          eq(certificates.certificateType, 'EICR'),
          eq(certificates.status, 'draft'),
        ),
      );

    const updatedCertificate = await getDraftCertificate(mobileUser.team.id, parsedCertificateId);

    if (!updatedCertificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json(formatMobileCertificate(updatedCertificate));
  } catch (error) {
    console.error('Error updating mobile certificate:', error);
    return NextResponse.json({ error: 'Failed to update certificate' }, { status: 500 });
  }
}

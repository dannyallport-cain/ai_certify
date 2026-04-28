import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { certificates, customers } from '@/lib/db/schema';
import { getMobileUser } from '@/lib/auth/mobile';

type MobileCertificateCustomer = {
  id: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type MobileCertificateListItem = {
  id: number;
  certificateNumber: string | null;
  status: string | null;
  siteAddress: string | null;
  inspectionDate: string | null;
  inspectorName: string | null;
  updatedAt: string | null;
  customer: MobileCertificateCustomer | null;
};

function formatCertificate(record: {
  id: number;
  certificateNumber: string | null;
  status: string | null;
  siteAddress: string | null;
  inspectionDate: string | null;
  inspectorName: string | null;
  updatedAt: Date | string | null;
  customer: MobileCertificateCustomer | null;
}): MobileCertificateListItem {
  return {
    id: record.id,
    certificateNumber: record.certificateNumber,
    status: record.status,
    siteAddress: record.siteAddress,
    inspectionDate: record.inspectionDate,
    inspectorName: record.inspectorName,
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
    customer: record.customer,
  };
}

export async function GET(request: NextRequest) {
  try {
    const mobileUser = await getMobileUser(request);

    if (!mobileUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mobileUser.team) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 });
    }

    const results = await db
      .select({
        id: certificates.id,
        certificateNumber: certificates.certificateNumber,
        status: certificates.status,
        siteAddress: certificates.siteAddress,
        inspectionDate: certificates.inspectionDate,
        inspectorName: certificates.inspectorName,
        updatedAt: certificates.updatedAt,
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
          eq(certificates.teamId, mobileUser.team.id),
          eq(certificates.certificateType, 'EICR'),
        ),
      )
      .orderBy(desc(certificates.updatedAt), desc(certificates.id));

    return NextResponse.json({
      certificates: results.map((certificate) =>
        formatCertificate({
          ...certificate,
          customer: certificate.customer?.id
            ? certificate.customer
            : null,
        }),
      ),
    });
  } catch (error) {
    console.error('Error fetching mobile certificates list:', error);
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}

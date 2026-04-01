import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { certificates, customers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getMobileUser } from '@/lib/auth/mobile';

function generateCertificateNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `CE${year}${month}${random}`;
}

export async function POST(request: NextRequest) {
  const auth = await getMobileUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auth.team) {
    return NextResponse.json({ error: 'No team found' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { customerId, siteAddress, inspectionDate, formData } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Verify customer belongs to team
    const customerResult = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(eq(customers.id, Number(customerId)), eq(customers.teamId, auth.team.id)))
      .limit(1);

    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const certificateNumber = generateCertificateNumber();
    const today = inspectionDate ?? new Date().toISOString().slice(0, 10);

    const rawFormData =
      formData && typeof formData === 'object' && !Array.isArray(formData)
        ? (formData as Record<string, unknown>)
        : {};

    const mobileCircuits = Array.isArray(rawFormData._mobileCircuits)
      ? rawFormData._mobileCircuits
      : [];

    const mappedCircuits = mobileCircuits.map((circuit, index) => {
      const item =
        circuit && typeof circuit === 'object'
          ? (circuit as Record<string, unknown>)
          : {};

      return {
        circuitNumber: String(item.circuitNumber ?? index + 1),
        designation: String(item.description ?? `Circuit ${index + 1}`),
        rating: String(item.rating ?? ''),
        deviceType: String(item.type ?? ''),
      };
    });

    const normalizedFormData = {
      ...rawFormData,
      circuits:
        Array.isArray(rawFormData.circuits) && rawFormData.circuits.length > 0
          ? rawFormData.circuits
          : mappedCircuits,
      _createdFromMobile: true,
      _mobileInspectorId: auth.user.id,
    };

    const [certificate] = await db
      .insert(certificates)
      .values({
        teamId: auth.team.id,
        customerId: Number(customerId),
        certificateType: 'EICR',
        certificateNumber,
        status: 'draft',
        siteAddress: siteAddress ?? null,
        inspectionDate: today,
        inspectorName: auth.user.name ?? null,
        formData: normalizedFormData,
      })
      .returning();

    return NextResponse.json({
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      status: certificate.status,
    }, { status: 201 });
  } catch (error) {
    console.error('Create draft certificate error:', error);
    return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
  }
}

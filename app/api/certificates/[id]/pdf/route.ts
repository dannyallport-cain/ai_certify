import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { certificates, customers, certificateItems, certificateTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateCertificatePDF, CertificateData, TemplateConfig } from '@/lib/pdf/generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const disposition = request.nextUrl.searchParams.get('disposition') === 'inline'
      ? 'inline'
      : 'attachment';

    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const certificateId = parseInt(resolvedParams.id);
    if (isNaN(certificateId)) {
      return NextResponse.json({ error: 'Invalid certificate ID' }, { status: 400 });
    }

    // Fetch certificate with customer and items
    const certificateWithDetails = await db
      .select({
        certificate: certificates,
        customer: customers,
      })
      .from(certificates)
      .leftJoin(customers, eq(certificates.customerId, customers.id))
      .where(eq(certificates.id, certificateId))
      .limit(1);

    if (certificateWithDetails.length === 0) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const { certificate, customer } = certificateWithDetails[0];

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch certificate items
    const items = await db
      .select()
      .from(certificateItems)
      .where(eq(certificateItems.certificateId, certificateId))
      .orderBy(certificateItems.sortOrder);

    // Fetch the default template for this certificate type (if one exists)
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
    } catch (err) {
      // Template lookup is non-critical – fall back to hardcoded palette
      console.warn('Could not load template config for PDF:', err);
    }

    // Prepare certificate data for PDF generation
    const certificateData: CertificateData = {
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

    // Generate PDF
    const pdfBytes = generateCertificatePDF(certificateData);
    const pdfBuffer = Buffer.from(pdfBytes);

    // Set response headers for PDF download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `${disposition}; filename="certificate-${certificate.certificateNumber}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());
    headers.set('Cache-Control', 'private, no-store, max-age=0');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

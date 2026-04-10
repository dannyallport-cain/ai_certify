import { NextRequest, NextResponse } from 'next/server';
import { isAdminRole } from '@/lib/auth/roles';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { createOneTimeCheckoutSession, getBaseUrl } from '@/lib/payments/stripe';

const TEMPLATE_PRICE_PENCE = 500; // £5.00 GBP

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Admin users do not need to pay' }, { status: 400 });
    }

    const team = await getTeamForUser();
    const body = await request.json();
    const templateName =
      typeof body.templateName === 'string' ? body.templateName.trim() : '';

    const baseUrl = getBaseUrl();

    const session = await createOneTimeCheckoutSession({
      team,
      userId: user.id,
      successUrl: `${baseUrl}/admin/reports/disseminator?payment_success={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/admin/reports/disseminator?payment_cancelled=1`,
      purchaseType: 'template_creation',
      featureId: 'report_disseminator_template',
      lineItems: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Template Creation Fee',
              description: templateName
                ? `Create template: ${templateName}`
                : 'Create a new disseminator template'
            },
            unit_amount: TEMPLATE_PRICE_PENCE
          },
          quantity: 1
        }
      ],
      metadata: {
        type: 'template_creation',
        templateName
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating template checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
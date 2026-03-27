import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { getUser } from '@/lib/db/queries';
import { isAdminRole } from '@/lib/auth/roles';

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

    const body = await request.json();
    const templateName = typeof body.templateName === 'string' ? body.templateName.trim() : '';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Template Creation Fee',
              description: templateName
                ? `Create template: ${templateName}`
                : 'Create a new disseminator template',
            },
            unit_amount: TEMPLATE_PRICE_PENCE,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/admin/reports/disseminator?payment_success={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/admin/reports/disseminator?payment_cancelled=1`,
      client_reference_id: user.id.toString(),
      metadata: {
        type: 'template_creation',
        userId: user.id.toString(),
        templateName,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating template checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

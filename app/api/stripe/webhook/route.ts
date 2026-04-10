import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import {
  handleSubscriptionChange,
  stripe,
  getMetadataValue,
  getPaymentTypeFromMetadata
} from '@/lib/payments/stripe';
import {
  getTeamByStripeCustomerId,
  updateTeamSubscription,
  upsertStripeInvoiceRecord,
  upsertStripePaymentTransaction,
  upsertStripePurchaseEntitlement
} from '@/lib/db/queries';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

type StoredPaymentStatus =
  | 'pending'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired';

function parseOptionalNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePaymentStatus(value: string | null | undefined): StoredPaymentStatus {
  switch (value) {
    case 'paid':
      return 'paid';
    case 'succeeded':
      return 'succeeded';
    case 'processing':
      return 'processing';
    case 'requires_action':
      return 'requires_action';
    case 'refunded':
      return 'refunded';
    case 'expired':
      return 'expired';
    case 'failed':
    case 'unpaid':
    case 'past_due':
      return 'failed';
    case 'cancelled':
    case 'canceled':
    case 'void':
      return 'cancelled';
    default:
      return 'pending';
  }
}

async function recordCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const paymentType = getPaymentTypeFromMetadata(session.metadata);
  const teamId = parseOptionalNumber(getMetadataValue(session.metadata, 'teamId'));
  const userId = parseOptionalNumber(getMetadataValue(session.metadata, 'userId'));
  const purchaseType = getMetadataValue(session.metadata, 'purchaseType');
  const featureId = getMetadataValue(session.metadata, 'featureId');
  const legacyType = getMetadataValue(session.metadata, 'type');

  if (teamId !== null) {
    await upsertStripePaymentTransaction({
      teamId,
      userId,
      paymentType:
        paymentType ||
        (session.mode === 'subscription' ? 'subscription' : 'one_time'),
      purchaseType,
      stripeCheckoutSessionId: session.id,
      stripeCustomerId:
        typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripeSubscriptionId:
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id,
      amountSubtotal: session.amount_subtotal ?? null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? 'gbp',
      status: normalizePaymentStatus(session.payment_status || session.status),
      mode: session.mode,
      metadata: session.metadata ?? {}
    });
  }

  if (teamId && paymentType === 'one_time') {
    await upsertStripePurchaseEntitlement({
      teamId,
      userId,
      paymentType: 'one_time',
      purchaseType: purchaseType || legacyType || 'one_time_purchase',
      featureId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id,
      stripeCustomerId:
        typeof session.customer === 'string' ? session.customer : session.customer?.id,
      status: 'active',
      metadata: session.metadata ?? {}
    });
  }

  if (legacyType === 'template_creation') {
    console.log(
      `Template creation payment completed: user=${session.metadata?.userId}, session=${session.id}`
    );
  }
}

async function recordInvoicePaid(invoice: Stripe.Invoice) {
  const stripeInvoice = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    payment_intent?: string | Stripe.PaymentIntent | null;
  };

  const customerId =
    typeof stripeInvoice.customer === 'string'
      ? stripeInvoice.customer
      : stripeInvoice.customer?.id;
  const subscriptionId =
    typeof stripeInvoice.subscription === 'string'
      ? stripeInvoice.subscription
      : stripeInvoice.subscription?.id;
  const paymentIntentId =
    typeof stripeInvoice.payment_intent === 'string'
      ? stripeInvoice.payment_intent
      : stripeInvoice.payment_intent?.id;

  const team = customerId ? await getTeamByStripeCustomerId(customerId) : null;

  if (team?.id) {
    await upsertStripeInvoiceRecord({
      teamId: team.id,
      stripeInvoiceId: stripeInvoice.id ?? '',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId ?? null,
      stripePaymentIntentId: paymentIntentId ?? null,
      amountDue: stripeInvoice.amount_due ?? null,
      amountPaid: stripeInvoice.amount_paid ?? null,
      currency: stripeInvoice.currency ?? 'gbp',
      status: normalizePaymentStatus(stripeInvoice.status),
      metadata: stripeInvoice.metadata ?? {}
    });

    await upsertStripePaymentTransaction({
      teamId: team.id,
      userId: null,
      paymentType: 'subscription',
      purchaseType:
        getMetadataValue(stripeInvoice.metadata, 'purchaseType') || 'subscription_invoice',
      stripeInvoiceId: stripeInvoice.id ?? '',
      stripeCheckoutSessionId: null,
      stripeCustomerId: customerId ?? null,
      stripeSubscriptionId: subscriptionId ?? null,
      stripePaymentIntentId: paymentIntentId ?? null,
      amountSubtotal: stripeInvoice.amount_due ?? null,
      amountTotal: stripeInvoice.amount_paid ?? null,
      currency: stripeInvoice.currency ?? 'gbp',
      status: normalizePaymentStatus(stripeInvoice.status),
      mode: 'subscription',
      metadata: stripeInvoice.metadata ?? {}
    });
  }

  if (team?.id && subscriptionId) {
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: team.stripeProductId,
      planName: team.planName,
      subscriptionStatus: 'active'
    });
  }
}

async function recordInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeInvoice = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    payment_intent?: string | Stripe.PaymentIntent | null;
  };

  const customerId =
    typeof stripeInvoice.customer === 'string'
      ? stripeInvoice.customer
      : stripeInvoice.customer?.id;
  const subscriptionId =
    typeof stripeInvoice.subscription === 'string'
      ? stripeInvoice.subscription
      : stripeInvoice.subscription?.id;
  const paymentIntentId =
    typeof stripeInvoice.payment_intent === 'string'
      ? stripeInvoice.payment_intent
      : stripeInvoice.payment_intent?.id;

  const team = customerId ? await getTeamByStripeCustomerId(customerId) : null;

  if (team?.id) {
    await upsertStripeInvoiceRecord({
      teamId: team.id,
      stripeInvoiceId: stripeInvoice.id ?? '',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId ?? null,
      stripePaymentIntentId: paymentIntentId ?? null,
      amountDue: stripeInvoice.amount_due ?? null,
      amountPaid: stripeInvoice.amount_paid ?? null,
      currency: stripeInvoice.currency ?? 'gbp',
      status: 'failed',
      metadata: stripeInvoice.metadata ?? {}
    });

    await upsertStripePaymentTransaction({
      teamId: team.id,
      userId: null,
      paymentType: 'subscription',
      purchaseType:
        getMetadataValue(stripeInvoice.metadata, 'purchaseType') || 'subscription_invoice',
      stripeInvoiceId: stripeInvoice.id ?? '',
      stripeCheckoutSessionId: null,
      stripeCustomerId: customerId ?? null,
      stripeSubscriptionId: subscriptionId ?? null,
      stripePaymentIntentId: paymentIntentId ?? null,
      amountSubtotal: stripeInvoice.amount_due ?? null,
      amountTotal: stripeInvoice.amount_paid ?? null,
      currency: stripeInvoice.currency ?? 'gbp',
      status: 'failed',
      mode: 'subscription',
      metadata: stripeInvoice.metadata ?? {}
    });
  }

  if (team?.id) {
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: subscriptionId || team.stripeSubscriptionId,
      stripeProductId: team.stripeProductId,
      planName: team.planName,
      subscriptionStatus: 'past_due'
    });
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await recordCheckoutSessionCompleted(session);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await recordInvoicePaid(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await recordInvoicePaymentFailed(invoice);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const team = await handleSubscriptionChange(subscription);

        if (team?.id) {
          await upsertStripePaymentTransaction({
            teamId: team.id,
            userId: parseOptionalNumber(getMetadataValue(subscription.metadata, 'userId')),
            paymentType: 'subscription',
            purchaseType:
              getMetadataValue(subscription.metadata, 'purchaseType') || 'subscription_plan',
            stripeCheckoutSessionId: null,
            stripeCustomerId:
              typeof subscription.customer === 'string'
                ? subscription.customer
                : subscription.customer?.id,
            stripeSubscriptionId: subscription.id,
            stripePaymentIntentId: null,
            amountSubtotal: null,
            amountTotal: null,
            currency: subscription.currency ?? 'gbp',
            status: normalizePaymentStatus(subscription.status),
            mode: 'subscription',
            metadata: subscription.metadata ?? {}
          });
        }

        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling Stripe webhook event ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

import StripePlanEditor from '@/components/admin/StripePlanEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { getTeamBillingHistory, getTeamForUser, getUser } from '@/lib/db/queries';
import {
  LOCAL_AUTHORITY_TEMPLATE_PACK_NAME,
  getLocalAuthorityTemplatePackOffer,
  hasLocalAuthorityTemplatePackAccess,
} from '@/lib/payments/addons';
import { checkoutAction } from '@/lib/payments/actions';
import { getAdminStripeSubscriptionPlans } from '@/lib/payments/stripe';
import { Check, CreditCard, Receipt, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ManageSubscription } from '../dashboard/components/ManageSubscription';
import { SubmitButton } from './submit-button';

export const revalidate = 3600;

type BillingHistoryItem = {
  id: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string | null;
  description?: string | null;
  status?: string | null;
  currency?: string | null;
  amount?: number | string | null;
  paymentType?: string | null;
  purchaseType?: string | null;
  createdAt?: string | Date | null;
};

type AddonOffer = NonNullable<Awaited<ReturnType<typeof getLocalAuthorityTemplatePackOffer>>>;

function formatCurrency(amount?: number | string | null, currency?: string | null) {
  const numericAmount =
    typeof amount === 'string'
      ? Number(amount)
      : typeof amount === 'number'
        ? amount
        : null;

  if (numericAmount === null || Number.isNaN(numericAmount)) {
    return '—';
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: (currency || 'GBP').toUpperCase(),
  }).format(numericAmount / 100);
}

function formatDate(dateValue?: string | Date | null) {
  if (!dateValue) {
    return '—';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function toTitleCase(value?: string | null) {
  if (!value) {
    return '—';
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadgeVariant(
  status?: string | null
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
    case 'active':
    case 'complete':
    case 'succeeded':
      return 'default';
    case 'open':
    case 'pending':
    case 'trialing':
      return 'secondary';
    case 'failed':
    case 'past_due':
    case 'unpaid':
    case 'canceled':
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default async function BillingPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const [subscriptionPlans, teamData, templatePackOffer] = await Promise.all([
    getAdminStripeSubscriptionPlans(),
    getTeamForUser(),
    getLocalAuthorityTemplatePackOffer(),
  ]);

  const hasTemplatePackAccess = teamData
    ? await hasLocalAuthorityTemplatePackAccess(teamData.id)
    : false;

  const billingHistory = teamData ? await getTeamBillingHistory() : [];

  const teamBillingHistory: BillingHistoryItem[] = (billingHistory || []).map(
    ({ transaction }) => ({
      id: String(transaction.id),
      stripeCheckoutSessionId: transaction.stripeCheckoutSessionId,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
      stripeInvoiceId: transaction.stripeInvoiceId,
      description: transaction.description,
      status: transaction.status,
      currency: transaction.currency,
      amount: transaction.amount,
      paymentType: transaction.paymentType,
      purchaseType: transaction.purchaseType,
      createdAt: transaction.createdAt,
    })
  );

  const activeSubscriptionPlans = subscriptionPlans.filter(
    (plan) => plan.active && plan.name !== LOCAL_AUTHORITY_TEMPLATE_PACK_NAME
  );

  return (
    <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            Manage your Stripe subscription, review payment history, and purchase add-ons.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      {!teamData ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            You’re signed in, but you’re not yet part of a team. Billing and subscriptions are
            available once your account is added to a team.
          </CardContent>
        </Card>
      ) : (
        <ManageSubscription initialTeamData={teamData} />
      )}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Subscription plans</CardTitle>
            <CardDescription>
              Start or change your recurring Stripe subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {activeSubscriptionPlans.map((plan) => (
              <PricingCard
                key={plan.priceId}
                name={plan.name}
                price={Math.round(plan.monthlyPrice * 100)}
                currency={plan.currency}
                interval={plan.interval || 'month'}
                trialDays={plan.trialPeriodDays || 0}
                description={plan.description || undefined}
                features={plan.features}
                priceId={plan.priceId}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional access</CardTitle>
            <CardDescription>
              Purchase optional add-ons that unlock extra document packs and workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddonPurchaseCard
              name={LOCAL_AUTHORITY_TEMPLATE_PACK_NAME}
              offer={templatePackOffer}
              hasAccess={hasTemplatePackAccess}
              description="A mobile-ready pack for void property inspections, end-of-tenancy reports, snagging, and housing association handovers."
            />

            <div className="rounded-lg border border-gray-200 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium">Hosted securely by Stripe</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Purchases continue through Stripe Checkout, and access is enabled automatically
                    once payment completes.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Edit Stripe plan options</CardTitle>
          <CardDescription>
            Live Stripe product metadata can also be updated from the billing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {activeSubscriptionPlans.map((plan) => (
            <StripePlanEditor key={`${plan.productId}-billing-editor`} plan={plan} compact />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Billing history</CardTitle>
            <CardDescription>
              Recent Stripe checkout sessions, invoices, and payment activity for your team.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit">
            {teamBillingHistory.length} records
          </Badge>
        </CardHeader>
        <CardContent>
          {teamBillingHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamBillingHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{toTitleCase(item.paymentType)}</div>
                        {item.purchaseType ? (
                          <div className="text-xs text-muted-foreground">
                            {toTitleCase(item.purchaseType)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.description || 'Stripe billing event'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(item.amount, item.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(item.status)} className="capitalize">
                          {item.status ? item.status.replace(/_/g, ' ') : 'unknown'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.stripeInvoiceId ||
                          item.stripePaymentIntentId ||
                          item.stripeCheckoutSessionId ||
                          '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No billing history yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Once your team completes a Stripe checkout or receives an invoice, those records
                will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function PricingCard({
  name,
  price,
  currency,
  interval,
  trialDays,
  description,
  features,
  priceId,
}: {
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays: number;
  description?: string;
  features: string[];
  priceId?: string;
}) {
  const formattedPrice = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(price / 100);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-2xl font-medium text-gray-900">{name}</h2>
      {description ? <p className="mt-2 text-sm text-gray-600">{description}</p> : null}
      <p className="mt-3 text-sm text-gray-600">
        {trialDays > 0
          ? `Includes a ${trialDays} day free trial`
          : 'Charged immediately after checkout'}
      </p>
      <p className="mt-4 text-4xl font-medium text-gray-900">
        {formattedPrice}{' '}
        <span className="text-xl font-normal text-gray-600">/ {interval}</span>
      </p>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start">
            <Check className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <form action={checkoutAction} className="mt-6">
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton />
      </form>
    </div>
  );
}

function AddonPurchaseCard({
  name,
  offer,
  hasAccess,
  description,
}: {
  name: string;
  offer: AddonOffer | null;
  hasAccess: boolean;
  description: string;
}) {
  const formattedPrice = offer
    ? new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: offer.currency.toUpperCase(),
      }).format(offer.monthlyPrice)
    : null;

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {hasAccess ? (
            <Badge>Enabled</Badge>
          ) : offer ? (
            <Badge variant="secondary">Custom price</Badge>
          ) : (
            <Badge variant="outline">Not configured</Badge>
          )}
        </div>

        <div className="rounded-lg border border-dashed border-gray-200 bg-muted/20 p-4">
          {hasAccess ? (
            <div className="space-y-1">
              <p className="font-medium text-emerald-700">Access already enabled</p>
              <p className="text-sm text-muted-foreground">
                This team already has the template pack add-on active.
              </p>
            </div>
          ) : offer ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Admin-set monthly price</p>
              <p className="text-2xl font-semibold">{formattedPrice}/month</p>
              <p className="text-xs text-muted-foreground">
                Sales can change this price in Stripe before activating the add-on.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">Not published yet</p>
              <p className="text-sm text-muted-foreground">
                A Stripe product named for the housing template pack must be active before
                checkout becomes available.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {offer
              ? 'Includes the housing void and asset/facilities template packs.'
              : 'Once published, customers can purchase this add-on from here.'}
          </div>

          {!hasAccess && offer ? (
            <form action="/api/stripe/template-checkout" method="post" className="w-full sm:w-auto">
              <Button type="submit" className="w-full sm:w-auto">
                <CreditCard className="mr-2 h-4 w-4" />
                Buy add-on
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { customerPortalAction } from '@/lib/payments/actions';
import { TeamDataWithMembers } from '@/lib/db/schema';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDate(dateValue?: string | Date | null) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getSubscriptionBadgeVariant(status?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'trialing':
      return 'secondary';
    case 'past_due':
    case 'unpaid':
    case 'incomplete_expired':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getSubscriptionSummary(teamData?: TeamDataWithMembers) {
  switch (teamData?.subscriptionStatus) {
    case 'active':
      return 'Your subscription is active and billed through Stripe.';
    case 'trialing':
      return 'Your team is currently in a Stripe trial period.';
    case 'past_due':
      return 'Your latest Stripe payment needs attention.';
    case 'canceled':
    case 'cancelled':
      return 'Your subscription has been cancelled.';
    default:
      return 'Your team does not currently have an active subscription.';
  }
}

export function ManageSubscription() {
  const { data: teamData, isLoading } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  const planName = teamData?.planName || 'Free';
  const status = teamData?.subscriptionStatus || 'inactive';
  const formattedTrialEnd = formatDate(teamData?.trialEndDate);

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Team Subscription</CardTitle>
          <CardDescription>
            View your current subscription status and open the Stripe customer portal.
          </CardDescription>
        </div>
        <Badge variant={getSubscriptionBadgeVariant(teamData?.subscriptionStatus)} className="w-fit capitalize">
          {status.replace('_', ' ')}
        </Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading subscription details...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Current plan</p>
                <p className="mt-1 text-lg font-semibold">{planName}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Subscription summary</p>
                <p className="mt-1 text-sm font-medium">{getSubscriptionSummary(teamData)}</p>
                {formattedTrialEnd ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Trial end date: {formattedTrialEnd}
                  </p>
                ) : null}
              </div>
            </div>

            {status === 'past_due' || status === 'unpaid' ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="text-sm">
                  Your Stripe billing status shows a payment issue. Open the billing portal to update your payment method or review invoices.
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Manage payment methods, invoices, and your subscription directly in Stripe.
              </div>
              <form action={customerPortalAction}>
                <Button type="submit" variant="outline" className="w-full sm:w-auto">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Subscription
                </Button>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
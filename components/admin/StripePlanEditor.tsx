'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

import { updateStripePlanMetadata, type UpdateStripePlanState } from '@/app/(dashboard)/admin/subscriptions/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AdminStripeSubscriptionPlan } from '@/lib/payments/stripe';

const initialState: UpdateStripePlanState = {};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      <Save className="h-4 w-4" />
      {pending ? 'Saving to Stripe...' : 'Save to Stripe'}
    </Button>
  );
}

type StripePlanEditorProps = {
  plan: AdminStripeSubscriptionPlan;
  compact?: boolean;
};

export default function StripePlanEditor({
  plan,
  compact = false,
}: StripePlanEditorProps) {
  const [state, formAction] = useActionState(updateStripePlanMetadata, initialState);

  useEffect(() => {
    if (state?.success && state.message) {
      toast.success(state.message);
    }

    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card className={compact ? 'border-dashed border-slate-300 shadow-none' : 'border-slate-200'}>
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="productId" value={plan.productId} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Edit {plan.name}
              </h3>
              <p className="text-sm text-slate-500">
                Updates save directly to Stripe product metadata and monthly pricing.
              </p>
            </div>
            <Badge variant="outline">{plan.priceId}</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${plan.productId}-name`}>Plan name</Label>
              <Input id={`${plan.productId}-name`} name="name" defaultValue={plan.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${plan.productId}-badge`}>Badge</Label>
              <Input
                id={`${plan.productId}-badge`}
                name="badge"
                defaultValue={plan.allowances.badge ?? ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${plan.productId}-description`}>Description</Label>
            <Textarea
              id={`${plan.productId}-description`}
              name="description"
              defaultValue={plan.description ?? ''}
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`${plan.productId}-monthlyPrice`}>Monthly price (£)</Label>
              <Input
                id={`${plan.productId}-monthlyPrice`}
                name="monthlyPrice"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={plan.monthlyPrice}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${plan.productId}-annualPrice`}>Annual price (£)</Label>
              <Input
                id={`${plan.productId}-annualPrice`}
                name="annualPrice"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={plan.annualPrice ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${plan.productId}-trialPeriodDays`}>Trial days</Label>
              <Input
                id={`${plan.productId}-trialPeriodDays`}
                name="trialPeriodDays"
                type="number"
                min="0"
                step="1"
                defaultValue={plan.trialPeriodDays ?? 0}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${plan.productId}-targetUser`}>Best for</Label>
              <Input
                id={`${plan.productId}-targetUser`}
                name="targetUser"
                defaultValue={plan.allowances.targetUser ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${plan.productId}-certificates`}>Usage</Label>
              <Input
                id={`${plan.productId}-certificates`}
                name="certificates"
                defaultValue={plan.allowances.certificates}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${plan.productId}-teamSeats`}>Seats</Label>
              <Input
                id={`${plan.productId}-teamSeats`}
                name="teamSeats"
                defaultValue={plan.allowances.teamSeats}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${plan.productId}-additionalSeatPrice`}>Extra seat pricing</Label>
              <Input
                id={`${plan.productId}-additionalSeatPrice`}
                name="additionalSeatPrice"
                defaultValue={plan.allowances.additionalSeatPrice ?? ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${plan.productId}-savingsNote`}>Savings note</Label>
            <Input
              id={`${plan.productId}-savingsNote`}
              name="savingsNote"
              defaultValue={plan.allowances.savingsNote ?? ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${plan.productId}-competitorAnchor`}>Competitor anchor</Label>
            <Textarea
              id={`${plan.productId}-competitorAnchor`}
              name="competitorAnchor"
              defaultValue={plan.allowances.competitorAnchor ?? ''}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${plan.productId}-features`}>
              Features (one per line)
            </Label>
            <Textarea
              id={`${plan.productId}-features`}
              name="features"
              defaultValue={plan.features.join('\n')}
              rows={6}
            />
          </div>

          {state?.error ? (
            <p className="text-sm font-medium text-red-600">{state.error}</p>
          ) : null}

          {state?.success && state.message ? (
            <p className="text-sm font-medium text-emerald-600">{state.message}</p>
          ) : null}

          <div className="flex justify-end">
            <SaveButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

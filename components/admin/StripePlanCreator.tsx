'use client';

import { type ChangeEvent, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { Plus, Sparkles } from 'lucide-react';

import {
  createStripePlanMetadata,
  type CreateStripePlanState,
} from '@/app/(dashboard)/admin/subscriptions/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const initialState: CreateStripePlanState = {};

function CreateButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      <Plus className="h-4 w-4" />
      {pending ? 'Creating plan...' : 'Create new plan'}
    </Button>
  );
}

function PlanField({
  label,
  name,
  placeholder,
  type = 'text',
  defaultValue,
}: {
  label: string;
  name:
    | 'name'
    | 'monthlyPrice'
    | 'annualPrice'
    | 'targetUser'
    | 'certificates'
    | 'teamSeats'
    | 'additionalSeatPrice'
    | 'badge'
    | 'savingsNote'
    | 'competitorAnchor'
    | 'trialPeriodDays';
  placeholder?: string;
  type?: 'text' | 'number';
  defaultValue?: string;
}) {
  const id = `create-plan-${name}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </div>
  );
}

function PlanTextareaField({
  label,
  name,
  placeholder,
  rows,
  defaultValue,
}: {
  label: string;
  name: 'description' | 'features' | 'competitorAnchor';
  placeholder?: string;
  rows: number;
  defaultValue?: string;
}) {
  const id = `create-plan-${name}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

export default function StripePlanCreator() {
  const [state, formAction] = useActionState(createStripePlanMetadata, initialState);

  useEffect(() => {
    if (state?.success && state.message) {
      toast.success(state.message);
    }

    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-5 text-sm text-emerald-950">
        Create a live Stripe plan directly from this form. There are no draft plan presets here.
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">Create a new Stripe plan</h3>
              </div>
              <p className="text-sm text-slate-600">
                Add a product, set monthly and annual pricing, and save the metadata Stripe will use in the billing UI.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">
              Live Stripe product
            </Badge>
          </div>

          <form action={formAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <PlanField
                label="Plan name"
                name="name"
                placeholder="Starter"
              />
              <PlanField
                label="Badge"
                name="badge"
                placeholder="Most popular"
              />
            </div>

            <PlanTextareaField
              label="Description"
              name="description"
              placeholder="Describe the plan"
              rows={3}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <PlanField
                label="Monthly price (£)"
                name="monthlyPrice"
                placeholder="5.00"
                type="number"
              />
              <PlanField
                label="Annual price (£)"
                name="annualPrice"
                placeholder="50.00"
                type="number"
              />
              <PlanField
                label="Trial days"
                name="trialPeriodDays"
                placeholder="14"
                type="number"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PlanField
                label="Best for"
                name="targetUser"
                placeholder="Who is this for?"
              />
              <PlanField
                label="Usage"
                name="certificates"
                placeholder="Up to 30 certificates / month"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PlanField
                label="Seats"
                name="teamSeats"
                placeholder="1 user included"
              />
              <PlanField
                label="Extra seat pricing"
                name="additionalSeatPrice"
                placeholder="£2.50/month each"
              />
            </div>

            <PlanField
              label="Savings note"
              name="savingsNote"
              placeholder="Why this is good value"
            />

            <PlanTextareaField
              label="Competitor anchor"
              name="competitorAnchor"
              placeholder="Explain the pricing comparison"
              rows={2}
            />

            <PlanTextareaField
              label="Features (one per line)"
              name="features"
              placeholder={'Feature one\nFeature two\nFeature three'}
              rows={8}
            />

            {state?.error ? (
              <p className="text-sm font-medium text-red-600">{state.error}</p>
            ) : null}

            {state?.success && state.message ? (
              <p className="text-sm font-medium text-emerald-600">{state.message}</p>
            ) : null}

            <div className="flex justify-end">
              <CreateButton />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

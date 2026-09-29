'use client';

import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, RotateCcw, Save, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { StripeCredentialStatusDto } from '@/lib/stripe/credential-status';
import { cn } from '@/lib/utils';

export type StripeCredentialKey = StripeCredentialStatusDto['key'];
export type StripeCredentialSource = StripeCredentialStatusDto['source'];
export type StripeCredentialStatus = StripeCredentialStatusDto;

const FIELD_HINTS: Record<StripeCredentialKey, string> = {
  secretKey: 'Starts with sk_live_, sk_test_, rk_live_, or rk_test_.',
  publishableKey: 'Starts with pk_live_ or pk_test_.',
  webhookSecret: 'Starts with whsec_.',
};

const SOURCE_LABELS: Record<StripeCredentialSource, string> = {
  database: 'Saved in admin',
  environment: 'From environment',
  missing: 'Not configured',
};

function sourceBadgeClass(source: StripeCredentialSource) {
  if (source === 'database') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (source === 'environment') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  return 'border-amber-200 bg-amber-50 text-amber-700';
}

type FeedbackState = { tone: 'success' | 'error'; message: string } | null;

interface StripeCredentialFieldProps {
  credential: StripeCredentialStatus;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled: boolean;
}

function StripeCredentialField({
  credential,
  value,
  onChange,
  onClear,
  disabled,
}: StripeCredentialFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{credential.label}</span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs font-medium',
              sourceBadgeClass(credential.source)
            )}
          >
            {SOURCE_LABELS[credential.source]}
          </span>
        </div>
        {credential.maskedValue ? (
          <code className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {credential.maskedValue}
          </code>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Input
            type={isRevealed ? 'text' : 'password'}
            value={value}
            placeholder="Paste a new value to replace this credential"
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            className="pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={() => setIsRevealed((current) => !current)}
            aria-label={isRevealed ? `Hide ${credential.label}` : `Show ${credential.label}`}
            title={isRevealed ? `Hide ${credential.label}` : `Show ${credential.label}`}
          >
            {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        {credential.source === 'database' ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={onClear}
            disabled={disabled}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Use env
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">{FIELD_HINTS[credential.key]}</p>
    </div>
  );
}

interface StripeCredentialEditorProps {
  initialCredentials: StripeCredentialStatus[];
}

export default function StripeCredentialEditor({
  initialCredentials,
}: StripeCredentialEditorProps) {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [drafts, setDrafts] = useState<Record<StripeCredentialKey, string>>({
    secretKey: '',
    publishableKey: '',
    webhookSecret: '',
  });
  const [cleared, setCleared] = useState<Record<StripeCredentialKey, boolean>>({
    secretKey: false,
    publishableKey: false,
    webhookSecret: false,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const hasChanges =
    Object.values(drafts).some((value) => value.trim().length > 0) ||
    Object.values(cleared).some(Boolean);

  function updateDraft(key: StripeCredentialKey, value: string) {
    setDrafts((current) => ({ ...current, [key]: value }));
    if (value.trim().length > 0) {
      setCleared((current) => ({ ...current, [key]: false }));
    }
    setFeedback(null);
  }

  function markCleared(key: StripeCredentialKey) {
    setCleared((current) => ({ ...current, [key]: !current[key] }));
    setDrafts((current) => ({ ...current, [key]: '' }));
    setFeedback(null);
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    const payload: Partial<Record<StripeCredentialKey, string>> = {};

    for (const key of Object.keys(drafts) as StripeCredentialKey[]) {
      const draftValue = drafts[key].trim();
      if (draftValue.length > 0) {
        payload[key] = draftValue;
      } else if (cleared[key]) {
        payload[key] = '';
      }
    }

    try {
      const response = await fetch('/api/admin/stripe/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save Stripe credentials.');
      }

      if (Array.isArray(result.credentials)) {
        setCredentials(result.credentials as StripeCredentialStatus[]);
      }

      setDrafts({ secretKey: '', publishableKey: '', webhookSecret: '' });
      setCleared({ secretKey: false, publishableKey: false, webhookSecret: false });
      setFeedback({
        tone: 'success',
        message: result.message || 'Stripe credentials updated.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to save Stripe credentials.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {credentials.map((credential) => (
          <StripeCredentialField
            key={credential.key}
            credential={credential}
            value={drafts[credential.key]}
            onChange={(value) => updateDraft(credential.key, value)}
            onClear={() => markCleared(credential.key)}
            disabled={saving}
          />
        ))}
      </div>

      {Object.values(cleared).some(Boolean) ? (
        <p className="text-sm text-amber-700">
          Cleared fields will fall back to their environment variable when you save.
        </p>
      ) : null}

      {feedback ? (
        <div
          className={cn(
            'flex items-start gap-2 rounded-2xl border p-3 text-sm',
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          )}
        >
          {feedback.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void handleSave()} disabled={saving || !hasChanges}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save credentials
            </>
          )}
        </Button>
        <p className="text-sm text-muted-foreground">
          New values take effect immediately for pricing, checkout, and webhooks.
        </p>
      </div>
    </div>
  );
}

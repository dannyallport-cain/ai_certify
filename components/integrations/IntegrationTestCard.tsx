'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  Server,
  TriangleAlert,
  Wifi,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Tone = 'slate' | 'blue' | 'purple' | 'green' | 'amber' | 'red';

type IntegrationTestResponse = {
  success?: boolean;
  message?: string;
  checkedAt?: string;
  service?: string;
  details?: unknown;
  [key: string]: unknown;
};

type IntegrationTestCardProps = {
  title: string;
  description: string;
  serviceLabel?: string;
  endpointPath?: string;
  tone?: Tone;
  buttonLabel?: string;
  successLabel?: string;
  requestBody?: Record<string, unknown>;
  hint?: string;
};

const toneStyles: Record<
  Tone,
  {
    shell: string;
    border: string;
    softBg: string;
    iconWrap: string;
    title: string;
    description: string;
    badge: string;
    line: string;
    primary: string;
  }
> = {
  slate: {
    shell: 'border-slate-200 bg-slate-50/60',
    border: 'border-slate-200',
    softBg: 'bg-slate-50',
    iconWrap: 'bg-slate-900 text-white',
    title: 'text-slate-950',
    description: 'text-slate-600',
    badge: 'border-slate-200 bg-white text-slate-700',
    line: 'from-slate-400 via-slate-500 to-slate-400',
    primary: 'text-slate-900',
  },
  blue: {
    shell: 'border-blue-200 bg-blue-50/60',
    border: 'border-blue-200',
    softBg: 'bg-blue-50',
    iconWrap: 'bg-blue-600 text-white',
    title: 'text-blue-950',
    description: 'text-blue-800/80',
    badge: 'border-blue-200 bg-white text-blue-700',
    line: 'from-blue-400 via-blue-500 to-blue-400',
    primary: 'text-blue-900',
  },
  purple: {
    shell: 'border-purple-200 bg-purple-50/60',
    border: 'border-purple-200',
    softBg: 'bg-purple-50',
    iconWrap: 'bg-purple-600 text-white',
    title: 'text-purple-950',
    description: 'text-purple-800/80',
    badge: 'border-purple-200 bg-white text-purple-700',
    line: 'from-purple-400 via-purple-500 to-purple-400',
    primary: 'text-purple-900',
  },
  green: {
    shell: 'border-emerald-200 bg-emerald-50/60',
    border: 'border-emerald-200',
    softBg: 'bg-emerald-50',
    iconWrap: 'bg-emerald-600 text-white',
    title: 'text-emerald-950',
    description: 'text-emerald-800/80',
    badge: 'border-emerald-200 bg-white text-emerald-700',
    line: 'from-emerald-400 via-emerald-500 to-emerald-400',
    primary: 'text-emerald-900',
  },
  amber: {
    shell: 'border-amber-200 bg-amber-50/60',
    border: 'border-amber-200',
    softBg: 'bg-amber-50',
    iconWrap: 'bg-amber-600 text-white',
    title: 'text-amber-950',
    description: 'text-amber-800/80',
    badge: 'border-amber-200 bg-white text-amber-700',
    line: 'from-amber-400 via-amber-500 to-amber-400',
    primary: 'text-amber-900',
  },
  red: {
    shell: 'border-rose-200 bg-rose-50/60',
    border: 'border-rose-200',
    softBg: 'bg-rose-50',
    iconWrap: 'bg-rose-600 text-white',
    title: 'text-rose-950',
    description: 'text-rose-800/80',
    badge: 'border-rose-200 bg-white text-rose-700',
    line: 'from-rose-400 via-rose-500 to-rose-400',
    primary: 'text-rose-900',
  },
};

function formatResultValue(value: unknown) {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    return value.trim() || '—';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function getStatusText(status: 'idle' | 'running' | 'success' | 'error') {
  switch (status) {
    case 'running':
      return 'Testing connection';
    case 'success':
      return 'Connection verified';
    case 'error':
      return 'Connection failed';
    default:
      return 'Ready to test';
  }
}

function getStatusTone(status: 'idle' | 'running' | 'success' | 'error') {
  switch (status) {
    case 'success':
      return 'success';
    case 'error':
      return 'destructive';
    case 'running':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function IntegrationTestCard({
  title,
  description,
  serviceLabel,
  endpointPath,
  tone = 'blue',
  buttonLabel,
  successLabel,
  requestBody,
  hint,
}: IntegrationTestCardProps) {
  const styles = toneStyles[tone];
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<unknown>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const resolvedServiceLabel = serviceLabel || title;
  const hasEndpoint = Boolean(endpointPath);
  const statusLabel = useMemo(() => getStatusText(status), [status]);

  async function handleTestClick() {
    if (!hasEndpoint) {
      setStatus('error');
      setMessage('No endpoint path was provided for this integration test card.');
      return;
    }

    setStatus('running');
    setMessage(null);
    setDetails(null);
    setCheckedAt(null);

    try {
      const response = await fetch(endpointPath!, {
        method: 'POST',
        credentials: 'same-origin',
        headers: requestBody ? { 'Content-Type': 'application/json' } : undefined,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      const payload = (await response.json().catch(() => ({}))) as IntegrationTestResponse;

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || (payload.details as string) || 'Integration test failed');
      }

      setStatus('success');
      setMessage(payload.message || successLabel || `${resolvedServiceLabel} responded successfully.`);
      setDetails(payload.details ?? payload);
      setCheckedAt(payload.checkedAt || new Date().toISOString());
    } catch (nextError) {
      setStatus('error');
      setMessage(nextError instanceof Error ? nextError.message : 'Integration test failed');
    }
  }

  return (
    <Card className={cn('overflow-hidden rounded-3xl border shadow-none', styles.shell)}>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className={cn('w-fit', styles.badge)}>
              {resolvedServiceLabel}
            </Badge>
            <CardTitle className={cn('text-xl font-semibold tracking-tight', styles.title)}>
              {title}
            </CardTitle>
            <p className={cn('max-w-2xl text-sm', styles.description)}>{description}</p>
          </div>

          <div className={cn('rounded-2xl border px-3 py-2 text-xs font-medium', styles.badge)}>
            {statusLabel}
          </div>
        </div>

        <div className={cn('relative overflow-hidden rounded-3xl border p-4', styles.border, styles.softBg)}>
          <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-current/30 to-transparent" />
          <div className="absolute left-8 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-current opacity-15 blur-sm motion-safe:animate-pulse" />
          <div className="absolute right-8 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-current opacity-15 blur-sm motion-safe:animate-pulse" />

          <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm', styles.iconWrap)}>
                <Server className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={cn('truncate text-xs font-medium uppercase tracking-[0.18em]', styles.primary)}>
                  App
                </p>
                <p className={cn('truncate text-sm font-semibold', styles.primary)}>Request</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', status === 'running' ? 'animate-ping bg-sky-500' : 'bg-sky-400')} />
                <span className={cn('h-2.5 w-2.5 rounded-full motion-safe:animate-pulse', status === 'error' ? 'bg-rose-500' : 'bg-emerald-500')} />
                <span className={cn('h-2.5 w-2.5 rounded-full motion-safe:animate-pulse', status === 'success' ? 'bg-emerald-500' : 'bg-current/40')} />
              </div>
              <div className={cn('mt-2 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm', styles.border)}>
                <ArrowLeftRight className={cn('h-3.5 w-3.5', status === 'running' ? 'animate-spin' : '')} />
                {status === 'running' ? 'Two-way check' : 'Bidirectional'}
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-3 text-right">
              <div className="min-w-0">
                <p className={cn('truncate text-xs font-medium uppercase tracking-[0.18em]', styles.primary)}>
                  {resolvedServiceLabel}
                </p>
                <p className={cn('truncate text-sm font-semibold', styles.primary)}>Response</p>
              </div>
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm', styles.iconWrap)}>
                {status === 'error' ? (
                  <TriangleAlert className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className={cn('h-5 w-5', status === 'running' ? 'animate-pulse' : '')} />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">{message || 'No test run yet'}</p>
            <p className="text-sm text-slate-600">
              {hint || `This card sends a live request to ${resolvedServiceLabel.toLowerCase()} and confirms the response comes back successfully.`}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void handleTestClick()}
            disabled={status === 'running' || !hasEndpoint}
          >
            {status === 'running' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" />
                {buttonLabel || `Test ${resolvedServiceLabel}`}
              </>
            )}
          </Button>
        </div>

        {checkedAt ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge variant="secondary" className="bg-white">
              Last checked
            </Badge>
            <span>{new Date(checkedAt).toLocaleString()}</span>
          </div>
        ) : null}

        {status === 'success' && details ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Response payload
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-emerald-950">
              {formatResultValue(details)}
            </pre>
          </div>
        ) : null}

        {status === 'error' && message ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800">
            {message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default IntegrationTestCard;

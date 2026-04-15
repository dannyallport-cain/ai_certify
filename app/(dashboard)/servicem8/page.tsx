'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Plug, RefreshCw, Unplug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type ServiceM8ConnectionPayload = {
  connected: boolean;
  connection?: {
    id: number;
    isActive: boolean | null;
    servicem8CompanyName: string | null;
    syncEnabled: boolean | null;
    syncDirection: string | null;
    lastSyncAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  error?: string;
};

const fetcher = async (url: string): Promise<ServiceM8ConnectionPayload> => {
  const res = await fetch(url, { credentials: 'include' });
  const body = (await res.json().catch(() => ({}))) as ServiceM8ConnectionPayload;

  if (!res.ok) {
    throw new Error(body.error || 'Failed to load ServiceM8 connection');
  }

  return body;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function getMessageFromSearchParams() {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const success = params.get('success');
  const error = params.get('error');

  if (success === 'connected') {
    return {
      type: 'success' as const,
      text: 'ServiceM8 is now connected for your web app team.',
    };
  }

  const errors: Record<string, string> = {
    no_code: 'ServiceM8 did not return an authorization code.',
    invalid_state: 'The ServiceM8 auth session expired or could not be verified. Please try again.',
    callback_failed: 'The ServiceM8 callback failed before the connection could be stored.',
    servicem8_activation_failed: 'The ServiceM8 activation step failed before OAuth could begin.',
    no_team: 'You need to belong to a team before connecting ServiceM8.',
    access_denied: 'ServiceM8 access was denied.',
  };

  if (error) {
    return {
      type: 'error' as const,
      text: errors[error] || `ServiceM8 returned an error: ${error}`,
    };
  }

  return null;
}

export default function ServiceM8Page() {
  const { data, error, isLoading, mutate } = useSWR('/api/servicem8/connection', fetcher);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isUpdatingSync, setIsUpdatingSync] = useState(false);
  const [localMessage, setLocalMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const urlMessage = useMemo(() => getMessageFromSearchParams(), []);
  const message = localMessage || urlMessage;
  const connection = data?.connection;
  const isConnected = !!data?.connected && !!connection;

  async function disconnectServiceM8() {
    setLocalMessage(null);
    setIsDisconnecting(true);

    try {
      const res = await fetch('/api/servicem8/connection', {
        method: 'DELETE',
        credentials: 'include',
      });

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error || 'Failed to disconnect ServiceM8');
      }

      setLocalMessage({
        type: 'success',
        text: 'ServiceM8 has been disconnected from your team.',
      });
      await mutate();
    } catch (err) {
      setLocalMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to disconnect ServiceM8',
      });
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function toggleSyncEnabled() {
    if (!connection) {
      return;
    }

    setLocalMessage(null);
    setIsUpdatingSync(true);

    try {
      const res = await fetch('/api/servicem8/connection', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          syncEnabled: !connection.syncEnabled,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error || 'Failed to update ServiceM8 sync settings');
      }

      setLocalMessage({
        type: 'success',
        text: `Automatic sync has been ${connection.syncEnabled ? 'disabled' : 'enabled'}.`,
      });
      await mutate();
    } catch (err) {
      setLocalMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update sync settings',
      });
    } finally {
      setIsUpdatingSync(false);
    }
  }

  return (
    <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ServiceM8</h1>
          <p className="text-muted-foreground">
            Connect your web app team to ServiceM8 so jobs, customers, and synced reporting workflows can run outside the mobile app too.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button asChild>
            <a href="/api/servicem8/activate">
              <Plug className="mr-2 h-4 w-4" />
              {isConnected ? 'Reconnect ServiceM8' : 'Connect ServiceM8'}
            </a>
          </Button>
        </div>
      </div>

      {message ? (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Failed to load ServiceM8 connection.'}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Connection status</CardTitle>
            <CardDescription>
              Authorize ServiceM8 for your current team and manage the stored integration settings used by the web app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Connected' : 'Not connected'}
              </Badge>
              {connection?.isActive ? <Badge variant="outline">Active</Badge> : null}
              {typeof connection?.syncEnabled === 'boolean' ? (
                <Badge variant={connection.syncEnabled ? 'outline' : 'secondary'}>
                  Sync {connection.syncEnabled ? 'enabled' : 'disabled'}
                </Badge>
              ) : null}
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading ServiceM8 connection…
              </div>
            ) : isConnected && connection ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Company" value={connection.servicem8CompanyName || 'Unnamed ServiceM8 account'} />
                <InfoRow label="Sync direction" value={connection.syncDirection || 'bidirectional'} />
                <InfoRow label="Connected at" value={formatDateTime(connection.createdAt)} />
                <InfoRow label="Last updated" value={formatDateTime(connection.updatedAt)} />
                <InfoRow label="Last sync" value={formatDateTime(connection.lastSyncAt)} />
                <InfoRow label="Team scope" value="Current signed-in web team" />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6">
                <p className="text-sm text-gray-700">
                  No ServiceM8 connection is stored for the current team yet. Use the connect button to start OAuth in the web app and save the tokens against this team.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href="/api/servicem8/activate">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {isConnected ? 'Manage authorization' : 'Start OAuth connection'}
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => mutate()}
                disabled={isLoading || isDisconnecting || isUpdatingSync}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh status
              </Button>
              {isConnected ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={toggleSyncEnabled}
                    disabled={isDisconnecting || isUpdatingSync}
                  >
                    {isUpdatingSync ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {connection.syncEnabled ? 'Disable sync' : 'Enable sync'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={disconnectServiceM8}
                    disabled={isDisconnecting || isUpdatingSync}
                  >
                    {isDisconnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="mr-2 h-4 w-4" />
                    )}
                    Disconnect
                  </Button>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How web auth works</CardTitle>
            <CardDescription>
              The same ServiceM8 backend can now be authorised from the dashboard as well as the mobile experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ol className="space-y-3 list-decimal pl-5">
              <li>Select <span className="font-medium text-foreground">Connect ServiceM8</span> from this page.</li>
              <li>Authorize the app in ServiceM8 OAuth.</li>
              <li>If you are not signed in yet, you will be sent through the web sign-in flow and returned to complete the pending connection.</li>
              <li>The tokens are stored against your current team, so the web dashboard and mobile app can reuse the same integration.</li>
            </ol>

            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
              Existing API routes already support the OAuth callback. This page exposes the missing web entry point so users can connect ServiceM8 directly from the dashboard.
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

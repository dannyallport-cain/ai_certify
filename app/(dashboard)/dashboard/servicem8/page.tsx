'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plug,
  Unplug,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Briefcase,
} from 'lucide-react';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ConnectionData {
  connected: boolean;
  connection?: {
    id: number;
    isActive: boolean;
    servicem8CompanyName: string;
    syncEnabled: boolean;
    syncDirection: string;
    lastSyncAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

interface SM8Job {
  uuid: string;
  status: string;
  job_address: string;
  job_description: string;
  generated_job_id: string;
  date: string;
  first_name: string;
  last_name: string;
}

interface SM8Client {
  uuid: string;
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  billing_address: string;
}

const PENDING_SERVICE_M8_ACTION_KEY = 'ai_certify_servicem8_pending_action';

type PendingServiceM8Action = 'import_clients';

function getPendingServiceM8Action(): PendingServiceM8Action | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const action = window.sessionStorage.getItem(PENDING_SERVICE_M8_ACTION_KEY);
  return action === 'import_clients' ? action : null;
}

function setPendingServiceM8Action(action: PendingServiceM8Action) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(PENDING_SERVICE_M8_ACTION_KEY, action);
}

function clearPendingServiceM8Action() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(PENDING_SERVICE_M8_ACTION_KEY);
}

export default function ServiceM8Page() {
  const { data: connData, error: connError, isLoading: connLoading } = useSWR<ConnectionData>(
    '/api/servicem8/connection',
    fetcher
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'clients' | 'settings'>(
    'overview'
  );
  const [disconnecting, setDisconnecting] = useState(false);
  const [importingClients, setImportingClients] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(
    null
  );
  const [urlMessage, setUrlMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const popupPollRef = useRef<number | null>(null);

  const isConnected = connData?.connected === true;

  function clearConnectPolling() {
    if (popupPollRef.current !== null) {
      window.clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }
  }

  async function resumePendingServiceM8Action() {
    const pendingAction = getPendingServiceM8Action();
    if (!pendingAction) {
      return;
    }

    clearPendingServiceM8Action();

    if (pendingAction === 'import_clients') {
      await handleImportClients({ allowConnectRedirect: false });
    }
  }

  // ─── Connection Actions ─────────────────────────────────────────────────

  async function handleConnect() {
    setUrlMessage(null);
    setIsConnecting(true);

    const width = 640;
    const height = 760;
    const left = Math.max(0, window.screenX + Math.round((window.outerWidth - width) / 2));
    const top = Math.max(0, window.screenY + Math.round((window.outerHeight - height) / 2));

    const popup = window.open(
      '/api/servicem8/activate?popup=1',
      'servicem8-oauth',
      `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      setIsConnecting(false);
      window.location.href = '/api/servicem8/activate';
      return;
    }

    popup.focus();
    clearConnectPolling();
    popupPollRef.current = window.setInterval(() => {
      if (popup.closed) {
        clearConnectPolling();
        setIsConnecting(false);
        mutate('/api/servicem8/connection');
      }
    }, 500);
  }

  async function handleDisconnect() {
    if (
      !confirm(
        'Are you sure you want to disconnect ServiceM8? This will remove the integration but keep any imported data.'
      )
    ) {
      return;
    }
    clearPendingServiceM8Action();
    setDisconnecting(true);
    try {
      await fetch('/api/servicem8/connection', { method: 'DELETE' });
      mutate('/api/servicem8/connection');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSyncSettingChange(key: string, value: any) {
    try {
      await fetch('/api/servicem8/connection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      mutate('/api/servicem8/connection');
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  }

  async function handleImportClients(options: { allowConnectRedirect?: boolean } = {}) {
    const { allowConnectRedirect = true } = options;
    setImportingClients(true);
    setImportResult(null);

    try {
      if (allowConnectRedirect && !isConnected) {
        setPendingServiceM8Action('import_clients');
        await handleConnect();
        return;
      }

      const res = await fetch('/api/servicem8/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_all' }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        imported?: number;
        skipped?: number;
        error?: string;
      };

      if (!res.ok) {
        if (allowConnectRedirect && (res.status === 401 || data.error === 'ServiceM8 not connected')) {
          setPendingServiceM8Action('import_clients');
          await handleConnect();
          return;
        }

        throw new Error(data.error || 'Failed to import clients');
      }

      clearPendingServiceM8Action();

      if (data.success) {
        setImportResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 });
      }
    } catch (error) {
      console.error('Failed to import clients:', error);
    } finally {
      setImportingClients(false);
    }
  }

  // ─── Error from URL / popup callback ────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'connected') {
      setUrlMessage({ type: 'success', text: 'ServiceM8 connected successfully!' });
      void (async () => {
        await mutate('/api/servicem8/connection');
        await resumePendingServiceM8Action();
      })();
    } else if (params.get('error')) {
      clearPendingServiceM8Action();
      const errorMap: Record<string, string> = {
        no_code: 'Authorization failed - no code received from ServiceM8.',
        invalid_state: 'Security check failed. Please try again.',
        no_team: 'You need to be part of a team to connect ServiceM8.',
        callback_failed: 'Connection failed. Please try again.',
        servicem8_activation_failed: 'Addon activation failed. Please try again.',
      };
      const errorKey = params.get('error') || '';
      setUrlMessage({ type: 'error', text: errorMap[errorKey] || `Error: ${errorKey}` });
    }

    if (params.has('success') || params.has('error')) {
      window.history.replaceState({}, '', '/dashboard/servicem8');
    }
  }, []);

  useEffect(() => {
    const errorMap: Record<string, string> = {
      no_code: 'Authorization failed - no code received from ServiceM8.',
      invalid_state: 'Security check failed. Please try again.',
      no_team: 'You need to be part of a team to connect ServiceM8.',
      callback_failed: 'Connection failed. Please try again.',
      servicem8_activation_failed: 'Addon activation failed. Please try again.',
    };

    function handleOAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data as { source?: string; success?: string; error?: string } | null;
      if (!payload || payload.source !== 'servicem8-oauth') {
        return;
      }

      clearConnectPolling();
      setIsConnecting(false);

      if (payload.success === 'connected') {
        setUrlMessage({ type: 'success', text: 'ServiceM8 connected successfully!' });
        void (async () => {
          await mutate('/api/servicem8/connection');
          await resumePendingServiceM8Action();
        })();
        return;
      }

      clearPendingServiceM8Action();
      const errorKey = payload.error || 'callback_failed';
      setUrlMessage({ type: 'error', text: errorMap[errorKey] || `Error: ${errorKey}` });
    }

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
      clearConnectPolling();
    };
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ServiceM8 Integration</h2>
          <p className="text-muted-foreground">
            Connect your ServiceM8 account to sync jobs, customers, and certificates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <XCircle className="h-4 w-4" />
              Not connected
            </div>
          )}
        </div>
      </div>

      {/* URL Messages */}
      {urlMessage && (
        <div
          className={`rounded-lg border p-4 ${
            urlMessage.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {urlMessage.text}
        </div>
      )}

      {connError && !connLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load ServiceM8 connection.
        </div>
      )}

      {/* Not Connected State */}
      {!connLoading && !isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Connect ServiceM8
            </CardTitle>
            <CardDescription>
              Link your ServiceM8 account to automatically sync jobs, customers, and attach
              completed certificates to jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <Briefcase className="mt-0.5 h-5 w-5 text-orange-500" />
                <div>
                  <h4 className="font-medium">Job Sync</h4>
                  <p className="text-sm text-muted-foreground">
                    Sync jobs from ServiceM8 and link them to certificates.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <Users className="mt-0.5 h-5 w-5 text-orange-500" />
                <div>
                  <h4 className="font-medium">Client Import</h4>
                  <p className="text-sm text-muted-foreground">
                    Import customers from ServiceM8 into your customer list.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <ArrowUpFromLine className="mt-0.5 h-5 w-5 text-orange-500" />
                <div>
                  <h4 className="font-medium">PDF Attachments</h4>
                  <p className="text-sm text-muted-foreground">
                    Attach completed certificate PDFs to ServiceM8 jobs.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={handleConnect}
              size="lg"
              className="w-full md:w-auto"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plug className="mr-2 h-4 w-4" />
              )}
              {isConnecting ? 'Opening ServiceM8…' : 'Connect to ServiceM8'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {connLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Connected State */}
      {isConnected && connData?.connection && (
        <>
          {/* Tabs */}
          <div className="border-b">
            <nav className="flex space-x-8">
              {(['overview', 'jobs', 'clients', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 px-1 py-2 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connection</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {connData.connection.servicem8CompanyName || 'Connected'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connected since {new Date(connData.connection.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sync Direction</CardTitle>
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold capitalize">
                    {connData.connection.syncDirection?.replace('_', ' ') || 'Bidirectional'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {connData.connection.syncEnabled ? 'Sync enabled' : 'Sync paused'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {connData.connection.lastSyncAt
                      ? new Date(connData.connection.lastSyncAt).toLocaleString()
                      : 'Never'}
                  </div>
                  <p className="text-xs text-muted-foreground">Last synchronisation time</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && <JobsTab />}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">ServiceM8 Clients</h3>
                <Button onClick={() => handleImportClients()} disabled={importingClients} variant="outline">
                  {importingClients ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                  )}
                  Import All Clients
                </Button>
              </div>

              {importResult && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                  Imported {importResult.imported} clients, skipped {importResult.skipped} already
                  existing.
                </div>
              )}

              <ClientsTab />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Settings</CardTitle>
                  <CardDescription>
                    Configure how data syncs between AI-Certificates and ServiceM8.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Enable Sync</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync data between systems
                      </p>
                    </div>
                    <Button
                      variant={connData.connection.syncEnabled ? 'default' : 'outline'}
                      onClick={() =>
                        handleSyncSettingChange('syncEnabled', !connData.connection!.syncEnabled)
                      }
                    >
                      {connData.connection.syncEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div>
                    <h4 className="mb-3 font-medium">Sync Direction</h4>
                    <div className="grid gap-2 md:grid-cols-3">
                      {[
                        {
                          value: 'from_servicem8',
                          label: 'From ServiceM8',
                          icon: ArrowDownToLine,
                          desc: 'Import from ServiceM8 only',
                        },
                        {
                          value: 'to_servicem8',
                          label: 'To ServiceM8',
                          icon: ArrowUpFromLine,
                          desc: 'Export to ServiceM8 only',
                        },
                        {
                          value: 'bidirectional',
                          label: 'Bidirectional',
                          icon: ArrowLeftRight,
                          desc: 'Sync both ways',
                        },
                      ].map(({ value, label, icon: Icon, desc }) => (
                        <button
                          key={value}
                          onClick={() => handleSyncSettingChange('syncDirection', value)}
                          className={`rounded-lg border p-4 text-left transition-colors ${
                            connData.connection!.syncDirection === value
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="mb-2 h-5 w-5" />
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground">{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>
                    Disconnect ServiceM8 from your account. This will not delete any previously
                    imported data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="mr-2 h-4 w-4" />
                    )}
                    Disconnect ServiceM8
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function JobsTab() {
  const { data, error, isLoading } = useSWR<{ jobs: SM8Job[] }>('/api/servicem8/jobs', fetcher);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.jobs) {
    return <div className="py-8 text-center text-muted-foreground">Failed to load jobs. Please try again.</div>;
  }

  if (data.jobs.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No jobs found in ServiceM8.</div>;
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Job ID</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Address</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.jobs.map((job) => (
            <tr key={job.uuid} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">{job.generated_job_id || '-'}</td>
              <td className="px-4 py-3 text-sm">{job.job_description || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{job.job_address || '-'}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    job.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : job.status === 'Work Order'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {job.date ? new Date(job.date).toLocaleDateString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientsTab() {
  const { data, error, isLoading } = useSWR<{ clients: SM8Client[] }>(
    '/api/servicem8/clients',
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.clients) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Failed to load clients. Please try again.
      </div>
    );
  }

  if (data.clients.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">No clients found in ServiceM8.</div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Company</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contact</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Phone</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Address</th>
          </tr>
        </thead>
        <tbody>
          {data.clients.map((client) => (
            <tr key={client.uuid} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">{client.company_name || '-'}</td>
              <td className="px-4 py-3 text-sm">
                {`${client.first_name || ''} ${client.last_name || ''}`.trim() || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{client.email || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{client.phone || '-'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {client.billing_address || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

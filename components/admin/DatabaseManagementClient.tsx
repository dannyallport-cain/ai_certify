'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type BackupItem = {
  objectKey: string;
  bucket?: string | null;
  size?: number | null;
  timestamp?: string | null;
  lastModified?: string | null;
};

type BackupsResponse = {
  success?: boolean;
  backups?: BackupItem[];
  message?: string;
  error?: string;
};

const fetcher = async (url: string): Promise<BackupsResponse> => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to load backups');
  }

  return data;
};

function formatBytes(size?: number | null) {
  if (!size || size <= 0) {
    return '—';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return format(date, 'PPP p');
}

function getBackupName(objectKey: string) {
  const segments = objectKey.split('/');
  return segments[segments.length - 1] || objectKey;
}

export default function DatabaseManagementClient() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<BackupsResponse>(
    '/api/admin/database/backups',
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false
    }
  );

  const backups = useMemo(() => data?.backups ?? [], [data?.backups]);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
  const configError =
    error instanceof Error && error.message === 'Backup worker URL is not configured'
      ? error.message
      : error instanceof Error && error.message === 'Backup shared secret is not configured'
        ? error.message
        : null;

  const handleTriggerBackup = async () => {
    try {
      setIsTriggeringBackup(true);

      const response = await fetch('/api/admin/database/backups', {
        method: 'POST'
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Backup failed');
      }

      toast.success(result?.message || 'Database backup started successfully');
      await mutate();
    } catch (triggerError) {
      const message =
        triggerError instanceof Error ? triggerError.message : 'Unable to create backup';
      toast.error(message);
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const handleRestore = async (objectKey: string) => {
    const confirmed = window.confirm(
      `Restore the production database from "${getBackupName(objectKey)}"? This will overwrite current database data and should only be used when recovery is required.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setRestoringKey(objectKey);

      const response = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ objectKey })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Restore failed');
      }

      toast.success(result?.message || 'Database restore completed');
      await mutate();
    } catch (restoreError) {
      const message =
        restoreError instanceof Error ? restoreError.message : 'Unable to restore backup';
      toast.error(message);
    } finally {
      setRestoringKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Database className="h-5 w-5 text-blue-600" />
            <span>Managed backup and restore system</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-slate-700 md:grid-cols-[1.5fr,1fr]">
          <div className="space-y-3">
            <p>
              Database backups are created by the Railway worker and stored as compressed SQL
              archives in Cloudflare R2. Manual backups can be triggered at any time from this
              page.
            </p>
            <p>
              Restores are destructive operations. Selecting a backup will download the archive
              from object storage and restore it into the configured PostgreSQL database.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-medium text-amber-900">
              <ShieldAlert className="h-4 w-4" />
              <span>Operational warning</span>
            </div>
            <p className="text-sm text-amber-800">
              Only run a restore during an incident or approved recovery window. Verify the backup
              timestamp before proceeding.
            </p>
          </div>
        </CardContent>
      </Card>

      {configError ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              <span>Backup system configuration required</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-900">
            <p>
              The admin database tools cannot connect to the backup worker because the required
              server environment variables are not configured in this deployment.
            </p>
            <div className="rounded-md border border-amber-300 bg-white/70 p-3 font-mono text-xs">
              {configError}
            </div>
            <p>Set these environment variables for the web app deployment, then redeploy:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><code>RAILWAY_BACKUP_WORKER_URL</code></li>
              <li><code>BACKUP_SHARED_SECRET</code></li>
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              <span>Manual backup</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Trigger an on-demand database backup using the same Railway worker flow as the
              automated backup process.
            </p>
            <Button
              onClick={handleTriggerBackup}
              disabled={isTriggeringBackup || Boolean(configError)}
              className="w-full"
            >
              {isTriggeringBackup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Create backup now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Restore guidance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
              Restoring a backup replaces current database contents. This action can interrupt live
              workflows and may permanently remove newer records.
            </div>
            <ul className="list-disc space-y-2 pl-5">
              <li>Confirm you have selected the correct backup snapshot.</li>
              <li>Use the restore action only when recovery has been approved.</li>
              <li>Notify impacted users and pause critical operations if necessary.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              <span>Available backups</span>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Stored backup archives from Cloudflare R2. Refreshes automatically every 30 seconds.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => mutate()}
            disabled={isValidating || Boolean(configError)}
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh list
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {configError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Configure <code>RAILWAY_BACKUP_WORKER_URL</code> and <code>BACKUP_SHARED_SECRET</code>{' '}
              on the web app to enable backup listing, manual backup, and restore actions.
            </div>
          ) : isLoading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading backups...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Failed to load backup list'}
            </div>
          ) : backups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No backups were returned by the backup worker yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="hidden rounded-lg border border-slate-200 md:block">
                <div className="grid grid-cols-[2fr,140px,180px,120px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Backup file</span>
                  <span>Size</span>
                  <span>Timestamp</span>
                  <span className="text-right">Action</span>
                </div>
                {backups.map((backup) => {
                  const backupTime = backup.timestamp || backup.lastModified;

                  return (
                    <div
                      key={backup.objectKey}
                      className="grid grid-cols-[2fr,140px,180px,120px] gap-4 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {getBackupName(backup.objectKey)}
                        </p>
                        <p className="truncate text-xs text-slate-500">{backup.objectKey}</p>
                        {backup.bucket ? (
                          <Badge variant="secondary" className="mt-2">
                            {backup.bucket}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-slate-600">{formatBytes(backup.size)}</div>
                      <div className="text-slate-600">{formatDateTime(backupTime)}</div>
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRestore(backup.objectKey)}
                          disabled={restoringKey === backup.objectKey || Boolean(configError)}
                        >
                          {restoringKey === backup.objectKey ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Restoring...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4" />
                              Restore
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 md:hidden">
                {backups.map((backup) => {
                  const backupTime = backup.timestamp || backup.lastModified;

                  return (
                    <div
                      key={backup.objectKey}
                      className="rounded-lg border border-slate-200 p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {getBackupName(backup.objectKey)}
                          </p>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {backup.objectKey}
                          </p>
                        </div>
                        {backup.bucket ? <Badge variant="secondary">{backup.bucket}</Badge> : null}
                      </div>
                      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Size</p>
                          <p className="text-slate-700">{formatBytes(backup.size)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Timestamp</p>
                          <p className="text-slate-700">{formatDateTime(backupTime)}</p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRestore(backup.objectKey)}
                        disabled={restoringKey === backup.objectKey || Boolean(configError)}
                      >
                        {restoringKey === backup.objectKey ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4" />
                            Restore this backup
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

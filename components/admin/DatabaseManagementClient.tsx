'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Database,
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminMutedNote, AdminSection } from '@/components/admin/AdminPageSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

type RestoreResponse = {
  success?: boolean;
  message?: string;
  detail?: string;
  restoredAt?: string;
  restored_at?: string;
  timestamp?: string;
  restoreId?: string;
  restore_id?: string;
};

type RestoreMetadata = {
  status: 'success';
  restoredAt?: string;
  message?: string;
  restoreId?: string;
};

const fetcher = async (url: string): Promise<BackupsResponse> => {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin'
  });
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

type BackupVisualState = 'idle' | 'deleting' | 'deleted';

export default function DatabaseManagementClient() {
  const router = useRouter();
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
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deletedKeys, setDeletedKeys] = useState<string[]>([]);
  const [visualStateByKey, setVisualStateByKey] = useState<Record<string, BackupVisualState>>({});
  const [restoreMetadataByKey, setRestoreMetadataByKey] = useState<Record<string, RestoreMetadata>>({});
  const configError =
    error instanceof Error && error.message === 'Backup worker URL is not configured'
      ? error.message
      : error instanceof Error && error.message === 'Backup shared secret is not configured'
        ? error.message
        : null;

  useEffect(() => {
    if (backups.length === 0) {
      return;
    }

    setDeletedKeys((current) => current.filter((key) => !backups.some((backup) => backup.objectKey === key)));
  }, [backups]);

  const visibleBackups = useMemo(
    () => backups.filter((backup) => !deletedKeys.includes(backup.objectKey)),
    [backups, deletedKeys]
  );

  const handleTriggerBackup = async () => {
    try {
      setIsTriggeringBackup(true);

      const response = await fetch('/api/admin/database/backups', {
        method: 'POST',
        credentials: 'same-origin'
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        router.push('/sign-in');
        return;
      }

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Backup failed');
      }

      toast.success(result?.message || 'Backup created successfully');
      await mutate();
    } catch (triggerError) {
      const message =
        triggerError instanceof Error ? triggerError.message : 'Unable to create backup';
      toast.error(message);
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const handleDelete = async (objectKey: string) => {
    const confirmed = window.confirm(
      `Delete "${getBackupName(objectKey)}" from backup storage? This only removes the archive file and cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingKey(objectKey);
      setVisualStateByKey((current) => ({
        ...current,
        [objectKey]: 'deleting'
      }));

      const response = await fetch('/api/admin/database/backups/delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ objectKey })
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        router.push('/sign-in');
        return;
      }

      if (!response.ok) {
        throw new Error(result?.error || result?.message || result?.detail || 'Delete failed');
      }

      toast.success('Backup deleted');
      setVisualStateByKey((current) => ({
        ...current,
        [objectKey]: 'deleted'
      }));

      window.setTimeout(() => {
        setDeletedKeys((current) => [...current, objectKey]);
      }, 220);

      window.setTimeout(() => {
        void mutate();
      }, 380);
    } catch (deleteError) {
      setVisualStateByKey((current) => ({
        ...current,
        [objectKey]: 'idle'
      }));

      const message =
        deleteError instanceof Error ? deleteError.message : 'Unable to delete backup';
      toast.error(message);
    } finally {
      setDeletingKey(null);
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
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ objectKey })
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        router.push('/sign-in');
        return;
      }

      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Restore failed');
      }

      const restoredAt = result?.restoredAt || result?.restored_at || result?.timestamp;
      const restoreMessage = result?.message || result?.detail || 'Database restore completed';
      const restoreId = result?.restoreId || result?.restore_id;

      setRestoreMetadataByKey((current) => ({
        ...current,
        [objectKey]: {
          status: 'success',
          restoredAt,
          message: restoreMessage,
          restoreId
        }
      }));

      toast.success(restoreMessage);
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
      {configError ? (
        <AdminSection
          eyebrow="Configuration"
          title="Backup system configuration required"
          description="The admin tools cannot reach the backup worker until deployment variables are set."
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
        >
          <div className="space-y-3 text-sm text-amber-950">
            <div className="rounded-xl border border-amber-300 bg-white/80 p-3 font-mono text-xs text-slate-700">
              {configError}
            </div>
            <p>Set these environment variables for the web app deployment, then redeploy:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><code>RAILWAY_BACKUP_WORKER_URL</code></li>
              <li><code>BACKUP_SHARED_SECRET</code></li>
            </ul>
          </div>
        </AdminSection>
      ) : null}

      <AdminSection
        eyebrow="Backups"
        title="Database backups"
        description="Create, review, delete, or restore backups from one compact view."
        icon={<Database className="h-5 w-5" />}
        tone="slate"
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
                  Refresh
                </>
              )}
            </Button>
            <Button
              onClick={handleTriggerBackup}
              disabled={isTriggeringBackup || Boolean(configError)}
            >
              {isTriggeringBackup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Create backup
                </>
              )}
            </Button>
          </div>
        }
      >
        <AdminMutedNote tone="amber">
          <ShieldAlert className="h-4 w-4" />
          Restore overwrites live database data. Delete only removes the stored archive file.
        </AdminMutedNote>

        {configError ? (
          <AdminMutedNote tone="amber">
            Configure <code>RAILWAY_BACKUP_WORKER_URL</code> and <code>BACKUP_SHARED_SECRET</code>{' '}
            on the web app to enable backup listing, manual backup, delete, and restore actions.
          </AdminMutedNote>
        ) : isLoading ? (
          <div className="flex min-h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading backups...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error instanceof Error ? error.message : 'Failed to load backup list'}
          </div>
        ) : visibleBackups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No backups were returned by the backup worker yet.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:hidden">
              {visibleBackups.map((backup) => {
                const backupTime = backup.timestamp || backup.lastModified;
                const isDeleting = deletingKey === backup.objectKey;
                const isRestoring = restoringKey === backup.objectKey;
                const visualState = visualStateByKey[backup.objectKey] ?? 'idle';
                const busy = isDeleting || isRestoring;

                return (
                  <div
                    key={backup.objectKey}
                    className={`rounded-2xl border bg-white p-4 shadow-none transition-all duration-300 ${
                      visualState === 'deleting'
                        ? 'scale-[0.985] border-amber-300 bg-amber-50/70 opacity-80'
                        : visualState === 'deleted'
                          ? 'scale-[0.96] border-emerald-300 bg-emerald-50 opacity-0'
                          : 'border-slate-200 opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {getBackupName(backup.objectKey)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(backupTime)}</p>
                      </div>
                      {backup.bucket ? <Badge variant="secondary">{backup.bucket}</Badge> : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                      <span>{formatBytes(backup.size)}</span>
                      <span className="truncate text-xs text-slate-500">{backup.objectKey}</span>
                    </div>

                    {restoreMetadataByKey[backup.objectKey] ? (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                            Restored
                          </Badge>
                          <span>
                            {restoreMetadataByKey[backup.objectKey].restoredAt
                              ? `Restored ${formatDateTime(restoreMetadataByKey[backup.objectKey].restoredAt)}`
                              : 'Restored just now'}
                          </span>
                        </div>
                        {restoreMetadataByKey[backup.objectKey].message ? (
                          <p className="mt-1 line-clamp-2">{restoreMetadataByKey[backup.objectKey].message}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(backup.objectKey)}
                        disabled={busy || Boolean(configError)}
                        className={visualState === 'deleted' ? 'border-emerald-300 text-emerald-700' : ''}
                      >
                        {visualState === 'deleting' ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : visualState === 'deleted' ? (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Deleted
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRestore(backup.objectKey)}
                        disabled={busy || Boolean(configError)}
                      >
                        {isRestoring ? (
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

            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
              <div className="grid grid-cols-[minmax(0,2fr),120px,180px,220px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Backup</span>
                <span>Size</span>
                <span>Timestamp</span>
                <span className="text-right">Actions</span>
              </div>
              {visibleBackups.map((backup) => {
                const backupTime = backup.timestamp || backup.lastModified;
                const isDeleting = deletingKey === backup.objectKey;
                const isRestoring = restoringKey === backup.objectKey;
                const visualState = visualStateByKey[backup.objectKey] ?? 'idle';
                const busy = isDeleting || isRestoring;

                return (
                  <div
                    key={backup.objectKey}
                    className={`grid grid-cols-[minmax(0,2fr),120px,180px,220px] gap-4 border-b px-4 py-3 text-sm transition-all duration-300 last:border-b-0 ${
                      visualState === 'deleting'
                        ? 'border-amber-200 bg-amber-50/70 opacity-80'
                        : visualState === 'deleted'
                          ? 'border-emerald-200 bg-emerald-50 opacity-0 scale-[0.98]'
                          : 'border-slate-100 bg-white opacity-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-slate-900">
                          {getBackupName(backup.objectKey)}
                        </p>
                        {backup.bucket ? <Badge variant="secondary">{backup.bucket}</Badge> : null}
                        {restoreMetadataByKey[backup.objectKey] ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                            Restored
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-slate-500">{backup.objectKey}</p>
                      {restoreMetadataByKey[backup.objectKey] ? (
                        <p className="mt-1 truncate text-xs text-emerald-700">
                          {restoreMetadataByKey[backup.objectKey].restoredAt
                            ? `Restored ${formatDateTime(restoreMetadataByKey[backup.objectKey].restoredAt)}`
                            : 'Restored just now'}
                          {restoreMetadataByKey[backup.objectKey].message
                            ? ` · ${restoreMetadataByKey[backup.objectKey].message}`
                            : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-slate-600">{formatBytes(backup.size)}</div>
                    <div className="text-slate-600">{formatDateTime(backupTime)}</div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(backup.objectKey)}
                        disabled={busy || Boolean(configError)}
                        className={visualState === 'deleted' ? 'border-emerald-300 text-emerald-700' : ''}
                      >
                        {visualState === 'deleting' ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : visualState === 'deleted' ? (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Deleted
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRestore(backup.objectKey)}
                        disabled={busy || Boolean(configError)}
                      >
                        {isRestoring ? (
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
          </div>
        )}
      </AdminSection>
    </div>
  );
}

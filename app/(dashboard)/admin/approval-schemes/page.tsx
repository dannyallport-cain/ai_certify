'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Save, RefreshCw } from 'lucide-react';

type ApprovalSchemeRow = {
  id: number;
  code: string;
  label: string;
  shortLabel: string;
  description: string | null;
  accentColor: string;
  textColor: string;
  symbol: string;
  logoSrc: string | null;
  logoAlt: string | null;
  sortOrder: number;
  isActive: boolean;
};

type EditableScheme = Omit<ApprovalSchemeRow, 'id'>;

const emptyScheme: EditableScheme = {
  code: '',
  label: '',
  shortLabel: '',
  description: '',
  accentColor: '#1d4ed8',
  textColor: '#ffffff',
  symbol: '',
  logoSrc: '',
  logoAlt: '',
  sortOrder: 0,
  isActive: true,
};

export default function AdminApprovalSchemesPage() {
  const [rows, setRows] = useState<ApprovalSchemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<EditableScheme>(emptyScheme);
  const [status, setStatus] = useState<string>('');

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [rows]
  );

  async function loadRows() {
    setLoading(true);
    setStatus('');
    try {
      const response = await fetch('/api/admin/approval-schemes', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load approval schemes');
      }
      setRows(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load approval schemes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  const updateLocalRow = (id: number, patch: Partial<ApprovalSchemeRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const saveRow = async (row: ApprovalSchemeRow) => {
    setSavingId(row.id);
    setStatus('');
    try {
      const response = await fetch(`/api/admin/approval-schemes/${row.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: row.code,
          label: row.label,
          shortLabel: row.shortLabel,
          description: row.description ?? '',
          accentColor: row.accentColor,
          textColor: row.textColor,
          symbol: row.symbol,
          logoSrc: row.logoSrc ?? '',
          logoAlt: row.logoAlt ?? '',
          sortOrder: Number(row.sortOrder) || 0,
          isActive: row.isActive,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update approval scheme');
      }
      updateLocalRow(row.id, data);
      setStatus(`Saved "${data.label}"`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to update approval scheme');
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (id: number) => {
    setDeletingId(id);
    setStatus('');
    try {
      const response = await fetch(`/api/admin/approval-schemes/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete approval scheme');
      }
      setRows((prev) => prev.filter((row) => row.id !== id));
      setStatus('Approval scheme deleted');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to delete approval scheme');
    } finally {
      setDeletingId(null);
    }
  };

  const createRow = async () => {
    setCreating(true);
    setStatus('');
    try {
      const response = await fetch('/api/admin/approval-schemes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          sortOrder: Number(draft.sortOrder) || 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create approval scheme');
      }
      setRows((prev) => [...prev, data]);
      setDraft(emptyScheme);
      setStatus(`Created "${data.label}"`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create approval scheme');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Approval schemes</h1>
          <p className="text-sm text-slate-600">
            Manage universal approval types used by users and printed in certificate/report headers.
          </p>
        </div>
        <Button variant="outline" onClick={loadRows} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {status ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {status}
        </div>
      ) : null}

      <Card className="border-slate-200 bg-white">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-slate-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Create new scheme</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Code">
              <Input
                value={draft.code}
                onChange={(e) => setDraft((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="niceic"
              />
            </Field>
            <Field label="Label">
              <Input
                value={draft.label}
                onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="NICEIC"
              />
            </Field>
            <Field label="Short label">
              <Input
                value={draft.shortLabel}
                onChange={(e) => setDraft((prev) => ({ ...prev, shortLabel: e.target.value }))}
                placeholder="NICEIC"
              />
            </Field>
            <Field label="Symbol">
              <Input
                value={draft.symbol}
                onChange={(e) => setDraft((prev) => ({ ...prev, symbol: e.target.value }))}
                placeholder="NC"
              />
            </Field>
            <Field label="Accent color">
              <Input
                value={draft.accentColor}
                onChange={(e) => setDraft((prev) => ({ ...prev, accentColor: e.target.value }))}
                placeholder="#1d4ed8"
              />
            </Field>
            <Field label="Text color">
              <Input
                value={draft.textColor}
                onChange={(e) => setDraft((prev) => ({ ...prev, textColor: e.target.value }))}
                placeholder="#ffffff"
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))}
              />
            </Field>
            <Field label="Active">
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={draft.isActive ? 'true' : 'false'}
                onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.value === 'true' }))}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </Field>
            <Field label="Logo source">
              <Input
                value={draft.logoSrc ?? ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, logoSrc: e.target.value }))}
                placeholder="/logos/niceic.png"
              />
            </Field>
            <Field label="Logo alt">
              <Input
                value={draft.logoAlt ?? ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, logoAlt: e.target.value }))}
                placeholder="NICEIC logo"
              />
            </Field>
            <Field label="Description" className="md:col-span-2 xl:col-span-2">
              <Input
                value={draft.description ?? ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Scheme description"
              />
            </Field>
          </div>

          <Button onClick={createRow} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? 'Creating...' : 'Create scheme'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Existing schemes</h2>
            <Badge variant="outline">{rows.length}</Badge>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : sortedRows.length === 0 ? (
            <p className="text-sm text-slate-600">No approval schemes found.</p>
          ) : (
            <div className="space-y-4">
              {sortedRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">#{row.id}</Badge>
                      <Badge variant="outline">{row.code}</Badge>
                      <span className="text-sm font-medium text-slate-800">{row.label}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveRow(row)} disabled={savingId === row.id}>
                        <Save className="mr-2 h-4 w-4" />
                        {savingId === row.id ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteRow(row.id)}
                        disabled={deletingId === row.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingId === row.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Code">
                      <Input
                        value={row.code}
                        onChange={(e) => updateLocalRow(row.id, { code: e.target.value })}
                      />
                    </Field>
                    <Field label="Label">
                      <Input
                        value={row.label}
                        onChange={(e) => updateLocalRow(row.id, { label: e.target.value })}
                      />
                    </Field>
                    <Field label="Short label">
                      <Input
                        value={row.shortLabel}
                        onChange={(e) => updateLocalRow(row.id, { shortLabel: e.target.value })}
                      />
                    </Field>
                    <Field label="Symbol">
                      <Input
                        value={row.symbol}
                        onChange={(e) => updateLocalRow(row.id, { symbol: e.target.value })}
                      />
                    </Field>
                    <Field label="Accent color">
                      <Input
                        value={row.accentColor}
                        onChange={(e) => updateLocalRow(row.id, { accentColor: e.target.value })}
                      />
                    </Field>
                    <Field label="Text color">
                      <Input
                        value={row.textColor}
                        onChange={(e) => updateLocalRow(row.id, { textColor: e.target.value })}
                      />
                    </Field>
                    <Field label="Sort order">
                      <Input
                        type="number"
                        value={row.sortOrder}
                        onChange={(e) => updateLocalRow(row.id, { sortOrder: Number(e.target.value) || 0 })}
                      />
                    </Field>
                    <Field label="Active">
                      <select
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={row.isActive ? 'true' : 'false'}
                        onChange={(e) => updateLocalRow(row.id, { isActive: e.target.value === 'true' })}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </Field>
                    <Field label="Logo source">
                      <Input
                        value={row.logoSrc ?? ''}
                        onChange={(e) => updateLocalRow(row.id, { logoSrc: e.target.value })}
                      />
                    </Field>
                    <Field label="Logo alt">
                      <Input
                        value={row.logoAlt ?? ''}
                        onChange={(e) => updateLocalRow(row.id, { logoAlt: e.target.value })}
                      />
                    </Field>
                    <Field label="Description" className="md:col-span-2 xl:col-span-2">
                      <Input
                        value={row.description ?? ''}
                        onChange={(e) => updateLocalRow(row.id, { description: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

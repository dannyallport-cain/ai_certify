'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Link2, Printer, Share2 } from 'lucide-react';

import type { DesignSheet } from '@/lib/design';

interface SheetPanelProps {
  sheet: DesignSheet;
  shareToken: string | null;
  onSheetChange: (patch: Partial<DesignSheet>) => void;
  onPublish: (editEnabled: boolean) => Promise<string | null>;
  /** False on a demonstration plan, which has no stored row to publish from. */
  canShare?: boolean;
}

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40';

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
    </label>
  );
}

/**
 * The title block and the sharing controls.
 *
 * Everything here prints with the plan except the sharing block itself, which is `print:hidden`:
 * a sheet handed to a client must not carry a management URL.
 */
export default function SheetPanel({
  sheet,
  shareToken,
  onSheetChange,
  onPublish,
  canShare = true,
}: SheetPanelProps) {
  const [editEnabled, setEditEnabled] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  // The origin is only known in the browser; reading it during render makes the server HTML and
  // the first client render disagree, so it is captured after mount instead.
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = shareToken && origin ? `${origin}/designs/share/${shareToken}` : null;

  const handlePublish = async () => {
    setPublishing(true);
    await onPublish(editEnabled);
    setPublishing(false);
  };

  const copyShareUrl = async () => {
    if (!shareUrl) {
      return;
    }

    await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h2 className="text-sm font-semibold text-foreground">Plan sheet</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Printed with the drawing on every floor.
      </p>

      <div className="mt-3 space-y-2.5">
        <Field
          label="Sheet title"
          value={sheet.title}
          onChange={(title) => onSheetChange({ title })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Job reference"
            value={sheet.jobReference}
            onChange={(jobReference) => onSheetChange({ jobReference })}
          />
          <Field
            label="Revision"
            value={sheet.revision}
            onChange={(revision) => onSheetChange({ revision })}
          />
        </div>
        <Field
          label="Site name"
          value={sheet.siteName}
          onChange={(siteName) => onSheetChange({ siteName })}
        />
        <Field
          label="Site address"
          value={sheet.siteAddress}
          onChange={(siteAddress) => onSheetChange({ siteAddress })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Prepared by"
            value={sheet.preparedBy}
            onChange={(preparedBy) => onSheetChange({ preparedBy })}
          />
          <Field
            label="Prepared on"
            value={sheet.preparedOn}
            onChange={(preparedOn) => onSheetChange({ preparedOn })}
          />
        </div>
        <Field
          label="Company"
          value={sheet.companyName}
          onChange={(companyName) => onSheetChange({ companyName })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Phone"
            value={sheet.companyPhone}
            onChange={(companyPhone) => onSheetChange({ companyPhone })}
          />
          <Field
            label="Accreditation"
            value={sheet.accreditation}
            placeholder="BAFE SP203-1"
            onChange={(accreditation) => onSheetChange({ accreditation })}
          />
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={sheet.notes}
            onChange={(event) => onSheetChange({ notes: event.target.value })}
            rows={2}
            className={`${INPUT_CLASS} resize-none`}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={sheet.showGrid}
              onChange={(event) => onSheetChange({ showGrid: event.target.checked })}
            />
            Grid
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={sheet.showZoneLegend}
              onChange={(event) => onSheetChange({ showZoneLegend: event.target.checked })}
            />
            Zone legend
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={sheet.showDeviceLegend}
              onChange={(event) => onSheetChange({ showDeviceLegend: event.target.checked })}
            />
            Device legend
          </label>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-border pt-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          <Printer className="h-3.5 w-3.5" />
          Print this floor
        </button>

        {canShare ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={editEnabled}
              onChange={(event) => setEditEnabled(event.target.checked)}
            />
            Let the recipient edit the shared plan
          </label>
        ) : null}

        {canShare ? (
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={publishing}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-2 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            {publishing ? 'Publishing…' : shareToken ? 'Refresh shared link' : 'Create shared link'}
          </button>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Save a copy of the plan first to create a shared link for a client.
          </p>
        )}

        {canShare && shareUrl ? (
          <div className="rounded-lg border border-border bg-muted/50 p-2">
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Link2 className="h-3 w-3" />
              Shared link
            </p>
            <p className="mt-1 break-all text-[11px] text-foreground">{shareUrl}</p>
            <button
              type="button"
              onClick={() => void copyShareUrl()}
              className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

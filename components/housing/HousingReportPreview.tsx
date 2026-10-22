'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { HousingReportTemplate } from '@/lib/housing/types';
import { formatUkDate, type HousingReportPayload, type HousingRow } from '@/lib/housing/values';

type HousingReportPreviewProps = {
  open: boolean;
  onClose: () => void;
  template: HousingReportTemplate;
  payload: HousingReportPayload;
};

function hasContent(row: HousingRow): boolean {
  return Object.values(row).some((cell) => cell && cell.trim().length > 0);
}

export function HousingReportPreview({ open, onClose, template, payload }: HousingReportPreviewProps) {
  if (!open) {
    return null;
  }

  const summary: Array<[string, string]> = [
    ['Report reference', payload.certificateNumber || 'Not assigned'],
    ['Report type', template.title],
    ['Customer', payload.customerName || 'Not specified'],
    ['Site', payload.siteName || 'Not specified'],
    ['Site address', payload.siteAddress || 'Not specified'],
    ['Inspection date', formatUkDate(payload.inspectionDate) || 'Not recorded'],
    ['Next inspection', formatUkDate(payload.nextInspectionDate) || 'Not recorded'],
    ['Inspector', payload.inspectorName || 'Not recorded'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4">
      <div className="my-6 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Report preview
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{template.reportTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">
              This is what will be generated as a PDF once the report is saved.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto bg-slate-50 p-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
              Report details
            </h3>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {summary.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </dt>
                  <dd className="text-sm text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {template.sections.map((section, index) => {
            const rows = section.repeatable
              ? (payload.rows[section.repeatable.id] ?? []).filter(hasContent)
              : [];

            return (
              <section key={section.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  {index + 1}. {section.title}
                </h3>

                {section.fields && section.fields.length > 0 ? (
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    {section.fields.map((field) => {
                      const rawValue = payload.values[field.id]?.trim() ?? '';
                      const value = field.type === 'date' ? formatUkDate(rawValue) : rawValue;
                      return (
                        <div
                          key={field.id}
                          className={field.span === 3 || field.type === 'textarea' ? 'sm:col-span-2' : ''}
                        >
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {field.label}
                          </dt>
                          <dd className={value ? 'text-sm text-slate-800' : 'text-sm text-slate-400'}>
                            {value || 'Not recorded'}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                ) : null}

                {section.repeatable && rows.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-left uppercase tracking-wide text-slate-600">
                          <th className="px-2 py-1.5">#</th>
                          {section.repeatable.columns.map((column) => (
                            <th key={column.id} className="px-2 py-1.5">
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, rowIndex) => (
                          <tr key={`${section.id}-preview-${rowIndex}`} className="border-b border-slate-100 align-top">
                            <td className="px-2 py-1.5 font-semibold text-slate-500">
                              {rowIndex + 1}
                            </td>
                            {section.repeatable!.columns.map((column) => (
                              <td key={column.id} className="px-2 py-1.5 text-slate-800">
                                {row[column.id] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-slate-200 p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close preview
          </Button>
        </div>
      </div>
    </div>
  );
}

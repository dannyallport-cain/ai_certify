'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { HousingRepeatableGroup } from '@/lib/housing/types';
import { createEmptyRow, type HousingRow } from '@/lib/housing/values';

type RepeatableRowsEditorProps = {
  group: HousingRepeatableGroup;
  rows: HousingRow[];
  onChange: (rows: HousingRow[]) => void;
};

const SELECT_CLASSES =
  'flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Column minimums keep placeholders readable. Wide groups scroll horizontally
 * rather than squeezing eight columns into the viewport.
 */
const COLUMN_MIN_WIDTH: Record<string, number> = {
  text: 150,
  number: 110,
  select: 155,
  textarea: 195,
};

const INDEX_AND_ACTIONS_WIDTH = 96;

export function RepeatableRowsEditor({ group, rows, onChange }: RepeatableRowsEditorProps) {
  const updateCell = (rowIndex: number, columnId: string, value: string) => {
    const nextRows = rows.map((row, index) =>
      index === rowIndex ? { ...row, [columnId]: value } : row,
    );
    onChange(nextRows);
  };

  const addRow = () => {
    onChange([...rows, createEmptyRow(group)]);
  };

  const removeRow = (rowIndex: number) => {
    onChange(rows.filter((_, index) => index !== rowIndex));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{group.title}</p>
          {group.description ? (
            <p className="text-xs text-slate-600">{group.description}</p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {group.addLabel}
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Scroll the table sideways to reach every column.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table
          className="w-full border-collapse text-sm"
          style={{
            minWidth: group.columns.reduce(
              (total, column) => total + (COLUMN_MIN_WIDTH[column.type] ?? 150),
              INDEX_AND_ACTIONS_WIDTH,
            ),
          }}
        >
          <thead>
            <tr className="bg-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <th className="w-10 border-b border-slate-200 px-2 py-2">#</th>
              {group.columns.map((column) => (
                <th key={column.id} className="border-b border-slate-200 px-2 py-2">
                  {column.label}
                </th>
              ))}
              <th className="w-12 border-b border-slate-200 px-2 py-2 text-right">Remove</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={group.columns.length + 2}
                  className="px-3 py-4 text-center text-xs text-slate-500"
                >
                  {group.emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={`${group.id}-row-${rowIndex}`} className="align-top">
                  <td className="border-b border-slate-100 px-2 py-2 text-xs font-semibold text-slate-500">
                    {rowIndex + 1}
                  </td>
                  {group.columns.map((column) => (
                    <td key={column.id} className="border-b border-slate-100 px-2 py-2">
                      {column.type === 'select' ? (
                        <select
                          value={row[column.id] ?? ''}
                          onChange={(event) =>
                            updateCell(rowIndex, column.id, event.target.value)
                          }
                          className={SELECT_CLASSES}
                        >
                          <option value="">Select</option>
                          {(column.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : column.type === 'textarea' ? (
                        <Textarea
                          value={row[column.id] ?? ''}
                          onChange={(event) =>
                            updateCell(rowIndex, column.id, event.target.value)
                          }
                          placeholder={column.placeholder}
                          rows={2}
                          className="min-h-[58px] text-sm"
                        />
                      ) : (
                        <Input
                          type={column.type === 'number' ? 'number' : 'text'}
                          value={row[column.id] ?? ''}
                          onChange={(event) =>
                            updateCell(rowIndex, column.id, event.target.value)
                          }
                          placeholder={column.placeholder}
                          className="h-9 text-sm"
                        />
                      )}
                    </td>
                  ))}
                  <td className="border-b border-slate-100 px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove row ${rowIndex + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

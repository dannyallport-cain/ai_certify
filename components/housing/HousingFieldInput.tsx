'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { HousingField } from '@/lib/housing/types';
import { HOUSING_YES_NO_NA_OPTIONS, HOUSING_YES_NO_OPTIONS } from '@/lib/housing/types';
import { cn } from '@/lib/utils';

type HousingFieldInputProps = {
  field: HousingField;
  value: string;
  onChange: (value: string) => void;
  idPrefix: string;
};

const SELECT_CLASSES =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function resolveOptions(field: HousingField): readonly string[] {
  if (field.type === 'yesno') {
    return HOUSING_YES_NO_OPTIONS;
  }

  if (field.type === 'yesno-na') {
    return HOUSING_YES_NO_NA_OPTIONS;
  }

  return field.options ?? [];
}

export function HousingFieldInput({ field, value, onChange, idPrefix }: HousingFieldInputProps) {
  const inputId = `${idPrefix}-${field.id}`;
  const options = resolveOptions(field);
  const isSelect = field.type === 'select' || field.type === 'yesno' || field.type === 'yesno-na';

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {field.label}
        {field.required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>

      {isSelect ? (
        <select
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={SELECT_CLASSES}
          required={field.required}
        >
          <option value="">Not recorded</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <Textarea
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={3}
          required={field.required}
        />
      ) : (
        <Input
          id={inputId}
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      )}

      {field.hint ? <p className="text-xs text-slate-500">{field.hint}</p> : null}
    </div>
  );
}

export function housingFieldWrapperClass(field: HousingField) {
  if (field.span === 3 || field.type === 'textarea') {
    return cn('sm:col-span-2 xl:col-span-3');
  }

  if (field.span === 2) {
    return cn('sm:col-span-2');
  }

  return '';
}

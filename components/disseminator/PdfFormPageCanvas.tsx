'use client';

import { DEFAULT_STATE_OPTIONS, isNumericLikeFieldType, type DisseminatorFieldType, type InspectionPeriodConfig, computeNextInspectionDate, calculateMaxZs, DEVICE_TYPE_OPTIONS, getValidRatingsForType } from '@/lib/report-disseminator/field-analysis';
import { useOverlayFieldCss } from '@/components/disseminator/pdfPageSurface';
import { DEFAULT_PDF_PAGE_REDACTION_OPTIONS, usePdfPageRaster } from '@/components/disseminator/usePdfPageRaster';

type FieldType = DisseminatorFieldType;

type FormField = {
  id: string;
  label: string;
  fieldType: FieldType;
  required?: boolean;
  plainTextHint?: string;
  dropdownOptions?: string[];
  stateOptions?: Array<'tick' | 'cross' | 'NA' | 'LIM' | 'NV'>;
  numericConfig?: { min?: number; max?: number; resolution?: number; unit?: string };
  inspectionPeriodConfig?: InspectionPeriodConfig;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
};

type Props = {
  pdfBase64: string;
  pageNumber?: number;
  fields?: FormField[];
  values: Record<string, string>;
  redactionOptions?: {
    fieldBounds: boolean;
    labelMatch: boolean;
    genericText: boolean;
    pixelFallback: boolean;
  };
  onValueChange: (fieldId: string, value: string) => void;
  selectedId?: string | null;
  onSelectField?: (id: string) => void;
};

// Colour palette for state_enum cycling buttons
const STATE_ENUM_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  '':     { label: '—',   bg: 'bg-white/55',       text: 'text-gray-400' },
  'tick': { label: '✓',   bg: 'bg-green-50',       text: 'text-green-800' },
  '✓':   { label: '✓',   bg: 'bg-green-50',       text: 'text-green-800' },
  'cross':{ label: '✗',   bg: 'bg-red-50',         text: 'text-red-800' },
  'NA':   { label: 'N/A', bg: 'bg-gray-100',       text: 'text-gray-600' },
  'N/A':  { label: 'N/A', bg: 'bg-gray-100',       text: 'text-gray-600' },
  'C1':   { label: 'C1',  bg: 'bg-red-100',        text: 'text-red-800' },
  'C2':   { label: 'C2',  bg: 'bg-orange-100',     text: 'text-orange-800' },
  'C3':   { label: 'C3',  bg: 'bg-blue-100',       text: 'text-blue-800' },
  'LIM':  { label: 'LIM', bg: 'bg-amber-50',       text: 'text-amber-800' },
  'NV':   { label: 'NV',  bg: 'bg-slate-100',      text: 'text-slate-700' },
};

export function PdfFormPageCanvas({
  pdfBase64,
  pageNumber = 1,
  fields = [],
  values,
  redactionOptions = DEFAULT_PDF_PAGE_REDACTION_OPTIONS,
  onValueChange,
  selectedId,
  onSelectField,
}: Props) {
  const { canvasSize, scale, viewportHeight, renderKey } = usePdfPageRaster({
    pdfBase64,
    pageNumber,
    fields,
    redactionOptions,
  });
  const overlayClassName = `pdf-form-overlay-page-${pageNumber}`;
  const overlayCss = useOverlayFieldCss(overlayClassName, fields, {
    width: canvasSize.width,
    height: canvasSize.height,
    scale,
    viewportHeight,
  });

  const renderFieldControl = (field: FormField) => {
    const commonClassName =
      'h-full w-full bg-white/55 px-1 text-[11px] text-slate-900 outline-none border-0';
    const value = values[field.id] || '';

    if (field.fieldType === 'auto_reference') {
      return (
        <input
          className={`${commonClassName} bg-slate-100 text-slate-500`}
          type="text"
          value={value}
          title={field.label}
          readOnly
          onFocus={() => onSelectField?.(field.id)}
        />
      );
    }

    if (field.fieldType === 'dropdown') {
      return (
        <select
          className={commonClassName}
          title={field.label}
          value={value}
          onChange={(event) => onValueChange(field.id, event.target.value)}
          onFocus={() => onSelectField?.(field.id)}
        >
          <option value="">{field.label}</option>
          {(field.dropdownOptions || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.fieldType === 'state_enum') {
      const cycle = field.stateOptions ?? [...DEFAULT_STATE_OPTIONS];
      const cycleWithBlank = ['', ...cycle] as string[];
      const nextValue = () => {
        const idx = cycleWithBlank.indexOf(value);
        return cycleWithBlank[(idx + 1) % cycleWithBlank.length];
      };
      const cfg = STATE_ENUM_STYLE[value] ?? STATE_ENUM_STYLE[''];
      return (
        <button
          type="button"
          className={`h-full w-full text-[11px] font-bold border-0 outline-none cursor-pointer select-none transition-colors duration-100 ${cfg.bg} ${cfg.text}`}
          title={`${field.label} — click to cycle`}
          onClick={() => {
            onValueChange(field.id, nextValue());
            onSelectField?.(field.id);
          }}
        >
          {cfg.label}
        </button>
      );
    }

    if (field.fieldType === 'date') {
      return (
        <input
          className={commonClassName}
          type="date"
          title={field.label}
          required={field.required}
          value={value}
          onChange={(event) => onValueChange(field.id, event.target.value)}
          onFocus={() => onSelectField?.(field.id)}
        />
      );
    }

    if (field.fieldType === 'inspection_date_plus_period') {
      const isCustom = field.inspectionPeriodConfig?.period === 'custom';
      const computedValue =
        !isCustom && field.inspectionPeriodConfig?.inspectionDateFieldId
          ? computeNextInspectionDate(
              values[field.inspectionPeriodConfig.inspectionDateFieldId] || '',
              field.inspectionPeriodConfig.period
            )
          : value;
      return (
        <input
          className={`${commonClassName}${!isCustom ? ' bg-slate-100 text-slate-500' : ''}`}
          type="date"
          title={isCustom ? field.label : `${field.label} (auto)`}
          value={isCustom ? value : computedValue}
          readOnly={!isCustom}
          onChange={isCustom ? (event) => onValueChange(field.id, event.target.value) : undefined}
          onFocus={() => onSelectField?.(field.id)}
        />
      );
    }



if (field.fieldType === 'auto_zs') {
  const deviceTypeFieldId = `${field.id}_deviceType`;
  const ratingFieldId = `${field.id}_rating`;
  const deviceType = String(values[deviceTypeFieldId] ?? '');
  const rating = String(values[ratingFieldId] ?? '');
  const maxZs = calculateMaxZs(deviceType, rating);
  const isValid = maxZs !== 'N/A';

  const validRatings = getValidRatingsForType(deviceType);

  return (
    <div className="flex h-full w-full flex-col space-y-1">
      <div className="flex flex-col space-y-1 text-[9px]">
        <label className="font-medium text-slate-700">Device Type</label>
        <select
          className="h-6 w-full rounded border px-1 text-slate-900 outline-none"
          title={`${field.label} device type`}
          value={deviceType}
          onChange={(e) => {
            onValueChange(deviceTypeFieldId, e.target.value);
            // Clear rating when type changes
            onValueChange(ratingFieldId, '');
          }}
          onFocus={() => onSelectField?.(deviceTypeFieldId)}
        >
          <option value="">Select Type</option>
          {DEVICE_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex flex-col space-y-1 text-[9px]">
        <label className="font-medium text-slate-700">Rating</label>
        <select
          className="h-6 w-full rounded border px-1 text-slate-900 outline-none"
          title={`${field.label} rating`}
          value={rating}
          onChange={(e) => onValueChange(ratingFieldId, e.target.value)}
          onFocus={() => onSelectField?.(ratingFieldId)}
          disabled={!deviceType}
        >
          <option value="">{deviceType ? 'Select Rating' : 'Select Type First'}</option>
          {validRatings.map((r) => (
            <option key={r} value={r}>
              {r}A
            </option>
          ))}
        </select>
      </div>

      <div className={`text-center font-mono text-[11px] font-bold ${
        isValid ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
      } rounded px-1 py-0.5`}>
        Max Zs: {maxZs}
        {!isValid && <span className="ml-1">⚠️</span>}
      </div>
    </div>
  );
}

if (field.fieldType === 'sentence_builder') {
      const snippets = field.dropdownOptions || [];
      const datalistId = `sentence-snippets-${field.id}`;
      return (
        <div className="h-full w-full">
          <input
            className={commonClassName}
            type="text"
            list={snippets.length ? datalistId : undefined}
            placeholder={field.plainTextHint || field.label}
            required={field.required}
            value={value}
            onChange={(event) => onValueChange(field.id, event.target.value)}
            onFocus={() => onSelectField?.(field.id)}
          />
          {snippets.length > 0 && (
            <datalist id={datalistId}>
              {snippets.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </div>
      );
    }

    return (
      <input
        className={commonClassName}
        type={isNumericLikeFieldType(field.fieldType) ? 'number' : field.fieldType === 'uk_phone' ? 'tel' : 'text'}
        placeholder={field.plainTextHint || field.label}
        required={field.required}
        min={field.numericConfig?.min}
        max={field.numericConfig?.max}
        step={field.numericConfig?.resolution}
        value={value}
        onChange={(event) => onValueChange(field.id, event.target.value)}
        onFocus={() => onSelectField?.(field.id)}
      />
    );
  };

  return (
    <div className="relative max-w-full overflow-auto rounded border bg-slate-100">
      <style>{overlayCss}</style>
      <div
        className="block bg-white bg-contain bg-no-repeat"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
        data-render-key={renderKey}
      />

      <div className={`absolute inset-0 ${overlayClassName}`}>
        {fields.map((field) => {
          if (!field.boundingBox) return null;

          const isSelected = field.id === selectedId;

          return (
            <div
              key={field.id}
              className={`absolute overflow-hidden rounded border shadow-sm pdf-form-field-${field.id.replace(/[^a-zA-Z0-9_-]/g, '-')} ${isSelected ? 'border-blue-500 bg-white/20' : 'border-amber-400 bg-transparent'}`}
              onClick={() => onSelectField?.(field.id)}
            >
              {renderFieldControl(field)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

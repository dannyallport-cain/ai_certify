'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_STATE_OPTIONS, isNumericLikeFieldType, type DisseminatorFieldType } from '@/lib/report-disseminator/field-analysis';
import { buildCanvasFallbackRedactions, buildFieldLabelRedactions, buildPdfValueRedactions } from '@/components/disseminator/pdfRedaction';

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

export function PdfFormPageCanvas({
  pdfBase64,
  pageNumber = 1,
  fields = [],
  values,
  redactionOptions = { fieldBounds: true, labelMatch: true, genericText: false, pixelFallback: false },
  onValueChange,
  selectedId,
  onSelectField,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1131 });
  const [scale, setScale] = useState(1);
  const [viewportHeight, setViewportHeight] = useState(1131);
  const overlayClassName = `pdf-form-overlay-page-${pageNumber}`;
  const overlayCss = useMemo(() => {
    const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');
    const rules = [
      `.${overlayClassName}{width:${canvasSize.width}px;height:${canvasSize.height}px;}`,
    ];

    for (const field of fields) {
      if (!field.boundingBox) continue;

      const { x, y, width, height } = field.boundingBox;
      const left = x * scale;
      const top = viewportHeight - (y + height) * scale;
      const overlayWidth = Math.max(width * scale, 12);
      const overlayHeight = Math.max(height * scale, 12);
      rules.push(
        `.pdf-form-field-${sanitize(field.id)}{left:${left}px;top:${top}px;width:${overlayWidth}px;height:${overlayHeight}px;}`,
      );
    }

    return rules.join('\n');
  }, [canvasSize.height, canvasSize.width, fields, overlayClassName, scale, viewportHeight]);

  useEffect(() => {
    if (!pdfBase64 || !canvasRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const dataUrl = pdfBase64.startsWith('data:')
          ? pdfBase64
          : `data:application/pdf;base64,${pdfBase64}`;

        const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const desiredWidth = 800;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const pageScale = desiredWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale: pageScale });

        if (cancelled) return;
        setScale(pageScale);
        setViewportHeight(viewport.height);
        setCanvasSize({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvas: canvas as HTMLCanvasElement, canvasContext: ctx, viewport }).promise;

        if (!cancelled) {
          const fieldLabels = fields.map((f) => f.label).filter(Boolean);
          const hasLabels = fieldLabels.length > 0;
          let textRedactions: Array<{ left: number; top: number; width: number; height: number }> = [];

          if (redactionOptions.fieldBounds) {
            textRedactions = fields
              .filter((f): f is FormField & { boundingBox: { x: number; y: number; width: number; height: number } } => Boolean(f.boundingBox))
              .map((f) => {
                const { x, y, width, height } = f.boundingBox;
                const left = x * pageScale;
                const top = viewport.height - (y + height) * pageScale;
                return {
                  left: Math.max(left + 1, 0),
                  top: Math.max(top + 1, 0),
                  width: Math.max(width * pageScale - 2, 0),
                  height: Math.max(height * pageScale - 2, 0),
                };
              })
              .filter((r) => r.width >= 2 && r.height >= 2);
          }

          if (!textRedactions.length && redactionOptions.labelMatch && hasLabels) {
            textRedactions = await buildFieldLabelRedactions(page, viewport, fieldLabels);
          }

          if (!textRedactions.length && redactionOptions.genericText) {
            textRedactions = await buildPdfValueRedactions(page, viewport);
          }

          const rects = textRedactions.length > 0
            ? textRedactions
            : redactionOptions.pixelFallback
              ? buildCanvasFallbackRedactions(canvas)
              : [];

          ctx.fillStyle = '#ffffff';
          for (const r of rects) {
            ctx.fillRect(r.left, r.top, r.width, r.height);
          }
        }
      } catch (error) {
        console.error('[PdfFormPageCanvas] render error', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    pdfBase64,
    pageNumber,
    redactionOptions.fieldBounds,
    redactionOptions.labelMatch,
    redactionOptions.genericText,
    redactionOptions.pixelFallback,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fields.map((f) => `${f.id}:${f.boundingBox ? '1' : '0'}`).join(','),
  ]);

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
      return (
        <select
          className={commonClassName}
          title={field.label}
          value={value}
          onChange={(event) => onValueChange(field.id, event.target.value)}
          onFocus={() => onSelectField?.(field.id)}
        >
          <option value="">{field.label}</option>
          {(field.stateOptions || [...DEFAULT_STATE_OPTIONS]).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
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
      <canvas ref={canvasRef} className="block" />

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

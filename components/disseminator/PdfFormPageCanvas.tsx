'use client';

import { useEffect, useRef, useState } from 'react';

type FieldType = 'dropdown' | 'address' | 'state_enum' | 'numeric' | 'text' | 'linked_text';

type FormField = {
  id: string;
  label: string;
  fieldType: FieldType;
  required?: boolean;
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
  onValueChange: (fieldId: string, value: string) => void;
  selectedId?: string | null;
  onSelectField?: (id: string) => void;
};

export function PdfFormPageCanvas({
  pdfBase64,
  pageNumber = 1,
  fields = [],
  values,
  onValueChange,
  selectedId,
  onSelectField,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1131 });
  const [scale, setScale] = useState(1);
  const [viewportHeight, setViewportHeight] = useState(1131);

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
      } catch (error) {
        console.error('[PdfFormPageCanvas] render error', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBase64, pageNumber]);

  const renderFieldControl = (field: FormField) => {
    const commonClassName =
      'h-full w-full rounded border border-slate-300 bg-white/92 px-2 text-[11px] text-slate-900 outline-none focus:border-blue-500';
    const value = values[field.id] || '';

    if (field.fieldType === 'dropdown') {
      return (
        <select
          className={commonClassName}
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
          value={value}
          onChange={(event) => onValueChange(field.id, event.target.value)}
          onFocus={() => onSelectField?.(field.id)}
        >
          <option value="">{field.label}</option>
          {(field.stateOptions || ['tick', 'cross', 'NA', 'LIM', 'NV']).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        className={commonClassName}
        type={field.fieldType === 'numeric' ? 'number' : 'text'}
        placeholder={field.label}
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
    <div className="relative overflow-auto rounded border bg-slate-100" style={{ maxWidth: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      <div className="absolute left-0 top-0" style={{ width: canvasSize.width, height: canvasSize.height }}>
        {fields.map((field) => {
          if (!field.boundingBox) return null;

          const { x, y, width, height } = field.boundingBox;
          const left = x * scale;
          const top = viewportHeight - (y + height) * scale;
          const overlayWidth = Math.max(width * scale, 88);
          const overlayHeight = Math.max(height * scale, 28);
          const isSelected = field.id === selectedId;

          return (
            <div
              key={field.id}
              className={`absolute rounded border p-0.5 shadow-sm ${isSelected ? 'border-blue-500 bg-blue-50/55' : 'border-amber-400 bg-white/35'}`}
              style={{ left, top, width: overlayWidth, height: overlayHeight }}
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

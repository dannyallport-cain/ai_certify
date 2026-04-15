'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildCanvasFallbackRedactions, buildFieldLabelRedactions, buildPdfValueRedactions } from '@/components/disseminator/pdfRedaction';
import { configurePdfJsWorker } from '@/lib/pdf/pdfjs-worker';

export type PdfPageBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfPageFieldLike = {
  id: string;
  label: string;
  boundingBox?: PdfPageBoundingBox | null;
};

export type PdfPageRedactionOptions = {
  fieldBounds: boolean;
  labelMatch: boolean;
  genericText: boolean;
  pixelFallback: boolean;
};

export const DEFAULT_PDF_PAGE_REDACTION_OPTIONS: PdfPageRedactionOptions = {
  fieldBounds: true,
  labelMatch: true,
  genericText: false,
  pixelFallback: false,
};

export type UsePdfPageRasterArgs = {
  pdfBase64: string;
  pageNumber: number;
  fields: PdfPageFieldLike[];
  redactionOptions: PdfPageRedactionOptions;
};

export type UsePdfPageRasterResult = {
  canvasSize: { width: number; height: number };
  scale: number;
  viewportHeight: number;
  renderKey: string;
};

const DEFAULT_CANVAS_SIZE = { width: 800, height: 1131 };

function buildPdfBytes(pdfBase64: string) {
  const dataUrl = pdfBase64.startsWith('data:')
    ? pdfBase64
    : `data:application/pdf;base64,${pdfBase64}`;

  const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

export async function getPdfPageCount(pdfBase64: string) {
  const pdfjsLib = configurePdfJsWorker();
  const pdf = await pdfjsLib.getDocument({ data: buildPdfBytes(pdfBase64) }).promise;
  return pdf.numPages || 1;
}

export function usePdfPageRaster({
  pdfBase64,
  pageNumber,
  fields,
  redactionOptions,
}: UsePdfPageRasterArgs): UsePdfPageRasterResult {
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [scale, setScale] = useState(1);
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_CANVAS_SIZE.height);

  const renderKey = useMemo(
    () =>
      fields
        .map((field) => {
          const box = field.boundingBox;
          return box
            ? `${field.id}:${field.label}:${box.x}:${box.y}:${box.width}:${box.height}`
            : `${field.id}:${field.label}:none`;
        })
        .join('|'),
    [fields],
  );

  useEffect(() => {
    if (!pdfBase64) {
      setCanvasSize(DEFAULT_CANVAS_SIZE);
      setScale(1);
      setViewportHeight(DEFAULT_CANVAS_SIZE.height);
    }
  }, [pdfBase64]);

  useEffect(() => {
    if (!pdfBase64) return;

    let cancelled = false;
    let loadingTask: { destroy: () => void; promise: Promise<any> } | null = null;

    (async () => {
      try {
        const pdfjsLib = configurePdfJsWorker();

        loadingTask = pdfjsLib.getDocument({ data: buildPdfBytes(pdfBase64) });
        const pdf = await loadingTask.promise;
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

        const scratchCanvas = document.createElement('canvas');
        scratchCanvas.width = viewport.width;
        scratchCanvas.height = viewport.height;
        const ctx = scratchCanvas.getContext('2d');
        if (!ctx) return;

        await page.render({
          canvas: scratchCanvas as HTMLCanvasElement,
          canvasContext: ctx,
          viewport,
        }).promise;

        if (cancelled) return;

        const fieldLabels = fields.map((field) => field.label).filter(Boolean);
        const hasLabels = fieldLabels.length > 0;
        let textRedactions: Array<{ left: number; top: number; width: number; height: number }> = [];

        if (redactionOptions.fieldBounds) {
          textRedactions = fields
            .filter(
              (field): field is PdfPageFieldLike & { boundingBox: PdfPageBoundingBox } =>
                Boolean(field.boundingBox),
            )
            .map((field) => {
              const { x, y, width, height } = field.boundingBox;
              const left = x * pageScale;
              const top = viewport.height - (y + height) * pageScale;
              return {
                left: Math.max(left + 1, 0),
                top: Math.max(top + 1, 0),
                width: Math.max(width * pageScale - 2, 0),
                height: Math.max(height * pageScale - 2, 0),
              };
            })
            .filter((rect) => rect.width >= 2 && rect.height >= 2);
        }

        if (!textRedactions.length && redactionOptions.labelMatch && hasLabels) {
          textRedactions = await buildFieldLabelRedactions(page, viewport, fieldLabels);
        }

        if (!textRedactions.length && redactionOptions.genericText) {
          textRedactions = await buildPdfValueRedactions(page, viewport);
        }

        const rects =
          textRedactions.length > 0
            ? textRedactions
            : redactionOptions.pixelFallback
              ? buildCanvasFallbackRedactions(scratchCanvas)
              : [];

        ctx.fillStyle = '#ffffff';
        for (const rect of rects) {
          ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
        }

        if (!cancelled) {
          // Force consumers to repaint canvases/backgrounds using the latest raster pass.
          setCanvasSize({ width: viewport.width, height: viewport.height });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[usePdfPageRaster] render error', error);
        }
      }
    })();

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [
    pdfBase64,
    pageNumber,
    redactionOptions.fieldBounds,
    redactionOptions.genericText,
    redactionOptions.labelMatch,
    redactionOptions.pixelFallback,
    renderKey,
  ]);

  return {
    canvasSize,
    scale,
    viewportHeight,
    renderKey: `${pageNumber}:${canvasSize.width}:${canvasSize.height}:${renderKey}:${JSON.stringify(redactionOptions)}`,
  };
}

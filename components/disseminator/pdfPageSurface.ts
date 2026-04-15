import { useMemo } from 'react';
import type { PdfPageBoundingBox } from '@/components/disseminator/usePdfPageRaster';

export type CanvasRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PdfSurfaceMetrics = {
  width: number;
  height: number;
  scale: number;
  viewportHeight: number;
};

export function pdfBoundingBoxToCanvasRect(
  boundingBox: PdfPageBoundingBox,
  metrics: Pick<PdfSurfaceMetrics, 'scale' | 'viewportHeight'>,
): CanvasRect {
  const { x, y, width, height } = boundingBox;

  return {
    left: x * metrics.scale,
    top: metrics.viewportHeight - (y + height) * metrics.scale,
    width: width * metrics.scale,
    height: height * metrics.scale,
  };
}

export function canvasRectToPdfBoundingBox(
  rect: CanvasRect,
  metrics: Pick<PdfSurfaceMetrics, 'scale' | 'viewportHeight'>,
): PdfPageBoundingBox {
  return {
    x: rect.left / metrics.scale,
    y: (metrics.viewportHeight - (rect.top + rect.height)) / metrics.scale,
    width: rect.width / metrics.scale,
    height: rect.height / metrics.scale,
  };
}

export function sanitizeOverlayClassName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function useOverlayFieldCss(
  overlayClassName: string,
  fields: Array<{ id: string; boundingBox?: PdfPageBoundingBox | null }>,
  metrics: PdfSurfaceMetrics,
) {
  return useMemo(() => {
    const rules = [
      `.${overlayClassName}{width:${metrics.width}px;height:${metrics.height}px;}`,
    ];

    for (const field of fields) {
      if (!field.boundingBox) continue;

      const rect = pdfBoundingBoxToCanvasRect(field.boundingBox, metrics);
      rules.push(
        `.pdf-form-field-${sanitizeOverlayClassName(field.id)}{left:${rect.left}px;top:${rect.top}px;width:${Math.max(rect.width, 12)}px;height:${Math.max(rect.height, 12)}px;}`,
      );
    }

    return rules.join('\n');
  }, [fields, metrics, overlayClassName]);
}

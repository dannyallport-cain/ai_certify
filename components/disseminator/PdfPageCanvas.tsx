'use client';

/**
 * PdfPageCanvas
 * Renders a single page of a base64-encoded PDF onto a <canvas> using pdfjs-dist,
 * then overlays react-konva Rect handles for each field bounding box.
 *
 * Props:
 *  pdfBase64   – base64 string (no data: prefix needed; we add it)
 *  pageNumber  – 1-based page to render
 *  fields      – array of fields that have boundingBox arrays [x1,y1,x2,y2,…] (PDF coords)
 *  selectedId  – currently selected field id (highlighted)
 *  onSelectField – callback when a field rect is clicked
 */

import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';

type FieldOverlay = {
  id: string;
  label: string;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
};

type Props = {
  pdfBase64: string;
  pageNumber?: number;
  fields?: FieldOverlay[];
  selectedId?: string | null;
  onSelectField?: (id: string) => void;
};

export function PdfPageCanvas({ pdfBase64, pageNumber = 1, fields = [], selectedId, onSelectField }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1131 }); // A4 default
  const [scale, setScale] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [viewportHeight, setViewportHeight] = useState(1131);

  useEffect(() => {
    if (!pdfBase64 || !canvasRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamically import pdfjs-dist to avoid SSR issues
        const pdfjsLib = await import('pdfjs-dist');
        // Point the worker at the bundled worker script
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const dataUrl = pdfBase64.startsWith('data:')
          ? pdfBase64
          : `data:application/pdf;base64,${pdfBase64}`;

        // Strip the data URL prefix to get just the base64 string
        const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
        const binStr = atob(base64Data);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const desiredWidth = 800;
        const unscaledVp = page.getViewport({ scale: 1 });
        const pageScale = desiredWidth / unscaledVp.width;
        const viewport = page.getViewport({ scale: pageScale });

        if (cancelled) return;
        setScale(pageScale);
        setViewportWidth(viewport.width);
        setViewportHeight(viewport.height);
        setCanvasSize({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvas: canvas as HTMLCanvasElement, canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('[PdfPageCanvas] render error', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBase64, pageNumber]);

  return (
    <div className="relative border rounded overflow-auto bg-gray-100" style={{ maxWidth: '100%' }}>
      {/* PDF rendered background */}
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* Konva overlay for field bounding boxes */}
      {fields.length > 0 && (
        <div className="absolute top-0 left-0 pointer-events-none" style={{ width: canvasSize.width, height: canvasSize.height }}>
          <Stage width={canvasSize.width} height={canvasSize.height} style={{ pointerEvents: 'auto' }}>
            <Layer>
              {fields.map((field) => {
                if (!field.boundingBox) return null;

                // boundingBox is {x, y, width, height} in PDF points (origin bottom-left)
                // Convert to canvas coords (origin top-left)
                const { x: x1, y: y1, width: bw, height: bh } = field.boundingBox as { x: number; y: number; width: number; height: number };
                const canvasX = x1 * scale;
                const canvasY = viewportHeight - (y1 + bh) * scale;
                const w = bw * scale;
                const h = bh * scale;
                const isSelected = field.id === selectedId;

                return (
                  <React.Fragment key={field.id}>
                    <Rect
                      x={canvasX}
                      y={canvasY}
                      width={w}
                      height={h}
                      stroke={isSelected ? '#2563eb' : '#f59e0b'}
                      strokeWidth={isSelected ? 2 : 1}
                      fill={isSelected ? 'rgba(37,99,235,0.1)' : 'rgba(245,158,11,0.08)'}
                      onClick={() => onSelectField?.(field.id)}
                    />
                    <Text
                      x={canvasX + 2}
                      y={canvasY + 2}
                      text={field.label}
                      fontSize={9}
                      fill={isSelected ? '#2563eb' : '#92400e'}
                      listening={false}
                    />
                  </React.Fragment>
                );
              })}
            </Layer>
          </Stage>
        </div>
      )}
    </div>
  );
}

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
import { Stage, Layer, Rect, Circle, Text, Transformer } from 'react-konva';
import { pdfBoundingBoxToCanvasRect } from '@/components/disseminator/pdfPageSurface';
import { buildCanvasFallbackRedactions, buildFieldLabelRedactions, buildPdfValueRedactions } from '@/components/disseminator/pdfRedaction';
import { configurePdfJsWorker } from '@/lib/pdf/pdfjs-worker';

type CanvasTextItem = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type FieldOverlay = {
  id: string;
  label: string;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
};

// A text overlay: a white redaction box on the PDF canvas, optionally with replacement text.
// Coordinates are in PDF points (same system as boundingBox — origin bottom-left).
export type TextOverlay = {
  id: string;
  page: number;
  // PDF-point coords
  x: number;
  y: number;
  width: number;
  height: number;
  // Optional replacement text (if absent = pure white redaction)
  replacementText?: string;
  // Styling
  fontSize?: number;       // pt, default 10
  fontFamily?: string;    // default 'Helvetica'
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic';
  color?: string;          // hex, default '#000000'
  align?: 'left' | 'center' | 'right';
};

type Props = {
  pdfBase64: string;
  pageNumber?: number;
  fields?: FieldOverlay[];
  redactionOptions?: {
    fieldBounds: boolean;
    labelMatch: boolean;
    genericText: boolean;
    pixelFallback: boolean;
  };
  selectedId?: string | null;
  onSelectField?: (id: string) => void;
  manualPlacementField?: { id: string; label: string } | null;
  placementMode?: 'auto' | 'manual';
  suggestedBoundingBox?: { x: number; y: number; width: number; height: number } | null;
  suggestedLabel?: string | null;
  onAssignBoundingBox?: (pageNumber: number, boundingBox: { x: number; y: number; width: number; height: number }) => void;
  // Step 1 — mark-and-blank mode
  step1Mode?: boolean;
  step1Blanks?: Array<{ x: number; y: number; width: number; height: number }>;
  onStep1Click?: (pageNumber: number, boundingBox: { x: number; y: number; width: number; height: number }) => void;
  onStep1Update?: (index: number, boundingBox: { x: number; y: number; width: number; height: number }) => void;
  // Text-edit mode — redact / replace text in the PDF
  textEditMode?: boolean;
  textOverlays?: TextOverlay[];
  onAddTextOverlay?: (pageNumber: number, overlay: Omit<TextOverlay, 'id' | 'page'>) => void;
  onUpdateTextOverlay?: (id: string, updates: Partial<TextOverlay>) => void;
  onRemoveTextOverlay?: (id: string) => void;
};

function toCanvasTextItems(textContent: any, viewport: any): CanvasTextItem[] {
  const items = Array.isArray(textContent?.items) ? textContent.items : [];

  return items
    .map((item: any) => {
      const text = typeof item?.str === 'string' ? item.str : '';
      if (!text.trim()) return null;

      const transform = Array.isArray(item?.transform) ? item.transform : null;
      if (!transform) return null;

      const [left, baseline] = viewport.convertToViewportPoint(transform[4], transform[5]);
      const width = Math.max((item.width || 0) * viewport.scale, 0);
      const height = Math.max((item.height || 0) * viewport.scale, 0);
      const top = baseline - height;

      return {
        text,
        left,
        top,
        width,
        height,
      } satisfies CanvasTextItem;
    })
    .filter((item: CanvasTextItem | null): item is CanvasTextItem => Boolean(item));
}

function distanceToRect(pointX: number, pointY: number, item: CanvasTextItem) {
  const dx = Math.max(item.left - pointX, 0, pointX - (item.left + item.width));
  const dy = Math.max(item.top - pointY, 0, pointY - (item.top + item.height));
  return Math.hypot(dx, dy);
}

/**
 * Joe's Theory: BFS flood-fill from a click point, stopping at dark border pixels
 * (the box border lines on the form).  Naturally navigates around in-cell text
 * and correctly detects the full rectangular boundary of the field box.
 *
 * Pixels with luminance ≥ LIGHT_THRESHOLD (130) are treated as field interior;
 * pixels below that threshold are treated as border/line/text — the fill stops there.
 * If the click lands on a dark pixel (e.g. text), a short spiral search finds the
 * nearest light pixel to start from.
 *
 * Returns the bounding box of the connected light region, or null if the region
 * appears unbounded (touches the canvas edge) — indicating the page background.
 */
function detectBoxBounds(
  canvas: HTMLCanvasElement,
  seedX: number,
  seedY: number,
): { left: number; top: number; width: number; height: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const W = canvas.width;
  const H = canvas.height;
  const data = ctx.getImageData(0, 0, W, H).data;

  // Pixels darker than this luminance are treated as borders (black lines, dark text).
  const LIGHT = 130;

  const lum = (x: number, y: number): number => {
    const i = (y * W + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };

  // Find seed: if click landed on a dark pixel (e.g. text stroke), spiral outward
  // to find the nearest light pixel that is the actual field interior.
  let sx = Math.round(Math.max(0, Math.min(seedX, W - 1)));
  let sy = Math.round(Math.max(0, Math.min(seedY, H - 1)));

  if (lum(sx, sy) < LIGHT) {
    let found = false;
    outer: for (let r = 1; r <= 20; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // shell only
          const nx = sx + dx;
          const ny = sy + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          if (lum(nx, ny) >= LIGHT) { sx = nx; sy = ny; found = true; break outer; }
        }
      }
    }
    if (!found) return null;
  }

  // BFS flood-fill — typed arrays for speed; queue stores canvas-pixel coordinates.
  // Bail out early if the connected region is implausibly large (page background).
  const MAX_FILL = Math.floor((W * H) / 5); // > 20% of page = unbounded

  const visited = new Uint8Array(W * H);
  const qx = new Int32Array(W * H);
  const qy = new Int32Array(W * H);
  let head = 0;
  let tail = 0;

  visited[sy * W + sx] = 1;
  qx[tail] = sx; qy[tail] = sy; tail++;

  let minX = sx, maxX = sx, minY = sy, maxY = sy;
  let touchesEdge = false;

  const enq = (nx: number, ny: number) => {
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) return;
    if (visited[ny * W + nx]) return;
    if (lum(nx, ny) < LIGHT) return;
    visited[ny * W + nx] = 1;
    qx[tail] = nx; qy[tail] = ny; tail++;
  };

  while (head < tail) {
    if (tail > MAX_FILL) return null; // Too large — page background or huge section

    const x = qx[head];
    const y = qy[head];
    head++;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x === 0 || x === W - 1 || y === 0 || y === H - 1) touchesEdge = true;

    enq(x - 1, y); enq(x + 1, y); enq(x, y - 1); enq(x, y + 1);
  }

  if (touchesEdge) return null;

  return {
    left: minX,
    top: minY,
    width: Math.max(maxX - minX, 4),
    height: Math.max(maxY - minY, 4),
  };
}

export function PdfPageCanvas({
  pdfBase64,
  pageNumber = 1,
  fields = [],
  redactionOptions = { fieldBounds: true, labelMatch: true, genericText: false, pixelFallback: false },
  selectedId,
  onSelectField,
  manualPlacementField = null,
  placementMode = 'manual',
  suggestedBoundingBox = null,
  suggestedLabel = null,
  onAssignBoundingBox,
  step1Mode = false,
  step1Blanks = [],
  onStep1Click,
  onStep1Update,
  textEditMode = false,
  textOverlays = [],
  onAddTextOverlay,
  onUpdateTextOverlay,
  onRemoveTextOverlay,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<any>(null);
  const selectedRectRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const pendingKonvaRectRef = useRef<any>(null);
  const pendingTransformerRef = useRef<any>(null);
  const isDragging = useRef(false);
  // Step 1 — per-page pending (detected but not yet confirmed) and selection tracking
  const [step1PendingRect, setStep1PendingRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [step1SelectedIdx, setStep1SelectedIdx] = useState<number | null>(null);
  const step1PendingKonvaRef = useRef<any>(null);
  const step1PendingTransRef = useRef<any>(null);
  const step1TransformerRef = useRef<any>(null);
  const step1KonvaRefs = useRef<Map<number, any>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1131 }); // A4 default
  const [scale, setScale] = useState(1);
  const [viewportHeight, setViewportHeight] = useState(1131);;
  const [draftRect, setDraftRect] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [pendingRect, setPendingRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [textItems, setTextItems] = useState<CanvasTextItem[]>([]);
  // Text edit mode
  const [selectedTextItemIdx, setSelectedTextItemIdx] = useState<number | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  // Pending new overlay: user clicked a text item, pick redact or replace
  const [pendingTextOverlay, setPendingTextOverlay] = useState<{
    x: number; y: number; width: number; height: number;
    replacementText: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
    color: string;
    align: 'left' | 'center' | 'right';
  } | null>(null);

  useEffect(() => {
    if (!pdfBase64 || !canvasRef.current) return;

    let cancelled = false;
    let loadingTask: { destroy: () => void; promise: Promise<any> } | null = null;

    (async () => {
      try {
        // Dynamically load and configure pdf.js with a bundled worker asset
        const pdfjsLib = configurePdfJsWorker();

        const dataUrl = pdfBase64.startsWith('data:')
          ? pdfBase64
          : `data:application/pdf;base64,${pdfBase64}`;

        // Strip the data URL prefix to get just the base64 string
        const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
        const binStr = atob(base64Data);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

        loadingTask = pdfjsLib.getDocument({ data: bytes });
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
        setViewportHeight(viewport.height);
        setCanvasSize({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvas: canvas as HTMLCanvasElement, canvasContext: ctx, viewport }).promise;

        const textContent = await page.getTextContent();
        if (!cancelled) {
          setTextItems(toCanvasTextItems(textContent, viewport));
        }

        if (!cancelled) {
          const fieldLabels = fields.map((f) => f.label).filter(Boolean);
          const hasLabels = fieldLabels.length > 0;
          let textRedactions: Array<{ left: number; top: number; width: number; height: number }> = [];

          if (redactionOptions.fieldBounds) {
            textRedactions = fields
              .filter((f): f is FieldOverlay & { boundingBox: { x: number; y: number; width: number; height: number } } => Boolean(f.boundingBox))
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
      } catch (err) {
        // Suppress the expected cancellation error when the task is destroyed on cleanup.
        if (!cancelled) console.error('[PdfPageCanvas] render error', err);
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
    redactionOptions.labelMatch,
    redactionOptions.genericText,
    redactionOptions.pixelFallback,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fields.map((f) => `${f.id}:${f.boundingBox ? '1' : '0'}`).join(','),
  ]);

  useEffect(() => {
    if (!manualPlacementField || !selectedRectRef.current || !transformerRef.current) return;
    transformerRef.current.nodes([selectedRectRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [manualPlacementField, selectedId, fields]);

  // Attach pending transformer to the pending rect node when it appears/disappears.
  // We intentionally depend only on the boolean presence (not the rect values) so that
  // resize operations don't re-attach the transformer on every onTransformEnd update —
  // the transformer always re-reads the node dimensions directly and doesn't need
  // re-attachment just because the rect's coordinates changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingTransformerRef.current) return;
    if (pendingRect && pendingKonvaRectRef.current) {
      pendingTransformerRef.current.nodes([pendingKonvaRectRef.current]);
    } else {
      pendingTransformerRef.current.nodes([]);
    }
    pendingTransformerRef.current.getLayer()?.batchDraw();
  }, [pendingRect !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach step1 transformer to the selected existing blank node.
  useEffect(() => {
    if (!step1TransformerRef.current) return;
    if (step1SelectedIdx !== null) {
      const node = step1KonvaRefs.current.get(step1SelectedIdx);
      if (node) {
        step1TransformerRef.current.nodes([node]);
        step1TransformerRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    step1TransformerRef.current.nodes([]);
    step1TransformerRef.current.getLayer()?.batchDraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step1SelectedIdx, step1Blanks.length]);

  // Attach step1 pending transformer to its rect node (same logic as pendingTransformerRef).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!step1PendingTransRef.current) return;
    if (step1PendingRect && step1PendingKonvaRef.current) {
      step1PendingTransRef.current.nodes([step1PendingKonvaRef.current]);
    } else {
      step1PendingTransRef.current.nodes([]);
    }
    step1PendingTransRef.current.getLayer()?.batchDraw();
  }, [step1PendingRect !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear step1 selection and pending when step1Mode exits.
  useEffect(() => {
    if (!step1Mode) {
      setStep1PendingRect(null);
      setStep1SelectedIdx(null);
    }
  }, [step1Mode]);

  // Clear text edit selections when mode exits.
  useEffect(() => {
    if (!textEditMode) {
      setSelectedTextItemIdx(null);
      setSelectedOverlayId(null);
      setPendingTextOverlay(null);
    }
  }, [textEditMode]);

  // Clear pending rect when switching to a different field or page.
  useEffect(() => {
    setPendingRect(null);
  }, [manualPlacementField?.id, pageNumber]);

  // Global mouseup — needed so releasing the mouse outside the Stage still ends the draw
  // (instead of the old onMouseLeave approach which committed too early).
  // endDraftRef is kept current via the assignment below endDraft's definition.
  const endDraftRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onUp = () => {
      if (isDragging.current) endDraftRef.current();
    };
    document.addEventListener('mouseup', onUp);
    return () => document.removeEventListener('mouseup', onUp);
  }, []);

  // Keyboard: Enter = confirm pending rect, Escape = cancel.
  useEffect(() => {
    if (!pendingRect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        pendingRectCommitRef.current(pendingRect);
        setPendingRect(null);
      } else if (e.key === 'Escape') {
        setPendingRect(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingRect]);

  // Keyboard: Enter = confirm step1 pending, Escape = cancel.
  useEffect(() => {
    if (!step1PendingRect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (onStep1Click && scale > 0) {
          onStep1Click(pageNumber, {
            x: step1PendingRect.left / scale,
            y: (viewportHeight - (step1PendingRect.top + step1PendingRect.height)) / scale,
            width: step1PendingRect.width / scale,
            height: step1PendingRect.height / scale,
          });
        }
        setStep1PendingRect(null);
      } else if (e.key === 'Escape') {
        setStep1PendingRect(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step1PendingRect, onStep1Click, pageNumber, scale, viewportHeight]);

  const clampPoint = (value: number, max: number) => Math.min(Math.max(value, 0), max);

  const detectAutoRectAtPoint = (pointX: number, pointY: number) => {
    if (!textItems.length) return null;

    const paddedHit = textItems.find((item) => {
      const padX = 3;
      const padY = 2;
      return (
        pointX >= item.left - padX &&
        pointX <= item.left + item.width + padX &&
        pointY >= item.top - padY &&
        pointY <= item.top + item.height + padY
      );
    });

    const nearestItem = [...textItems]
      .map((item) => ({ item, distance: distanceToRect(pointX, pointY, item) }))
      .sort((left, right) => left.distance - right.distance)[0];

    const target = paddedHit ?? (nearestItem && nearestItem.distance <= 26 ? nearestItem.item : null);
    if (!target) return null;

    const sameLineItems = textItems
      .filter((item) => Math.abs(item.top - target.top) <= Math.max(6, target.height * 0.8))
      .sort((left, right) => left.left - right.left);

    const targetIndex = sameLineItems.findIndex((item) => item === target);
    if (targetIndex === -1) return null;

    let leftIndex = targetIndex;
    let rightIndex = targetIndex;

    while (leftIndex > 0) {
      const current = sameLineItems[leftIndex];
      const previous = sameLineItems[leftIndex - 1];
      const gap = current.left - (previous.left + previous.width);
      if (gap > 14) break;
      leftIndex--;
    }

    while (rightIndex < sameLineItems.length - 1) {
      const current = sameLineItems[rightIndex];
      const next = sameLineItems[rightIndex + 1];
      const gap = next.left - (current.left + current.width);
      if (gap > 14) break;
      rightIndex++;
    }

    const cluster = sameLineItems.slice(leftIndex, rightIndex + 1);
    const left = Math.max(Math.min(...cluster.map((item) => item.left)) - 2, 0);
    const top = Math.max(Math.min(...cluster.map((item) => item.top)) - 1, 0);
    const right = Math.max(...cluster.map((item) => item.left + item.width)) + 2;
    const bottom = Math.max(...cluster.map((item) => item.top + item.height)) + 1;

    return {
      left,
      top,
      width: Math.max(right - left, 8),
      height: Math.max(bottom - top, 8),
    };
  };

  const commitCanvasRect = (rect: { left: number; top: number; width: number; height: number }) => {
    if (!onAssignBoundingBox || scale <= 0) return;

    onAssignBoundingBox(pageNumber, {
      x: rect.left / scale,
      y: (viewportHeight - (rect.top + rect.height)) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    });
  };

  // Keep a stable ref to commitCanvasRect so effects/closures always call the latest version.
  const pendingRectCommitRef = useRef(commitCanvasRect);
  pendingRectCommitRef.current = commitCanvasRect;

  const getNormalizedDraftRect = () => {
    if (!draftRect) return null;

    const left = Math.min(draftRect.startX, draftRect.currentX);
    const top = Math.min(draftRect.startY, draftRect.currentY);
    const width = Math.abs(draftRect.currentX - draftRect.startX);
    const height = Math.abs(draftRect.currentY - draftRect.startY);

    return { left, top, width, height };
  };

  const beginDraft = (event: any) => {
    if (!stageRef.current) return;

    // ── Step 1 mark-and-blank mode: BFS detect box and show as pending ──────
    if (step1Mode) {
      // Only trigger BFS when the user clicks directly on the Stage background.
      // Any child shape (existing blank Rect, Transformer anchor, etc.) will have
      // event.target !== stageRef.current, so we bail out to avoid re-triggering BFS
      // while the user is dragging handles or clicking an existing blank.
      if (event?.target !== stageRef.current) return;

      // Clicking the stage background clears existing selection; then BFS-detect a new box.
      setStep1SelectedIdx(null);

      const pointer = stageRef.current.getPointerPosition();
      if (!pointer || !canvasRef.current) return;
      const detected = detectBoxBounds(canvasRef.current, pointer.x, pointer.y);
      if (detected && scale > 0) {
        setStep1PendingRect(detected);
      }
      return;
    }

    if (!manualPlacementField) return;
    if (placementMode === 'auto') {
      // Only trigger detection on clicks directly on the stage background.
      // Clicks on the pending rect, transformer anchors, or circle handle must
      // not override the current pending rect or they'll cause resets mid-adjust.
      if (event?.target !== stageRef.current) return;
      const pointer = stageRef.current.getPointerPosition();
      if (!pointer) return;

      // First try text-token detection; if that misses, fall back to BFS expand.
      // Show as a pending rect so the user can adjust with handles before confirming.
      const detectedRect = detectAutoRectAtPoint(pointer.x, pointer.y);
      if (detectedRect) {
        const canvas = canvasRef.current;
        const seedX = Math.round(detectedRect.left + detectedRect.width / 2);
        const seedY = Math.round(detectedRect.top + detectedRect.height / 2);
        const colorRect = canvas ? detectBoxBounds(canvas, seedX, seedY) : null;
        setPendingRect(colorRect ?? detectedRect);
      } else if (canvasRef.current) {
        const colorRect = detectBoxBounds(canvasRef.current, pointer.x, pointer.y);
        if (colorRect) setPendingRect(colorRect);
      }
      return;
    }

    const targetClassName = event?.target?.getClassName?.();
    if (targetClassName && targetClassName !== 'Stage' && targetClassName !== 'Layer') return;
    const pointer = stageRef.current.getPointerPosition();
    if (!pointer) return;

    // If there's a pending rect being adjusted, a click outside it (on Stage/Layer)
    // cancels the pending state so the user can start a fresh draw.
    if (pendingRect) {
      setPendingRect(null);
      return;
    }

    const startX = clampPoint(pointer.x, canvasSize.width);
    const startY = clampPoint(pointer.y, canvasSize.height);
    isDragging.current = true;
    setDraftRect({ startX, startY, currentX: startX, currentY: startY });
  };

  const updateDraft = () => {
    if (placementMode !== 'manual') return;
    if (!manualPlacementField || !draftRect || !stageRef.current) return;
    const pointer = stageRef.current.getPointerPosition();
    if (!pointer) return;

    setDraftRect((current) => {
      if (!current) return current;
      return {
        ...current,
        currentX: clampPoint(pointer.x, canvasSize.width),
        currentY: clampPoint(pointer.y, canvasSize.height),
      };
    });
  };

  const endDraft = () => {
    isDragging.current = false;
    if (placementMode !== 'manual') {
      setDraftRect(null);
      return;
    }
    if (!manualPlacementField || !draftRect || scale <= 0) {
      setDraftRect(null);
      return;
    }

    const rect = getNormalizedDraftRect();
    setDraftRect(null);
    if (!rect || rect.width < 4 || rect.height < 4) return;

    // Try to expand the drawn rect to the edges of the colour region the user
    // drew inside (e.g. a white form-box cell).  Fall back to what was drawn.
    // Show as pending so the user can adjust with handles before confirming.
    const canvas = canvasRef.current;
    const seedX = Math.round(rect.left + rect.width / 2);
    const seedY = Math.round(rect.top + rect.height / 2);
    const colorRect = canvas ? detectBoxBounds(canvas, seedX, seedY) : null;
    setPendingRect(colorRect ?? rect);
  };

  // Keep endDraftRef current so the document mouseup listener always calls the latest endDraft.
  endDraftRef.current = endDraft;

  const previewRect = getNormalizedDraftRect();
  const suggestedRect = suggestedBoundingBox
    ? pdfBoundingBoxToCanvasRect(suggestedBoundingBox, { scale, viewportHeight })
    : null;

  // Helper: build a pending overlay from a text item (canvas coords → PDF coords)
  const buildOverlayFromTextItem = (item: CanvasTextItem) => {
    if (scale <= 0) return null;
    return {
      x: item.left / scale,
      y: (viewportHeight - (item.top + item.height)) / scale,
      width: item.width / scale,
      height: item.height / scale,
      replacementText: '',
      fontSize: 10,
      fontFamily: 'Helvetica',
      fontStyle: 'normal' as const,
      color: '#000000',
      align: 'left' as const,
    };
  };

  return (
    <div className="relative max-w-full overflow-auto rounded border bg-gray-100">
      {/* PDF rendered background */}
      <canvas ref={canvasRef} className="block" />

      {/* Konva overlay for field bounding boxes */}
      {(fields.length > 0 || manualPlacementField || step1Mode || step1Blanks.length > 0 || textEditMode || textOverlays.length > 0) && (
        <div className="absolute inset-0">
          <div className={textEditMode ? 'cursor-pointer' : step1Mode ? 'cursor-cell' : manualPlacementField ? (placementMode === 'auto' ? 'cursor-cell' : 'cursor-crosshair') : 'cursor-default'}>
            <Stage
              ref={stageRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseDown={beginDraft}
              onMouseMove={updateDraft}
              onMouseUp={endDraft}
            >
              <Layer>
              {fields.map((field) => {
                if (!field.boundingBox) return null;

                // boundingBox is {x, y, width, height} in PDF points (origin bottom-left)
                // Convert to canvas coords (origin top-left)
                const rect = pdfBoundingBoxToCanvasRect(field.boundingBox, {
                  scale,
                  viewportHeight,
                });
                const isSelected = field.id === selectedId;

                return (
                  <React.Fragment key={field.id}>
                    <Rect
                      ref={isSelected ? selectedRectRef : undefined}
                      x={rect.left}
                      y={rect.top}
                      width={rect.width}
                      height={rect.height}
                      stroke={isSelected ? '#2563eb' : '#f59e0b'}
                      strokeWidth={isSelected ? 2 : 1}
                      fill={isSelected ? 'rgba(37,99,235,0.08)' : 'transparent'}
                      draggable={Boolean(manualPlacementField && isSelected && placementMode === 'manual')}
                      onDragStart={() => setDraftRect(null)}
                      onDragEnd={(event) => {
                        const node = event.target;
                        commitCanvasRect({
                          left: node.x(),
                          top: node.y(),
                          width: node.width(),
                          height: node.height(),
                        });
                      }}
                      onTransformEnd={(event) => {
                        const node = event.target;
                        const nextWidth = Math.max(node.width() * node.scaleX(), 8);
                        const nextHeight = Math.max(node.height() * node.scaleY(), 8);
                        node.scaleX(1);
                        node.scaleY(1);
                        commitCanvasRect({
                          left: node.x(),
                          top: node.y(),
                          width: nextWidth,
                          height: nextHeight,
                        });
                      }}
                      onClick={() => onSelectField?.(field.id)}
                    />
                    <Text
                      x={rect.left + 2}
                      y={rect.top + 2}
                      text={field.label}
                      fontSize={9}
                      fill={isSelected ? '#2563eb' : '#92400e'}
                      listening={false}
                    />
                  </React.Fragment>
                );
              })}

              {manualPlacementField && selectedId && placementMode === 'manual' && (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={false}
                  flipEnabled={false}
                  enabledAnchors={[
                    'top-left',
                    'top-center',
                    'top-right',
                    'middle-left',
                    'middle-right',
                    'bottom-left',
                    'bottom-center',
                    'bottom-right',
                  ]}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 8 || newBox.height < 8) return oldBox;
                    return newBox;
                  }}
                />
              )}

              {previewRect && manualPlacementField && (
                <>
                  <Rect
                    x={previewRect.left}
                    y={previewRect.top}
                    width={previewRect.width}
                    height={previewRect.height}
                    stroke="#16a34a"
                    strokeWidth={2}
                    dash={[6, 4]}
                    fill="rgba(34,197,94,0.1)"
                    listening={false}
                  />
                  <Text
                    x={previewRect.left + 4}
                    y={Math.max(previewRect.top - 14, 0)}
                    text={manualPlacementField.label}
                    fontSize={10}
                    fill="#166534"
                    listening={false}
                  />
                </>
              )}

              {suggestedRect && manualPlacementField && !previewRect && !pendingRect && (
                <>
                  <Rect
                    x={suggestedRect.left}
                    y={suggestedRect.top}
                    width={suggestedRect.width}
                    height={suggestedRect.height}
                    stroke="#0f766e"
                    strokeWidth={2}
                    dash={[4, 4]}
                    fill="rgba(20,184,166,0.08)"
                    listening={false}
                  />
                  <Text
                    x={suggestedRect.left + 4}
                    y={Math.max(suggestedRect.top - 14, 0)}
                    text={suggestedLabel ? `Suggested: ${suggestedLabel}` : 'Suggested area'}
                    fontSize={10}
                    fill="#0f766e"
                    listening={false}
                  />
                </>
              )}
              {/* Pending rect — adjust with handles before confirming the placement */}
              {pendingRect && manualPlacementField && (
                <>
                  <Rect
                    ref={pendingKonvaRectRef}
                    x={pendingRect.left}
                    y={pendingRect.top}
                    width={pendingRect.width}
                    height={pendingRect.height}
                    stroke="#16a34a"
                    strokeWidth={2}
                    fill="rgba(34,197,94,0.15)"
                    draggable
                    onDragEnd={(e) => {
                      const node = e.target;
                      setPendingRect((pr) => pr ? { ...pr, left: node.x(), top: node.y() } : null);
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const nextWidth = Math.max(node.width() * node.scaleX(), 8);
                      const nextHeight = Math.max(node.height() * node.scaleY(), 8);
                      node.width(nextWidth);
                      node.height(nextHeight);
                      node.scaleX(1);
                      node.scaleY(1);
                      setPendingRect({ left: node.x(), top: node.y(), width: nextWidth, height: nextHeight });
                    }}
                  />
                  {/* Move handle — drag this dot to reposition the whole rect (sits above the rect) */}
                  <Circle
                    x={pendingRect.left + pendingRect.width / 2}
                    y={Math.max(pendingRect.top - 16, 0)}
                    radius={7}
                    fill="#16a34a"
                    opacity={0.85}
                    draggable
                    dragBoundFunc={(pos: { x: number; y: number }) => pos}
                    onDragStart={() => { pendingKonvaRectRef.current?.startDrag(); }}
                    onDragEnd={() => {
                      const r = pendingKonvaRectRef.current;
                      if (r) setPendingRect((pr) => pr ? { ...pr, left: r.x(), top: r.y() } : null);
                    }}
                    listening
                  />
                  <Text
                    x={pendingRect.left + 4}
                    y={Math.max(pendingRect.top - 14, 0)}
                    text={manualPlacementField.label}
                    fontSize={10}
                    fill="#166534"
                    listening={false}
                  />
                  <Transformer
                    ref={pendingTransformerRef}
                    rotateEnabled={false}
                    flipEnabled={false}
                    enabledAnchors={[
                      'top-left', 'top-center', 'top-right',
                      'middle-left', 'middle-right',
                      'bottom-left', 'bottom-center', 'bottom-right',
                    ]}
                    boundBoxFunc={(oldBox, newBox) =>
                      newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
                    }
                  />
                </>
              )}

              {/* Step 1 — detected blank areas with drag/resize handles */}
              {step1Blanks.length > 0 && step1Blanks.map((blank, i) => {
                const bx = blank.x * scale;
                const by = viewportHeight - (blank.y + blank.height) * scale;
                const bw = blank.width * scale;
                const bh = blank.height * scale;
                const isSelected = step1SelectedIdx === i;
                return (
                  <React.Fragment key={`s1-${i}`}>
                    <Rect
                      ref={(node) => { if (node) step1KonvaRefs.current.set(i, node); else step1KonvaRefs.current.delete(i); }}
                      x={bx} y={by} width={bw} height={bh}
                      fill="white"
                      opacity={0.92}
                      stroke={isSelected && step1Mode ? '#059669' : '#0d9488'}
                      strokeWidth={isSelected && step1Mode ? 2.5 : 2}
                      draggable={step1Mode}
                      onClick={() => { if (step1Mode) { setStep1PendingRect(null); setStep1SelectedIdx(i); } }}
                      onDragStart={() => { if (step1Mode) { setStep1PendingRect(null); setStep1SelectedIdx(i); } }}
                      onDragEnd={(e) => {
                        if (!step1Mode) return;
                        const node = e.target;
                        onStep1Update?.(i, {
                          x: node.x() / scale,
                          y: (viewportHeight - (node.y() + node.height())) / scale,
                          width: node.width() / scale,
                          height: node.height() / scale,
                        });
                      }}
                      onTransformEnd={(e) => {
                        if (!step1Mode) return;
                        const node = e.target;
                        const nw = Math.max(node.width() * node.scaleX(), 8);
                        const nh = Math.max(node.height() * node.scaleY(), 8);
                        // Update node dimensions directly so Konva shows correct size
                        // immediately, before React's async re-render confirms the change.
                        node.width(nw); node.height(nh);
                        node.scaleX(1); node.scaleY(1);
                        onStep1Update?.(i, {
                          x: node.x() / scale,
                          y: (viewportHeight - (node.y() + nh)) / scale,
                          width: nw / scale,
                          height: nh / scale,
                        });
                      }}
                    />
                    {/* Move handle for each blank (sits above the rect) */}
                    {step1Mode && (
                      <Circle
                        x={bx + bw / 2}
                        y={Math.max(by - 14, 0)}
                        radius={7}
                        fill={isSelected ? '#059669' : '#0d9488'}
                        opacity={0.8}
                        draggable
                        dragBoundFunc={(pos: { x: number; y: number }) => pos}
                        onDragStart={() => {
                          setStep1PendingRect(null);
                          setStep1SelectedIdx(i);
                          step1KonvaRefs.current.get(i)?.startDrag();
                        }}
                        onDragEnd={() => {
                          const rect = step1KonvaRefs.current.get(i);
                          if (rect) {
                            onStep1Update?.(i, {
                              x: rect.x() / scale,
                              y: (viewportHeight - (rect.y() + rect.height())) / scale,
                              width: rect.width() / scale,
                              height: rect.height() / scale,
                            });
                          }
                        }}
                        listening
                      />
                    )}
                    <Text
                      x={bx + 3}
                      y={by + 3}
                      text={String(i + 1)}
                      fontSize={11}
                      fontStyle="bold"
                      fill={isSelected && step1Mode ? '#059669' : '#0d9488'}
                      listening={false}
                    />
                  </React.Fragment>
                );
              })}

              {/* Transformer attached to selected existing step1 blank */}
              {step1Mode && (
                <Transformer
                  ref={step1TransformerRef}
                  rotateEnabled={false}
                  flipEnabled={false}
                  enabledAnchors={[
                    'top-left', 'top-center', 'top-right',
                    'middle-left', 'middle-right',
                    'bottom-left', 'bottom-center', 'bottom-right',
                  ]}
                  boundBoxFunc={(oldBox, newBox) =>
                    newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
                  }
                />
              )}

              {/* Step 1 — pending (just detected, not yet confirmed) */}
              {step1Mode && step1PendingRect && (
                <>
                  <Rect
                    ref={step1PendingKonvaRef}
                    x={step1PendingRect.left}
                    y={step1PendingRect.top}
                    width={step1PendingRect.width}
                    height={step1PendingRect.height}
                    fill="rgba(20,184,166,0.15)"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dash={[5, 3]}
                    draggable
                    onDragEnd={(e) => {
                      const node = e.target;
                      setStep1PendingRect((pr) => pr ? { ...pr, left: node.x(), top: node.y() } : null);
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const nw = Math.max(node.width() * node.scaleX(), 8);
                      const nh = Math.max(node.height() * node.scaleY(), 8);
                      node.width(nw); node.height(nh);
                      node.scaleX(1); node.scaleY(1);
                      setStep1PendingRect({ left: node.x(), top: node.y(), width: nw, height: nh });
                    }}
                  />
                  {/* Move handle for pending step1 area (sits above the rect) */}
                  <Circle
                    x={step1PendingRect.left + step1PendingRect.width / 2}
                    y={Math.max(step1PendingRect.top - 16, 0)}
                    radius={7}
                    fill="#0d9488"
                    opacity={0.85}
                    draggable
                    dragBoundFunc={(pos: { x: number; y: number }) => pos}
                    onDragStart={() => { step1PendingKonvaRef.current?.startDrag(); }}
                    onDragEnd={(_e: any) => {
                      _e.target.stopDrag();
                      const r = step1PendingKonvaRef.current;
                      if (r) setStep1PendingRect((pr) => pr ? { ...pr, left: r.x(), top: r.y() } : null);
                    }}
                    listening
                  />
                  <Transformer
                    ref={step1PendingTransRef}
                    rotateEnabled={false}
                    flipEnabled={false}
                    enabledAnchors={[
                      'top-left', 'top-center', 'top-right',
                      'middle-left', 'middle-right',
                      'bottom-left', 'bottom-center', 'bottom-right',
                    ]}
                    boundBoxFunc={(oldBox, newBox) =>
                      newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
                    }
                  />
                </>
              )}
              {/* Text edit mode — hit areas over each text item */}
              {textEditMode && textItems.map((item, i) => {
                const isHovered = selectedTextItemIdx === i;
                return (
                  <Rect
                    key={`ti-${i}`}
                    x={item.left}
                    y={item.top}
                    width={Math.max(item.width, 6)}
                    height={Math.max(item.height, 6)}
                    fill={isHovered ? 'rgba(251,191,36,0.35)' : 'rgba(251,191,36,0.12)'}
                    stroke={isHovered ? '#d97706' : 'rgba(251,191,36,0.35)'}
                    strokeWidth={1}
                    onClick={() => {
                      if (selectedTextItemIdx === i) {
                        setSelectedTextItemIdx(null);
                        setPendingTextOverlay(null);
                      } else {
                        setSelectedTextItemIdx(i);
                        setSelectedOverlayId(null);
                        const overlay = buildOverlayFromTextItem(item);
                        if (overlay) setPendingTextOverlay(overlay);
                      }
                    }}
                  />
                );
              })}

              {/* Text overlays — white redaction boxes + optional replacement text */}
              {textOverlays.map((overlay) => {
                const ox = overlay.x * scale;
                const oy = viewportHeight - (overlay.y + overlay.height) * scale;
                const ow = overlay.width * scale;
                const oh = overlay.height * scale;
                const isSelected = selectedOverlayId === overlay.id;
                const fsScaled = (overlay.fontSize ?? 10) * scale;
                return (
                  <React.Fragment key={overlay.id}>
                    <Rect
                      x={ox} y={oy} width={ow} height={oh}
                      fill="white"
                      stroke={isSelected ? '#f59e0b' : '#94a3b8'}
                      strokeWidth={isSelected ? 2 : 1}
                      dash={isSelected ? undefined : [3, 2]}
                      onClick={() => {
                        if (textEditMode) {
                          setSelectedOverlayId(isSelected ? null : overlay.id);
                          setSelectedTextItemIdx(null);
                          setPendingTextOverlay(null);
                        }
                      }}
                    />
                    {overlay.replacementText ? (
                      <Text
                        x={ox + 2} y={oy + 2}
                        width={Math.max(ow - 4, 4)}
                        height={Math.max(oh - 4, 4)}
                        text={overlay.replacementText}
                        fontSize={fsScaled}
                        fontFamily={overlay.fontFamily ?? 'Helvetica'}
                        fontStyle={overlay.fontStyle ?? 'normal'}
                        fill={overlay.color ?? '#000000'}
                        align={overlay.align ?? 'left'}
                        listening={false}
                        wrap="word"
                        ellipsis
                      />
                    ) : null}
                  </React.Fragment>
                );
              })}
              </Layer>
            </Stage>
          </div>
        </div>
      )}

      {/* Confirm / Cancel overlay for pending placement rect */}
      {pendingRect && manualPlacementField && (
        <div className="pointer-events-auto absolute bottom-3 left-3 z-20 flex gap-1.5">
          <button
            className="rounded bg-green-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-green-700"
            onClick={() => {
              pendingRectCommitRef.current(pendingRect);
              setPendingRect(null);
            }}
          >
            ✓ Confirm (Enter)
          </button>
          <button
            className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow ring-1 ring-gray-300 hover:bg-gray-50"
            onClick={() => setPendingRect(null)}
          >
            ✗ Cancel (Esc)
          </button>
        </div>
      )}

      {/* Add Area / Cancel overlay for step 1 pending detection */}
      {step1Mode && step1PendingRect && (
        <div className="pointer-events-auto absolute bottom-3 left-3 z-20 flex gap-1.5">
          <button
            className="rounded bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-teal-700"
            onClick={() => {
              if (onStep1Click && scale > 0) {
                onStep1Click(pageNumber, {
                  x: step1PendingRect.left / scale,
                  y: (viewportHeight - (step1PendingRect.top + step1PendingRect.height)) / scale,
                  width: step1PendingRect.width / scale,
                  height: step1PendingRect.height / scale,
                });
              }
              setStep1PendingRect(null);
            }}
          >
            ✓ Add Area (Enter)
          </button>
          <button
            className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow ring-1 ring-gray-300 hover:bg-gray-50"
            onClick={() => setStep1PendingRect(null)}
          >
            ✗ Cancel (Esc)
          </button>
        </div>
      )}

      {/* ── Text edit panel ─────────────────────────────────────────────────
          Shows when textEditMode is active and a text item or overlay is selected.
          Panel floats at the bottom; handlebars tokens can be inserted via buttons.       */}
      {textEditMode && (selectedTextItemIdx !== null || selectedOverlayId !== null) && (() => {
        const HANDLEBARS_TOKENS: Array<{ label: string; token: string }> = [
          // Job
          { label: 'Job ID',       token: '{{job.generated_job_id}}' },
          { label: 'Job Date',     token: '{{job.date}}' },
          { label: 'Job Address',  token: '{{job.job_address}}' },
          { label: 'Job Desc',     token: '{{job.job_description}}' },
          // Engineer (staff)
          { label: 'Engineer',     token: '{{engineer.first}} {{engineer.last}}' },
          { label: 'Eng. Email',   token: '{{engineer.email}}' },
          // Customer (client)
          { label: 'Client Name',  token: '{{client.company_name}}' },
          { label: 'Client Phone', token: '{{client.phone}}' },
          { label: 'Client Email', token: '{{client.email}}' },
          { label: 'Client Addr',  token: '{{client.billing_address}}' },
          // Company
          { label: 'Co. Name',     token: '{{company.name}}' },
          { label: 'Co. Phone',    token: '{{company.phone}}' },
          { label: 'Co. Email',    token: '{{company.email}}' },
          { label: 'Co. Address',  token: '{{company.address}}' },
        ];

        // Editing an existing overlay
        if (selectedOverlayId !== null) {
          const overlay = textOverlays.find((o) => o.id === selectedOverlayId);
          if (!overlay) return null;

          const update = (patch: Partial<TextOverlay>) => onUpdateTextOverlay?.(overlay.id, patch);
          const repText = overlay.replacementText ?? '';

          return (
            <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 border-t border-amber-200 bg-white/97 p-3 shadow-lg backdrop-blur">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[160px] space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Replacement text</p>
                  <textarea
                    id={`rep-text-${overlay.id}`}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-amber-400 focus:outline-none"
                    rows={2}
                    placeholder="Leave blank for white-out only"
                    value={repText}
                    onChange={(e) => update({ replacementText: e.target.value })}
                  />
                  {/* Handlebars token buttons */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {HANDLEBARS_TOKENS.map(({ label, token }) => (
                      <button
                        key={token}
                        type="button"
                        className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                        title={`Insert ${token}`}
                        onClick={() => {
                          const el = document.getElementById(`rep-text-${overlay.id}`) as HTMLTextAreaElement | null;
                          if (el) {
                            const start = el.selectionStart ?? repText.length;
                            const end = el.selectionEnd ?? repText.length;
                            const next = repText.slice(0, start) + token + repText.slice(end);
                            update({ replacementText: next });
                            // restore cursor after React re-render
                            requestAnimationFrame(() => {
                              el.selectionStart = el.selectionEnd = start + token.length;
                              el.focus();
                            });
                          } else {
                            update({ replacementText: repText + token });
                          }
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Style controls */}
                <div className="flex flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Size</p>
                    <input
                      type="number"
                      title="Font size in points"
                      className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs"
                      min={6} max={72} step={1}
                      value={overlay.fontSize ?? 10}
                      onChange={(e) => update({ fontSize: Math.max(6, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Font</p>
                    <select
                      title="Font family"
                      className="rounded border border-gray-300 px-1 py-0.5 text-xs"
                      value={overlay.fontFamily ?? 'Helvetica'}
                      onChange={(e) => update({ fontFamily: e.target.value })}
                    >
                      {['Helvetica', 'Arial', 'Times New Roman', 'Courier New', 'Georgia'].map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Style</p>
                    <div className="flex gap-1">
                      {(['normal', 'bold', 'italic', 'bold italic'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`rounded px-1.5 py-0.5 text-[10px] ring-1 ${overlay.fontStyle === s ? 'bg-gray-700 text-white ring-gray-700' : 'bg-white ring-gray-300 hover:bg-gray-50'}`}
                          onClick={() => update({ fontStyle: s })}
                        >
                          {s === 'normal' ? 'N' : s === 'bold' ? 'B' : s === 'italic' ? 'I' : 'BI'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Align</p>
                    <div className="flex gap-1">
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          className={`rounded px-1.5 py-0.5 text-[10px] ring-1 ${overlay.align === a ? 'bg-gray-700 text-white ring-gray-700' : 'bg-white ring-gray-300 hover:bg-gray-50'}`}
                          onClick={() => update({ align: a })}
                        >
                          {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Colour</p>
                    <input
                      type="color"
                      title="Text colour"
                      className="h-6 w-8 rounded border border-gray-300 p-0"
                      value={overlay.color ?? '#000000'}
                      onChange={(e) => update({ color: e.target.value })}
                    />
                  </div>
                </div>
                {/* Delete */}
                <button
                  type="button"
                  className="self-start rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100"
                  onClick={() => {
                    onRemoveTextOverlay?.(overlay.id);
                    setSelectedOverlayId(null);
                  }}
                >
                  Remove overlay
                </button>
                <button
                  type="button"
                  className="self-start rounded bg-white px-2 py-1 text-xs text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
                  onClick={() => setSelectedOverlayId(null)}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        }

        // New overlay from selected text item
        if (selectedTextItemIdx !== null && pendingTextOverlay !== null) {
          const pt = pendingTextOverlay;
          const repText = pt.replacementText;

          const setPt = (patch: Partial<typeof pt>) =>
            setPendingTextOverlay((prev) => prev ? { ...prev, ...patch } : null);

          const commit = (redactOnly: boolean) => {
            onAddTextOverlay?.(pageNumber, {
              ...pt,
              replacementText: redactOnly ? '' : pt.replacementText,
            });
            setSelectedTextItemIdx(null);
            setPendingTextOverlay(null);
          };

          return (
            <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 border-t border-yellow-200 bg-white/97 p-3 shadow-lg backdrop-blur">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[160px] space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-yellow-700">
                    Add overlay — <span className="font-normal">{textItems[selectedTextItemIdx]?.text ?? ''}</span>
                  </p>
                  <textarea
                    id="pending-text-overlay"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-yellow-400 focus:outline-none"
                    rows={2}
                    placeholder="Replacement text (or leave blank for white-out)"
                    value={repText}
                    onChange={(e) => setPt({ replacementText: e.target.value })}
                  />
                  {/* Handlebars token buttons */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {HANDLEBARS_TOKENS.map(({ label, token }) => (
                      <button
                        key={token}
                        type="button"
                        className="rounded bg-yellow-50 px-1.5 py-0.5 text-[10px] text-yellow-700 ring-1 ring-yellow-200 hover:bg-yellow-100"
                        title={`Insert ${token}`}
                        onClick={() => {
                          const el = document.getElementById('pending-text-overlay') as HTMLTextAreaElement | null;
                          if (el) {
                            const start = el.selectionStart ?? repText.length;
                            const end = el.selectionEnd ?? repText.length;
                            const next = repText.slice(0, start) + token + repText.slice(end);
                            setPt({ replacementText: next });
                            requestAnimationFrame(() => {
                              el.selectionStart = el.selectionEnd = start + token.length;
                              el.focus();
                            });
                          } else {
                            setPt({ replacementText: repText + token });
                          }
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Style controls */}
                <div className="flex flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Size</p>
                    <input
                      type="number"
                      title="Font size in points"
                      className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs"
                      min={6} max={72} step={1}
                      value={pt.fontSize}
                      onChange={(e) => setPt({ fontSize: Math.max(6, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Font</p>
                    <select
                      title="Font family"
                      className="rounded border border-gray-300 px-1 py-0.5 text-xs"
                      value={pt.fontFamily}
                      onChange={(e) => setPt({ fontFamily: e.target.value })}
                    >
                      {['Helvetica', 'Arial', 'Times New Roman', 'Courier New', 'Georgia'].map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Style</p>
                    <div className="flex gap-1">
                      {(['normal', 'bold', 'italic', 'bold italic'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`rounded px-1.5 py-0.5 text-[10px] ring-1 ${pt.fontStyle === s ? 'bg-gray-700 text-white ring-gray-700' : 'bg-white ring-gray-300 hover:bg-gray-50'}`}
                          onClick={() => setPt({ fontStyle: s })}
                        >
                          {s === 'normal' ? 'N' : s === 'bold' ? 'B' : s === 'italic' ? 'I' : 'BI'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Align</p>
                    <div className="flex gap-1">
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          className={`rounded px-1.5 py-0.5 text-[10px] ring-1 ${pt.align === a ? 'bg-gray-700 text-white ring-gray-700' : 'bg-white ring-gray-300 hover:bg-gray-50'}`}
                          onClick={() => setPt({ align: a })}
                        >
                          {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500">Colour</p>
                    <input
                      type="color"
                      title="Text colour"
                      className="h-6 w-8 rounded border border-gray-300 p-0"
                      value={pt.color}
                      onChange={(e) => setPt({ color: e.target.value })}
                    />
                  </div>
                </div>
                {/* Action buttons */}
                <div className="flex flex-col gap-1 self-start">
                  <button
                    type="button"
                    className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    onClick={() => commit(true)}
                  >
                    White-out
                  </button>
                  <button
                    type="button"
                    className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                    disabled={!repText.trim()}
                    onClick={() => commit(false)}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    className="rounded bg-white px-2 py-1 text-xs text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
                    onClick={() => { setSelectedTextItemIdx(null); setPendingTextOverlay(null); }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })()}
    </div>
  );
}

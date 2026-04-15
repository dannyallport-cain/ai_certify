'use client';

import {
  Group,
  Line as KonvaLine,
  Rect,
  Text as KonvaText,
} from 'react-konva';

import {
  DEFAULT_TEMPLATE_FONTS,
  getDynamicFieldLabel,
  getDynamicFieldSampleValue,
  type CertificateTemplateConfig,
  type DragDropEditorDynamicTextElement,
  type DragDropEditorElement,
  type DragDropEditorElementType,
  type DragDropEditorImageElement,
  type DragDropEditorLineElement,
  type DragDropEditorPage,
  type DragDropEditorRectangleElement,
  type DragDropEditorStaticTextElement,
} from '@/lib/certificate-template-editor';

export const REPORT_PREVIEW_BASE_WIDTH = 1123;
export const REPORT_PREVIEW_BASE_HEIGHT = 794;
export const MIN_VIEWPORT_SIZE = 240;

export const sectionTypes = [
  { value: 'header', label: 'Company Header', icon: '🏢' },
  { value: 'title', label: 'Certificate Title', icon: '📋' },
  { value: 'certificate-number', label: 'Certificate Number', icon: '🏷️' },
  { value: 'data-table', label: 'Data Table', icon: '📊' },
  { value: 'items-table', label: 'Items Table', icon: '📋' },
  { value: 'defects', label: 'Defects & Recommendations', icon: '⚠️' },
  { value: 'certification', label: 'Certification Statement', icon: '✅' },
  { value: 'signatures', label: 'Signatures', icon: '✍️' },
] as const;

export const fontOptions = ['Helvetica', 'Arial', 'Times New Roman', 'Calibri', 'Verdana', 'Georgia'];

export function clampNumber(value: number, min = 0) {
  return Number.isFinite(value) ? Math.max(min, value) : min;
}

export function getElementLabel(element: DragDropEditorElement) {
  switch (element.type) {
    case 'static-text':
      return element.text || 'Static text';
    case 'dynamic-text':
      return element.label || getDynamicFieldLabel(element.fieldKey);
    case 'rectangle':
      return 'Rectangle';
    case 'line':
      return 'Line';
    case 'image':
      return element.alt || 'Image';
    default:
      return 'Element';
  }
}

export function getPageElementPreview(element: DragDropEditorElement) {
  if (element.type === 'static-text') return element.text;
  if (element.type === 'dynamic-text') return getDynamicFieldSampleValue(element.fieldKey);
  if (element.type === 'image') return element.alt || 'Image';
  if (element.type === 'rectangle') return 'Rectangle';
  return 'Line';
}

export function getSortedEditorPages(template: CertificateTemplateConfig) {
  return template.dragDropEditor.pages.slice().sort((a, b) => a.order - b.order);
}

export function getActivePage(
  template: CertificateTemplateConfig,
  pages: DragDropEditorPage[]
) {
  return pages.find((page) => page.id === template.dragDropEditor.activePageId) ?? pages[0] ?? null;
}

export function getPageElements(
  template: CertificateTemplateConfig,
  pageId?: string | null
) {
  if (!pageId) return [];

  return template.dragDropEditor.elements
    .filter((element) => element.pageId === pageId)
    .sort((a, b) => a.zIndex - b.zIndex);
}

function getDragBoundFunc(snapToGrid: boolean, gridSize: number) {
  return (position: { x: number; y: number }) =>
    snapToGrid
      ? {
          x: Math.round(position.x / gridSize) * gridSize,
          y: Math.round(position.y / gridSize) * gridSize,
        }
      : position;
}

interface RenderElementOptions {
  element: DragDropEditorElement;
  isSelected: boolean;
  snapToGrid: boolean;
  gridSize: number;
  onSelect: (elementId: string) => void;
  onMove: (elementId: string, position: { x: number; y: number }) => void;
}

function renderTextElement({
  element,
  isSelected,
  snapToGrid,
  gridSize,
  onSelect,
  onMove,
}: RenderElementOptions & {
  element: DragDropEditorStaticTextElement | DragDropEditorDynamicTextElement;
}) {
  const text =
    element.type === 'dynamic-text'
      ? getDynamicFieldSampleValue(element.fieldKey)
      : element.text;

  const style = element.style;

  return (
    <Group
      key={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation ?? 0}
      opacity={element.opacity ?? 1}
      draggable={!element.locked}
      dragBoundFunc={getDragBoundFunc(snapToGrid, gridSize)}
      onClick={() => onSelect(element.id)}
      onTap={() => onSelect(element.id)}
      onDragEnd={(event) =>
        onMove(element.id, {
          x: event.target.x(),
          y: event.target.y(),
        })
      }
    >
      {isSelected ? (
        <Rect
          x={-6}
          y={-6}
          width={(element.width ?? 240) + 12}
          height={(element.height ?? style.fontSize + 18) + 12}
          stroke="#2563eb"
          strokeWidth={1}
          dash={[6, 4]}
          listening={false}
        />
      ) : null}
      <KonvaText
        width={element.width ?? 240}
        height={element.height}
        text={text}
        fill={style.color}
        fontFamily={style.fontFamily}
        fontSize={style.fontSize}
        fontStyle={`${style.fontWeight === 'bold' ? 'bold ' : ''}${style.fontStyle}`.trim()}
        align={style.textAlign}
        lineHeight={style.lineHeight}
        letterSpacing={style.letterSpacing}
        textDecoration={style.textDecoration === 'underline' ? 'underline' : ''}
      />
    </Group>
  );
}

function renderRectangleElement({
  element,
  isSelected,
  snapToGrid,
  gridSize,
  onSelect,
  onMove,
}: RenderElementOptions & {
  element: DragDropEditorRectangleElement;
}) {
  return (
    <Rect
      key={element.id}
      x={element.x}
      y={element.y}
      width={element.width ?? 180}
      height={element.height ?? 100}
      rotation={element.rotation ?? 0}
      opacity={element.opacity ?? 1}
      cornerRadius={element.cornerRadius ?? 0}
      fill={element.style.fill}
      stroke={isSelected ? '#2563eb' : element.style.stroke}
      strokeWidth={isSelected ? Math.max((element.style.strokeWidth ?? 1) + 1, 2) : element.style.strokeWidth}
      dash={element.style.dash}
      draggable={!element.locked}
      dragBoundFunc={getDragBoundFunc(snapToGrid, gridSize)}
      onClick={() => onSelect(element.id)}
      onTap={() => onSelect(element.id)}
      onDragEnd={(event) =>
        onMove(element.id, {
          x: event.target.x(),
          y: event.target.y(),
        })
      }
    />
  );
}

function renderLineElement({
  element,
  isSelected,
  snapToGrid,
  gridSize,
  onSelect,
  onMove,
}: RenderElementOptions & {
  element: DragDropEditorLineElement;
}) {
  return (
    <KonvaLine
      key={element.id}
      x={element.x}
      y={element.y}
      points={element.points}
      rotation={element.rotation ?? 0}
      opacity={element.opacity ?? 1}
      stroke={isSelected ? '#2563eb' : element.style.stroke}
      strokeWidth={isSelected ? Math.max((element.style.strokeWidth ?? 1) + 1, 2) : element.style.strokeWidth}
      dash={element.style.dash}
      draggable={!element.locked}
      dragBoundFunc={getDragBoundFunc(snapToGrid, gridSize)}
      onClick={() => onSelect(element.id)}
      onTap={() => onSelect(element.id)}
      onDragEnd={(event) =>
        onMove(element.id, {
          x: event.target.x(),
          y: event.target.y(),
        })
      }
    />
  );
}

function renderImageElement({
  element,
  isSelected,
  snapToGrid,
  gridSize,
  onSelect,
  onMove,
}: RenderElementOptions & {
  element: DragDropEditorImageElement;
}) {
  return (
    <Group
      key={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation ?? 0}
      opacity={element.opacity ?? 1}
      draggable={!element.locked}
      dragBoundFunc={getDragBoundFunc(snapToGrid, gridSize)}
      onClick={() => onSelect(element.id)}
      onTap={() => onSelect(element.id)}
      onDragEnd={(event) =>
        onMove(element.id, {
          x: event.target.x(),
          y: event.target.y(),
        })
      }
    >
      <Rect
        width={element.width ?? 180}
        height={element.height ?? 120}
        cornerRadius={element.style?.borderRadius ?? 0}
        fill="#f8fafc"
        stroke={isSelected ? '#2563eb' : '#cbd5e1'}
        dash={element.src ? undefined : [6, 4]}
      />
      <KonvaText
        x={12}
        y={(element.height ?? 120) / 2 - 10}
        width={(element.width ?? 180) - 24}
        align="center"
        text={element.src ? element.alt || 'Image' : 'Image placeholder'}
        fill="#64748b"
        fontFamily={DEFAULT_TEMPLATE_FONTS.body}
        fontSize={14}
      />
    </Group>
  );
}

export function renderCanvasElement(options: RenderElementOptions) {
  if (options.element.visible === false) {
    return null;
  }

  if (options.element.type === 'static-text' || options.element.type === 'dynamic-text') {
    return renderTextElement(options as RenderElementOptions & {
      element: DragDropEditorStaticTextElement | DragDropEditorDynamicTextElement;
    });
  }

  if (options.element.type === 'rectangle') {
    return renderRectangleElement(options as RenderElementOptions & {
      element: DragDropEditorRectangleElement;
    });
  }

  if (options.element.type === 'line') {
    return renderLineElement(options as RenderElementOptions & {
      element: DragDropEditorLineElement;
    });
  }

  return renderImageElement(options as RenderElementOptions & {
    element: DragDropEditorImageElement;
  });
}

export function toPreviewCertificateType(certificateType?: string): string {
  switch (certificateType) {
    case 'BS5839-1':
      return 'BS5839_1';
    case 'BS5839-6':
      return 'BS5839_6';
    default:
      return certificateType || 'BS5839_1';
  }
}

export interface TemplateCanvasViewport {
  width: number;
  height: number;
  scale: number;
}

export function getPageViewport(activePage: DragDropEditorPage | null): TemplateCanvasViewport {
  if (!activePage) {
    return {
      width: REPORT_PREVIEW_BASE_WIDTH,
      height: REPORT_PREVIEW_BASE_HEIGHT,
      scale: 1,
    };
  }

  const viewportWidth = Math.max(activePage.canvas.viewportWidth, MIN_VIEWPORT_SIZE);
  const viewportHeight = Math.max(activePage.canvas.viewportHeight, MIN_VIEWPORT_SIZE);
  const zoom = Math.max(activePage.canvas.zoom, 0.1);

  return {
    width: viewportWidth,
    height: viewportHeight,
    scale: zoom,
  };
}

export function getPreviewScale(activePage: DragDropEditorPage | null) {
  if (!activePage) return 1;

  const widthScale = activePage.canvas.width / REPORT_PREVIEW_BASE_WIDTH;
  const heightScale = activePage.canvas.height / REPORT_PREVIEW_BASE_HEIGHT;

  return Math.min(widthScale, heightScale);
}

export function getCanvasGridLineCounts(
  renderedPageWidth: number,
  renderedPageHeight: number,
  gridSize: number
) {
  return {
    vertical: Math.floor(renderedPageWidth / gridSize) + 1,
    horizontal: Math.floor(renderedPageHeight / gridSize) + 1,
  };
}

export function getSelectedEditorVariants(selectedElement: DragDropEditorElement | null) {
  const selectedTextElement =
    selectedElement && (selectedElement.type === 'static-text' || selectedElement.type === 'dynamic-text')
      ? selectedElement
      : null;

  const selectedRectangleElement =
    selectedElement?.type === 'rectangle' ? selectedElement : null;

  const selectedLineOrRectangleElement =
    selectedElement && (selectedElement.type === 'line' || selectedElement.type === 'rectangle')
      ? selectedElement
      : null;

  const selectedImageElement =
    selectedElement?.type === 'image' ? selectedElement : null;

  return {
    selectedTextElement,
    selectedRectangleElement,
    selectedLineOrRectangleElement,
    selectedImageElement,
  };
}

export function getEmptyRealBlockOffsets() {
  return {} as Record<string, { x: number; y: number }>;
}

export function getEmptyPreviewSelection() {
  return null as string | null;
}

export function getElementTypeBadgeLabel(type: DragDropEditorElementType) {
  return type;
}
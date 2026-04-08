'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Group,
  Layer,
  Line as KonvaLine,
  Rect,
  Stage,
  Text as KonvaText,
} from 'react-konva';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import {
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Lock,
  Minus,
  Move,
  Plus,
  RectangleHorizontal,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { HexColorPicker } from 'react-colorful';
import {
  CERTIFICATE_TEMPLATE_DYNAMIC_FIELDS,
  createEditorElement,
  DEFAULT_TEMPLATE_FONTS,
  getDynamicFieldLabel,
  getDynamicFieldSampleValue,
  normalizeTemplateConfig,
  type CertificateTemplateConfig,
  type CertificateTemplateDynamicFieldKey,
  type DragDropEditorElement,
  type DragDropEditorImageElement,
  type DragDropEditorLineElement,
  type DragDropEditorRectangleElement,
  type DragDropEditorStaticTextElement,
  type DragDropEditorTextStyle,
  type DragDropEditorDynamicTextElement,
  type DragDropEditorElementType,
  type LegacyTemplateSection,
} from '@/lib/certificate-template-editor';

interface TemplateEditorProps {
  template: CertificateTemplateConfig;
  onChange: (template: CertificateTemplateConfig) => void;
}

const sectionTypes = [
  { value: 'header', label: 'Company Header', icon: '🏢' },
  { value: 'title', label: 'Certificate Title', icon: '📋' },
  { value: 'certificate-number', label: 'Certificate Number', icon: '🏷️' },
  { value: 'data-table', label: 'Data Table', icon: '📊' },
  { value: 'items-table', label: 'Items Table', icon: '📋' },
  { value: 'defects', label: 'Defects & Recommendations', icon: '⚠️' },
  { value: 'certification', label: 'Certification Statement', icon: '✅' },
  { value: 'signatures', label: 'Signatures', icon: '✍️' },
];

const fontOptions = ['Helvetica', 'Arial', 'Times New Roman', 'Calibri', 'Verdana', 'Georgia'];

const clampNumber = (value: number, min = 0) => (Number.isFinite(value) ? Math.max(min, value) : min);

function ColorField({
  label,
  color,
  onChange,
}: {
  label: string;
  color: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 w-full justify-start gap-3 px-3">
            <span className="h-5 w-5 rounded border" style={{ backgroundColor: color }} />
            <span className="font-mono text-xs">{color}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3">
          <HexColorPicker color={color} onChange={onChange} />
          <Input value={color} onChange={(event) => onChange(event.target.value)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ElementListIcon({ type }: { type: DragDropEditorElementType }) {
  if (type === 'static-text') return <Type className="h-4 w-4" />;
  if (type === 'dynamic-text') return <Move className="h-4 w-4" />;
  if (type === 'rectangle') return <RectangleHorizontal className="h-4 w-4" />;
  if (type === 'line') return <Minus className="h-4 w-4" />;
  return <ImageIcon className="h-4 w-4" />;
}

function getElementLabel(element: DragDropEditorElement) {
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

export default function TemplateEditor({ template, onChange }: TemplateEditorProps) {
  const normalizedTemplate = useMemo(() => normalizeTemplateConfig(template), [template]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('canvas');

  const selectedSection = selectedSectionId
    ? normalizedTemplate.sections.find((section) => section.id === selectedSectionId) ?? null
    : null;

  const selectedElement = selectedElementId
    ? normalizedTemplate.dragDropEditor.elements.find((element) => element.id === selectedElementId) ?? null
    : null;

  const sortedElements = [...normalizedTemplate.dragDropEditor.elements].sort(
    (a, b) => a.zIndex - b.zIndex
  );

  const updateTemplate = useCallback(
    (updater: (current: CertificateTemplateConfig) => CertificateTemplateConfig) => {
      onChange(updater(normalizedTemplate));
    },
    [normalizedTemplate, onChange]
  );

  const updateSections = useCallback(
    (sections: LegacyTemplateSection[]) => {
      updateTemplate((current) => ({ ...current, sections }));
    },
    [updateTemplate]
  );

  const updateEditorElements = useCallback(
    (elements: DragDropEditorElement[]) => {
      updateTemplate((current) => ({
        ...current,
        dragDropEditor: {
          ...current.dragDropEditor,
          elements,
        },
      }));
    },
    [updateTemplate]
  );

  const updateCanvas = useCallback(
    (canvasUpdates: Partial<CertificateTemplateConfig['dragDropEditor']['canvas']>) => {
      updateTemplate((current) => ({
        ...current,
        dragDropEditor: {
          ...current.dragDropEditor,
          canvas: {
            ...current.dragDropEditor.canvas,
            ...canvasUpdates,
          },
        },
      }));
    },
    [updateTemplate]
  );

  const updateSection = (sectionId: string, updates: Partial<LegacyTemplateSection>) => {
    updateSections(
      normalizedTemplate.sections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  };

  const updateSectionStyle = (
    sectionId: string,
    styleUpdates: Partial<NonNullable<LegacyTemplateSection['style']>>
  ) => {
    updateSections(
      normalizedTemplate.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              style: {
                ...(section.style ?? {}),
                ...styleUpdates,
              },
            }
          : section
      )
    );
  };

  const addSection = (type: string) => {
    const section: LegacyTemplateSection = {
      id: `${type}-${Date.now()}`,
      type,
      title: sectionTypes.find((item) => item.value === type)?.label ?? type,
      order: normalizedTemplate.sections.length + 1,
      visible: true,
      style: {
        backgroundColor: '#f8f9fa',
        textColor: normalizedTemplate.colors.text,
        fontSize: normalizedTemplate.fonts.size.medium,
        padding: 15,
        margin: 5,
      },
    };

    updateSections([...normalizedTemplate.sections, section]);
    setSelectedSectionId(section.id);
  };

  const deleteSection = (sectionId: string) => {
    const sections = normalizedTemplate.sections
      .filter((section) => section.id !== sectionId)
      .map((section, index) => ({ ...section, order: index + 1 }));

    updateSections(sections);

    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
  };

  const handleSectionDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sections = Array.from(normalizedTemplate.sections);
    const [movedSection] = sections.splice(result.source.index, 1);
    sections.splice(result.destination.index, 0, movedSection);

    updateSections(sections.map((section, index) => ({ ...section, order: index + 1 })));
  };

  const updateElement = (elementId: string, updater: (element: DragDropEditorElement) => DragDropEditorElement) => {
    updateEditorElements(
      normalizedTemplate.dragDropEditor.elements.map((element) =>
        element.id === elementId ? updater(element) : element
      )
    );
  };

  const addElement = (type: DragDropEditorElementType) => {
    const nextElement = createEditorElement(type, normalizedTemplate.dragDropEditor.elements.length, {
      colors: normalizedTemplate.colors,
      fonts: normalizedTemplate.fonts,
    });

    updateEditorElements([...normalizedTemplate.dragDropEditor.elements, nextElement]);
    setSelectedElementId(nextElement.id);
  };

  const deleteElement = (elementId: string) => {
    const elements = normalizedTemplate.dragDropEditor.elements
      .filter((element) => element.id !== elementId)
      .map((element, index) => ({ ...element, zIndex: index + 1 }));

    updateEditorElements(elements);

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const duplicateElement = (elementId: string) => {
    const element = normalizedTemplate.dragDropEditor.elements.find((item) => item.id === elementId);
    if (!element) return;

    const duplicated = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      x: element.x + 24,
      y: element.y + 24,
      zIndex: normalizedTemplate.dragDropEditor.elements.length + 1,
    } as DragDropEditorElement;

    updateEditorElements([...normalizedTemplate.dragDropEditor.elements, duplicated]);
    setSelectedElementId(duplicated.id);
  };

  const moveElementLayer = (elementId: string, direction: 'forward' | 'backward') => {
    const ordered = [...sortedElements];
    const index = ordered.findIndex((item) => item.id === elementId);
    if (index === -1) return;

    const targetIndex = direction === 'forward' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    const [element] = ordered.splice(index, 1);
    ordered.splice(targetIndex, 0, element);

    updateEditorElements(ordered.map((item, idx) => ({ ...item, zIndex: idx + 1 })));
  };

  const renderTextElement = (
    element: DragDropEditorStaticTextElement | DragDropEditorDynamicTextElement,
    isSelected: boolean
  ) => {
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
        onClick={() => setSelectedElementId(element.id)}
        onTap={() => setSelectedElementId(element.id)}
        onDragEnd={(event) =>
          updateElement(element.id, (current) => ({
            ...current,
            x: event.target.x(),
            y: event.target.y(),
          }))
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
  };

  const renderRectangleElement = (
    element: DragDropEditorRectangleElement,
    isSelected: boolean
  ) => (
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
      onClick={() => setSelectedElementId(element.id)}
      onTap={() => setSelectedElementId(element.id)}
      onDragEnd={(event) =>
        updateElement(element.id, (current) => ({
          ...current,
          x: event.target.x(),
          y: event.target.y(),
        }))
      }
    />
  );

  const renderLineElement = (element: DragDropEditorLineElement, isSelected: boolean) => (
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
      onClick={() => setSelectedElementId(element.id)}
      onTap={() => setSelectedElementId(element.id)}
      onDragEnd={(event) =>
        updateElement(element.id, (current) => ({
          ...current,
          x: event.target.x(),
          y: event.target.y(),
        }))
      }
    />
  );

  const renderImageElement = (element: DragDropEditorImageElement, isSelected: boolean) => (
    <Group
      key={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation ?? 0}
      opacity={element.opacity ?? 1}
      draggable={!element.locked}
      onClick={() => setSelectedElementId(element.id)}
      onTap={() => setSelectedElementId(element.id)}
      onDragEnd={(event) =>
        updateElement(element.id, (current) => ({
          ...current,
          x: event.target.x(),
          y: event.target.y(),
        }))
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

  const updateTextStyle = (elementId: string, updates: Partial<DragDropEditorTextStyle>) => {
    updateElement(elementId, (current) => {
      if (current.type !== 'static-text' && current.type !== 'dynamic-text') {
        return current;
      }

      return {
        ...current,
        style: {
          ...current.style,
          ...updates,
        },
      };
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 xl:flex-row">
      <div className="min-w-0 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="fonts">Typography</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Drag & Drop Layout Editor</h3>
                <p className="text-sm text-muted-foreground">
                  Position certificate content visually. This is saved into the template creation workflow.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => addElement('static-text')}>
                  <Type className="mr-2 h-4 w-4" />
                  Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => addElement('dynamic-text')}>
                  <Move className="mr-2 h-4 w-4" />
                  Dynamic Field
                </Button>
                <Button variant="outline" size="sm" onClick={() => addElement('rectangle')}>
                  <RectangleHorizontal className="mr-2 h-4 w-4" />
                  Rectangle
                </Button>
                <Button variant="outline" size="sm" onClick={() => addElement('line')}>
                  <Minus className="mr-2 h-4 w-4" />
                  Line
                </Button>
                <Button variant="outline" size="sm" onClick={() => addElement('image')}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Image
                </Button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <div>
                      <Label>Width</Label>
                      <Input
                        type="number"
                        value={normalizedTemplate.dragDropEditor.canvas.width}
                        onChange={(event) =>
                          updateCanvas({ width: clampNumber(Number(event.target.value), 100) })
                        }
                      />
                    </div>
                    <div>
                      <Label>Height</Label>
                      <Input
                        type="number"
                        value={normalizedTemplate.dragDropEditor.canvas.height}
                        onChange={(event) =>
                          updateCanvas({ height: clampNumber(Number(event.target.value), 100) })
                        }
                      />
                    </div>
                    <div>
                      <Label>Grid Size</Label>
                      <Input
                        type="number"
                        value={normalizedTemplate.dragDropEditor.canvas.gridSize}
                        onChange={(event) =>
                          updateCanvas({ gridSize: clampNumber(Number(event.target.value), 2) })
                        }
                      />
                    </div>
                    <div>
                      <Label>Padding</Label>
                      <Input
                        type="number"
                        value={normalizedTemplate.dragDropEditor.canvas.pagePadding}
                        onChange={(event) =>
                          updateCanvas({ pagePadding: clampNumber(Number(event.target.value), 0) })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <ColorField
                        label="Canvas Background"
                        color={normalizedTemplate.dragDropEditor.canvas.backgroundColor}
                        onChange={(color) => updateCanvas({ backgroundColor: color })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={normalizedTemplate.dragDropEditor.canvas.showGrid}
                        onCheckedChange={(checked) => updateCanvas({ showGrid: checked })}
                      />
                      <Label>Show Grid</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={normalizedTemplate.dragDropEditor.canvas.snapToGrid}
                        onCheckedChange={(checked) => updateCanvas({ snapToGrid: checked })}
                      />
                      <Label>Snap To Grid</Label>
                    </div>
                  </div>

                  <div className="overflow-auto rounded-lg border bg-slate-100 p-4">
                    <Stage
                      width={normalizedTemplate.dragDropEditor.canvas.width}
                      height={normalizedTemplate.dragDropEditor.canvas.height}
                      onMouseDown={(event) => {
                        if (event.target === event.target.getStage()) {
                          setSelectedElementId(null);
                        }
                      }}
                    >
                      <Layer>
                        <Rect
                          x={0}
                          y={0}
                          width={normalizedTemplate.dragDropEditor.canvas.width}
                          height={normalizedTemplate.dragDropEditor.canvas.height}
                          fill={normalizedTemplate.dragDropEditor.canvas.backgroundColor}
                        />

                        {normalizedTemplate.dragDropEditor.canvas.showGrid
                          ? Array.from(
                              {
                                length:
                                  Math.floor(
                                    normalizedTemplate.dragDropEditor.canvas.width /
                                      normalizedTemplate.dragDropEditor.canvas.gridSize
                                  ) + 1,
                              },
                              (_, index) => (
                                <KonvaLine
                                  key={`grid-v-${index}`}
                                  points={[
                                    index * normalizedTemplate.dragDropEditor.canvas.gridSize,
                                    0,
                                    index * normalizedTemplate.dragDropEditor.canvas.gridSize,
                                    normalizedTemplate.dragDropEditor.canvas.height,
                                  ]}
                                  stroke="#e2e8f0"
                                  strokeWidth={1}
                                  listening={false}
                                />
                              )
                            )
                          : null}

                        {normalizedTemplate.dragDropEditor.canvas.showGrid
                          ? Array.from(
                              {
                                length:
                                  Math.floor(
                                    normalizedTemplate.dragDropEditor.canvas.height /
                                      normalizedTemplate.dragDropEditor.canvas.gridSize
                                  ) + 1,
                              },
                              (_, index) => (
                                <KonvaLine
                                  key={`grid-h-${index}`}
                                  points={[
                                    0,
                                    index * normalizedTemplate.dragDropEditor.canvas.gridSize,
                                    normalizedTemplate.dragDropEditor.canvas.width,
                                    index * normalizedTemplate.dragDropEditor.canvas.gridSize,
                                  ]}
                                  stroke="#e2e8f0"
                                  strokeWidth={1}
                                  listening={false}
                                />
                              )
                            )
                          : null}

                        {sortedElements.map((element) => {
                          const isSelected = element.id === selectedElementId;

                          if (element.visible === false) {
                            return null;
                          }

                          if (element.type === 'static-text' || element.type === 'dynamic-text') {
                            return renderTextElement(element, isSelected);
                          }

                          if (element.type === 'rectangle') {
                            return renderRectangleElement(element, isSelected);
                          }

                          if (element.type === 'line') {
                            return renderLineElement(element, isSelected);
                          }

                          return renderImageElement(element, isSelected);
                        })}
                      </Layer>
                    </Stage>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Canvas Elements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedElements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No canvas elements yet. Add text, fields, lines, or boxes to build your template visually.
                    </p>
                  ) : (
                    sortedElements
                      .slice()
                      .reverse()
                      .map((element) => {
                        const isSelected = element.id === selectedElementId;

                        return (
                          <button
                            key={element.id}
                            type="button"
                            onClick={() => setSelectedElementId(element.id)}
                            className={`w-full rounded-lg border p-3 text-left transition ${
                              isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <ElementListIcon type={element.type} />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {getElementLabel(element)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    x:{Math.round(element.x)} y:{Math.round(element.y)} · z:{element.zIndex}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="capitalize">
                                  {element.type}
                                </Badge>
                                {element.locked ? <Lock className="h-4 w-4 text-slate-500" /> : null}
                              </div>
                            </div>
                          </button>
                        );
                      })
                  )}

                  {selectedElement ? (
                    <div className="space-y-4 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="capitalize">
                          {selectedElement.type}
                        </Badge>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveElementLayer(selectedElement.id, 'backward')}
                            title="Send backward"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveElementLayer(selectedElement.id, 'forward')}
                            title="Bring forward"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateElement(selectedElement.id)}
                            title="Duplicate"
                          >
                            <GripVertical className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => deleteElement(selectedElement.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>X</Label>
                          <Input
                            type="number"
                            value={selectedElement.x}
                            onChange={(event) =>
                              updateElement(selectedElement.id, (current) => ({
                                ...current,
                                x: clampNumber(Number(event.target.value), 0),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Y</Label>
                          <Input
                            type="number"
                            value={selectedElement.y}
                            onChange={(event) =>
                              updateElement(selectedElement.id, (current) => ({
                                ...current,
                                y: clampNumber(Number(event.target.value), 0),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Width</Label>
                          <Input
                            type="number"
                            value={selectedElement.width ?? 0}
                            onChange={(event) =>
                              updateElement(selectedElement.id, (current) => ({
                                ...current,
                                width: clampNumber(Number(event.target.value), 0),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Height</Label>
                          <Input
                            type="number"
                            value={selectedElement.height ?? 0}
                            onChange={(event) =>
                              updateElement(selectedElement.id, (current) => ({
                                ...current,
                                height: clampNumber(Number(event.target.value), 0),
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Rotation</Label>
                          <Input
                            type="number"
                            value={selectedElement.rotation ?? 0}
                            onChange={(event) =>
                              updateElement(selectedElement.id, (current) => ({
                                ...current,
                                rotation: Number(event.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Opacity (%)</Label>
                          <Input
                            type="number"
                            value={Math.round((selectedElement.opacity ?? 1) * 100)}
                            onChange={(event) =>
                              updateElement(selectedElement.id, (current) => ({
                                ...current,
                                opacity: Math.min(Math.max((Number(event.target.value) || 100) / 100, 0), 1),
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Visible</Label>
                        <Switch
                          checked={selectedElement.visible !== false}
                          onCheckedChange={(checked) =>
                            updateElement(selectedElement.id, (current) => ({
                              ...current,
                              visible: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Locked</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateElement(selectedElement.id, (current) => ({
                              ...current,
                              locked: !current.locked,
                            }))
                          }
                        >
                          {selectedElement.locked ? (
                            <>
                              <Unlock className="mr-2 h-4 w-4" />
                              Unlock
                            </>
                          ) : (
                            <>
                              <Lock className="mr-2 h-4 w-4" />
                              Lock
                            </>
                          )}
                        </Button>
                      </div>

                      {(selectedElement.type === 'static-text' ||
                        selectedElement.type === 'dynamic-text') && (
                        <>
                          {selectedElement.type === 'static-text' ? (
                            <div>
                              <Label>Text</Label>
                              <Textarea
                                rows={3}
                                value={selectedElement.text}
                                onChange={(event) =>
                                  updateElement(selectedElement.id, (current) => ({
                                    ...(current as DragDropEditorStaticTextElement),
                                    text: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          ) : (
                            <>
                              <div>
                                <Label>Dynamic Field</Label>
                                <Select
                                  value={selectedElement.fieldKey}
                                  onValueChange={(value) =>
                                    updateElement(selectedElement.id, (current) => ({
                                      ...(current as DragDropEditorDynamicTextElement),
                                      fieldKey: value as CertificateTemplateDynamicFieldKey,
                                      label: getDynamicFieldLabel(
                                        value as CertificateTemplateDynamicFieldKey
                                      ),
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CERTIFICATE_TEMPLATE_DYNAMIC_FIELDS.map((field) => (
                                      <SelectItem key={field} value={field}>
                                        {getDynamicFieldLabel(field)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Placeholder / Label</Label>
                                <Input
                                  value={selectedElement.label ?? ''}
                                  onChange={(event) =>
                                    updateElement(selectedElement.id, (current) => ({
                                      ...(current as DragDropEditorDynamicTextElement),
                                      label: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Font Size</Label>
                              <span className="text-xs text-muted-foreground">
                                {selectedElement.style.fontSize}px
                              </span>
                            </div>
                            <Slider
                              value={[selectedElement.style.fontSize]}
                              onValueChange={([value]) => updateTextStyle(selectedElement.id, { fontSize: value })}
                              min={8}
                              max={60}
                              step={1}
                            />
                          </div>

                          <div>
                            <Label>Font Family</Label>
                            <Select
                              value={selectedElement.style.fontFamily}
                              onValueChange={(value) => updateTextStyle(selectedElement.id, { fontFamily: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fontOptions.map((font) => (
                                  <SelectItem key={font} value={font}>
                                    {font}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Weight</Label>
                              <Select
                                value={selectedElement.style.fontWeight}
                                onValueChange={(value) =>
                                  updateTextStyle(selectedElement.id, {
                                    fontWeight: value as DragDropEditorTextStyle['fontWeight'],
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="bold">Bold</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Style</Label>
                              <Select
                                value={selectedElement.style.fontStyle}
                                onValueChange={(value) =>
                                  updateTextStyle(selectedElement.id, {
                                    fontStyle: value as DragDropEditorTextStyle['fontStyle'],
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="italic">Italic</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label>Alignment</Label>
                            <Select
                              value={selectedElement.style.textAlign}
                              onValueChange={(value) =>
                                updateTextStyle(selectedElement.id, {
                                  textAlign: value as DragDropEditorTextStyle['textAlign'],
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <ColorField
                            label="Text Color"
                            color={selectedElement.style.color}
                            onChange={(color) => updateTextStyle(selectedElement.id, { color })}
                          />
                        </>
                      )}

                      {selectedElement.type === 'rectangle' ? (
                        <>
                          <ColorField
                            label="Fill"
                            color={selectedElement.style.fill}
                            onChange={(color) =>
                              updateElement(selectedElement.id, (current) => ({
                                ...(current as DragDropEditorRectangleElement),
                                style: {
                                  ...(current as DragDropEditorRectangleElement).style,
                                  fill: color,
                                },
                              }))
                            }
                          />
                          <ColorField
                            label="Stroke"
                            color={selectedElement.style.stroke}
                            onChange={(color) =>
                              updateElement(selectedElement.id, (current) => ({
                                ...(current as DragDropEditorRectangleElement),
                                style: {
                                  ...(current as DragDropEditorRectangleElement).style,
                                  stroke: color,
                                },
                              }))
                            }
                          />
                        </>
                      ) : null}

                      {selectedElement.type === 'line' || selectedElement.type === 'rectangle' ? (
                        <div>
                          <Label>Stroke Width</Label>
                          <Input
                            type="number"
                            value={selectedElement.style.strokeWidth ?? 1}
                            onChange={(event) =>
                              updateElement(selectedElement.id, (current) => {
                                const strokeWidth = clampNumber(Number(event.target.value), 0);

                                if (current.type === 'line') {
                                  return {
                                    ...current,
                                    style: {
                                      ...current.style,
                                      strokeWidth,
                                    },
                                  };
                                }

                                if (current.type === 'rectangle') {
                                  return {
                                    ...current,
                                    style: {
                                      ...current.style,
                                      strokeWidth,
                                    },
                                  };
                                }

                                return current;
                              })
                            }
                          />
                        </div>
                      ) : null}

                      {selectedElement.type === 'image' ? (
                        <>
                          <div>
                            <Label>Image URL</Label>
                            <Input
                              value={selectedElement.src}
                              placeholder="https://..."
                              onChange={(event) =>
                                updateElement(selectedElement.id, (current) => ({
                                  ...(current as DragDropEditorImageElement),
                                  src: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Alt Text</Label>
                            <Input
                              value={selectedElement.alt ?? ''}
                              onChange={(event) =>
                                updateElement(selectedElement.id, (current) => ({
                                  ...(current as DragDropEditorImageElement),
                                  alt: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sections" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Legacy Section Layout</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <h4 className="font-medium">Select Section Type</h4>
                    {sectionTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => addSection(type.value)}
                      >
                        <span className="mr-2">{type.icon}</span>
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <DragDropContext onDragEnd={handleSectionDragEnd}>
              <Droppable droppableId="template-sections">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                    {normalizedTemplate.sections.map((section, index) => (
                      <Draggable key={section.id} draggableId={section.id} index={index}>
                        {(draggableProvided) => (
                          <Card
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            className={`cursor-pointer transition-colors ${
                              selectedSectionId === section.id ? 'ring-2 ring-blue-500' : ''
                            }`}
                            onClick={() => setSelectedSectionId(section.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div {...draggableProvided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-medium">{section.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {section.type}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={section.visible}
                                    onCheckedChange={(visible) => updateSection(section.id, { visible })}
                                    aria-label={`Toggle ${section.title} visibility`}
                                  />
                                  {section.visible ? (
                                    <Eye className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      deleteSection(section.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {selectedSection ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Section Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Section Title</Label>
                    <Input
                      value={selectedSection.title ?? ''}
                      onChange={(event) =>
                        updateSection(selectedSection.id, { title: event.target.value })
                      }
                    />
                  </div>

                  <ColorField
                    label="Background Color"
                    color={String(selectedSection.style?.backgroundColor ?? '#ffffff')}
                    onChange={(color) => updateSectionStyle(selectedSection.id, { backgroundColor: color })}
                  />

                  <ColorField
                    label="Text Color"
                    color={String(selectedSection.style?.textColor ?? '#000000')}
                    onChange={(color) => updateSectionStyle(selectedSection.id, { textColor: color })}
                  />
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            <h3 className="text-lg font-semibold">Color Scheme</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <ColorField
                label="Primary"
                color={normalizedTemplate.colors.primary}
                onChange={(color) =>
                  updateTemplate((current) => ({
                    ...current,
                    colors: { ...current.colors, primary: color },
                  }))
                }
              />
              <ColorField
                label="Secondary"
                color={normalizedTemplate.colors.secondary}
                onChange={(color) =>
                  updateTemplate((current) => ({
                    ...current,
                    colors: { ...current.colors, secondary: color },
                  }))
                }
              />
              <ColorField
                label="Accent"
                color={normalizedTemplate.colors.accent}
                onChange={(color) =>
                  updateTemplate((current) => ({
                    ...current,
                    colors: { ...current.colors, accent: color },
                  }))
                }
              />
              <ColorField
                label="Background"
                color={normalizedTemplate.colors.background}
                onChange={(color) =>
                  updateTemplate((current) => ({
                    ...current,
                    colors: { ...current.colors, background: color },
                  }))
                }
              />
              <ColorField
                label="Text"
                color={normalizedTemplate.colors.text}
                onChange={(color) =>
                  updateTemplate((current) => ({
                    ...current,
                    colors: { ...current.colors, text: color },
                  }))
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-6">
            <h3 className="text-lg font-semibold">Typography</h3>

            <div className="space-y-4">
              <div>
                <Label>Heading Font</Label>
                <Select
                  value={normalizedTemplate.fonts.heading}
                  onValueChange={(value) =>
                    updateTemplate((current) => ({
                      ...current,
                      fonts: { ...current.fonts, heading: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Body Font</Label>
                <Select
                  value={normalizedTemplate.fonts.body}
                  onValueChange={(value) =>
                    updateTemplate((current) => ({
                      ...current,
                      fonts: { ...current.fonts, body: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {Object.entries(normalizedTemplate.fonts.size).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">{key}</Label>
                    <span className="text-xs text-muted-foreground">{value}px</span>
                  </div>
                  <Slider
                    value={[value]}
                    min={6}
                    max={32}
                    step={1}
                    onValueChange={([nextValue]) =>
                      updateTemplate((current) => ({
                        ...current,
                        fonts: {
                          ...current.fonts,
                          size: {
                            ...current.fonts.size,
                            [key]: nextValue,
                          },
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6">
            <h3 className="text-lg font-semibold">Layout Settings</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(normalizedTemplate.layout.margins).map(([side, value]) => (
                <div key={side}>
                  <Label className="capitalize">{side} Margin</Label>
                  <Input
                    type="number"
                    value={value}
                    onChange={(event) =>
                      updateTemplate((current) => ({
                        ...current,
                        layout: {
                          ...current.layout,
                          margins: {
                            ...current.layout.margins,
                            [side]: clampNumber(Number(event.target.value), 0),
                          },
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Section Spacing</Label>
                <span className="text-xs text-muted-foreground">
                  {normalizedTemplate.layout.spacing}px
                </span>
              </div>
              <Slider
                value={[normalizedTemplate.layout.spacing]}
                min={0}
                max={40}
                step={1}
                onValueChange={([value]) =>
                  updateTemplate((current) => ({
                    ...current,
                    layout: {
                      ...current.layout,
                      spacing: value,
                    },
                  }))
                }
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

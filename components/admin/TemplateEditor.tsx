'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  FilePlus2,
  GripVertical,
  Image as ImageIcon,
  Layers3,
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
import { CertificatePreview, type CertificatePreviewData } from '@/components/CertificatePreview';
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
  createBlankDragDropEditor,
  createDefaultDragDropEditor,
  createEditorElement,
  createEditorPage,
  DEFAULT_TEMPLATE_FONTS,
  getDynamicFieldLabel,
  getDynamicFieldSampleValue,
  normalizeTemplateConfig,
  type CertificateTemplateConfig,
  type CertificateTemplateDynamicFieldKey,
  type DragDropEditorElement,
  type DragDropEditorElementType,
  type DragDropEditorDynamicTextElement,
  type DragDropEditorImageElement,
  type DragDropEditorLineElement,
  type DragDropEditorPage,
  type DragDropEditorRectangleElement,
  type DragDropEditorStaticTextElement,
  type DragDropEditorTextStyle,
  type LegacyTemplateSection,
} from '@/lib/certificate-template-editor';

interface TemplateEditorProps {
  template: CertificateTemplateConfig;
  certificateType?: string;
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
const REPORT_PREVIEW_BASE_WIDTH = 1123;
const REPORT_PREVIEW_BASE_HEIGHT = 794;
const MIN_VIEWPORT_SIZE = 240;

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

function getPageElementPreview(element: DragDropEditorElement) {
  if (element.type === 'static-text') return element.text;
  if (element.type === 'dynamic-text') return getDynamicFieldSampleValue(element.fieldKey);
  if (element.type === 'image') return element.alt || 'Image';
  if (element.type === 'rectangle') return 'Rectangle';
  return 'Line';
}

function toPreviewCertificateType(certificateType?: string): string {
  switch (certificateType) {
    case 'BS5839-1':
      return 'BS5839_1';
    case 'BS5839-6':
      return 'BS5839_6';
    default:
      return certificateType || 'BS5839_1';
  }
}

function getPreviewData(certificateType?: string): CertificatePreviewData {
  const normalizedCertificateType = toPreviewCertificateType(certificateType);

  const commonData: CertificatePreviewData = {
    certificateNumber: 'CERT-2026-001',
    certificateType: normalizedCertificateType,
    siteName: 'Highfield Hall Community Centre',
    siteAddress: 'Marsh Lane, Farnworth, Bolton, BL4 0AW',
    inspectionDate: '2026-04-01',
    nextInspectionDate: '2027-04-01',
    inspectorName: 'Daniel Allport',
    inspectorQualification: 'Certified Fire Safety Engineer',
    inspectionType: 'Periodic Inspection',
    status: 'SATISFACTORY',
    customer: {
      name: 'Acme Property Services Ltd',
      email: 'facilities@acme-property.co.uk',
      phone: '01204 555123',
      address: '1 Market Street',
      postcode: 'BL1 2AB',
      contactPerson: 'Sarah Thompson',
    },
    items: [
      {
        id: 1,
        itemType: 'Smoke Detector',
        location: 'Main Hall',
        description: 'Optical smoke detector',
        status: 'PASS',
      },
      {
        id: 2,
        itemType: 'Manual Call Point',
        location: 'Front Entrance',
        description: 'Break glass unit',
        status: 'PASS',
      },
      {
        id: 3,
        itemType: 'Sounder',
        location: 'Kitchen Corridor',
        description: 'Wall mounted alarm sounder',
        status: 'FAIL',
        defects: 'Sound pressure level below acceptable threshold during alarm test.',
        recommendations: 'Replace sounder and re-test audibility across affected area.',
      },
    ],
  };

  switch (normalizedCertificateType) {
    case 'BS5839_6':
      return {
        ...commonData,
        formData: {
          propertyType: 'House in multiple occupation',
          gradeOfSystem: 'Grade D1 / LD2',
          numberOfSmokeSensors: '6',
          numberOfHeatSensors: '2',
          numberOfCOSensors: '1',
          bedrooms: '5',
        },
      };
    case 'BS5266':
      return {
        ...commonData,
        items: [
          {
            id: 1,
            itemType: 'Emergency Luminaire',
            location: 'Main Exit',
            description: 'Maintained bulkhead fitting',
            status: 'PASS',
          },
          {
            id: 2,
            itemType: 'Emergency Luminaire',
            location: 'Rear Corridor',
            description: 'Non-maintained fitting',
            status: 'PASS',
          },
        ],
        formData: {
          systemType: 'Self-contained emergency lighting',
          numberOfLuminaires: '24',
          batteryBlocks: '4',
          emergencyDuration: '3',
        },
      };
    case 'FIRE_EXTINGUISHER':
      return {
        ...commonData,
        items: [
          {
            id: 1,
            itemType: 'Water Extinguisher',
            location: 'Reception',
            description: '9L water extinguisher',
            status: 'PASS',
          },
          {
            id: 2,
            itemType: 'CO2 Extinguisher',
            location: 'Server Room',
            description: '5kg CO2 extinguisher',
            status: 'PASS',
          },
        ],
        formData: {
          riskCategory: 'Ordinary hazard',
          serviceInterval: 'Annual',
        },
      };
    case 'DRY_RISER':
      return {
        ...commonData,
        items: [
          {
            id: 1,
            itemType: 'Inlet Breeching',
            location: 'Ground Floor',
            description: 'Twin inlet breeching',
            status: 'PASS',
          },
          {
            id: 2,
            itemType: 'Outlet Valve',
            location: 'Level 5 Stair Core',
            description: 'Landing valve set',
            status: 'PASS',
          },
        ],
        formData: {
          buildingHeight: '28m',
          numberOfInlets: '2',
          testPressure: '12 bar',
          testFlow: '1500 l/min',
        },
      };
    case 'CP12':
      return {
        ...commonData,
        items: [
          {
            id: 1,
            itemType: 'Boiler',
            location: 'Kitchen',
            description: 'Wall-mounted condensing boiler',
            status: 'PASS',
          },
        ],
        formData: {
          applianceType: 'Gas boiler',
          applianceLocation: 'Kitchen',
          applianceMakeModel: 'Vaillant ecoTEC Plus',
          flueType: 'Room sealed',
          operatingPressure: '20 mbar',
          safetyDevicesCorrect: 'Yes',
          fluePerformanceSatisfactory: 'Yes',
          applianceSafeToUse: 'Yes',
        },
      };
    case 'EICR':
      return {
        ...commonData,
        items: [
          {
            id: 1,
            itemType: 'Consumer Unit',
            location: 'Ground Floor Cupboard',
            description: '18-way metal consumer unit',
            status: 'PASS',
          },
        ],
        formData: {
          systemType: 'TN-C-S',
        },
      };
    case 'BS5839_1':
    default:
      return {
        ...commonData,
        formData: {
          systemType: 'L2',
          numberOfZones: '8',
          numberOfDevices: '46',
          controlPanelMake: 'Advanced',
          controlPanelModel: 'MxPro 5',
          totalDetectors: '28',
          totalCallPoints: '9',
          totalSounders: '9',
        },
      };
  }
}

export default function TemplateEditor({ template, certificateType, onChange }: TemplateEditorProps) {
  const normalizedTemplate = useMemo(() => normalizeTemplateConfig(template), [template]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('canvas');
  const [realLayoutEditEnabled, setRealLayoutEditEnabled] = useState(true);
  const [selectedRealBlockId, setSelectedRealBlockId] = useState<string | null>(null);
  const [realBlockOffsets, setRealBlockOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const previewMeasureRef = useRef<HTMLDivElement | null>(null);

  const pages = normalizedTemplate.dragDropEditor.pages
    .slice()
    .sort((a, b) => a.order - b.order);

  const activePage =
    pages.find((page) => page.id === normalizedTemplate.dragDropEditor.activePageId) ?? pages[0] ?? null;

  const selectedSection = selectedSectionId
    ? normalizedTemplate.sections.find((section) => section.id === selectedSectionId) ?? null
    : null;

  const activePageElements = normalizedTemplate.dragDropEditor.elements
    .filter((element) => element.pageId === activePage?.id)
    .sort((a, b) => a.zIndex - b.zIndex);

  const selectedElement =
    selectedElementId && activePage
      ? activePageElements.find((element) => element.id === selectedElementId) ?? null
      : null;

  const previewData = useMemo(() => getPreviewData(certificateType), [certificateType]);
  const hasOverlayElements = activePageElements.length > 0;
  const showOverlayElements = !realLayoutEditEnabled && hasOverlayElements;

  const pageViewport = useMemo(() => {
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
  }, [activePage]);

  const previewScale = useMemo(() => {
    if (!activePage) return 1;

    const widthScale = activePage.canvas.width / REPORT_PREVIEW_BASE_WIDTH;
    const heightScale = activePage.canvas.height / REPORT_PREVIEW_BASE_HEIGHT;

    return Math.min(widthScale, heightScale);
  }, [activePage]);

  const renderedPageWidth = REPORT_PREVIEW_BASE_WIDTH * previewScale;
  const renderedPageHeight = REPORT_PREVIEW_BASE_HEIGHT * previewScale;

  const handleRealBlockMove = useCallback((blockId: string, position: { x: number; y: number }) => {
    setRealBlockOffsets((current) => ({
      ...current,
      [blockId]: position,
    }));
  }, []);

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

  const updateDragDropEditor = useCallback(
    (
      updater: (
        current: CertificateTemplateConfig['dragDropEditor']
      ) => CertificateTemplateConfig['dragDropEditor']
    ) => {
      updateTemplate((current) => ({
        ...current,
        dragDropEditor: updater(current.dragDropEditor),
      }));
    },
    [updateTemplate]
  );

  const updateEditorElements = useCallback(
    (elements: DragDropEditorElement[]) => {
      updateDragDropEditor((current) => ({
        ...current,
        elements,
      }));
    },
    [updateDragDropEditor]
  );

  const updatePages = useCallback(
    (
      nextPages: DragDropEditorPage[],
      options?: {
        activePageId?: string;
      }
    ) => {
      updateDragDropEditor((current) => {
        const sortedPages = nextPages
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((page, index) => ({
            ...page,
            order: index,
            name: page.name?.trim() || `Page ${index + 1}`,
          }));

        const fallbackPageId = sortedPages[0]?.id ?? current.activePageId;
        const requestedPageId = options?.activePageId ?? current.activePageId;
        const activePageId =
          sortedPages.find((page) => page.id === requestedPageId)?.id ?? fallbackPageId;

        return {
          ...current,
          pages: sortedPages,
          activePageId,
          elements: current.elements.filter((element) =>
            sortedPages.some((page) => page.id === element.pageId)
          ),
        };
      });
    },
    [updateDragDropEditor]
  );

  const updateActivePage = useCallback(
    (activePageId: string) => {
      updateDragDropEditor((current) => ({
        ...current,
        activePageId,
      }));
      setSelectedElementId(null);
    },
    [updateDragDropEditor]
  );

  const updatePageCanvas = useCallback(
    (
      pageId: string,
      canvasUpdates: Partial<CertificateTemplateConfig['dragDropEditor']['pages'][number]['canvas']>
    ) => {
      updatePages(
        pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                canvas: {
                  ...page.canvas,
                  ...canvasUpdates,
                },
              }
            : page
        ),
        { activePageId: pageId }
      );
    },
    [pages, updatePages]
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
    if (!activePage) return;

    const nextElement = createEditorElement(type, activePageElements.length, {
      pageId: activePage.id,
      colors: normalizedTemplate.colors,
      fonts: normalizedTemplate.fonts,
    });

    updateEditorElements([...normalizedTemplate.dragDropEditor.elements, nextElement]);
    setSelectedElementId(nextElement.id);
  };

  const deleteElement = (elementId: string) => {
    if (!activePage) return;

    const remainingElements = normalizedTemplate.dragDropEditor.elements.filter(
      (element) => element.id !== elementId
    );

    const pageElements = remainingElements
      .filter((element) => element.pageId === activePage.id)
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((element, index) => ({ ...element, zIndex: index + 1 }));

    const otherPages = remainingElements.filter((element) => element.pageId !== activePage.id);

    updateEditorElements([...otherPages, ...pageElements]);

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const duplicateElement = (elementId: string) => {
    if (!activePage) return;

    const element = normalizedTemplate.dragDropEditor.elements.find((item) => item.id === elementId);
    if (!element) return;

    const duplicated = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      x: element.x + 24,
      y: element.y + 24,
      zIndex: activePageElements.length + 1,
    } as DragDropEditorElement;

    updateEditorElements([...normalizedTemplate.dragDropEditor.elements, duplicated]);
    setSelectedElementId(duplicated.id);
  };

  const moveElementLayer = (elementId: string, direction: 'forward' | 'backward') => {
    if (!activePage) return;

    const ordered = [...activePageElements];
    const index = ordered.findIndex((item) => item.id === elementId);
    if (index === -1) return;

    const targetIndex = direction === 'forward' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    const [element] = ordered.splice(index, 1);
    ordered.splice(targetIndex, 0, element);

    const reordered = ordered.map((item, idx) => ({ ...item, zIndex: idx + 1 }));
    const otherPages = normalizedTemplate.dragDropEditor.elements.filter(
      (item) => item.pageId !== activePage.id
    );

    updateEditorElements([...otherPages, ...reordered]);
  };

  const handleClearReport = () => {
    const clearedEditor = createBlankDragDropEditor();

    updateTemplate((current) => ({
      ...current,
      dragDropEditor: {
        ...clearedEditor,
        pages: clearedEditor.pages.map((page, index) =>
          index === 0
            ? {
                ...page,
                canvas: {
                  ...page.canvas,
                  ...current.dragDropEditor.pages[0]?.canvas,
                },
              }
            : page
        ),
      },
    }));

    setSelectedElementId(null);
  };

  const handleRestoreOriginalDesign = () => {
    const defaultEditor = createDefaultDragDropEditor();

    updateTemplate((current) => ({
      ...current,
      dragDropEditor: {
        ...defaultEditor,
        pages: defaultEditor.pages.map((page, index) =>
          index === 0
            ? {
                ...page,
                canvas: {
                  ...page.canvas,
                  ...current.dragDropEditor.pages[0]?.canvas,
                },
              }
            : page
        ),
      },
    }));

    setSelectedElementId(null);
  };

  const handleAddPage = () => {
    const nextPage = createEditorPage(pages.length, activePage?.canvas, {
      id: `page-${Date.now()}`,
      name: `Page ${pages.length + 1}`,
    });

    updatePages([...pages, nextPage], { activePageId: nextPage.id });
    setSelectedElementId(null);
  };

  const handleRemovePage = (pageId: string) => {
    if (pages.length <= 1) return;

    const pageIndex = pages.findIndex((page) => page.id === pageId);
    const nextPages = pages.filter((page) => page.id !== pageId);
    const nextActivePage =
      nextPages[Math.max(0, Math.min(pageIndex - 1, nextPages.length - 1))] ?? nextPages[0];

    updateDragDropEditor((current) => ({
      ...current,
      pages: nextPages.map((page, index) => ({
        ...page,
        order: index,
        name: page.name?.trim() || `Page ${index + 1}`,
      })),
      activePageId: nextActivePage.id,
      elements: current.elements.filter((element) => element.pageId !== pageId),
    }));

    setSelectedElementId(null);
  };

  const renderTextElement = (
    element: DragDropEditorStaticTextElement | DragDropEditorDynamicTextElement,
    isSelected: boolean,
    snapToGrid: boolean,
    gridSize: number
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
        dragBoundFunc={(position) =>
          snapToGrid
            ? {
                x: Math.round(position.x / gridSize) * gridSize,
                y: Math.round(position.y / gridSize) * gridSize,
              }
            : position
        }
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
    isSelected: boolean,
    snapToGrid: boolean,
    gridSize: number
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
      dragBoundFunc={(position) =>
        snapToGrid
          ? {
              x: Math.round(position.x / gridSize) * gridSize,
              y: Math.round(position.y / gridSize) * gridSize,
            }
          : position
      }
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

  const renderLineElement = (
    element: DragDropEditorLineElement,
    isSelected: boolean,
    snapToGrid: boolean,
    gridSize: number
  ) => (
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
      dragBoundFunc={(position) =>
        snapToGrid
          ? {
              x: Math.round(position.x / gridSize) * gridSize,
              y: Math.round(position.y / gridSize) * gridSize,
            }
          : position
      }
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

  const renderImageElement = (
    element: DragDropEditorImageElement,
    isSelected: boolean,
    snapToGrid: boolean,
    gridSize: number
  ) => (
    <Group
      key={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation ?? 0}
      opacity={element.opacity ?? 1}
      draggable={!element.locked}
      dragBoundFunc={(position) =>
        snapToGrid
          ? {
              x: Math.round(position.x / gridSize) * gridSize,
              y: Math.round(position.y / gridSize) * gridSize,
            }
          : position
      }
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
            <div className="grid gap-4 xl:grid-cols-[140px_minmax(0,1fr)]">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Pages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-3">
                  {pages.map((page, index) => {
                    const pageElements = normalizedTemplate.dragDropEditor.elements
                      .filter((element) => element.pageId === page.id)
                      .sort((a, b) => a.zIndex - b.zIndex);
                    const isActive = page.id === activePage?.id;
                    const previewText = pageElements.slice(0, 3).map(getPageElementPreview);

                    return (
                      <div
                        key={page.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => updateActivePage(page.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            updateActivePage(page.id);
                          }
                        }}
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          isActive ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-700">
                              {page.name || `Page ${index + 1}`}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {pageElements.length} items
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-red-600"
                            disabled={pages.length <= 1}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemovePage(page.id);
                            }}
                            title="Remove page"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="rounded-md border bg-white p-2 shadow-sm">
                          <div
                            className="mx-auto flex w-20 flex-col justify-start gap-1 rounded-sm border bg-white p-2"
                            style={{
                              aspectRatio: `${page.canvas.width} / ${page.canvas.height}`,
                            }}
                          >
                            {previewText.length > 0 ? (
                              previewText.map((text, previewIndex) => (
                                <div
                                  key={`${page.id}-preview-${previewIndex}`}
                                  className={`rounded-sm bg-slate-200 ${
                                    previewIndex === 0 ? 'h-2.5 w-full' : 'h-2 w-4/5'
                                  }`}
                                  title={text}
                                />
                              ))
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                                Blank page
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-4">
                  {activePage ? (
                    <>
                      <div className="rounded-lg border bg-white">
                        <div className="space-y-4 border-b px-4 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold">Drag & Drop Layout Editor</h3>
                              <p className="text-sm text-muted-foreground">
                                Real layout editing mode treats the report preview as the source of truth. The old synthetic overlay items are disabled because they are not the actual PDF layout.
                              </p>
                            </div>
                            <Badge variant="secondary" className="px-3 py-1 text-xs uppercase tracking-wide">
                              Layout editing mode
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                              <Switch checked={realLayoutEditEnabled} onCheckedChange={setRealLayoutEditEnabled} />
                              <Label>Real layout mode</Label>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleAddPage}>
                              <FilePlus2 className="mr-2 h-4 w-4" />
                              Add Page
                            </Button>
                            {!realLayoutEditEnabled ? (
                              <>
                                <Button variant="outline" size="sm" onClick={handleClearReport}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Clear Overlays
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleRestoreOriginalDesign}>
                                  <Layers3 className="mr-2 h-4 w-4" />
                                  Restore Overlay Preset
                                </Button>
                                <div className="mx-1 hidden h-7 w-px bg-slate-200 md:block" />
                                <Button variant="outline" size="sm" onClick={() => addElement('static-text')} disabled={!activePage}>
                                  <Type className="mr-2 h-4 w-4" />
                                  Text
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => addElement('dynamic-text')} disabled={!activePage}>
                                  <Move className="mr-2 h-4 w-4" />
                                  Dynamic Field
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => addElement('rectangle')} disabled={!activePage}>
                                  <RectangleHorizontal className="mr-2 h-4 w-4" />
                                  Rectangle
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => addElement('line')} disabled={!activePage}>
                                  <Minus className="mr-2 h-4 w-4" />
                                  Line
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => addElement('image')} disabled={!activePage}>
                                  <ImageIcon className="mr-2 h-4 w-4" />
                                  Image
                                </Button>
                              </>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-medium text-slate-700">Toolbar</span>
                            {realLayoutEditEnabled ? (
                              <>
                                <span>The actual report is shown as the editing target.</span>
                                <span>The old overlay system is intentionally hidden because those items are not the real PDF elements.</span>
                              </>
                            ) : (
                              <>
                                <span>The report itself is the base canvas.</span>
                                <span>Overlay items shown in this mode are legacy synthetic elements only.</span>
                              </>
                            )}
                            <span>Canvas Surround only changes the editor area around the report.</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
                          <div>
                            <h4 className="text-sm font-semibold">{activePage.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Page {activePage.order + 1} of {pages.length}
                            </p>
                          </div>
                          <div className="w-full max-w-48">
                            <Label>Page Name</Label>
                            <Input
                              value={activePage.name}
                              onChange={(event) =>
                                updatePages(
                                  pages.map((page) =>
                                    page.id === activePage.id
                                      ? { ...page, name: event.target.value }
                                      : page
                                  ),
                                  { activePageId: activePage.id }
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 px-4 py-3 md:grid-cols-3 xl:grid-cols-6">
                          <div>
                            <Label>Width</Label>
                            <Input
                              type="number"
                              value={activePage.canvas.width}
                              onChange={(event) =>
                                updatePageCanvas(activePage.id, {
                                  width: clampNumber(Number(event.target.value), 100),
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Height</Label>
                            <Input
                              type="number"
                              value={activePage.canvas.height}
                              onChange={(event) =>
                                updatePageCanvas(activePage.id, {
                                  height: clampNumber(Number(event.target.value), 100),
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Grid Size</Label>
                            <Input
                              type="number"
                              value={activePage.canvas.gridSize}
                              onChange={(event) =>
                                updatePageCanvas(activePage.id, {
                                  gridSize: clampNumber(Number(event.target.value), 2),
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Padding</Label>
                            <Input
                              type="number"
                              value={activePage.canvas.pagePadding}
                              onChange={(event) =>
                                updatePageCanvas(activePage.id, {
                                  pagePadding: clampNumber(Number(event.target.value), 0),
                                })
                              }
                            />
                          </div>
                          <div>
                            <ColorField
                              label="Canvas Surround"
                              color={activePage.canvas.backgroundColor}
                              onChange={(color) => updatePageCanvas(activePage.id, { backgroundColor: color })}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 border-t px-4 py-3 md:grid-cols-3 xl:grid-cols-6">
                            <div>
                              <Label>Viewport Width</Label>
                              <Input
                                type="number"
                                value={activePage.canvas.viewportWidth}
                                onChange={(event) =>
                                  updatePageCanvas(activePage.id, {
                                    viewportWidth: clampNumber(Number(event.target.value), MIN_VIEWPORT_SIZE),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label>Viewport Height</Label>
                              <Input
                                type="number"
                                value={activePage.canvas.viewportHeight}
                                onChange={(event) =>
                                  updatePageCanvas(activePage.id, {
                                    viewportHeight: clampNumber(Number(event.target.value), MIN_VIEWPORT_SIZE),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label>Zoom (%)</Label>
                              <Input
                                type="number"
                                value={Math.round(activePage.canvas.zoom * 100)}
                                onChange={(event) =>
                                  updatePageCanvas(activePage.id, {
                                    zoom: Math.max((Number(event.target.value) || 100) / 100, 0.1),
                                  })
                                }
                              />
                            </div>
                          </div>

                        <div className="flex flex-wrap gap-6 border-t px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={activePage.canvas.showGrid}
                              onCheckedChange={(checked) => updatePageCanvas(activePage.id, { showGrid: checked })}
                            />
                            <Label>Show Grid</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={activePage.canvas.snapToGrid}
                              onCheckedChange={(checked) => updatePageCanvas(activePage.id, { snapToGrid: checked })}
                            />
                            <Label>Snap To Grid</Label>
                          </div>
                        </div>
                      </div>

                        <div className="overflow-auto rounded-lg border bg-slate-100 p-4">
                          <div
                            className="relative overflow-auto rounded border border-slate-300 bg-white shadow-sm"
                            style={{
                              width: pageViewport.width,
                              height: pageViewport.height,
                              backgroundColor: activePage.canvas.backgroundColor,
                            }}
                          >
                            <div
                              className="relative"
                              style={{
                                width: renderedPageWidth * pageViewport.scale,
                                height: renderedPageHeight * pageViewport.scale,
                              }}
                            >
                              <div
                                ref={previewMeasureRef}
                                className="absolute left-0 top-0 overflow-visible"
                                style={{
                                  width: renderedPageWidth,
                                  height: renderedPageHeight,
                                  pointerEvents: realLayoutEditEnabled ? 'auto' : 'none',
                                }}
                              >
                                <div
                                  className="origin-top-left"
                                  style={{
                                    width: REPORT_PREVIEW_BASE_WIDTH,
                                    minHeight: REPORT_PREVIEW_BASE_HEIGHT,
                                    transform: `scale(${previewScale})`,
                                    transformOrigin: 'top left',
                                  }}
                                >
                                  <CertificatePreview
                                    data={previewData}
                                    className="h-full w-full"
                                    layoutEditMode={realLayoutEditEnabled}
                                    selectedBlockId={selectedRealBlockId}
                                    blockPositions={realBlockOffsets}
                                    onSelectBlock={setSelectedRealBlockId}
                                    onMoveBlock={handleRealBlockMove}
                                  />
                                </div>
                              </div>

                              <Stage
                                width={renderedPageWidth}
                                height={renderedPageHeight}
                                onMouseDown={(event) => {
                                  if (event.target === event.target.getStage()) {
                                    setSelectedElementId(null);
                                  }
                                }}
                                className="absolute left-0 top-0"
                              >
                                <Layer>
                                  {activePage.canvas.showGrid
                                    ? Array.from(
                                        {
                                          length:
                                            Math.floor(renderedPageWidth / activePage.canvas.gridSize) + 1,
                                        },
                                        (_, index) => (
                                          <KonvaLine
                                            key={`grid-v-${index}`}
                                            points={[
                                              index * activePage.canvas.gridSize,
                                              0,
                                              index * activePage.canvas.gridSize,
                                              renderedPageHeight,
                                            ]}
                                            stroke="#e2e8f0"
                                            strokeWidth={1}
                                            listening={false}
                                          />
                                        )
                                      )
                                    : null}

                                  {activePage.canvas.showGrid
                                    ? Array.from(
                                        {
                                          length:
                                            Math.floor(renderedPageHeight / activePage.canvas.gridSize) + 1,
                                        },
                                        (_, index) => (
                                          <KonvaLine
                                            key={`grid-h-${index}`}
                                            points={[
                                              0,
                                              index * activePage.canvas.gridSize,
                                              renderedPageWidth,
                                              index * activePage.canvas.gridSize,
                                            ]}
                                            stroke="#e2e8f0"
                                            strokeWidth={1}
                                            listening={false}
                                          />
                                        )
                                      )
                                    : null}

                                  {showOverlayElements && activePageElements.map((element) => {
                                    const isSelected = element.id === selectedElementId;

                                    if (element.visible === false) {
                                      return null;
                                    }

                                    if (element.type === 'static-text' || element.type === 'dynamic-text') {
                                      return renderTextElement(
                                        element,
                                        isSelected,
                                        activePage.canvas.snapToGrid,
                                        activePage.canvas.gridSize
                                      );
                                    }

                                    if (element.type === 'rectangle') {
                                      return renderRectangleElement(
                                        element,
                                        isSelected,
                                        activePage.canvas.snapToGrid,
                                        activePage.canvas.gridSize
                                      );
                                    }

                                    if (element.type === 'line') {
                                      return renderLineElement(
                                        element,
                                        isSelected,
                                        activePage.canvas.snapToGrid,
                                        activePage.canvas.gridSize
                                      );
                                    }

                                    return renderImageElement(
                                      element,
                                      isSelected,
                                      activePage.canvas.snapToGrid,
                                      activePage.canvas.gridSize
                                    );
                                  })}
                                </Layer>
                              </Stage>
                            </div>
                          </div>
                        </div>
                    </>
                  ) : (
                    <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
                      No page available.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4 xl:col-start-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Canvas Elements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {realLayoutEditEnabled ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Real layout mode is active. Click a real report section to select it, then drag it in the preview. This is a first-pass editor for actual report blocks rather than the old synthetic overlay layer.
                        </p>
                        {selectedRealBlockId ? (
                          <p className="text-xs text-muted-foreground">
                            Selected block: <span className="font-medium text-slate-700">{selectedRealBlockId}</span>
                            {realBlockOffsets[selectedRealBlockId]
                              ? ` · offset x:${Math.round(realBlockOffsets[selectedRealBlockId].x)} y:${Math.round(realBlockOffsets[selectedRealBlockId].y)}`
                              : ' · offset x:0 y:0'}
                          </p>
                        ) : null}
                      </div>
                    ) : activePageElements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        The canvas is currently showing only the report itself with no extra overlay elements.
                      </p>
                    ) : (
                      activePageElements
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
                                    <p className="truncate text-sm font-medium">{getElementLabel(element)}</p>
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

                    {!realLayoutEditEnabled && selectedElement ? (
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

                        {selectedTextElement && (
                          <>
                            {selectedTextElement.type === 'static-text' ? (
                              <div>
                                <Label>Text</Label>
                                <Textarea
                                  rows={3}
                                  value={selectedTextElement.text}
                                  onChange={(event) =>
                                    updateElement(selectedTextElement.id, (current) => ({
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
                                    value={selectedTextElement.fieldKey}
                                    onValueChange={(value) =>
                                      updateElement(selectedTextElement.id, (current) => ({
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
                                    value={selectedTextElement.label ?? ''}
                                    onChange={(event) =>
                                      updateElement(selectedTextElement.id, (current) => ({
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
                                  {selectedTextElement.style.fontSize}px
                                </span>
                              </div>
                              <Slider
                                value={[selectedTextElement.style.fontSize]}
                                onValueChange={([value]) => updateTextStyle(selectedTextElement.id, { fontSize: value })}
                                min={8}
                                max={60}
                                step={1}
                              />
                            </div>

                            <div>
                              <Label>Font Family</Label>
                              <Select
                                value={selectedTextElement.style.fontFamily}
                                onValueChange={(value) => updateTextStyle(selectedTextElement.id, { fontFamily: value })}
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
                                  value={selectedTextElement.style.fontWeight}
                                  onValueChange={(value) =>
                                    updateTextStyle(selectedTextElement.id, {
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
                                  value={selectedTextElement.style.fontStyle}
                                  onValueChange={(value) =>
                                    updateTextStyle(selectedTextElement.id, {
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
                                value={selectedTextElement.style.textAlign}
                                onValueChange={(value) =>
                                  updateTextStyle(selectedTextElement.id, {
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
                              color={selectedTextElement.style.color}
                              onChange={(color) => updateTextStyle(selectedTextElement.id, { color })}
                            />
                          </>
                        )}

                        {selectedRectangleElement ? (
                          <>
                            <ColorField
                              label="Fill"
                              color={selectedRectangleElement.style.fill}
                              onChange={(color) =>
                                updateElement(selectedRectangleElement.id, (current) => ({
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
                              color={selectedRectangleElement.style.stroke}
                              onChange={(color) =>
                                updateElement(selectedRectangleElement.id, (current) => ({
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

                        {selectedLineOrRectangleElement ? (
                          <div>
                            <Label>Stroke Width</Label>
                            <Input
                              type="number"
                              value={selectedLineOrRectangleElement.style.strokeWidth ?? 1}
                              onChange={(event) =>
                                updateElement(selectedLineOrRectangleElement.id, (current) => {
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

                        {selectedImageElement ? (
                          <>
                            <div>
                              <Label>Image URL</Label>
                              <Input
                                value={selectedImageElement.src}
                                placeholder="https://..."
                                onChange={(event) =>
                                  updateElement(selectedImageElement.id, (current) => ({
                                    ...(current as DragDropEditorImageElement),
                                    src: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label>Alt Text</Label>
                              <Input
                                value={selectedImageElement.alt ?? ''}
                                onChange={(event) =>
                                  updateElement(selectedImageElement.id, (current) => ({
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

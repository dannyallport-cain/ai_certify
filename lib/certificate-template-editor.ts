export const CERTIFICATE_TEMPLATE_DYNAMIC_FIELDS = [
  'customer.name',
  'certificateNumber',
  'siteName',
  'siteAddress',
  'inspectionDate',
  'nextInspectionDate',
  'inspectorName',
  'status',
] as const;

export type CertificateTemplateDynamicFieldKey =
  (typeof CERTIFICATE_TEMPLATE_DYNAMIC_FIELDS)[number];

export type DragDropEditorElementType =
  | 'dynamic-text'
  | 'static-text'
  | 'rectangle'
  | 'line'
  | 'image';

export type DragDropEditorTextAlign = 'left' | 'center' | 'right';
export type DragDropEditorFontStyle = 'normal' | 'italic';
export type DragDropEditorFontWeight = 'normal' | 'bold';
export type DragDropEditorImageFit = 'contain' | 'cover' | 'stretch';

export interface LegacyTemplateSection {
  id: string;
  type: string;
  title?: string;
  label?: string;
  order: number;
  visible: boolean;
  config?: Record<string, unknown>;
  style?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LegacyTemplateColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface LegacyTemplateFonts {
  heading: string;
  body: string;
  size: {
    small: number;
    medium: number;
    large: number;
  };
}

export interface LegacyTemplateLayout {
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  spacing: number;
}

export interface DragDropEditorCanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  pagePadding: number;
}

interface DragDropEditorElementBase {
  id: string;
  type: DragDropEditorElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
}

export interface DragDropEditorTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: DragDropEditorFontWeight;
  fontStyle: DragDropEditorFontStyle;
  textAlign: DragDropEditorTextAlign;
  color: string;
  lineHeight: number;
  letterSpacing: number;
  textDecoration?: 'none' | 'underline';
}

export interface DragDropEditorStrokeStyle {
  stroke: string;
  strokeWidth: number;
  dash?: number[];
}

export interface DragDropEditorFillStyle {
  fill: string;
}

export interface DragDropEditorStaticTextElement extends DragDropEditorElementBase {
  type: 'static-text';
  text: string;
  style: DragDropEditorTextStyle;
}

export interface DragDropEditorDynamicTextElement extends DragDropEditorElementBase {
  type: 'dynamic-text';
  fieldKey: CertificateTemplateDynamicFieldKey;
  placeholder?: string;
  label?: string;
  style: DragDropEditorTextStyle;
}

export interface DragDropEditorRectangleElement extends DragDropEditorElementBase {
  type: 'rectangle';
  cornerRadius?: number;
  style: DragDropEditorStrokeStyle & DragDropEditorFillStyle;
}

export interface DragDropEditorLineElement extends DragDropEditorElementBase {
  type: 'line';
  points: [number, number, number, number];
  style: DragDropEditorStrokeStyle;
}

export interface DragDropEditorImageElement extends DragDropEditorElementBase {
  type: 'image';
  src: string;
  alt?: string;
  fit?: DragDropEditorImageFit;
  style?: {
    borderRadius?: number;
  };
}

export type DragDropEditorElement =
  | DragDropEditorStaticTextElement
  | DragDropEditorDynamicTextElement
  | DragDropEditorRectangleElement
  | DragDropEditorLineElement
  | DragDropEditorImageElement;

export interface DragDropEditorConfig {
  version: 1;
  canvas: DragDropEditorCanvasSettings;
  elements: DragDropEditorElement[];
}

export interface CertificateTemplateConfig {
  sections: LegacyTemplateSection[];
  colors: LegacyTemplateColors;
  fonts: LegacyTemplateFonts;
  layout: LegacyTemplateLayout;
  dragDropEditor: DragDropEditorConfig;
  [key: string]: unknown;
}

export const DEFAULT_TEMPLATE_COLORS: LegacyTemplateColors = {
  primary: '#344970',
  secondary: '#6c757d',
  accent: '#ffc107',
  background: '#ffffff',
  text: '#000000',
};

export const DEFAULT_TEMPLATE_FONTS: LegacyTemplateFonts = {
  heading: 'Helvetica',
  body: 'Helvetica',
  size: {
    small: 8,
    medium: 10,
    large: 14,
  },
};

export const DEFAULT_TEMPLATE_LAYOUT: LegacyTemplateLayout = {
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
  spacing: 15,
};

export const DEFAULT_TEMPLATE_SECTIONS: LegacyTemplateSection[] = [
  {
    id: 'header',
    type: 'header',
    title: 'Company Header',
    order: 1,
    visible: true,
    style: {
      backgroundColor: '#344970',
      textColor: '#ffffff',
      fontSize: 14,
      padding: 20,
      margin: 0,
    },
  },
  {
    id: 'certificate-title',
    type: 'title',
    title: 'Certificate Title',
    order: 2,
    visible: true,
    style: {
      backgroundColor: '#f8f9fa',
      textColor: '#000000',
      fontSize: 18,
      padding: 15,
      margin: 10,
    },
  },
  {
    id: 'certificate-number',
    type: 'certificate-number',
    title: 'Certificate Number',
    order: 3,
    visible: true,
    style: {
      backgroundColor: '#ffc107',
      textColor: '#000000',
      fontSize: 12,
      padding: 10,
      margin: 5,
    },
  },
  {
    id: 'site-details',
    type: 'data-table',
    title: 'Site Details',
    order: 4,
    visible: true,
    style: {
      backgroundColor: '#f8f9fa',
      textColor: '#000000',
      fontSize: 10,
      padding: 15,
      margin: 5,
    },
  },
  {
    id: 'inspection-details',
    type: 'data-table',
    title: 'Inspection Details',
    order: 5,
    visible: true,
    style: {
      backgroundColor: '#f8f9fa',
      textColor: '#000000',
      fontSize: 10,
      padding: 15,
      margin: 5,
    },
  },
  {
    id: 'items-table',
    type: 'items-table',
    title: 'Items Tested',
    order: 6,
    visible: true,
    style: {
      backgroundColor: '#f8f9fa',
      textColor: '#000000',
      fontSize: 9,
      padding: 15,
      margin: 5,
    },
  },
  {
    id: 'defects',
    type: 'defects',
    title: 'Defects and Recommendations',
    order: 7,
    visible: true,
    style: {
      backgroundColor: '#fff5f5',
      textColor: '#000000',
      fontSize: 10,
      padding: 15,
      margin: 5,
    },
  },
  {
    id: 'certification',
    type: 'certification',
    title: 'Certification Statement',
    order: 8,
    visible: true,
    style: {
      backgroundColor: '#f0f8ff',
      textColor: '#000000',
      fontSize: 10,
      padding: 15,
      margin: 5,
    },
  },
  {
    id: 'signatures',
    type: 'signatures',
    title: 'Signatures',
    order: 9,
    visible: true,
    style: {
      backgroundColor: '#f8f9fa',
      textColor: '#000000',
      fontSize: 10,
      padding: 15,
      margin: 10,
    },
  },
];

export const DEFAULT_DRAG_DROP_CANVAS: DragDropEditorCanvasSettings = {
  width: 1123,
  height: 794,
  backgroundColor: '#ffffff',
  snapToGrid: true,
  gridSize: 16,
  showGrid: true,
  pagePadding: 24,
};

const createBaseTextStyle = (
  overrides?: Partial<DragDropEditorTextStyle>
): DragDropEditorTextStyle => ({
  fontFamily: DEFAULT_TEMPLATE_FONTS.heading,
  fontSize: DEFAULT_TEMPLATE_FONTS.size.medium,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  color: DEFAULT_TEMPLATE_COLORS.text,
  lineHeight: 1.2,
  letterSpacing: 0,
  textDecoration: 'none',
  ...overrides,
});

export function createDefaultDragDropEditor(): DragDropEditorConfig {
  return {
    version: 1,
    canvas: { ...DEFAULT_DRAG_DROP_CANVAS },
    elements: [
      {
        id: 'el-title',
        type: 'static-text',
        x: 120,
        y: 80,
        width: 880,
        height: 48,
        rotation: 0,
        opacity: 1,
        zIndex: 1,
        visible: true,
        text: 'CERTIFICATE OF INSPECTION',
        style: createBaseTextStyle({
          fontSize: 30,
          fontWeight: 'bold',
          textAlign: 'center',
          color: DEFAULT_TEMPLATE_COLORS.primary,
        }),
      },
      {
        id: 'el-certificate-number',
        type: 'dynamic-text',
        x: 120,
        y: 160,
        width: 360,
        height: 24,
        rotation: 0,
        opacity: 1,
        zIndex: 2,
        visible: true,
        fieldKey: 'certificateNumber',
        label: 'Certificate Number',
        placeholder: 'CERT-000123',
        style: createBaseTextStyle({
          fontSize: 18,
          fontWeight: 'bold',
          color: DEFAULT_TEMPLATE_COLORS.text,
        }),
      },
      {
        id: 'el-customer-name',
        type: 'dynamic-text',
        x: 120,
        y: 220,
        width: 420,
        height: 24,
        rotation: 0,
        opacity: 1,
        zIndex: 3,
        visible: true,
        fieldKey: 'customer.name',
        label: 'Customer Name',
        placeholder: 'Customer Name',
        style: createBaseTextStyle({
          fontSize: 22,
          fontWeight: 'bold',
        }),
      },
      {
        id: 'el-site-address',
        type: 'dynamic-text',
        x: 120,
        y: 255,
        width: 480,
        height: 48,
        rotation: 0,
        opacity: 1,
        zIndex: 4,
        visible: true,
        fieldKey: 'siteAddress',
        label: 'Site Address',
        placeholder: 'Site Address',
        style: createBaseTextStyle({
          fontSize: 16,
        }),
      },
      {
        id: 'el-inspection-date',
        type: 'dynamic-text',
        x: 120,
        y: 340,
        width: 260,
        height: 24,
        rotation: 0,
        opacity: 1,
        zIndex: 5,
        visible: true,
        fieldKey: 'inspectionDate',
        label: 'Inspection Date',
        placeholder: '01/04/2026',
        style: createBaseTextStyle({
          fontSize: 16,
        }),
      },
      {
        id: 'el-next-inspection-date',
        type: 'dynamic-text',
        x: 420,
        y: 340,
        width: 260,
        height: 24,
        rotation: 0,
        opacity: 1,
        zIndex: 6,
        visible: true,
        fieldKey: 'nextInspectionDate',
        label: 'Next Inspection Date',
        placeholder: '01/04/2027',
        style: createBaseTextStyle({
          fontSize: 16,
        }),
      },
      {
        id: 'el-status-box',
        type: 'rectangle',
        x: 760,
        y: 150,
        width: 220,
        height: 120,
        rotation: 0,
        opacity: 1,
        zIndex: 7,
        visible: true,
        cornerRadius: 8,
        style: {
          fill: '#f8fafc',
          stroke: DEFAULT_TEMPLATE_COLORS.primary,
          strokeWidth: 2,
        },
      },
      {
        id: 'el-status-label',
        type: 'static-text',
        x: 790,
        y: 178,
        width: 160,
        height: 24,
        rotation: 0,
        opacity: 1,
        zIndex: 8,
        visible: true,
        text: 'STATUS',
        style: createBaseTextStyle({
          fontSize: 14,
          fontWeight: 'bold',
          textAlign: 'center',
          color: DEFAULT_TEMPLATE_COLORS.primary,
        }),
      },
      {
        id: 'el-status-value',
        type: 'dynamic-text',
        x: 790,
        y: 214,
        width: 160,
        height: 32,
        rotation: 0,
        opacity: 1,
        zIndex: 9,
        visible: true,
        fieldKey: 'status',
        label: 'Status',
        placeholder: 'Satisfactory',
        style: createBaseTextStyle({
          fontSize: 24,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#15803d',
        }),
      },
      {
        id: 'el-divider',
        type: 'line',
        x: 120,
        y: 400,
        width: 860,
        height: 0,
        rotation: 0,
        opacity: 1,
        zIndex: 10,
        visible: true,
        points: [0, 0, 860, 0],
        style: {
          stroke: DEFAULT_TEMPLATE_COLORS.secondary,
          strokeWidth: 1,
          dash: [8, 4],
        },
      },
      {
        id: 'el-inspector-name',
        type: 'dynamic-text',
        x: 120,
        y: 450,
        width: 320,
        height: 24,
        rotation: 0,
        opacity: 1,
        zIndex: 11,
        visible: true,
        fieldKey: 'inspectorName',
        label: 'Inspector Name',
        placeholder: 'Inspector Name',
        style: createBaseTextStyle({
          fontSize: 16,
        }),
      },
    ],
  };
}

export function createDefaultTemplateConfig(): CertificateTemplateConfig {
  return {
    sections: DEFAULT_TEMPLATE_SECTIONS.map((section) => ({ ...section })),
    colors: { ...DEFAULT_TEMPLATE_COLORS },
    fonts: {
      ...DEFAULT_TEMPLATE_FONTS,
      size: { ...DEFAULT_TEMPLATE_FONTS.size },
    },
    layout: {
      ...DEFAULT_TEMPLATE_LAYOUT,
      margins: { ...DEFAULT_TEMPLATE_LAYOUT.margins },
    },
    dragDropEditor: createDefaultDragDropEditor(),
  };
}

function sanitizeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function normalizeTemplateConfig(
  template: Partial<CertificateTemplateConfig> | null | undefined
): CertificateTemplateConfig {
  const base = createDefaultTemplateConfig();
  const incoming = template ?? {};

  return {
    ...incoming,
    sections: Array.isArray(incoming.sections) ? incoming.sections : base.sections,
    colors: {
      ...base.colors,
      ...(incoming.colors ?? {}),
    },
    fonts: {
      ...base.fonts,
      ...(incoming.fonts ?? {}),
      size: {
        ...base.fonts.size,
        ...(incoming.fonts?.size ?? {}),
      },
    },
    layout: {
      ...base.layout,
      ...(incoming.layout ?? {}),
      margins: {
        ...base.layout.margins,
        ...(incoming.layout?.margins ?? {}),
      },
    },
    dragDropEditor: normalizeDragDropEditor(incoming.dragDropEditor, {
      colors: {
        ...base.colors,
        ...(incoming.colors ?? {}),
      },
      fonts: {
        ...base.fonts,
        ...(incoming.fonts ?? {}),
        size: {
          ...base.fonts.size,
          ...(incoming.fonts?.size ?? {}),
        },
      },
    }),
  };
}

export function normalizeDragDropEditor(
  editor: Partial<DragDropEditorConfig> | null | undefined,
  options?: {
    colors?: Partial<LegacyTemplateColors>;
    fonts?: Partial<LegacyTemplateFonts>;
  }
): DragDropEditorConfig {
  const defaults = createDefaultDragDropEditor();
  const colors = {
    ...DEFAULT_TEMPLATE_COLORS,
    ...(options?.colors ?? {}),
  };
  const fonts = {
    ...DEFAULT_TEMPLATE_FONTS,
    ...(options?.fonts ?? {}),
    size: {
      ...DEFAULT_TEMPLATE_FONTS.size,
      ...(options?.fonts?.size ?? {}),
    },
  };

  const incoming = editor ?? {};

  const elements = Array.isArray(incoming.elements)
    ? incoming.elements.map((element, index) => normalizeElement(element, index, colors, fonts))
    : defaults.elements;

  return {
    version: 1,
    canvas: {
      ...defaults.canvas,
      ...(incoming.canvas ?? {}),
      width: sanitizeNumber(incoming.canvas?.width, defaults.canvas.width),
      height: sanitizeNumber(incoming.canvas?.height, defaults.canvas.height),
      backgroundColor: sanitizeString(
        incoming.canvas?.backgroundColor,
        defaults.canvas.backgroundColor
      ),
      gridSize: sanitizeNumber(incoming.canvas?.gridSize, defaults.canvas.gridSize),
      pagePadding: sanitizeNumber(
        incoming.canvas?.pagePadding,
        defaults.canvas.pagePadding
      ),
      snapToGrid:
        typeof incoming.canvas?.snapToGrid === 'boolean'
          ? incoming.canvas.snapToGrid
          : defaults.canvas.snapToGrid,
      showGrid:
        typeof incoming.canvas?.showGrid === 'boolean'
          ? incoming.canvas.showGrid
          : defaults.canvas.showGrid,
    },
    elements,
  };
}

function normalizeElement(
  element: Partial<DragDropEditorElement>,
  index: number,
  colors: LegacyTemplateColors,
  fonts: LegacyTemplateFonts
): DragDropEditorElement {
  const baseElement = {
    id: sanitizeString(element.id, `element-${index + 1}`),
    x: sanitizeNumber(element.x, 0),
    y: sanitizeNumber(element.y, 0),
    width: sanitizeNumber(element.width, 200),
    height: sanitizeNumber(element.height, 40),
    rotation: sanitizeNumber(element.rotation, 0),
    opacity: sanitizeNumber(element.opacity, 1),
    zIndex: sanitizeNumber(element.zIndex, index + 1),
    visible: typeof element.visible === 'boolean' ? element.visible : true,
    locked: typeof element.locked === 'boolean' ? element.locked : false,
  };

  switch (element.type) {
    case 'dynamic-text': {
      const dynamicTextElement = element as Partial<DragDropEditorDynamicTextElement>;

      return {
        ...baseElement,
        type: 'dynamic-text',
        fieldKey: CERTIFICATE_TEMPLATE_DYNAMIC_FIELDS.includes(
          dynamicTextElement.fieldKey as CertificateTemplateDynamicFieldKey
        )
          ? (dynamicTextElement.fieldKey as CertificateTemplateDynamicFieldKey)
          : 'certificateNumber',
        label: sanitizeString(dynamicTextElement.label, 'Dynamic Field'),
        placeholder: sanitizeString(dynamicTextElement.placeholder, 'Dynamic Value'),
        style: normalizeTextStyle(dynamicTextElement.style, colors, fonts),
      };
    }
    case 'rectangle':
      return {
        ...baseElement,
        type: 'rectangle',
        cornerRadius: sanitizeNumber(element.cornerRadius, 0),
        style: {
          fill: sanitizeString(
            (element as DragDropEditorRectangleElement).style?.fill,
            '#ffffff'
          ),
          stroke: sanitizeString(
            (element as DragDropEditorRectangleElement).style?.stroke,
            colors.primary
          ),
          strokeWidth: sanitizeNumber(
            (element as DragDropEditorRectangleElement).style?.strokeWidth,
            1
          ),
          dash: Array.isArray((element as DragDropEditorRectangleElement).style?.dash)
            ? ((element as DragDropEditorRectangleElement).style?.dash as number[])
            : undefined,
        },
      };
    case 'line':
      return {
        ...baseElement,
        type: 'line',
        points:
          Array.isArray((element as DragDropEditorLineElement).points) &&
          (element as DragDropEditorLineElement).points.length === 4
            ? ((element as DragDropEditorLineElement).points as [number, number, number, number])
            : [0, 0, sanitizeNumber(element.width, 200), 0],
        style: {
          stroke: sanitizeString(
            (element as DragDropEditorLineElement).style?.stroke,
            colors.secondary
          ),
          strokeWidth: sanitizeNumber(
            (element as DragDropEditorLineElement).style?.strokeWidth,
            1
          ),
          dash: Array.isArray((element as DragDropEditorLineElement).style?.dash)
            ? ((element as DragDropEditorLineElement).style?.dash as number[])
            : undefined,
        },
      };
    case 'image':
      return {
        ...baseElement,
        type: 'image',
        src: sanitizeString((element as DragDropEditorImageElement).src, ''),
        alt: sanitizeString((element as DragDropEditorImageElement).alt, 'Image'),
        fit: ((element as DragDropEditorImageElement).fit as DragDropEditorImageFit) || 'contain',
        style: {
          borderRadius: sanitizeNumber(
            (element as DragDropEditorImageElement).style?.borderRadius,
            0
          ),
        },
      };
    case 'static-text':
    default: {
      const staticTextElement = element as Partial<DragDropEditorStaticTextElement>;

      return {
        ...baseElement,
        type: 'static-text',
        text: sanitizeString(staticTextElement.text, 'Text'),
        style: normalizeTextStyle(staticTextElement.style, colors, fonts),
      };
    }
  }
}

function normalizeTextStyle(
  style:
    | Partial<DragDropEditorTextStyle>
    | Partial<DragDropEditorStrokeStyle>
    | Partial<DragDropEditorFillStyle>
    | undefined,
  colors: LegacyTemplateColors,
  fonts: LegacyTemplateFonts
): DragDropEditorTextStyle {
  const textStyle = style as Partial<DragDropEditorTextStyle> | undefined;

  return {
    fontFamily: sanitizeString(textStyle?.fontFamily, fonts.body),
    fontSize: sanitizeNumber(textStyle?.fontSize, fonts.size.medium),
    fontWeight: textStyle?.fontWeight === 'bold' ? 'bold' : 'normal',
    fontStyle: textStyle?.fontStyle === 'italic' ? 'italic' : 'normal',
    textAlign:
      textStyle?.textAlign === 'center' || textStyle?.textAlign === 'right'
        ? textStyle.textAlign
        : 'left',
    color: sanitizeString(textStyle?.color, colors.text),
    lineHeight: sanitizeNumber(textStyle?.lineHeight, 1.2),
    letterSpacing: sanitizeNumber(textStyle?.letterSpacing, 0),
    textDecoration: textStyle?.textDecoration === 'underline' ? 'underline' : 'none',
  };
}

export function createEditorElement(
  type: DragDropEditorElementType,
  currentCount: number,
  options?: {
    colors?: Partial<LegacyTemplateColors>;
    fonts?: Partial<LegacyTemplateFonts>;
  }
): DragDropEditorElement {
  const colors = {
    ...DEFAULT_TEMPLATE_COLORS,
    ...(options?.colors ?? {}),
  };
  const fonts = {
    ...DEFAULT_TEMPLATE_FONTS,
    ...(options?.fonts ?? {}),
    size: {
      ...DEFAULT_TEMPLATE_FONTS.size,
      ...(options?.fonts?.size ?? {}),
    },
  };
  const nextIndex = currentCount + 1;
  const baseId = `${type}-${Date.now()}-${nextIndex}`;
  const common = {
    id: baseId,
    x: 80 + (currentCount % 4) * 24,
    y: 80 + (currentCount % 6) * 24,
    width: 220,
    height: 40,
    rotation: 0,
    opacity: 1,
    zIndex: nextIndex,
    visible: true,
    locked: false,
  };

  switch (type) {
    case 'dynamic-text':
      return {
        ...common,
        type: 'dynamic-text',
        fieldKey: 'certificateNumber',
        label: 'Certificate Number',
        placeholder: 'CERT-000123',
        style: createBaseTextStyle({
          fontFamily: fonts.body,
          color: colors.text,
        }),
      };
    case 'rectangle':
      return {
        ...common,
        type: 'rectangle',
        width: 240,
        height: 100,
        cornerRadius: 6,
        style: {
          fill: '#ffffff',
          stroke: colors.primary,
          strokeWidth: 2,
        },
      };
    case 'line':
      return {
        ...common,
        type: 'line',
        width: 240,
        height: 0,
        points: [0, 0, 240, 0],
        style: {
          stroke: colors.secondary,
          strokeWidth: 2,
        },
      };
    case 'image':
      return {
        ...common,
        type: 'image',
        width: 160,
        height: 160,
        src: '',
        alt: 'Image',
        fit: 'contain',
        style: {
          borderRadius: 0,
        },
      };
    case 'static-text':
    default:
      return {
        ...common,
        type: 'static-text',
        text: 'New text',
        style: createBaseTextStyle({
          fontFamily: fonts.body,
          color: colors.text,
        }),
      };
  }
}

export function getDynamicFieldLabel(fieldKey: CertificateTemplateDynamicFieldKey) {
  const labels: Record<CertificateTemplateDynamicFieldKey, string> = {
    'customer.name': 'Customer Name',
    certificateNumber: 'Certificate Number',
    siteName: 'Site Name',
    siteAddress: 'Site Address',
    inspectionDate: 'Inspection Date',
    nextInspectionDate: 'Next Inspection Date',
    inspectorName: 'Inspector Name',
    status: 'Status',
  };

  return labels[fieldKey];
}

export function getDynamicFieldSampleValue(fieldKey: CertificateTemplateDynamicFieldKey) {
  const values: Record<CertificateTemplateDynamicFieldKey, string> = {
    'customer.name': 'Acme Property Services Ltd',
    certificateNumber: 'CERT-2026-001',
    siteName: 'Highfield Hall Community Centre',
    siteAddress: 'Marsh Lane, Farnworth, Bolton, BL4 0AW',
    inspectionDate: '01 April 2026',
    nextInspectionDate: '01 April 2027',
    inspectorName: 'Daniel Allport',
    status: 'Satisfactory',
  };

  return values[fieldKey];
}

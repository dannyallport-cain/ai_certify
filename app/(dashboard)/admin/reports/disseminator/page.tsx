'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Upload, Wand2, Save, Eye, List, Globe, Info, PanelLeftClose, PanelLeftOpen, Archive, Copy, Send, Lock, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PdfPageCanvas, type TextOverlay } from '@/components/disseminator/PdfPageCanvas';
import { PdfFormPageCanvas } from '@/components/disseminator/PdfFormPageCanvas';
import {
  analyzeFieldDefinition,
  DEFAULT_STATE_OPTIONS,
  isNumericLikeFieldType,
  type DisseminatorFieldType,
  type InspectionPeriodConfig,
  type InspectionPeriod,
  computeNextInspectionDate,
} from '@/lib/report-disseminator/field-analysis';
import type { DeviceType } from '@/lib/utils/calculate-zs';
import { 
  calculateMaxZs, 
  DEVICE_TYPE_OPTIONS, 
  getValidRatingsForType, 
  isValidZsCombo 
} from '@/lib/utils/calculate-zs';
import { validateUkPostcode } from '@/lib/report-disseminator/postcode';
import { GuidancePanel } from '@/components/disseminator/GuidancePanel';
import { getStepGuidance, getFieldGuidance, type DisseminatorStep } from '@/lib/report-disseminator/advisor';

type FieldType = DisseminatorFieldType;
type TemplateStatus = 'draft' | 'review' | 'published' | 'archived';
type ReportStatus = 'draft' | 'completed' | 'archived';

/** A single exclusion rule stored on a field. */
type ExcludeRule = {
  fieldId: string;
  /** If set and non-empty, only triggers when the excluding field's value matches one of these.
   *  If absent/empty, any non-empty value triggers exclusion. */
  whenValues?: string[];
  /** If set and non-empty, only these specific option values in the target field are removed/filtered.
   *  If absent/empty, the entire target field is locked to N/A. */
  excludeValues?: string[];
};

type ReportField = {
  id: string;
  page: number;
  label: string;
  fieldType: FieldType;
  required: boolean;
  plainTextHint?: string;
  dropdownOptions?: string[];
  dropdownDefault?: string;
  stateOptions?: Array<'tick' | 'cross' | 'NA' | 'LIM' | 'NV'>;
  addressConfig?: { mode: 'uk_address' | 'uk_postcode_format' };
  postcodeConfig?: { country: 'GB'; validateAddress: boolean };
  phoneConfig?: { country: 'GB' };
  numericConfig?: { min?: number; max?: number; resolution?: number; unit?: string };
  linkedConfig?: { relatedSection: string; relatedFieldId: string; relationType: 'mirrors' | 'derived_from' | 'depends_on' };
  inspectionPeriodConfig?: InspectionPeriodConfig;
  boundingBox?: { x: number; y: number; width: number; height: number };
  // Exclusion rules: grey out / set fields to N/A when this field changes
  excludes?: ExcludeRule[];
  // Max options to return from Search Online Options (default 12, max 40)
  searchOptionsMax?: number;
};

type IncomingExclusion = {
  key: string;
  sourceField: ReportField;
  sourceValue: string;
  whenValues?: string[];
  excludeValues?: string[];
  affectsWholeField: boolean;
  isTriggered: boolean;
};

type DisseminatorTemplate = {
  id: number;
  name: string;
  description?: string | null;
  status: TemplateStatus;
  version: number;
  sourceFileName: string;
  sourceMimeType: string;
  sourcePdfBase64?: string;
  fields: ReportField[];
  wizardData: {
    currentStep?: number;
    notes?: string;
    aiSuggestionsEnabled?: boolean;
    previewValues?: Record<string, string>;
  };
  publishedAt?: string | null;
  archivedAt?: string | null;
  parentTemplateId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type DisseminatorReportListItem = {
  id: number;
  templateId: number;
  templateName: string;
  templateVersion: number;
  name: string;
  description?: string | null;
  status: ReportStatus;
  createdAt?: string;
  updatedAt?: string;
};

type DisseminatorReport = DisseminatorReportListItem & {
  sourceFileName: string;
  sourceMimeType: string;
  sourcePdfBase64?: string;
  fields: ReportField[];
  values: Record<string, string>;
  notes?: string | null;
};

type RedactionLogicOptions = {
  fieldBounds: boolean;
  labelMatch: boolean;
  genericText: boolean;
  pixelFallback: boolean;
};

type PlacementSuggestion = {
  pageNumber: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  anchorText: string;
  relation: 'right_of_label' | 'below_label';
};

type PdfTextToken = {
  text: string;
  normalized: string;
  x: number;
  baselineY: number;
  width: number;
  height: number;
};

function normalizeSuggestionText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenizeSuggestionLabel(label: string) {
  return normalizeSuggestionText(label)
    .split(' ')
    .filter((token) => token.length >= 3);
}

function buildPdfTextTokens(textContent: any): PdfTextToken[] {
  const items = Array.isArray(textContent?.items) ? textContent.items : [];

  return items
    .map((item: any) => {
      const text = typeof item?.str === 'string' ? item.str : '';
      const normalized = normalizeSuggestionText(text);
      const transform = Array.isArray(item?.transform) ? item.transform : null;
      if (!normalized || !transform) return null;

      const width = Math.max(Number(item?.width) || 0, 1);
      const height = Math.max(Number(item?.height) || Math.abs(Number(transform[3]) || 0), 8);

      return {
        text,
        normalized,
        x: Number(transform[4]) || 0,
        baselineY: Number(transform[5]) || 0,
        width,
        height,
      } satisfies PdfTextToken;
    })
    .filter((item: PdfTextToken | null): item is PdfTextToken => Boolean(item));
}

async function findPlacementSuggestionForField(pdfBase64: string, fieldLabel: string): Promise<PlacementSuggestion | null> {
  const normalizedLabel = normalizeSuggestionText(fieldLabel);
  const labelTokens = tokenizeSuggestionLabel(fieldLabel);
  if (!normalizedLabel || labelTokens.length === 0) return null;

  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const base64Data = pdfBase64.replace(/^data:[^;]+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  let bestMatch: { score: number; suggestion: PlacementSuggestion } | null = null;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const tokens = buildPdfTextTokens(textContent);
    if (!tokens.length) continue;

    const lineBuckets = new Map<number, PdfTextToken[]>();
    for (const token of tokens) {
      const bucket = Math.round(token.baselineY / 10);
      const current = lineBuckets.get(bucket) || [];
      current.push(token);
      lineBuckets.set(bucket, current);
    }

    for (const line of lineBuckets.values()) {
      const sorted = [...line].sort((left, right) => left.x - right.x);
      const lineText = sorted.map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim();
      const normalizedLineText = normalizeSuggestionText(lineText);
      if (!normalizedLineText) continue;

      const tokenHits = labelTokens.filter((token) => normalizedLineText.includes(token)).length;
      const exactHit = normalizedLineText.includes(normalizedLabel) ? 6 : 0;
      const prefixHit = normalizedLabel.includes(normalizedLineText) && normalizedLineText.length >= 6 ? 3 : 0;
      const score = exactHit + prefixHit + tokenHits;
      if (score < 2) continue;

      const lineLeft = Math.max(Math.min(...sorted.map((token) => token.x)), 0);
      const lineRight = Math.max(...sorted.map((token) => token.x + token.width));
      const baselineY = sorted.reduce((sum, token) => sum + token.baselineY, 0) / sorted.length;
      const lineHeight = Math.max(...sorted.map((token) => token.height), 12);
      const rightGap = viewport.width - lineRight - 14;
      const suggestedHeight = Math.max(lineHeight * 1.8, 18);
      const rightWidth = Math.min(Math.max(viewport.width * 0.22, 110), Math.max(rightGap, 0));

      const suggestion: PlacementSuggestion = rightWidth >= 80
        ? {
            pageNumber,
            boundingBox: {
              x: Math.max(Math.min(lineRight + 8, viewport.width - rightWidth - 8), 8),
              y: Math.max(baselineY - lineHeight * 0.85, 8),
              width: rightWidth,
              height: suggestedHeight,
            },
            anchorText: lineText,
            relation: 'right_of_label',
          }
        : {
            pageNumber,
            boundingBox: {
              x: Math.max(Math.min(lineLeft, viewport.width - Math.min(Math.max(viewport.width * 0.32, 150), viewport.width - lineLeft - 12) - 8), 8),
              y: Math.max(baselineY - lineHeight * 2.6, 8),
              width: Math.min(Math.max(viewport.width * 0.32, 150), viewport.width - lineLeft - 12),
              height: suggestedHeight,
            },
            anchorText: lineText,
            relation: 'below_label',
          };

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { score, suggestion };
      }
    }
  }

  return bestMatch?.suggestion || null;
}

function generateAutoReferenceValue(templateId: number, field: Pick<ReportField, 'id' | 'label'>) {
  const label = field.label.toLowerCase();
  const prefix = label.includes('report') ? 'RPT' : label.includes('certificate') ? 'CERT' : 'REF';
  const fieldToken = field.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'FIELD';
  return `${prefix}-${String(templateId).padStart(4, '0')}-${fieldToken}`;
}

function stripTemplatePreviewValues(template: DisseminatorTemplate): DisseminatorTemplate {
  const nextWizardData = { ...(template.wizardData || {}) };
  delete nextWizardData.previewValues;

  return {
    ...template,
    wizardData: nextWizardData,
  };
}

const FIELD_TYPES: Array<{ value: FieldType; label: string }> = [
  { value: 'auto_zs', label: 'Auto-calculated Max Zs (BS7671)' },
  { value: 'auto_reference', label: 'Auto-generated ref' },
  { value: 'date', label: 'Date' },
  { value: 'text', label: 'Plain text' },
  { value: 'dropdown', label: 'Dropdown options' },
  { value: 'address', label: 'Address' },
  { value: 'postcode', label: 'Postcode (UK)' },
  { value: 'uk_phone', label: 'Phone Number (UK)' },
  { value: 'state_enum', label: 'Tick/Cross/NA/LIM/NV' },
  { value: 'numeric', label: 'Numeric value' },
  { value: 'resistance', label: 'Resistance reading' },
  { value: 'voltage', label: 'Voltage reading' },
  { value: 'linked_text', label: 'Related section text' },
  { value: 'sentence_builder', label: 'Text + sentence snippets' },
  { value: 'inspection_date_plus_period', label: 'Inspection date plus period' },
];

const AUTO_OPTION_RESEARCH_LIMIT = 8;
const OPTION_FIELD_PATTERN = /\b(type|class|classification|category|method|code|rating|phase|arrangement|supply|system|scheme|grade|status)\b/i;
const IMMUTABLE_PUBLISHED_TEMPLATE_ERROR =
  'Published templates are immutable. Clone to create a new editable version.';

const WIZARD_STEP_DETAILS = {
  1: {
    title: 'Field inventory',
    summary: 'Extract fields from the PDF, remove noise, and make sure the template contains every required input.',
    focus: 'Use Auto Extract, then add, remove, rename, and reorder fields until the inventory matches the source form.',
    suggestedTab: 'fields',
  },
  2: {
    title: 'Intent type mapping',
    summary: 'Assign the correct field type so the generated form uses the right control for each value.',
    focus: 'Review text vs dropdown vs status vs auto-generated ref and use AI Suggest where labels are ambiguous.',
    suggestedTab: 'fields',
  },
  3: {
    title: 'Validation rules',
    summary: 'Configure numeric ranges, units, dropdown options, postcode checks, and other field-level constraints.',
    focus: 'Open each field and add the rules that should apply when a report is filled in.',
    suggestedTab: 'preview-template',
  },
  4: {
    title: 'Review & publish state',
    summary: 'Check the rendered facsimile, confirm any unplaced fields, add notes, and set the right lifecycle state.',
    focus: 'Use the template preview to verify layout before saving, reviewing, or publishing.',
    suggestedTab: 'preview-template',
  },
} as const;

function getSuggestedTabForWizardStep(step: number) {
  return WIZARD_STEP_DETAILS[step as keyof typeof WIZARD_STEP_DETAILS]?.suggestedTab || 'fields';
}

function PdfDocumentPreview({
  pdfBase64,
  fields,
  selectedId,
  onSelectField,
  redactionOptions,
  manualPlacementField,
  placementMode,
  suggestedPlacement,
  onAssignBoundingBox,
  step1Mode,
  step1Blanks,
  onStep1Click,
  onStep1Update,
  textEditMode,
  textOverlays,
  onAddTextOverlay,
  onUpdateTextOverlay,
  onRemoveTextOverlay,
}: {
  pdfBase64?: string;
  fields: ReportField[];
  selectedId: string | null;
  onSelectField: (id: string | null) => void;
  redactionOptions: RedactionLogicOptions;
  manualPlacementField?: { id: string; label: string } | null;
  placementMode?: 'auto' | 'manual';
  suggestedPlacement?: PlacementSuggestion | null;
  onAssignBoundingBox?: (pageNumber: number, boundingBox: { x: number; y: number; width: number; height: number }) => void;
  step1Mode?: boolean;
  step1Blanks?: Array<{ x: number; y: number; width: number; height: number; page: number }>;
  onStep1Click?: (pageNumber: number, boundingBox: { x: number; y: number; width: number; height: number }) => void;
  onStep1Update?: (index: number, boundingBox: { x: number; y: number; width: number; height: number }) => void;
  textEditMode?: boolean;
  textOverlays?: TextOverlay[];
  onAddTextOverlay?: (pageNumber: number, overlay: Omit<TextOverlay, 'id' | 'page'>) => void;
  onUpdateTextOverlay?: (id: string, updates: Partial<TextOverlay>) => void;
  onRemoveTextOverlay?: (id: string) => void;
}) {
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    if (!pdfBase64) {
      setPageCount(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const base64Data = pdfBase64.replace(/^data:[^;]+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (!cancelled) {
          setPageCount(pdf.numPages || 1);
        }
      } catch (error) {
        console.error('Failed to load PDF page count', error);
        if (!cancelled) {
          setPageCount(0);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBase64]);

  if (!pdfBase64) {
    return <p className="text-sm text-muted-foreground">No PDF preview available (base64 not stored).</p>;
  }

  if (pageCount === 0) {
    return <p className="text-sm text-muted-foreground">Loading PDF preview…</p>;
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: pageCount }, (_, index) => {
        const pageNumber = index + 1;
        return (
          <div key={pageNumber} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Page {pageNumber} of {pageCount}
            </p>
            <PdfPageCanvas
              pdfBase64={pdfBase64}
              pageNumber={pageNumber}
              fields={fields
                .filter((field) => field.page === pageNumber)
                .map((field) => ({ id: field.id, label: field.label, boundingBox: field.boundingBox || null }))}
              redactionOptions={redactionOptions}
              selectedId={selectedId}
              onSelectField={onSelectField}
              manualPlacementField={manualPlacementField}
              placementMode={placementMode}
              suggestedBoundingBox={suggestedPlacement?.pageNumber === pageNumber ? suggestedPlacement.boundingBox : null}
              suggestedLabel={suggestedPlacement?.pageNumber === pageNumber ? suggestedPlacement.anchorText : null}
              onAssignBoundingBox={onAssignBoundingBox}
              step1Mode={step1Mode}
              step1Blanks={step1Blanks?.filter((b) => b.page === pageNumber)}
              onStep1Click={onStep1Click}
              onStep1Update={onStep1Update ? (localIdx, bb) => {
                const blanksForPage = (step1Blanks ?? []).filter((b) => b.page === pageNumber);
                const target = blanksForPage[localIdx];
                if (!target) return;
                const globalIdx = (step1Blanks ?? []).indexOf(target);
                if (globalIdx >= 0) onStep1Update(globalIdx, bb);
              } : undefined}
              textEditMode={textEditMode}
              textOverlays={textOverlays?.filter((o) => o.page === pageNumber)}
              onAddTextOverlay={onAddTextOverlay}
              onUpdateTextOverlay={onUpdateTextOverlay}
              onRemoveTextOverlay={onRemoveTextOverlay}
            />
          </div>
        );
      })}
    </div>
  );
}

function PdfFormDocumentPreview({
  pdfBase64,
  fields,
  values,
  onValueChange,
  selectedId,
  onSelectField,
  redactionOptions,
}: {
  pdfBase64?: string;
  fields: ReportField[];
  values: Record<string, string>;
  onValueChange: (fieldId: string, value: string) => void;
  selectedId: string | null;
  onSelectField: (id: string | null) => void;
  redactionOptions: RedactionLogicOptions;
}) {
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    if (!pdfBase64) {
      setPageCount(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const base64Data = pdfBase64.replace(/^data:[^;]+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (!cancelled) {
          setPageCount(pdf.numPages || 1);
        }
      } catch (error) {
        console.error('Failed to load PDF form page count', error);
        if (!cancelled) {
          setPageCount(0);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBase64]);

  if (!pdfBase64) {
    return <p className="text-sm text-muted-foreground">No PDF preview available (base64 not stored).</p>;
  }

  if (pageCount === 0) {
    return <p className="text-sm text-muted-foreground">Loading PDF preview…</p>;
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: pageCount }, (_, index) => {
        const pageNumber = index + 1;
        return (
          <div key={pageNumber} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Rendered Form Page {pageNumber} of {pageCount}
            </p>
            <PdfFormPageCanvas
              pdfBase64={pdfBase64}
              pageNumber={pageNumber}
              fields={fields.filter((field) => field.page === pageNumber)}
              values={values}
              redactionOptions={redactionOptions}
              onValueChange={onValueChange}
              selectedId={selectedId}
              onSelectField={(id) => onSelectField(id)}
            />
          </div>
        );
      })}
    </div>
  );
}

function RedactionLogicControls({
  value,
  onChange,
}: {
  value: RedactionLogicOptions;
  onChange: (next: RedactionLogicOptions) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">Redaction Logic</p>
      <p className="text-xs text-muted-foreground">
        Toggle each strategy on/off to find the cleanest preview for this PDF.
      </p>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.fieldBounds}
            onChange={(event) => onChange({ ...value, fieldBounds: event.target.checked })}
          />
          Field bounding-box redaction
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.labelMatch}
            onChange={(event) => onChange({ ...value, labelMatch: event.target.checked })}
          />
          Label-matched redaction
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.genericText}
            onChange={(event) => onChange({ ...value, genericText: event.target.checked })}
          />
          Generic text redaction
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.pixelFallback}
            onChange={(event) => onChange({ ...value, pixelFallback: event.target.checked })}
          />
          Pixel fallback redaction
        </label>
      </div>
    </div>
  );
}

function SortableFieldRow({
  field,
  allFields,
  onUpdate,
  onAiSuggest,
  onSearchOnlineOptions,
  searchingOnlineOptions,
}: {
  field: ReportField;
  allFields: ReportField[];
  onUpdate: (patch: Partial<ReportField>) => void;
  onAiSuggest: () => void;
  onSearchOnlineOptions: () => void;
  searchingOnlineOptions: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const rowClassName = `sortable-field-row-${field.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const rowCss = `.${rowClassName}{transform:${CSS.Transform.toString(transform) || 'none'};transition:${transition || 'none'};opacity:${isDragging ? '0.5' : '1'};}`;

  const [postcodeTest, setPostcodeTest] = useState('');
  const [postcodeResult, setPostcodeResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [excludesOpen, setExcludesOpen] = useState(false);

  const testPostcode = async () => {
    if (!postcodeTest.trim()) return;
    const result = await validateUkPostcode(postcodeTest);
    setPostcodeResult(result);
    if (result.valid) {
      toast.success(`✓ ${result.postcode} is valid (${result.region}, ${result.country})`);
    } else {
      toast.error(result.error || 'Invalid postcode');
    }
  };

  return (
    <>
      <style>{rowCss}</style>
      <div ref={setNodeRef} className={`${rowClassName} space-y-3 rounded border bg-white p-3`}>
      <div className="flex items-center gap-2">
        <button type="button" className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <Badge variant="outline" className="text-xs">{field.page}</Badge>
        <span className="text-xs text-muted-foreground flex-1">{field.id.slice(0, 8)}</span>
        <Badge variant={field.required ? 'default' : 'secondary'}>{field.required ? 'Required' : 'Optional'}</Badge>
      </div>

      <div className="space-y-2">
        <Label>Field label</Label>
        <Input className="bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-700" title="Human-readable label shown to users in the generated form" value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Page</Label>
          <Input title="PDF page where this field belongs" type="number" min={1} value={field.page} onChange={(e) => onUpdate({ page: Number(e.target.value || 1) })} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={field.fieldType} onValueChange={(value: FieldType) => onUpdate({ fieldType: value })}>
            <SelectTrigger title="Behavior of this field in the generated form"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onAiSuggest}>
          <Wand2 className="w-4 h-4 mr-1" />
          AI Suggest
        </Button>
        {(field.fieldType === 'dropdown' || field.fieldType === 'text' || field.fieldType === 'state_enum' || field.fieldType === 'sentence_builder') && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={onSearchOnlineOptions} disabled={searchingOnlineOptions}>
              <Globe className="w-4 h-4 mr-1" />
              {searchingOnlineOptions ? 'Searching…' : 'Search Online Options'}
            </Button>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={40}
                title="Maximum number of options to return from Search Online Options"
                className="w-14 rounded border border-input bg-background px-2 py-1 text-sm"
                placeholder="12"
                value={field.searchOptionsMax ?? ''}
                onChange={(e) => onUpdate({ searchOptionsMax: e.target.value === '' ? undefined : Math.min(40, Math.max(1, Number(e.target.value))) })}
              />
              <span className="text-xs text-muted-foreground">max</span>
            </div>
          </>
        )}
      </div>

      {field.fieldType === 'dropdown' && (
        <div className="space-y-2">
          <Label>Dropdown options (one per line)</Label>
          <Textarea
            title="Dropdown options — one per line"
            placeholder="Option A&#10;Option B&#10;Option C"
            value={(field.dropdownOptions || []).join('\n')}
            onChange={(e) => onUpdate({ dropdownOptions: e.target.value.split('\n') })}
            onBlur={(e) => onUpdate({ dropdownOptions: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean) })}
            rows={4}
          />
          {(field.dropdownOptions || []).length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Default value</Label>
              <select
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                title="Default value pre-filled when a new report is created from this template"
                value={field.dropdownDefault || ''}
                onChange={(e) => onUpdate({ dropdownDefault: e.target.value || undefined })}
              >
                <option value="">(blank — no default)</option>
                {(field.dropdownOptions || []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {field.fieldType === 'sentence_builder' && (
        <div className="space-y-2">
          <Label>Sentence snippets (one per line)</Label>
          <Textarea
            placeholder="Enter each pre-made sentence on a new line…"
            value={(field.dropdownOptions || []).join('\n')}
            onChange={(e) => onUpdate({ dropdownOptions: e.target.value.split('\n') })}
            onBlur={(e) => onUpdate({ dropdownOptions: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean) })}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Users can pick these sentences from a dropdown to append them to the field text.
          </p>
        </div>
      )}

      {field.fieldType === 'state_enum' && (
        <div className="space-y-2">
          <Label>State options</Label>
          <Input value={(field.stateOptions || [...DEFAULT_STATE_OPTIONS]).join(', ')} disabled />
        </div>
      )}

      {field.fieldType === 'auto_reference' && (
        <div className="space-y-2">
          <Label>Reference generation</Label>
          <Input value="Auto-generated from template id and field id" disabled />
          <p className="text-xs text-muted-foreground">
            This field is populated automatically and remains read-only in the generated preview.
          </p>
        </div>
      )}

      {field.fieldType === 'date' && (
        <div className="space-y-2">
          <Label>Date input</Label>
          <Input value={field.plainTextHint || 'Pick a date from the calendar dropdown'} disabled />
          <p className="text-xs text-muted-foreground">
            Date fields render as date pickers in the generated preview so engineers can select valid calendar dates quickly.
          </p>
        </div>
      )}

      {field.fieldType === 'address' && (
        <div className="space-y-2">
          <Label>Address guidance</Label>
          <Input value={field.plainTextHint || 'UK address'} disabled />
          <p className="text-xs text-muted-foreground">
            Address fields should capture the full UK address. Use a separate postcode field when the form includes one.
          </p>
        </div>
      )}

      {field.fieldType === 'postcode' && (
        <div className="space-y-2">
          <Label>UK Postcode Validation</Label>
          <div className="flex gap-2">
            <Input
              title="Use a sample UK postcode to verify the postcode rule"
              placeholder="Test postcode (e.g. SW1A 1AA)"
              value={postcodeTest}
              onChange={(e) => setPostcodeTest(e.target.value)}
            />
            <Button type="button" size="sm" onClick={testPostcode}>Validate</Button>
          </div>
          {postcodeResult && (
            <p className={`text-xs ${postcodeResult.valid ? 'text-green-600' : 'text-red-600'}`}>
              {postcodeResult.valid ? '✓ Valid postcode' : `✗ ${postcodeResult.error}`}
            </p>
          )}
        </div>
      )}

      {field.fieldType === 'uk_phone' && (
        <div className="space-y-2">
          <Label>Phone guidance</Label>
          <Input value={field.plainTextHint || 'UK phone number'} disabled />
          <p className="text-xs text-muted-foreground">
            Phone fields are tagged as UK-only so generated forms can apply telephone validation later.
          </p>
        </div>
      )}

      {isNumericLikeFieldType(field.fieldType) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input
            title="Minimum allowed value"
            placeholder="Min"
            type="number"
            value={field.numericConfig?.min ?? ''}
            onChange={(e) => onUpdate({ numericConfig: { ...field.numericConfig, min: e.target.value === '' ? undefined : Number(e.target.value) } })}
          />
          <Input
            title="Maximum allowed value"
            placeholder="Max"
            type="number"
            value={field.numericConfig?.max ?? ''}
            onChange={(e) => onUpdate({ numericConfig: { ...field.numericConfig, max: e.target.value === '' ? undefined : Number(e.target.value) } })}
          />
          <Input
            title="Allowed precision or increment"
            placeholder="Resolution"
            type="number"
            value={field.numericConfig?.resolution ?? ''}
            onChange={(e) => onUpdate({ numericConfig: { ...field.numericConfig, resolution: e.target.value === '' ? undefined : Number(e.target.value) } })}
          />
          <Input
            title="Measurement unit shown to users"
            placeholder="Unit"
            value={field.numericConfig?.unit ?? ''}
            onChange={(e) => onUpdate({ numericConfig: { ...field.numericConfig, unit: e.target.value } })}
          />
        </div>
      )}

      {field.fieldType === 'linked_text' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            title="Related section or group for this linked field"
            placeholder="Related section"
            value={field.linkedConfig?.relatedSection ?? ''}
            onChange={(e) => onUpdate({
              linkedConfig: {
                relatedSection: e.target.value,
                relatedFieldId: field.linkedConfig?.relatedFieldId || '',
                relationType: field.linkedConfig?.relationType || 'depends_on',
              },
            })}
          />
          <Input
            title="ID of the field this entry links to"
            placeholder="Related field ID"
            value={field.linkedConfig?.relatedFieldId ?? ''}
            onChange={(e) => onUpdate({
              linkedConfig: {
                relatedSection: field.linkedConfig?.relatedSection || '',
                relatedFieldId: e.target.value,
                relationType: field.linkedConfig?.relationType || 'depends_on',
              },
            })}
          />
          <Select
            value={field.linkedConfig?.relationType || 'depends_on'}
            onValueChange={(value: 'mirrors' | 'derived_from' | 'depends_on') => onUpdate({
              linkedConfig: {
                relatedSection: field.linkedConfig?.relatedSection || '',
                relatedFieldId: field.linkedConfig?.relatedFieldId || '',
                relationType: value,
              },
            })}
          >
            <SelectTrigger title="How this field depends on the referenced field"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="depends_on">depends_on</SelectItem>
              <SelectItem value="mirrors">mirrors</SelectItem>
              <SelectItem value="derived_from">derived_from</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {field.fieldType === 'inspection_date_plus_period' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Inspection date field</Label>
            <select
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              title="The date field in this template that records the inspection date"
              value={field.inspectionPeriodConfig?.inspectionDateFieldId || ''}
              onChange={(e) => onUpdate({
                inspectionPeriodConfig: {
                  period: field.inspectionPeriodConfig?.period || '1y',
                  inspectionDateFieldId: e.target.value,
                },
              })}
            >
              <option value="">— select a date field —</option>
              {allFields.filter((f) => f.fieldType === 'date' && f.id !== field.id).map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Period</Label>
            <select
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              title="How many years after the inspection date this next-inspection date falls"
              value={field.inspectionPeriodConfig?.period || '1y'}
              onChange={(e) => onUpdate({
                inspectionPeriodConfig: {
                  period: e.target.value as InspectionPeriod,
                  inspectionDateFieldId: field.inspectionPeriodConfig?.inspectionDateFieldId || '',
                },
              })}
            >
              <option value="1y">1 year</option>
              <option value="3y">3 years</option>
              <option value="5y">5 years</option>
              <option value="10y">10 years</option>
              <option value="custom">Custom (user picks date)</option>
            </select>
          </div>
          {!field.inspectionPeriodConfig?.inspectionDateFieldId && (
            <p className="text-xs text-amber-600 md:col-span-2">
              Select the inspection date field above so the next date can be computed automatically.
            </p>
          )}
        </div>
      )}

      {/* Excludes — when this field has a matching value, listed fields are greyed out and set to N/A */}
      <div className="rounded-md border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-left"
          onClick={() => setExcludesOpen((o) => !o)}
        >
          <span className="text-sm font-medium">
            Excludes other fields
            {(field.excludes?.length ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                {field.excludes!.length}
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">{excludesOpen ? '▲' : '▼'}</span>
        </button>
        {excludesOpen && (() => {
          // Options that the *excluding* field (this field) can have — used for conditional whenValues
          const excluderOptions =
            (field.fieldType === 'dropdown' || field.fieldType === 'sentence_builder')
              ? (field.dropdownOptions || [])
              : field.fieldType === 'state_enum'
              ? (field.stateOptions || [...DEFAULT_STATE_OPTIONS])
              : [];

          return (
            <div className="space-y-2 border-t px-3 pb-3 pt-2">
              <p className="text-xs text-muted-foreground">
                When this field has a matching value, ticked fields are excluded. Configure which trigger values apply (list 1) and which specific options to remove in the target field (list 2). No options selected in list 2 = entire field locked to N/A.
              </p>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {allFields.filter((f) => f.id !== field.id).map((f) => {
                  const rule = (field.excludes || []).find((r) => r.fieldId === f.id);
                  const isChecked = !!rule;
                  const whenValues = rule?.whenValues || [];
                  const excludeValues = rule?.excludeValues || [];
                  // Options available in the TARGET field (for the "exclude these options" list)
                  const targetFieldOptions =
                    (f.fieldType === 'dropdown' || f.fieldType === 'sentence_builder')
                      ? (f.dropdownOptions || [])
                      : f.fieldType === 'state_enum'
                      ? (f.stateOptions || [...DEFAULT_STATE_OPTIONS])
                      : [];

                  return (
                    <div key={f.id} className="space-y-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = field.excludes || [];
                            onUpdate({
                              excludes: e.target.checked
                                ? [...current, { fieldId: f.id }]
                                : current.filter((r) => r.fieldId !== f.id),
                            });
                          }}
                        />
                        <span className="truncate" title={f.id}>{f.label}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{f.fieldType}</span>
                      </label>
                      {/* List 1: which values of THIS field trigger the exclusion */}
                      {isChecked && excluderOptions.length > 0 && (
                        <div className="ml-5 space-y-0.5 rounded border bg-muted/30 px-2 py-1.5">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Trigger values (this field){whenValues.length === 0 ? ': any' : ':'}
                          </p>
                          {excluderOptions.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={whenValues.includes(opt)}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...whenValues, opt]
                                    : whenValues.filter((v) => v !== opt);
                                  onUpdate({
                                    excludes: (field.excludes || []).map((r) =>
                                      r.fieldId === f.id
                                        ? { ...r, whenValues: updated.length ? updated : undefined }
                                        : r
                                    ),
                                  });
                                }}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      {/* List 2: which options in the TARGET field are excluded when triggered */}
                      {isChecked && targetFieldOptions.length > 0 && (
                        <div className="ml-5 space-y-0.5 rounded border bg-blue-50/50 px-2 py-1.5 dark:bg-blue-950/20">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Options to remove from <em>{f.label}</em>
                            {excludeValues.length === 0 ? ' (none = lock entire field)' : ':'}
                          </p>
                          {targetFieldOptions.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={excludeValues.includes(opt)}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...excludeValues, opt]
                                    : excludeValues.filter((v) => v !== opt);
                                  onUpdate({
                                    excludes: (field.excludes || []).map((r) =>
                                      r.fieldId === f.id
                                        ? { ...r, excludeValues: updated.length ? updated : undefined }
                                        : r
                                    ),
                                  });
                                }}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {allFields.filter((f) => f.id !== field.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">No other fields in this template.</p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      </div>
    </>
  );
}

export default function ReportDisseminatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<DisseminatorTemplate[]>([]);
  const [reports, setReports] = useState<DisseminatorReportListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<DisseminatorTemplate | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<DisseminatorReport | null>(null);
  const [editorMode, setEditorMode] = useState<'template' | 'report'>('template');
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingReport, setCreatingReport] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [createReportDialogOpen, setCreateReportDialogOpen] = useState(false);
  const [saveReportDialogOpen, setSaveReportDialogOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [saveReportName, setSaveReportName] = useState('');

  const navigateToTemplateEditor = (templateId: number) => {
    router.replace(`/admin/reports/disseminator?templateId=${templateId}`);
  };

  const navigateToReportEditor = (reportId: number) => {
    router.replace(`/admin/reports/disseminator?mode=report&reportId=${reportId}`);
  };
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [searchingFieldId, setSearchingFieldId] = useState<string | null>(null);
  const [templateTab, setTemplateTab] = useState('fields');
  const [reportTab, setReportTab] = useState('report-form');
  const [templateFieldSearch, setTemplateFieldSearch] = useState('');
  const [reportFieldSearch, setReportFieldSearch] = useState('');
  const [fieldWizardIndex, setFieldWizardIndex] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [placementMode, setPlacementMode] = useState<'auto' | 'manual'>('auto');
  const [placementSuggestions, setPlacementSuggestions] = useState<Record<string, PlacementSuggestion | null>>({});
  const [mappingUndoStack, setMappingUndoStack] = useState<Array<{ fieldId: string; previousBoundingBox: ReportField['boundingBox']; previousPage: number }>>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Refs used by the auto-save interval — avoided in state to prevent re-renders
  const autoSaveDirtyTemplate = useRef(false);
  const autoSaveDirtyReport = useRef(false);
  const autoSaveSelectedRef = useRef<typeof selected>(null);
  const autoSaveReportRef = useRef<typeof selectedReport>(null);
  const autoSaveEditorModeRef = useRef<typeof editorMode>('template');

  // Keep refs in sync with current state
  useEffect(() => { autoSaveSelectedRef.current = selected; }, [selected]);
  useEffect(() => { autoSaveReportRef.current = selectedReport; }, [selectedReport]);
  useEffect(() => { autoSaveEditorModeRef.current = editorMode; }, [editorMode]);

  // Mark dirty when template changes (skip first mount — selectedId not yet set)
  const isInitialTemplateLoad = useRef(true);
  useEffect(() => {
    if (isInitialTemplateLoad.current) { isInitialTemplateLoad.current = false; return; }
    if (selected) autoSaveDirtyTemplate.current = true;
  }, [selected]);

  // Mark dirty when report values/notes change
  const isInitialReportLoad = useRef(true);
  useEffect(() => {
    if (isInitialReportLoad.current) { isInitialReportLoad.current = false; return; }
    if (selectedReport) autoSaveDirtyReport.current = true;
  }, [selectedReport]);

  // ── Auto-save every 10 seconds ────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const mode = autoSaveEditorModeRef.current;

      if (mode === 'template') {
        const tmpl = autoSaveSelectedRef.current;
        if (!autoSaveDirtyTemplate.current || !tmpl || tmpl.status !== 'draft') return;
        autoSaveDirtyTemplate.current = false;
        setAutoSaveStatus('saving');
        try {
          const res = await fetch(`/api/admin/report-disseminator/${tmpl.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: tmpl.fields,
              wizardData: stripTemplatePreviewValues(tmpl).wizardData,
              description: tmpl.description || '',
              name: tmpl.name,
              status: tmpl.status,
            }),
          });
          if (!res.ok) { setAutoSaveStatus('error'); return; }
          setAutoSaveStatus('saved');
        } catch {
          setAutoSaveStatus('error');
        }
      } else {
        const report = autoSaveReportRef.current;
        if (!autoSaveDirtyReport.current || !report) return;
        autoSaveDirtyReport.current = false;
        setAutoSaveStatus('saving');
        try {
          const res = await fetch(`/api/admin/report-disseminator/reports/${report.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: report.name,
              description: report.description || '',
              status: report.status,
              values: report.values,
              notes: report.notes || '',
            }),
          });
          if (!res.ok) { setAutoSaveStatus('error'); return; }
          setAutoSaveStatus('saved');
        } catch {
          setAutoSaveStatus('error');
        }
      }
    }, 10_000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Admin-only AI cost warning ────────────────────────────────────────
  const showAiCostWarning = (label: string, estimatedCost: string) => {
    if (userRole !== 'admin') return;
    toast.error(`AI call: ${label} — est. ${estimatedCost}`, { duration: 4000 });
  };

  // ── Wizard Step Through ──────────────────────────────────────────────
  type WizardPhase = 'select' | 'name' | 'type' | 'logic' | 'confirm';
  type WizardDraft = {
    boundingBox: ReportField['boundingBox'];
    page: number;
    label: string;
    fieldType: FieldType;
    stateOptions: Array<'tick' | 'cross' | 'NA' | 'LIM' | 'NV'>;
    dropdownOptions: string[];
    prefix: string;
    suffix: string;
    increment: boolean;
    numericUnit: string;
  };
  const EMPTY_WIZARD_DRAFT: WizardDraft = {
    boundingBox: undefined,
    page: 1,
    label: '',
    fieldType: 'text',
    stateOptions: [...DEFAULT_STATE_OPTIONS],
    dropdownOptions: ['Option 1', 'Option 2'],
    prefix: '',
    suffix: '',
    increment: false,
    numericUnit: '',
  };
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardPhase, setWizardPhase] = useState<WizardPhase>('select');
  const [wizardDraft, setWizardDraft] = useState<WizardDraft>(EMPTY_WIZARD_DRAFT);
  const [wizardFieldsAdded, setWizardFieldsAdded] = useState(0);

  // ── Step 1: mark-and-blank field detection ────────────────────────────────
  const [step1Active, setStep1Active] = useState(false);
  const [step1Blanks, setStep1Blanks] = useState<Array<{ x: number; y: number; width: number; height: number; page: number }>>([]);
  const [step2Queue, setStep2Queue] = useState<Array<{ x: number; y: number; width: number; height: number; page: number }>>([]);

  // ── Text edit mode: redact / replace text in the PDF ──────────────────────
  const [textEditActive, setTextEditActive] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

  const handleAddTextOverlay = (pageNumber: number, overlay: Omit<TextOverlay, 'id' | 'page'>) => {
    setTextOverlays((prev) => [...prev, { ...overlay, id: crypto.randomUUID(), page: pageNumber }]);
  };
  const handleUpdateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };
  const handleRemoveTextOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
  };

  const [redactionOptions, setRedactionOptions] = useState<RedactionLogicOptions>({
    fieldBounds: true,
    labelMatch: true,
    genericText: false,
    pixelFallback: false,
  });
  const [manualPlacementMode, setManualPlacementMode] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/report-disseminator', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data);
      // Use functional update so we read the *current* selectedId state,
      // not the stale closure value captured when this async function was created.
      setSelectedId((current) => (!current && data.length > 0 ? data[0].id : current));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load report disseminator templates');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      const res = await fetch('/api/admin/report-disseminator/reports', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load reports');
      const data = await res.json();
      setReports(data);
      if (!selectedReportId && editorMode === 'report' && data.length > 0) {
        setSelectedReportId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load saved disseminated reports');
    } finally {
      setLoadingReports(false);
    }
  };

  const loadTemplate = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/report-disseminator/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load template');
      const data = await res.json();
      setSelected(stripTemplatePreviewValues(data));
      
      // Reconstruct File from base64 for extraction APIs
      if (data.sourcePdfBase64) {
        try {
          const base64Data = data.sourcePdfBase64.replace(/^data:[^;]+;base64,/, '');
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const reconstructedFile = new File([blob], data.sourceFileName, { type: 'application/pdf' });
          setFile(reconstructedFile);
        } catch (e) {
          console.warn('Could not reconstruct file from base64:', e);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load template details');
    }
  };

  const loadReport = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/report-disseminator/reports/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load report');
      const data = await res.json();
      setSelectedReport(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load saved report');
    }
  };

  useEffect(() => {
    loadTemplates();
    loadReports();
    // Fetch current user role for paywall logic
    fetch('/api/user').then(r => r.ok ? r.json() : null).then(u => {
      if (u?.role) setUserRole(u.role);
    });
    // Check for payment success from Stripe redirect
    const paymentSuccess = searchParams.get('payment_success');
    if (paymentSuccess) {
      setPaymentSessionId(paymentSuccess);
      toast.success('Payment successful! You can now create your template.');
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadTemplate(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    if (selectedReportId) {
      loadReport(selectedReportId);
    } else {
      setSelectedReport(null);
    }
  }, [selectedReportId]);

  useEffect(() => {
    const mode = searchParams.get('mode');
    const reportIdParam = searchParams.get('reportId');
    if (mode === 'report' && reportIdParam) {
      const id = parseInt(reportIdParam, 10);
      if (!Number.isNaN(id)) {
        setEditorMode('report');
        setSelectedReportId(id);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const templateIdParam = searchParams.get('templateId');
    if (!templateIdParam) return;

    const id = parseInt(templateIdParam, 10);
    if (Number.isNaN(id)) return;

    setEditorMode('template');
    setSelectedId(id);
    setSelectedFieldId(null);
  }, [searchParams]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action !== 'create-report' || !selected) return;
    if (selectedId !== selected.id) return;

    openCreateReportDialog();
    navigateToTemplateEditor(selected.id);
  }, [searchParams, selected, selectedId]);

  useEffect(() => {
    if (!selected) {
      setPreviewValues({});
      return;
    }

    setPreviewValues((currentValues) => {
      const nextValues: Record<string, string> = {};
      for (const field of selected.fields) {
        const existingValue = currentValues[field.id];
        nextValues[field.id] =
          existingValue ??
          (field.fieldType === 'auto_reference'
            ? generateAutoReferenceValue(selected.id, field)
            : field.fieldType === 'inspection_date_plus_period'
            ? ''
            : field.dropdownDefault || '');
      }
      return nextValues;
    });
  }, [selected]);

  const createTemplate = async () => {
    setCreateFeedback(null);
    if (!name.trim() || !file) {
      const message = 'Name and PDF file are required';
      setCreateFeedback({ type: 'error', message });
      toast.error(message);
      return;
    }

    // Non-admin users need to pay £5 via Stripe Checkout
    if (userRole && userRole !== 'admin' && !paymentSessionId) {
      setCreating(true);
      try {
        const checkoutRes = await fetch('/api/stripe/template-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateName: name.trim() }),
        });
        const checkoutData = await checkoutRes.json();
        if (!checkoutRes.ok || !checkoutData.url) {
          throw new Error(checkoutData?.error || 'Failed to start payment');
        }
        window.location.href = checkoutData.url;
        return;
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Payment initiation failed');
        setCreating(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (paymentSessionId) {
      headers['x-payment-session-id'] = paymentSessionId;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/report-disseminator', {
        method: 'POST',
        body: formData,
        headers,
      });

      const payload = await res.json();
      if (!res.ok) {
        if (payload?.code === 'PAYMENT_REQUIRED') {
          toast.error('Payment is required to create templates. Please complete checkout.');
          return;
        }
        throw new Error(payload?.error || 'Failed to create template');
      }

      const message = 'Template created. Continue with field wizard.';
      setCreateFeedback({ type: 'success', message });
      toast.success(message);
      setName('');
      setDescription('');
      setFile(null);
      setPaymentSessionId(null);
      setEditorMode('template');
      await loadTemplates();
      setSelectedId(payload.id);
    } catch (error: any) {
      console.error(error);
      const message = error.message || 'Failed to create template';
      setCreateFeedback({ type: 'error', message });
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const autoExtractAllFields = async () => {
    console.log('🔵 AUTO EXTRACT CALLED');
    if (!selected) {
      toast.error('Please select a template first');
      return;
    }
    console.log('🔵 Selected template:', selected.id);
    
    if (!file) {
      console.error('🔴 CRITICAL: file is null or undefined!');
      console.log('🔴 selected:', selected);
      console.log('🔴 selected.sourcePdfBase64 exists?', !!selected.sourcePdfBase64);
      toast.error('PDF file not available. Please re-upload the template.');
      return;
    }
    console.log('🔵 File available:', file.name, 'Size:', file.size, 'bytes');

    setExtracting(true);
    try {
      // Read file bytes once, reuse for all requests
      const fileBytes = await file.arrayBuffer();
      const makePdfFormData = () => {
        const fd = new FormData();
        fd.append('file', new File([fileBytes], file.name, { type: 'application/pdf' }));
        return fd;
      };

      console.log('🔵 File bytes read:', fileBytes.byteLength, 'bytes');

      let allFields: ReportField[] = [];
      const methods: string[] = [];

      // Step 1: Try AcroForm fields first (fast, for fillable PDFs)
      toast.info('Extracting form fields...');
      console.log('🔵 Starting AcroForm extraction...');
      try {
        const acroRes = await fetch('/api/admin/report-disseminator/extract-fields', {
          method: 'POST',
          body: makePdfFormData(),
        });
        console.log('🔵 AcroForm response status:', acroRes.status);

        if (acroRes.ok) {
          const acroData = await acroRes.json();
          console.log('🔵 AcroForm data:', acroData.fields?.length || 0, 'fields');
          if (acroData.fields && acroData.fields.length > 0) {
            const acroFields: ReportField[] = acroData.fields.map((f: any) => {
              const analysis = analyzeFieldDefinition(f.key || f.label || 'Untitled', {
                fieldTypeHint: f.fieldType,
              });
              return {
                id: f.id || crypto.randomUUID(),
                page: f.pageNumber || f.page || 1,
                label: analysis.label,
                fieldType: analysis.fieldType,
                required: false,
                plainTextHint: analysis.plainTextHint,
                dropdownOptions: analysis.dropdownOptions,
                stateOptions: analysis.stateOptions,
                addressConfig: analysis.addressConfig,
                postcodeConfig: analysis.postcodeConfig,
                phoneConfig: analysis.phoneConfig,
                numericConfig: analysis.numericConfig,
                // boundingBox omitted - AcroForm doesn't reliably provide valid coordinates
              };
            });
            allFields = [...allFields, ...acroFields];
            methods.push(`AcroForm (${acroFields.length})`);
          }
        }
      } catch (e) {
        console.warn('AcroForm extraction failed:', e);
      }

      // Step 2: Try AI Gateway for intelligent field extraction
      toast.info('Analyzing with AI Gateway...');
      try {
        const gatewayRes = await fetch('/api/admin/report-disseminator/ai-gateway-analyze', {
          method: 'POST',
          body: makePdfFormData(),
        });
        showAiCostWarning('AI Gateway field analysis', '~£0.04');
        console.log('🔵 AI Gateway response status:', gatewayRes.status);
        
        if (gatewayRes.ok) {
          const gatewayData = await gatewayRes.json();
          console.log('🔵 AI Gateway data:', gatewayData.fields?.length || 0, 'fields');
          if (gatewayData.fields && gatewayData.fields.length > 0) {
            const gatewayFields: ReportField[] = gatewayData.fields.map((f: any) => {
              const analysis = analyzeFieldDefinition(f.key || f.label || 'Untitled', {
                fieldTypeHint: f.fieldType,
              });
              // Convert flat polygon array [x1,y1,x2,y2,...] to bounding box {x,y,width,height}
              let boundingBox: ReportField['boundingBox'] = undefined;
              if (Array.isArray(f.boundingBox) && f.boundingBox.length >= 8) {
                const xs = [f.boundingBox[0], f.boundingBox[2], f.boundingBox[4], f.boundingBox[6]];
                const ys = [f.boundingBox[1], f.boundingBox[3], f.boundingBox[5], f.boundingBox[7]];
                const x = Math.min(...xs);
                const y = Math.min(...ys);
                boundingBox = { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
              }
              return {
                id: f.id || crypto.randomUUID(),
                page: f.pageNumber || f.page || 1,
                label: analysis.label,
                fieldType: analysis.fieldType,
                required: false,
                plainTextHint: analysis.plainTextHint,
                dropdownOptions: analysis.dropdownOptions,
                stateOptions: analysis.stateOptions,
                addressConfig: analysis.addressConfig,
                postcodeConfig: analysis.postcodeConfig,
                phoneConfig: analysis.phoneConfig,
                numericConfig: analysis.numericConfig,
                ...(boundingBox ? { boundingBox } : {}),
              };
            });
            
            // Deduplicate by label (prefer AI Gateway fields with bounding boxes)
            const existingLabels = new Set(allFields.map(f => f.label.toLowerCase()));
            const newGatewayFields = gatewayFields.filter(f => !existingLabels.has(f.label.toLowerCase()));
            
            allFields = [...allFields, ...newGatewayFields];
            methods.push(`AI Gateway (${gatewayFields.length} found, ${newGatewayFields.length} unique)`);
          }
        } else {
          const errorData = await gatewayRes.json();
          if (errorData.hint) {
            console.log('AI Gateway hint:', errorData.hint);
          }
        }
      } catch (e) {
        console.warn('AI Gateway extraction skipped:', e);
      }

      // Step 3: OCR fallback - if both methods returned 0 fields, try text extraction
      console.log('🔵 Fields so far:', allFields.length);
      if (allFields.length === 0) {
        console.log('🔵 No fields from AcroForm/AI Gateway, trying OCR fallback...');
        try {
          const ocrRes = await fetch('/api/admin/report-disseminator/ocr-text', {
            method: 'POST',
            body: makePdfFormData(),
          });
          console.log('🔵 OCR response status:', ocrRes.status);

          if (ocrRes.ok) {
            const ocrData = await ocrRes.json();
            const extractedText = ocrData.text || '';
            console.log('🔵 OCR text length:', extractedText.length);

            if (extractedText.trim().length > 0) {
              // Parse text to find likely field labels (lines with colons, etc.)
              const lines = extractedText.split('\n');
              const fieldLabels = new Set<string>();

              // Look for patterns like "Label:" or "Label :" (common in forms)
              for (const line of lines) {
                const trimmed = line.trim();
                // Skip very short or very long lines
                if (trimmed.length < 2 || trimmed.length > 80) continue;

                // Pattern: "Text:" or "Text :" at end of line
                if (trimmed.match(/.*:\s*$/)) {
                  const label = trimmed.replace(/:\s*$/, '').trim();
                  if (label.length > 2 && label.length < 50) {
                    fieldLabels.add(label);
                  }
                }
              }

              if (fieldLabels.size > 0) {
                const ocrFields = Array.from(fieldLabels).map((label) => {
                  const analysis = analyzeFieldDefinition(label);
                  return {
                    id: crypto.randomUUID(),
                    page: 1,
                    label: analysis.label,
                    fieldType: analysis.fieldType,
                    required: false,
                    plainTextHint: analysis.plainTextHint,
                    dropdownOptions: analysis.dropdownOptions,
                    stateOptions: analysis.stateOptions,
                    addressConfig: analysis.addressConfig,
                    postcodeConfig: analysis.postcodeConfig,
                    phoneConfig: analysis.phoneConfig,
                    numericConfig: analysis.numericConfig,
                    // No boundingBox - OCR doesn't give us coordinates
                  };
                });

                allFields = [...allFields, ...ocrFields];
                methods.push(`OCR (${ocrFields.length} fields)`);
                console.log('🔵 Created', ocrFields.length, 'fields from OCR text');
              }
            }
          }
        } catch (e) {
          console.warn('OCR fallback skipped:', e);
        }
      }

      console.log('🔵 Total extracted fields:', allFields.length);
      if (allFields.length === 0) {
        toast.error('No fields could be extracted from this PDF. Try manually adding fields.');
        return;
      }

      const autoResearchCandidates = allFields
        .filter((field) => shouldAutoResearchOptions(field))
        .slice(0, AUTO_OPTION_RESEARCH_LIMIT);

      if (autoResearchCandidates.length > 0) {
        toast.info(
          `Researching online option lists for ${autoResearchCandidates.length} extracted field${autoResearchCandidates.length === 1 ? '' : 's'}...`,
        );

        const enrichedFields = [...allFields];
        let researchedCount = 0;

        for (const candidate of autoResearchCandidates) {
          try {
            const result = await researchOnlineOptionsForField(candidate);
            if (!result) continue;

            const index = enrichedFields.findIndex((field) => field.id === candidate.id);
            if (index === -1) continue;

            enrichedFields[index] = {
              ...enrichedFields[index],
              ...result.patch,
            };
            researchedCount += 1;
          } catch (error) {
            console.warn(`Online option research skipped for ${candidate.label}:`, error);
          }
        }

        if (researchedCount > 0) {
          allFields = enrichedFields;
          methods.push(`Online options (${researchedCount})`);
        }
      }

      // Save all extracted fields
      console.log('🔵 ABOUT TO SAVE - Making PUT request...');
      const updatedTemplate = { ...selected, fields: [...selected.fields, ...allFields] };
      setSelected(updatedTemplate);
      
      console.log('🔵 PUT URL:', `/api/admin/report-disseminator/${selected.id}`);
      const saveRes = await fetch(`/api/admin/report-disseminator/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: updatedTemplate.fields,
          wizardData: updatedTemplate.wizardData,
          status: updatedTemplate.status,
          description: updatedTemplate.description || '',
          name: updatedTemplate.name,
        }),
      });
      console.log('🔵 PUT response status:', saveRes.status);

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        console.error('🔴 PUT failed:', errorData);
        throw new Error(errorData?.error || 'Failed to save extracted fields');
      }

      const savedTemplate = await saveRes.json();
      console.log('🔵 ✅ SAVED SUCCESSFULLY! Fields count:', savedTemplate.fields?.length);
      setSelected(savedTemplate);
      await loadTemplates();
      console.log('🔵 ✅ Templates reloaded');
      
      toast.success(`✓ Extracted & saved ${allFields.length} fields (${methods.join(' + ')})`);
      console.log('🔵 ✅ COMPLETE!');
    } catch (error: any) {
      console.error('🔴 [autoExtractAllFields] error:', error);
      toast.error(error.message || 'Field extraction failed');
    } finally {
      console.log('🔵 Setting extracting=false');
      setExtracting(false);
    }
  };

  const addField = () => {
    if (!selected) return;
    const next: ReportField = {
      id: crypto.randomUUID(),
      page: 1,
      label: 'New field',
      fieldType: 'text',
      required: false,
      plainTextHint: '',
    };
    setSelected({ ...selected, fields: [...(selected.fields || []), next] });
  };

  const updateField = (id: string, patch: Partial<ReportField>) => {
    if (!selected) return;
    setSelected({
      ...selected,
      fields: (selected.fields || []).map((field) => (field.id === id ? { ...field, ...patch } : field)),
    });
  };

  const buildFieldTypePatch = (field: ReportField, fieldType: FieldType): Partial<ReportField> => {
    const analysis = analyzeFieldDefinition(field.label, { fieldTypeHint: fieldType });

    const patch: Partial<ReportField> = {
      fieldType,
      plainTextHint: analysis.plainTextHint,
      dropdownOptions: undefined,
      stateOptions: undefined,
      addressConfig: undefined,
      postcodeConfig: undefined,
      phoneConfig: undefined,
      numericConfig: undefined,
      linkedConfig: undefined,
      inspectionPeriodConfig: undefined,
    };

    if (fieldType === 'dropdown') {
      patch.dropdownOptions = field.dropdownOptions?.length ? field.dropdownOptions : analysis.dropdownOptions || ['Option 1', 'Option 2'];
    }

    if (fieldType === 'state_enum') {
      patch.stateOptions = field.stateOptions?.length ? field.stateOptions : [...DEFAULT_STATE_OPTIONS];
    }

    if (fieldType === 'address') {
      patch.addressConfig = analysis.addressConfig || { mode: 'uk_address' };
    }

    if (fieldType === 'postcode') {
      patch.postcodeConfig = analysis.postcodeConfig || { country: 'GB', validateAddress: true };
    }

    if (fieldType === 'uk_phone') {
      patch.phoneConfig = analysis.phoneConfig || { country: 'GB' };
    }

    if (isNumericLikeFieldType(fieldType)) {
      patch.numericConfig = {
        min: field.numericConfig?.min,
        max: field.numericConfig?.max,
        resolution: field.numericConfig?.resolution,
        unit: field.numericConfig?.unit || analysis.numericConfig?.unit,
      };
    }

    if (fieldType === 'linked_text') {
      patch.linkedConfig = field.linkedConfig || {
        relatedSection: '',
        relatedFieldId: '',
        relationType: 'depends_on',
      };
    }

    if (fieldType === 'inspection_date_plus_period') {
      patch.inspectionPeriodConfig = field.inspectionPeriodConfig || {
        period: '1y',
        inspectionDateFieldId: '',
      };
    }

    return patch;
  };

  const applyWizardFieldType = (field: ReportField, fieldType: FieldType) => {
    updateField(field.id, buildFieldTypePatch(field, fieldType));

    if (fieldWizardIndex < fieldWizardFields.length - 1) {
      setFieldWizardIndex((currentIndex) => currentIndex + 1);
    }
  };

  const applyAiSuggestion = (field: ReportField) => {
    const analysis = analyzeFieldDefinition(field.label);
    const patch: Partial<ReportField> = {
      label: analysis.label,
      fieldType: analysis.fieldType,
      plainTextHint: analysis.plainTextHint,
      dropdownOptions: analysis.fieldType === 'dropdown' ? field.dropdownOptions || analysis.dropdownOptions || ['Option 1', 'Option 2'] : analysis.dropdownOptions,
      stateOptions: analysis.stateOptions,
      addressConfig: analysis.addressConfig,
      postcodeConfig: analysis.postcodeConfig,
      phoneConfig: analysis.phoneConfig,
      numericConfig: analysis.numericConfig,
    };

    const stringifyValue = (value: unknown) => {
      if (value === undefined) return 'none';
      if (typeof value === 'string') return value || '(empty)';
      if (Array.isArray(value)) return value.length ? value.join(', ') : '(empty)';
      return JSON.stringify(value);
    };

    const diffLines: string[] = [];
    if (patch.label !== field.label) {
      diffLines.push(`Label: ${field.label} -> ${patch.label}`);
    }
    if (patch.fieldType !== field.fieldType) {
      diffLines.push(`Type: ${field.fieldType} -> ${patch.fieldType}`);
    }

    const configComparisons: Array<{ name: string; before: unknown; after: unknown }> = [
      { name: 'Hint', before: field.plainTextHint, after: patch.plainTextHint },
      { name: 'Dropdown options', before: field.dropdownOptions, after: patch.dropdownOptions },
      { name: 'State options', before: field.stateOptions, after: patch.stateOptions },
      { name: 'Address config', before: field.addressConfig, after: patch.addressConfig },
      { name: 'Postcode config', before: field.postcodeConfig, after: patch.postcodeConfig },
      { name: 'Phone config', before: field.phoneConfig, after: patch.phoneConfig },
      { name: 'Numeric config', before: field.numericConfig, after: patch.numericConfig },
    ];

    for (const comparison of configComparisons) {
      if (JSON.stringify(comparison.before) !== JSON.stringify(comparison.after)) {
        diffLines.push(
          `${comparison.name}: ${stringifyValue(comparison.before)} -> ${stringifyValue(comparison.after)}`,
        );
      }
    }

    if (!diffLines.length) {
      toast.info(`No stronger AI suggestion for "${field.label}"`);
      return;
    }

    const confirmed = window.confirm(
      ['Apply AI suggestion to this field?', '', ...diffLines.map((line) => `- ${line}`)].join('\n'),
    );

    if (!confirmed) {
      toast.info('AI suggestion cancelled');
      return;
    }

    updateField(field.id, patch);
    toast.success(`AI suggestion applied: ${field.label} -> ${patch.fieldType}`);
  };

  const searchOnlineOptions = async (field: ReportField) => {
    if (!selected) return;
    setSearchingFieldId(field.id);
    try {
      const result = await researchOnlineOptionsForField(field, { notifyNoResults: true });
      if (!result) {
        return;
      }
      updateField(field.id, result.patch);
      const defaultNote = result.suggestedDefault ? ` · default: "${result.suggestedDefault}"` : ' · no default set';
      toast.success(
        `Applied ${result.optionCount} researched option${result.optionCount === 1 ? '' : 's'}${result.sourceCount ? ` from ${result.sourceCount} source${result.sourceCount === 1 ? '' : 's'}` : ''}${defaultNote}`,
      );
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to research option list');
    } finally {
      setSearchingFieldId((current) => (current === field.id ? null : current));
    }
  };

  const shouldAutoResearchOptions = (field: ReportField) => {
    if (field.dropdownOptions && field.dropdownOptions.length > 0) return false;
    if (field.fieldType === 'dropdown') return true;
    if (field.fieldType === 'text' && OPTION_FIELD_PATTERN.test(field.label)) return true;
    return false;
  };

  const researchOnlineOptionsForField = async (
    field: ReportField,
    options: { notifyNoResults?: boolean } = {}
  ): Promise<{ patch: Partial<ReportField>; optionCount: number; sourceCount: number; suggestedDefault?: string } | null> => {
    if (!selected) return null;
    if (!field.label.trim()) {
      if (options.notifyNoResults) {
        toast.error('Field label is required before searching online options');
      }
      return null;
    }

    const res = await fetch('/api/admin/report-disseminator/option-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: field.label,
        fieldType: field.fieldType,
        context: `${selected.name} | ${selected.sourceFileName}`,
        maxOptions: field.searchOptionsMax ?? 12,
      }),
    });
    showAiCostWarning(`Option search: ${field.label}`, '~£0.03');

    const payload = await res.json();
    if (!res.ok) {
      if (res.status === 402) {
        throw new Error('AI Gateway credits are exhausted or payment is required. Check your AI_GATEWAY_API_KEY billing.');
      }
      throw new Error(payload?.error || 'Failed to research option list');
    }

    if (!Array.isArray(payload.options) || payload.options.length === 0) {
      if (options.notifyNoResults) {
        toast.info(payload.notes || `No strong online option list found for "${field.label}"`);
      }
      return null;
    }

    const patch: Partial<ReportField> = {
      label: payload.normalizedLabel || field.label,
    };

    if (payload.suggestedFieldType === 'state_enum') {
      patch.fieldType = 'state_enum';
      patch.stateOptions = [...DEFAULT_STATE_OPTIONS];
      patch.dropdownOptions = undefined;
      patch.dropdownDefault = undefined;
    } else if (field.fieldType === 'sentence_builder') {
      // Keep sentence_builder type; populate dropdownOptions as snippets
      patch.dropdownOptions = payload.options;
      patch.stateOptions = undefined;
      // sentence_builder has no dropdownDefault concept
    } else {
      // text, dropdown, or any other type → convert to dropdown with the found options
      patch.fieldType = 'dropdown';
      patch.dropdownOptions = payload.options;
      patch.stateOptions = undefined;
      // Use AI-suggested default if available, otherwise leave blank
      patch.dropdownDefault = payload.suggestedDefault ?? undefined;
    }

    return {
      patch,
      optionCount: payload.options.length,
      sourceCount: Array.isArray(payload.sources) ? payload.sources.length : 0,
      suggestedDefault: payload.suggestedDefault as string | undefined,
    };
  };

  const upsertTemplateSummary = (template: DisseminatorTemplate) => {
    setTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
  };

  const upsertReportSummary = (report: DisseminatorReport | DisseminatorReportListItem) => {
    setReports((current) => [report, ...current.filter((item) => item.id !== report.id)]);
  };

  const updateTemplate = async () => {
    if (!selected) return;

    const isPublished = selected.status === 'published';
    const confirmMessage = isPublished
      ? [
          `Save changes to "${selected.name}"?`,
          '',
          'This template is published and cannot be edited directly.',
          'Confirming will:',
          '  - Clone it into a new draft with your changes',
          '  - Archive the current published version',
        ].join('\n')
      : [
          `Save changes to "${selected.name}"?`,
          '',
          `Status: ${selected.status}`,
          `Fields: ${selected.fields.length}`,
          '',
          'This will overwrite the current saved version.',
        ].join('\n');

    if (!window.confirm(confirmMessage)) return;

    const currentTemplate = selected;
    const updateBody = {
      fields: currentTemplate.fields,
      wizardData: stripTemplatePreviewValues(currentTemplate).wizardData,
      description: currentTemplate.description || '',
      name: currentTemplate.name,
      status: currentTemplate.status,
    };

    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/report-disseminator/${currentTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });

      const payload = await res.json();
      if (!res.ok) {
        if (
          res.status === 409 &&
          typeof payload?.error === 'string' &&
          payload.error.includes(IMMUTABLE_PUBLISHED_TEMPLATE_ERROR)
        ) {
          const cloneRes = await fetch(`/api/admin/report-disseminator/${currentTemplate.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intent: 'clone' }),
          });

          const clonePayload = await cloneRes.json();
          if (!cloneRes.ok) {
            throw new Error(clonePayload?.error || 'Failed to clone published template');
          }

          const saveCloneRes = await fetch(`/api/admin/report-disseminator/${clonePayload.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...updateBody,
              status: 'draft',
            }),
          });

          const savedClonePayload = await saveCloneRes.json();
          if (!saveCloneRes.ok) {
            throw new Error(savedClonePayload?.error || 'Failed to save cloned template');
          }

          setTemplates((current) =>
            current.map((item) =>
              item.id === currentTemplate.id ? { ...item, status: 'archived' } : item
            )
          );
          setSelected(stripTemplatePreviewValues(savedClonePayload));
          upsertTemplateSummary(savedClonePayload);
          setSelectedId(savedClonePayload.id);
          toast.success('Published template cloned and saved as draft');
          return;
        }

        throw new Error(payload?.error || 'Failed to save template');
      }

      setSelected(stripTemplatePreviewValues(payload));
      upsertTemplateSummary(payload);
      toast.success('Template updated');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const saveTemplateAsNew = async () => {
    if (!selected) return;
    if (!saveTemplateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/report-disseminator/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'save_as',
          fields: selected.fields,
          wizardData: stripTemplatePreviewValues(selected).wizardData,
          description: selected.description || '',
          name: saveTemplateName.trim(),
          status: selected.status,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to save template');
      }

      setSaveDialogOpen(false);
      setSaveTemplateName('');
      setSelected(stripTemplatePreviewValues(payload));
      upsertTemplateSummary(payload);
      toast.success('New template saved');
      setSelectedId(payload.id);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const publishTemplate = async () => {
    if (!selected) return;
    if (selected.status === 'published') {
      toast.error('Template is already published');
      return;
    }
    if (selected.status === 'archived') {
      toast.error('Cannot publish an archived template');
      return;
    }
    if (!selected.fields.length) {
      toast.error('Add fields before publishing');
      return;
    }
    if (!window.confirm(`Publish "${selected.name}"?\n\nPublished templates are immutable and can be used to create reports.\nTo make changes later, you will need to clone it first.`)) return;

    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/report-disseminator/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: selected.fields,
          wizardData: stripTemplatePreviewValues(selected).wizardData,
          description: selected.description || '',
          name: selected.name,
          status: 'published',
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to publish template');

      setSelected(stripTemplatePreviewValues(payload));
      upsertTemplateSummary(payload);
      toast.success('Template published');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to publish');
    } finally {
      setSavingTemplate(false);
    }
  };

  const cloneTemplate = async () => {
    if (!selected) return;
    if (!window.confirm(`Clone "${selected.name}" into a new editable draft?\n\nThe current version will be archived.`)) return;

    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/report-disseminator/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'clone' }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to clone template');

      setTemplates((current) =>
        current.map((item) =>
          item.id === selected.id ? { ...item, status: 'archived' as TemplateStatus } : item
        )
      );
      setSelected(stripTemplatePreviewValues(payload));
      upsertTemplateSummary(payload);
      setSelectedId(payload.id);
      toast.success('Cloned into a new draft');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to clone');
    } finally {
      setSavingTemplate(false);
    }
  };

  const archiveTemplate = async () => {
    if (!selected) return;
    if (selected.status === 'archived') {
      toast.error('Template is already archived');
      return;
    }
    if (!window.confirm(`Archive "${selected.name}"?\n\nArchived templates can no longer be edited or used to create new reports.`)) return;

    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/report-disseminator/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'archive' }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to archive template');

      setSelected(stripTemplatePreviewValues(payload));
      upsertTemplateSummary(payload);
      toast.success('Template archived');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to archive');
    } finally {
      setSavingTemplate(false);
    }
  };

  const openCreateReportDialog = () => {
    if (!selected) return;
    if (!selected.fields.length) {
      toast.error('Extract or add fields before creating a report');
      return;
    }
    setReportName(`${selected.name} report`);
    setReportDescription(selected.description || '');
    setCreateReportDialogOpen(true);
  };

  const createReportFromTemplate = async () => {
    if (!selected) return;
    if (!reportName.trim()) {
      toast.error('Report name is required');
      return;
    }

    if (!selected.sourcePdfBase64) {
      toast.error('This template is missing its source PDF snapshot');
      return;
    }

    // Build blank initial values — auto-generated refs keep their value (read-only),
    // all other fields start empty so the report is a clean blank form.
    const blankValues: Record<string, string> = {};
    const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for <input type="date">
    for (const field of selected.fields) {
      if (field.fieldType === 'auto_reference') {
        blankValues[field.id] = generateAutoReferenceValue(selected.id, field);
      } else if (field.fieldType === 'inspection_date_plus_period') {
        blankValues[field.id] = ''; // always blank on creation; auto-computed when inspection date is set
      } else if (field.fieldType === 'date') {
        blankValues[field.id] = todayISO;
      } else {
        blankValues[field.id] = field.dropdownDefault || '';
      }
    }

    setCreatingReport(true);
    try {
      const res = await fetch('/api/admin/report-disseminator/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selected.id,
          name: reportName.trim(),
          description: reportDescription.trim(),
          values: blankValues,
          notes: '',
          snapshot: {
            templateName: selected.name,
            templateVersion: selected.version,
            sourceFileName: selected.sourceFileName,
            sourceMimeType: selected.sourceMimeType,
            sourcePdfBase64: selected.sourcePdfBase64,
            fields: selected.fields,
          },
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to create report');
      }

      setCreateReportDialogOpen(false);
      setReportName('');
      setReportDescription('');
      setSelectedReport(payload);
      upsertReportSummary(payload);
      setSelectedReportId(payload.id);
      setEditorMode('report');
      navigateToReportEditor(payload.id);
      toast.success('Draft report created');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to create report');
    } finally {
      setCreatingReport(false);
    }
  };

  const openSaveReportDialog = () => {
    if (!selectedReport) return;
    setSaveReportName(selectedReport.name || '');
    setSaveReportDialogOpen(true);
  };

  const saveReport = async () => {
    if (!selectedReport) return;
    const trimmedName = saveReportName.trim();
    if (!trimmedName) {
      toast.error('Report name is required');
      return;
    }

    setSavingReport(true);
    try {
      const nextReport = {
        ...selectedReport,
        name: trimmedName,
      };

      const res = await fetch(`/api/admin/report-disseminator/reports/${selectedReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextReport.name,
          description: nextReport.description || '',
          status: nextReport.status,
          values: nextReport.values,
          notes: nextReport.notes || '',
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to save report');
      }

      setSaveReportDialogOpen(false);
      setSaveReportName('');
      setSelectedReport(payload);
      upsertReportSummary(payload);
      toast.success('Report saved');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save report');
    } finally {
      setSavingReport(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !selected) return;

    if (active.id !== over.id) {
      const oldIndex = selected.fields.findIndex((f) => f.id === active.id);
      const newIndex = selected.fields.findIndex((f) => f.id === over.id);
      setSelected({ ...selected, fields: arrayMove(selected.fields, oldIndex, newIndex) });
    }
  };

  const summarizeFields = (fields: ReportField[]) => {
    const numericCount = fields.filter((f) => isNumericLikeFieldType(f.fieldType)).length;
    const dropdownCount = fields.filter((f) => f.fieldType === 'dropdown').length;
    const addressCount = fields.filter((f) => f.fieldType === 'address' || f.fieldType === 'postcode').length;
    const phoneCount = fields.filter((f) => f.fieldType === 'uk_phone').length;
    return { numericCount, dropdownCount, addressCount, phoneCount };
  };

  const matchesFieldSearch = (field: ReportField, rawQuery: string) => {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      field.label,
      field.fieldType,
      field.plainTextHint || '',
      String(field.page),
    ].some((value) => value.toLowerCase().includes(query));
  };

  const wizardStep = selected?.wizardData?.currentStep || 1;
  const currentWizardStep = WIZARD_STEP_DETAILS[wizardStep as keyof typeof WIZARD_STEP_DETAILS] || WIZARD_STEP_DETAILS[1];
  const templateReadOnly = selected?.status === 'published' || selected?.status === 'archived';

  const STEP_TO_DISSEMINATOR_STEP: Record<number, DisseminatorStep> = { 1: 'extract', 2: 'fields', 3: 'fields', 4: 'preview' };
  const guidanceStep = STEP_TO_DISSEMINATOR_STEP[wizardStep] || 'fields';
  const guidanceItems = useMemo(() => {
    const stepItems = getStepGuidance(guidanceStep);
    const fieldSummaries = (selected?.fields || []).map((f) => ({
      id: f.id,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
      hasBoundingBox: !!f.boundingBox,
      hasDropdownOptions: (f.dropdownOptions?.length || 0) > 0,
      hasStateOptions: (f.stateOptions?.length || 0) > 0,
    }));
    const fieldItems = getFieldGuidance(fieldSummaries);
    return [...stepItems, ...fieldItems];
  }, [guidanceStep, selected?.fields]);

  const guidancePanelFields = useMemo(() =>
    (selected?.fields || []).map((f) => ({
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
      hasBoundingBox: !!f.boundingBox,
    })),
  [selected?.fields]);

  const unplacedFields = useMemo(
    () => selected?.fields.filter((field) => !field.boundingBox) || [],
    [selected]
  );
  const reportUnplacedFields = useMemo(
    () => selectedReport?.fields.filter((field) => !field.boundingBox) || [],
    [selectedReport]
  );
  const filteredTemplateFields = useMemo(
    () => selected?.fields.filter((field) => matchesFieldSearch(field, templateFieldSearch)) || [],
    [selected, templateFieldSearch]
  );
  const fieldWizardFields = useMemo(() => {
    if (!selected) return [] as ReportField[];

    return [...selected.fields].sort((left, right) => {
      const leftPlaced = Number(Boolean(left.boundingBox));
      const rightPlaced = Number(Boolean(right.boundingBox));
      if (leftPlaced !== rightPlaced) return leftPlaced - rightPlaced;
      return left.label.localeCompare(right.label);
    });
  }, [selected]);
  const filteredReportFields = useMemo(
    () => selectedReport?.fields.filter((field) => matchesFieldSearch(field, reportFieldSearch)) || [],
    [selectedReport, reportFieldSearch]
  );
  const filteredReportUnplacedFields = useMemo(
    () => reportUnplacedFields.filter((field) => matchesFieldSearch(field, reportFieldSearch)),
    [reportFieldSearch, reportUnplacedFields]
  );

  const selectedSummary = useMemo(() => {
    if (!selected) return null;
    return summarizeFields(selected.fields);
  }, [selected]);
  const selectedField = useMemo(
    () => selected?.fields.find((field) => field.id === selectedFieldId) || null,
    [selected, selectedFieldId]
  );
  const wizardField = fieldWizardFields[fieldWizardIndex] || null;
  const nextUnplacedField = useMemo(
    () => unplacedFields.find((field) => field.id !== selectedFieldId) || null,
    [selectedFieldId, unplacedFields]
  );
  const placementFields = useMemo(() => {
    if (!selected) return [] as ReportField[];

    return [...selected.fields].sort((left, right) => {
      const leftPlaced = Number(Boolean(left.boundingBox));
      const rightPlaced = Number(Boolean(right.boundingBox));
      if (leftPlaced !== rightPlaced) return leftPlaced - rightPlaced;
      return left.label.localeCompare(right.label);
    });
  }, [selected]);
  const placedFieldCount = selected?.fields.length
    ? selected.fields.length - unplacedFields.length
    : 0;
  const sourcePreviewRedactionOptions = manualPlacementMode
    ? { fieldBounds: false, labelMatch: false, genericText: false, pixelFallback: false }
    : redactionOptions;
  const selectedFieldPlacementSuggestion = selectedField ? placementSuggestions[selectedField.id] ?? null : null;

  useEffect(() => {
    setPlacementSuggestions({});
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.sourcePdfBase64 || !selectedField || selectedField.boundingBox) return;
    if (placementSuggestions[selectedField.id] !== undefined) return;

    let cancelled = false;

    (async () => {
      try {
        const suggestion = await findPlacementSuggestionForField(selected.sourcePdfBase64 || '', selectedField.label);
        if (!cancelled) {
          setPlacementSuggestions((current) => ({
            ...current,
            [selectedField.id]: suggestion,
          }));
        }
      } catch (error) {
        console.error('Failed to build placement suggestion', error);
        if (!cancelled) {
          setPlacementSuggestions((current) => ({
            ...current,
            [selectedField.id]: null,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placementSuggestions, selected?.sourcePdfBase64, selectedField]);

  useEffect(() => {
    setTemplateTab(getSuggestedTabForWizardStep(wizardStep));
  }, [wizardStep]);

  useEffect(() => {
    if (!selectedFieldId) {
      setManualPlacementMode(false);
      return;
    }

    if (selected && !selected.fields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(null);
      setManualPlacementMode(false);
    }
  }, [selected, selectedFieldId]);

  useEffect(() => {
    if (fieldWizardFields.length === 0) {
      setFieldWizardIndex(0);
      return;
    }

    setFieldWizardIndex((currentIndex) => Math.min(currentIndex, fieldWizardFields.length - 1));
  }, [fieldWizardFields]);

  useEffect(() => {
    if (wizardStep !== 2 || !wizardField) return;
    setSelectedFieldId(wizardField.id);
  }, [wizardField, wizardStep]);

  useEffect(() => {
    if (editorMode !== 'template' || templateTab !== 'preview-origin') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        Boolean(target?.isContentEditable);

      // Cmd/Ctrl+Z: undo last mapping.
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        if (mappingUndoStack.length) {
          event.preventDefault();
          undoLastMapping();
        }
        return;
      }

      if (isEditable || event.altKey) return;

      if (event.key === 'n') {
        event.preventDefault();
        if (nextUnplacedField) {
          setSelectedFieldId(nextUnplacedField.id);
        }
      }

      if (event.key === 'c') {
        if (!selectedField?.boundingBox) return;
        event.preventDefault();
        clearSelectedFieldPlacement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorMode, templateTab, nextUnplacedField, selectedField, mappingUndoStack]);

  const selectedReportSummary = useMemo(() => {
    if (!selectedReport) return null;
    return summarizeFields(selectedReport.fields);
  }, [selectedReport]);

  const assignBoundingBoxToSelectedField = (
    pageNumber: number,
    boundingBox: { x: number; y: number; width: number; height: number }
  ) => {
    if (!selected || !selectedFieldId) return;

    const field = selected.fields.find((candidate) => candidate.id === selectedFieldId);

    // Push current state onto undo stack before overwriting.
    setMappingUndoStack((prev) => [
      ...prev,
      { fieldId: selectedFieldId, previousBoundingBox: field?.boundingBox, previousPage: field?.page ?? 1 },
    ]);

    const nextUnplacedField = selected.fields.find(
      (candidate) => candidate.id !== selectedFieldId && !candidate.boundingBox,
    );

    updateField(selectedFieldId, {
      page: pageNumber,
      boundingBox,
    });

    toast.success(`Mapped ${field?.label || 'field'} to page ${pageNumber}`);

    if (nextUnplacedField) {
      setSelectedFieldId(nextUnplacedField.id);
    } else {
      setManualPlacementMode(false);
    }
  };

  const clearSelectedFieldPlacement = () => {
    if (!selectedFieldId) return;
    updateField(selectedFieldId, { boundingBox: undefined });
  };

  const undoLastMapping = () => {
    if (!mappingUndoStack.length) return;
    const last = mappingUndoStack[mappingUndoStack.length - 1];
    setMappingUndoStack((prev) => prev.slice(0, -1));
    if (!selected) return;
    setSelected({
      ...selected,
      fields: selected.fields.map((f) =>
        f.id === last.fieldId
          ? { ...f, page: last.previousPage, boundingBox: last.previousBoundingBox }
          : f,
      ),
    });
    setSelectedFieldId(last.fieldId);
    const fieldLabel = selected.fields.find((f) => f.id === last.fieldId)?.label;
    toast.info(`Undid mapping for ${fieldLabel || 'field'}`);
  };

  const startWizardStepThrough = () => {
    setWizardDraft(EMPTY_WIZARD_DRAFT);
    setWizardFieldsAdded(0);
    setWizardPhase('select');
    setWizardActive(true);
    setManualPlacementMode(false);
    setTemplateTab('preview-origin');
  };

  const cancelWizardStepThrough = () => {
    setWizardActive(false);
    setWizardPhase('select');
    setWizardDraft(EMPTY_WIZARD_DRAFT);
  };

  // ── Step 1 / Step 2 handlers ────────────────────────────────────────

  const startStep1 = () => {
    setStep1Blanks([]);
    setStep2Queue([]);
    setStep1Active(true);
    setManualPlacementMode(false);
    setWizardActive(false);
    setTemplateTab('preview-origin');
  };

  const cancelStep1 = () => {
    setStep1Active(false);
    setStep1Blanks([]);
    setStep2Queue([]);
  };

  const handleStep1Click = (
    pageNumber: number,
    boundingBox: { x: number; y: number; width: number; height: number },
  ) => {
    setStep1Blanks((prev) => [...prev, { ...boundingBox, page: pageNumber }]);
  };

  const handleStep1Update = (
    globalIdx: number,
    boundingBox: { x: number; y: number; width: number; height: number },
  ) => {
    setStep1Blanks((prev) =>
      prev.map((b, i) => (i === globalIdx ? { ...b, ...boundingBox } : b)),
    );
  };

  const undoStep1Blank = () => {
    setStep1Blanks((prev) => prev.slice(0, -1));
  };

  const startStep2 = () => {
    if (!step1Blanks.length) return;
    const [first, ...rest] = step1Blanks;
    setStep2Queue(rest);
    setWizardDraft({
      ...EMPTY_WIZARD_DRAFT,
      boundingBox: { x: first.x, y: first.y, width: first.width, height: first.height },
      page: first.page,
    });
    setWizardFieldsAdded(0);
    setWizardPhase('name');
    setWizardActive(true);
    setStep1Active(false);
  };

  const handleWizardBoundingBoxSelect = (
    pageNumber: number,
    boundingBox: { x: number; y: number; width: number; height: number },
  ) => {
    setWizardDraft((d) => ({ ...d, boundingBox, page: pageNumber }));
    setWizardPhase('name');
  };

  const confirmWizardField = () => {
    if (!selected || !wizardDraft.boundingBox || !wizardDraft.label.trim()) return;
    const analysis = analyzeFieldDefinition(wizardDraft.label, { fieldTypeHint: wizardDraft.fieldType });
    const newField: ReportField = {
      id: crypto.randomUUID(),
      page: wizardDraft.page,
      label: wizardDraft.label.trim(),
      fieldType: wizardDraft.fieldType,
      required: false,
      boundingBox: wizardDraft.boundingBox,
      plainTextHint:
        wizardDraft.prefix || wizardDraft.suffix
          ? `${wizardDraft.prefix}[value]${wizardDraft.suffix}`.trim()
          : analysis.plainTextHint,
      stateOptions: wizardDraft.fieldType === 'state_enum' ? wizardDraft.stateOptions : undefined,
      dropdownOptions: wizardDraft.fieldType === 'dropdown' ? wizardDraft.dropdownOptions : undefined,
      numericConfig: isNumericLikeFieldType(wizardDraft.fieldType)
        ? { unit: wizardDraft.numericUnit || undefined, resolution: wizardDraft.increment ? 1 : undefined }
        : undefined,
    };
    setSelected({ ...selected, fields: [...(selected.fields || []), newField] });
    setWizardFieldsAdded((n) => n + 1);
    toast.success(
      `Added "${newField.label}" (${wizardFieldsAdded + 1} field${wizardFieldsAdded + 1 !== 1 ? 's' : ''} added this session)`,
    );
    if (step2Queue.length > 0) {
      // Advance to the next blank in the step2 queue
      const [next, ...remaining] = step2Queue;
      setStep2Queue(remaining);
      setWizardDraft({
        ...EMPTY_WIZARD_DRAFT,
        boundingBox: { x: next.x, y: next.y, width: next.width, height: next.height },
        page: next.page,
      });
      setWizardPhase('name');
    } else if (step1Blanks.length > 0) {
      // All step1 areas have been named — clean up
      setStep1Blanks([]);
      setStep2Queue([]);
      setWizardActive(false);
      setWizardPhase('select');
      setWizardDraft(EMPTY_WIZARD_DRAFT);
      toast.success('All detected fields have been named!');
    } else {
      setWizardDraft(EMPTY_WIZARD_DRAFT);
      setWizardPhase('select');
    }
  };

  const toggleManualPlacementMode = () => {
    if (manualPlacementMode) {
      setManualPlacementMode(false);
      return;
    }

    const targetField = selectedField || nextUnplacedField || selected?.fields[0] || null;
    if (!targetField) return;

    if (!selectedFieldId || selectedFieldId !== targetField.id) {
      setSelectedFieldId(targetField.id);
    }
    setManualPlacementMode(true);
  };

  const updatePreviewValue = (fieldId: string, value: string) => {
    setPreviewValues((current) => {
      const next: Record<string, string> = { ...current, [fieldId]: value };
      // Cascade-compute inspection_date_plus_period fields whose source is fieldId
      if (selected) {
        for (const f of selected.fields) {
          if (
            f.fieldType === 'inspection_date_plus_period' &&
            f.inspectionPeriodConfig?.inspectionDateFieldId === fieldId &&
            f.inspectionPeriodConfig.period !== 'custom'
          ) {
            next[f.id] = value ? computeNextInspectionDate(value, f.inspectionPeriodConfig.period) : '';
          }
        }
        // Exclusion: grey out / restore fields that this field excludes
        const changedField = selected.fields.find((f) => f.id === fieldId);
        if (changedField?.excludes?.length) {
          for (const rule of changedField.excludes) {
            const triggers = value && (!rule.whenValues?.length || rule.whenValues.includes(value));
            if (!rule.excludeValues?.length) {
              // Full-field exclusion: lock to N/A or restore to ''
              next[rule.fieldId] = triggers ? 'N/A' : '';
            } else if (triggers && rule.excludeValues.includes(next[rule.fieldId] ?? '')) {
              // Option-level: only clear the target value if it is one of the excluded options
              next[rule.fieldId] = '';
            }
          }
        }
      }
      return next;
    });
  };

  const updateReportValue = (fieldId: string, value: string) => {
    setSelectedReport((currentReport) => {
      if (!currentReport) return currentReport;
      const nextValues = { ...currentReport.values, [fieldId]: value };

      // Auto-populate linked Section 7 observations for C1/C2/C3 codes
      const changedField = currentReport.fields?.find((f: ReportField) => f.id === fieldId);
      if (changedField?.fieldType === 'state_enum' && changedField.linkedConfig) {
        const { relatedFieldId, relatedSection } = changedField.linkedConfig;
        const isDeficiency = value === 'C1' || value === 'C2' || value === 'C3';

        if (relatedSection === 'section7_observations' && relatedFieldId) {
          // Find target observation row fields by matching relatedFieldId prefix
          // Convention: observation row fields share id prefix, e.g. "obs_row_1_code", "obs_row_1_desc"
          const codeFieldId = `${relatedFieldId}_code`;
          const descFieldId = `${relatedFieldId}_desc`;
          const refFieldId = `${relatedFieldId}_ref`;

          if (isDeficiency) {
            // Auto-populate the observation row
            const refLabel = changedField.label.match(/^[\d.]+/)?.[0] ?? changedField.label;
            nextValues[refFieldId] = refLabel;
            nextValues[descFieldId] = changedField.plainTextHint || changedField.label;
            nextValues[codeFieldId] = value;
          } else {
            // Clear auto-populated row when code changes away from C1/C2/C3
            nextValues[refFieldId] = '';
            nextValues[descFieldId] = '';
            nextValues[codeFieldId] = '';
          }
        }
      }

      // Exclusion: grey out / restore fields that this field excludes
      if (changedField?.excludes?.length) {
        for (const rule of changedField.excludes) {
          const triggers = value && (!rule.whenValues?.length || rule.whenValues.includes(value));
          if (!rule.excludeValues?.length) {
            // Full-field exclusion: lock to N/A or restore to ''
            nextValues[rule.fieldId] = triggers ? 'N/A' : '';
          } else if (triggers && rule.excludeValues.includes(nextValues[rule.fieldId] ?? '')) {
            // Option-level: only clear the target value if it is one of the excluded options
            nextValues[rule.fieldId] = '';
          }
        }
      }

      // Cascade-compute inspection_date_plus_period fields when their source date changes
      for (const f of (currentReport.fields ?? []) as ReportField[]) {
        if (
          f.fieldType === 'inspection_date_plus_period' &&
          f.inspectionPeriodConfig?.inspectionDateFieldId === fieldId &&
          f.inspectionPeriodConfig.period !== 'custom'
        ) {
          nextValues[f.id] = nextValues[fieldId]
            ? computeNextInspectionDate(nextValues[fieldId], f.inspectionPeriodConfig.period)
            : '';
        }
      }

      return { ...currentReport, values: nextValues };
    });
  };

const getIncomingExclusionsForField = (
    fieldId: string,
    values: Record<string, string>,
    allFields?: ReportField[]
  ): IncomingExclusion[] => {
    if (!allFields?.length) return [];

    return allFields.flatMap((sourceField) =>
      (sourceField.excludes || [])
        .map((rule, index) => ({ rule, index }))
        .filter(({ rule }) => rule.fieldId === fieldId)
        .map(({ rule, index }) => {
          const sourceValue = String(values[sourceField.id] ?? '');
          const whenValues = rule.whenValues?.filter(Boolean);
          const excludeValues = rule.excludeValues?.filter(Boolean);
          const isTriggered = Boolean(sourceValue) && (!whenValues?.length || whenValues.includes(sourceValue));

          return {
            key: `${sourceField.id}:${index}`,
            sourceField,
            sourceValue,
            whenValues,
            excludeValues,
            affectsWholeField: !excludeValues?.length,
            isTriggered,
          } satisfies IncomingExclusion;
        })
    );
  };

const renderIncomingExclusionSummary = (
    field: ReportField,
    values: Record<string, string>,
    allFields?: ReportField[]
  ) => {
    const incomingExclusions = getIncomingExclusionsForField(field.id, values, allFields);
    if (!incomingExclusions.length) return null;

    return (
      <div className="mt-2 rounded-md border border-amber-200/70 bg-amber-50/40 px-2 py-1.5 text-[11px] text-amber-900">
        <p className="font-medium">Applicable exclusions for this field</p>
        <div className="mt-1 space-y-1">
          {incomingExclusions.map((rule) => (
            <div key={rule.key} className="rounded border border-amber-200/60 bg-white/60 px-2 py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">From: {rule.sourceField.label}</span>
                <span className={`rounded px-1 py-0.5 text-[10px] ${rule.isTriggered ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                  {rule.isTriggered ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-0.5 text-amber-900/90">
                Trigger: {rule.whenValues?.length ? rule.whenValues.join(', ') : 'any non-empty value'}
                {rule.sourceValue ? ` (current: ${rule.sourceValue})` : ' (current: empty)'}
              </p>
              <p className="text-amber-900/90">
                Effect: {rule.affectsWholeField ? 'lock field to N/A' : `exclude options: ${rule.excludeValues!.join(', ')}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

const renderInlineFieldInput = (
    field: ReportField,
    values: Record<string, string>,
    onValueChange: (fieldId: string, value: string) => void,
    allFields?: ReportField[]
  ) => {
    const commonClassName = 'w-full rounded border border-input bg-background px-3 py-2 text-sm';
    const value = values[field.id] || '';

    const incomingExclusions = getIncomingExclusionsForField(field.id, values, allFields);
    const activeFullFieldExclusions = incomingExclusions.filter((rule) => rule.isTriggered && rule.affectsWholeField);

    // Check if this field is fully excluded (excludeValues absent/empty → entire field locked to N/A)
    if (activeFullFieldExclusions.length > 0) {
      const sourceLabels = activeFullFieldExclusions.map((rule) => rule.sourceField.label);
      return (
        <div className="relative">
          <input
            disabled
            className={`${commonClassName} cursor-not-allowed bg-muted text-muted-foreground`}
            value="N/A"
            title={`Excluded by: ${sourceLabels.join(', ')}`}
          />
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Excluded — active rule source{sourceLabels.length > 1 ? 's' : ''}: {sourceLabels.join(', ')}
          </span>
        </div>
      );
    }
    // Compute options that should be hidden in this field due to option-level exclude rules on other fields
    const excludedOptions: string[] = Array.from(
      new Set(
        incomingExclusions
          .filter((rule) => rule.isTriggered && !rule.affectsWholeField)
          .flatMap((rule) => rule.excludeValues || [])
      )
    );

if (field.fieldType === 'auto_zs') {
      const deviceType = values[`${field.id}_deviceType`] || '';
      const rating = values[`${field.id}_rating`] || '';
      const maxZs = calculateMaxZs(deviceType, rating);
      const validCombo = isValidZsCombo(deviceType, rating);
      
      return (
        <div className="grid grid-cols-2 gap-2 space-y-2 [&_.text-destructive]:text-red-500">
          <div>
            <Label className="text-xs">Device Type</Label>
            <select
              className={commonClassName}
              title={`${field.label} device type`}
              value={deviceType}
              onChange={(e) => onValueChange(`${field.id}_deviceType`, e.target.value)}
            >
              <option value="">Select type</option>
              {DEVICE_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Rating</Label>
            <select
              className={commonClassName}
              title={`${field.label} rating`}
              value={rating}
              onChange={(e) => onValueChange(`${field.id}_rating`, e.target.value)}
              disabled={!deviceType}
            >
              <option value="">Select rating</option>
              {deviceType && getValidRatingsForType(deviceType).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs font-mono">Max Zs Permitted (BS7671)</Label>
            <Input
              className={`font-mono text-sm font-semibold border-2 ${
                validCombo 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : deviceType && rating 
                    ? 'bg-red-50 border-red-200 text-red-800' 
                    : 'bg-slate-50 border-slate-200'
              }`}
              value={maxZs}
              readOnly
              title={`BS7671 Table 41.3: ${deviceType} ${rating} → ${maxZs}`}
            />
            {deviceType && rating && !validCombo && (
              <p className="text-xs text-destructive">
                ⚠️ Invalid device/rating combination
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Compare with measured Zs below
            </p>
          </div>
        </div>
      );
    }

    if (field.fieldType === 'dropdown') {
      return (
        <select
          className={commonClassName}
          title={field.label}
          value={value}
          onChange={(event) => onValueChange(field.id, event.target.value)}
          onFocus={() => setSelectedFieldId(field.id)}
        >
          <option value="">Select {field.label}</option>
          {(field.dropdownOptions || []).filter((o) => !excludedOptions.includes(o)).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.fieldType === 'sentence_builder') {
      const snippets = field.dropdownOptions || [];
      return (
        <div className="space-y-1">
          {snippets.length > 0 && (
            <select
              className={commonClassName}
              title={`Add a snippet to ${field.label}`}
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  const current = values[field.id] || '';
                  onValueChange(field.id, current ? `${current} ${event.target.value}` : event.target.value);
                }
              }}
              onFocus={() => setSelectedFieldId(field.id)}
            >
              <option value="">+ Add snippet…</option>
              {snippets.filter((s) => !excludedOptions.includes(s)).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <Input
            className="w-full"
            title={field.label}
            type="text"
            placeholder={field.plainTextHint || field.label}
            value={value}
            onChange={(event) => onValueChange(field.id, event.target.value)}
            onFocus={() => setSelectedFieldId(field.id)}
          />
        </div>
      );
    }

    if (field.fieldType === 'state_enum') {
      return (
        <select
          className={commonClassName}
          title={field.label}
          value={value}
          onChange={(event) => onValueChange(field.id, event.target.value)}
          onFocus={() => setSelectedFieldId(field.id)}
        >
          <option value="">Select {field.label}</option>
          {(field.stateOptions || [...DEFAULT_STATE_OPTIONS]).filter((o) => !excludedOptions.includes(o)).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.fieldType === 'auto_reference') {
      return (
        <Input
          className="w-full bg-muted text-muted-foreground"
          value={value}
          title={field.label}
          readOnly
          onFocus={() => setSelectedFieldId(field.id)}
        />
      );
    }

    if (field.fieldType === 'inspection_date_plus_period') {
      const isCustom = field.inspectionPeriodConfig?.period === 'custom';
      return (
        <Input
          className={`w-full${!isCustom ? ' bg-muted text-muted-foreground' : ''}`}
          title={isCustom ? field.label : `${field.label} (auto-computed)`}
          type="date"
          value={value}
          readOnly={!isCustom}
          onChange={isCustom ? (event) => onValueChange(field.id, event.target.value) : undefined}
          onFocus={() => setSelectedFieldId(field.id)}
        />
      );
    }

    if (field.fieldType === 'date') {
      return (
        <Input
          className="w-full"
          title={field.label}
          type="date"
          required={field.required}
          value={value}
          onChange={(event) => onValueChange(field.id, event.target.value)}
          onFocus={() => setSelectedFieldId(field.id)}
        />
      );
    }

    return (
      <Input
        className="w-full"
        title={field.label}
        type={isNumericLikeFieldType(field.fieldType) ? 'number' : field.fieldType === 'uk_phone' ? 'tel' : 'text'}
        placeholder={field.plainTextHint || field.label}
        min={field.numericConfig?.min}
        max={field.numericConfig?.max}
        step={field.numericConfig?.resolution}
        value={value}
        onChange={(event) => onValueChange(field.id, event.target.value)}
        onFocus={() => setSelectedFieldId(field.id)}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Report Disseminator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a source PDF and build a facsimile-ready template with per-field intent metadata.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Templates are reusable definitions. Saved reports are filled-in copies created from those templates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create From Source PDF</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-2 md:col-span-1">
            <Label>Template name</Label>
            <Input title="Internal name for this reusable template" value={name} onChange={(e) => setName(e.target.value)} placeholder="EICR Original Facsimile" />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Description</Label>
            <Input title="Optional context explaining what this template is for" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Source PDF</Label>
            <Input title="Upload the original source PDF to mirror as a form template" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
          </div>
          <Button type="button" title="Create a new template from the uploaded source PDF" onClick={createTemplate} className="md:col-span-1" disabled={creating}>
            <Upload className="w-4 h-4 mr-2" />
            {creating ? 'Processing…' : userRole && userRole !== 'admin' && !paymentSessionId ? 'Pay £5 & Create' : 'Upload & Create'}
          </Button>
          <p className="text-xs text-muted-foreground md:col-span-4">
            Upload creates the template shell. Field extraction, mapping, validation, and review happen in the builder below.
          </p>
          {createFeedback && (
            <p className={`text-sm md:col-span-4 ${createFeedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {createFeedback.message}
            </p>
          )}
        </CardContent>
      </Card>

              <div className={`grid grid-cols-1 gap-6 ${isSidebarCollapsed ? 'lg:grid-cols-[56px_minmax(0,1fr)]' : 'lg:grid-cols-3'}`}>
        {isSidebarCollapsed ? (
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <Card>
              <CardContent className="flex min-h-[320px] items-center justify-center p-2">
                <Button
                  type="button"
                  variant="ghost"
                  title="Expand templates and reports sidebar"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="flex h-full min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed text-xs"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                  <span className="[writing-mode:vertical-rl] rotate-180 tracking-[0.2em] uppercase">Templates</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        ) : (
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Templates</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Collapse templates and reports to the left"
                onClick={() => setIsSidebarCollapsed(true)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loading && templates.length === 0 && <p className="text-sm text-muted-foreground">No templates yet.</p>}
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`w-full text-left border rounded p-3 ${
                    editorMode === 'template' && selectedId === template.id ? 'border-primary' : 'border-border'
                  }`}
                  onClick={() => {
                    setEditorMode('template');
                    setSelectedId(template.id);
                    setSelectedFieldId(null);
                    navigateToTemplateEditor(template.id);
                  }}
                >
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{template.sourceFileName}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Reusable template definition for future reports.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary">v{template.version}</Badge>
                    <Badge variant={template.status === 'published' ? 'default' : template.status === 'archived' ? 'secondary' : 'outline'}>{template.status}</Badge>
                    {template.parentTemplateId && (
                      <Badge variant="outline" className="text-[10px]">cloned</Badge>
                    )}
                  </div>
                  {(template.publishedAt || template.archivedAt) && (
                    <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                      {template.publishedAt && <p>Published {new Date(template.publishedAt).toLocaleDateString()}</p>}
                      {template.archivedAt && <p>Archived {new Date(template.archivedAt).toLocaleDateString()}</p>}
                    </div>
                  )}
                  {(template.status === 'draft' || template.status === 'review') && (
                    <div className="mt-2">
                      <span
                        role="button"
                        tabIndex={0}
                        className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditorMode('template');
                          setSelectedId(template.id);
                          setSelectedFieldId(null);
                          navigateToTemplateEditor(template.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            setEditorMode('template');
                            setSelectedId(template.id);
                            setSelectedFieldId(null);
                            navigateToTemplateEditor(template.id);
                          }
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingReports && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loadingReports && reports.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No saved reports yet. Create one from a template once the form layout is ready.
                </p>
              )}
              {reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className={`w-full text-left border rounded p-3 ${
                    editorMode === 'report' && selectedReportId === report.id ? 'border-primary' : 'border-border'
                  }`}
                  onClick={() => {
                    setEditorMode('report');
                    setSelectedReportId(report.id);
                    setSelectedFieldId(null);
                    navigateToReportEditor(report.id);
                  }}
                >
                  <p className="font-medium text-sm">{report.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From {report.templateName} v{report.templateVersion}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Saved report instance with its own values and notes.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={report.status === 'completed' ? 'default' : 'outline'}>{report.status}</Badge>
                    {report.updatedAt && (
                      <span className="text-[11px] text-muted-foreground">
                        Updated {new Date(report.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
        )}

        <Card className={isSidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-2'}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>{editorMode === 'report' ? 'Saved Report Editor' : 'Template Builder'}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {editorMode === 'report'
                  ? 'Saved reports hold completed form data. Templates remain reusable definitions.'
                  : 'Templates define the extracted fields, validations, and layout used by future saved reports.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                title={isSidebarCollapsed ? 'Expand the templates and reports sidebar' : 'Collapse the templates and reports sidebar'}
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                className="hidden lg:inline-flex"
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="mr-2 h-4 w-4" /> : <PanelLeftClose className="mr-2 h-4 w-4" />}
                {isSidebarCollapsed ? 'Expand Lists' : 'Collapse Lists'}
              </Button>
            {editorMode === 'template' && selected && (
              <>
                <div className="hidden md:flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4" />
                  Steps set the current review focus and switch to the most relevant tab.
                </div>
                <Select
                  value={String(wizardStep)}
                  onValueChange={(value) =>
                    setSelected({
                      ...selected,
                      wizardData: { ...selected.wizardData, currentStep: Number(value) },
                    })
                  }
                >
                  <SelectTrigger className="w-[220px]" title="Choose the current template-building step">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Step 1: Field inventory</SelectItem>
                    <SelectItem value="2">Step 2: Intent type mapping</SelectItem>
                    <SelectItem value="3">Step 3: Validation rules</SelectItem>
                    <SelectItem value="4">Step 4: Review & publish state</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editorMode === 'template' && !selected && (
              <p className="text-sm text-muted-foreground">Select a template to begin building the form definition.</p>
            )}

            {editorMode === 'template' && selected && (
              <>
                {templateReadOnly && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm">
                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300">
                        {selected.status === 'published' ? 'Published template — read-only' : 'Archived template — read-only'}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400/70">
                        {selected.status === 'published'
                          ? 'Clone this template to create a new editable draft.'
                          : 'Archived templates cannot be edited.'}
                      </p>
                    </div>
                  </div>
                )}

                <GuidancePanel
                  items={guidanceItems}
                  templateName={selected.name}
                  wizardStep={wizardStep}
                  fields={guidancePanelFields}
                  isAdmin={userRole === 'admin'}
                />

                <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Step {wizardStep}: {currentWizardStep.title}</p>
                      <p className="text-sm text-muted-foreground">{currentWizardStep.summary}</p>
                    </div>
                    <Badge variant="outline">Wizard focus</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{currentWizardStep.focus}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Template title</Label>
                    <Input title="Name displayed in the templates list and used for new reports" value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} disabled={templateReadOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Input title="Current lifecycle state" value={selected.status} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input title="Original uploaded PDF file name" value={selected.sourceFileName} disabled />
                  </div>
                </div>

                {(selected.publishedAt || selected.archivedAt || selected.parentTemplateId) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {selected.publishedAt && <span>Published: {new Date(selected.publishedAt).toLocaleDateString()}</span>}
                    {selected.archivedAt && <span>Archived: {new Date(selected.archivedAt).toLocaleDateString()}</span>}
                    {selected.parentTemplateId && <span>Cloned from template #{selected.parentTemplateId}</span>}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" title="Scan the PDF and build an initial field list using extraction and AI analysis" variant="default" size="sm" onClick={autoExtractAllFields} disabled={extracting || !file || !selected || templateReadOnly}>
                    <Wand2 className="w-4 h-4 mr-1" />
                    {extracting ? 'Extracting Fields...' : 'Auto Extract'}
                  </Button>
                  <Button type="button" title="Insert a blank field when extraction missed something" onClick={addField} variant="outline" size="sm" disabled={!selected || templateReadOnly}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Field Manually
                  </Button>
                  <Button type="button" title="Create a saved report instance from the current template definition" onClick={openCreateReportDialog} variant="outline" size="sm" disabled={!selected.fields.length || selected.status === 'archived'}>
                    <Plus className="w-4 h-4 mr-1" />
                    Create Draft Report
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto Extract builds the template. Create Draft Report snapshots the current template into a saved form instance.
                </p>

                <Tabs value={templateTab} onValueChange={setTemplateTab} className="w-full">
                  <TabsList>
                    <TabsTrigger value="fields" title="Field list and field configuration editor">
                      <List className="w-4 h-4 mr-2" />
                      Fields
                    </TabsTrigger>
                    <TabsTrigger value="preview-origin" title="Original PDF with field overlays for placement review">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Source
                    </TabsTrigger>
                    <TabsTrigger value="preview-template" title="Rendered facsimile preview showing how the generated form behaves">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Template
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="fields" className="space-y-3 mt-4">
                    <p className="text-xs text-muted-foreground">
                      Fields is the working tab for inventory, field typing, and validation setup.
                    </p>
                    {wizardStep === 2 && wizardField && (
                      <div className="space-y-4 rounded-md border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Type Wizard</p>
                            <p className="text-xs text-muted-foreground">
                              Work through each extracted field and confirm what control type it should become in the generated template.
                            </p>
                          </div>
                          <Badge variant="outline">
                            Field {fieldWizardIndex + 1} of {fieldWizardFields.length}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                          <div className="space-y-2">
                            <p className="text-lg font-semibold leading-tight">{wizardField.label}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>Current type: {wizardField.fieldType}</span>
                              <span>Page {wizardField.page}</span>
                              <span>{wizardField.boundingBox ? 'Placed on PDF' : 'Not mapped yet'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Use this guided step for repeated schedule items too. If a field is one of the tick/cross/NA/LIM/NV entries, choose <span className="font-medium">Tick/Cross/NA/LIM/NV</span>.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFieldWizardIndex((currentIndex) => Math.max(currentIndex - 1, 0))}
                              disabled={fieldWizardIndex === 0}
                            >
                              Previous
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFieldWizardIndex((currentIndex) => Math.min(currentIndex + 1, fieldWizardFields.length - 1))}
                              disabled={fieldWizardIndex >= fieldWizardFields.length - 1}
                            >
                              Skip
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                          <Button type="button" variant="outline" className="justify-start" onClick={() => applyWizardFieldType(wizardField, 'state_enum')}>
                            Tick/Cross/NA/LIM/NV
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => applyWizardFieldType(wizardField, 'text')}>
                            Plain text
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => applyWizardFieldType(wizardField, 'dropdown')}>
                            Dropdown options
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => applyWizardFieldType(wizardField, 'date')}>
                            Date picker
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => applyWizardFieldType(wizardField, 'numeric')}>
                            Numeric value
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => applyWizardFieldType(wizardField, 'auto_reference')}>
                            Auto-generated reference
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => applyWizardFieldType(wizardField, 'address')}>
                            UK address
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => applyWizardFieldType(wizardField, 'postcode')}>
                            UK postcode
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => applyWizardFieldType(wizardField, 'uk_phone')}>
                            UK phone number
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => applyAiSuggestion(wizardField)}>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Ask AI For This Field
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFieldId(wizardField.id);
                              setTemplateTab('preview-origin');
                            }}
                          >
                            Review Placement
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="template-field-search">Search fields</Label>
                      <Input
                        id="template-field-search"
                        title="Filter fields by label, type, hint, or page number"
                        value={templateFieldSearch}
                        onChange={(event) => setTemplateFieldSearch(event.target.value)}
                        placeholder="Search template fields..."
                      />
                      {selected.fields.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Showing {filteredTemplateFields.length} of {selected.fields.length} fields.
                        </p>
                      )}
                    </div>
                    {selected.fields.length === 0 && (
                      <p className="text-sm text-muted-foreground">No fields yet. Add a field or auto-extract them.</p>
                    )}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={filteredTemplateFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                        {filteredTemplateFields.map((field) => (
                          <SortableFieldRow
                            key={field.id}
                            field={field}
                            allFields={selected.fields}
                            onUpdate={(patch) => updateField(field.id, patch)}
                            onAiSuggest={() => applyAiSuggestion(field)}
                            onSearchOnlineOptions={() => searchOnlineOptions(field)}
                            searchingOnlineOptions={searchingFieldId === field.id}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    {selected.fields.length > 0 && filteredTemplateFields.length === 0 && (
                      <p className="text-sm text-muted-foreground">No template fields match that search.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="preview-origin" className="mt-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        {textEditActive ? (
                          /* — Text Edit panel — */
                          <div className="space-y-3 rounded-md border border-blue-400 bg-blue-50/50 p-4 dark:bg-blue-950/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Text Editing</p>
                                <p className="text-xs text-muted-foreground">
                                  {textOverlays.length} overlay{textOverlays.length !== 1 ? 's' : ''} added
                                </p>
                              </div>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setTextEditActive(false)}>
                                Done
                              </Button>
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              Click any text on the PDF to select it. Then choose to white it out or replace it with static text or a <code className="text-[10px]">&#123;&#123;handlebars&#125;&#125;</code> variable that fills in automatically.
                            </p>
                            {textOverlays.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Applied overlays:</p>
                                <div className="max-h-40 space-y-0.5 overflow-y-auto">
                                  {textOverlays.map((o, i) => (
                                    <div key={o.id} className="flex items-center justify-between rounded bg-white px-2 py-1 text-[11px] text-muted-foreground ring-1 ring-gray-200 dark:bg-gray-900">
                                      <span className="truncate flex-1">
                                        {i + 1}.{' '}
                                        {o.replacementText ? (
                                          <span className="text-blue-700 dark:text-blue-400">&ldquo;{o.replacementText.slice(0, 40)}{o.replacementText.length > 40 ? '…' : ''}&rdquo;</span>
                                        ) : (
                                          <span className="italic text-gray-400">white-out</span>
                                        )}
                                      </span>
                                      <button
                                        type="button"
                                        className="ml-2 text-red-400 hover:text-red-600"
                                        title="Remove this overlay"
                                        onClick={() => handleRemoveTextOverlay(o.id)}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-red-500 hover:text-red-600"
                                  onClick={() => setTextOverlays([])}
                                >
                                  Clear all overlays
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : step1Active ? (
                          /* — Step 1: Mark Field Areas panel — */
                          <div className="space-y-3 rounded-md border border-green-500 bg-green-50/50 p-4 dark:bg-green-950/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-green-700 dark:text-green-400">Step 1 — Mark Field Areas</p>
                                <p className="text-xs text-muted-foreground">
                                  {step1Blanks.length} area{step1Blanks.length !== 1 ? 's' : ''} detected
                                </p>
                              </div>
                              <Button type="button" size="sm" variant="ghost" onClick={cancelStep1}>
                                Cancel
                              </Button>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-400">
                              Click on each blank data-entry box in the PDF. The app will detect the box boundary and mark it. Click all fields you want to define, then continue.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!step1Blanks.length}
                                onClick={undoStep1Blank}
                              >
                                Undo Last
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={!step1Blanks.length}
                                onClick={startStep2}
                              >
                                Continue to Step 2 — Name Fields ({step1Blanks.length})
                              </Button>
                            </div>
                            {step1Blanks.length > 0 && (
                              <div className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                                {step1Blanks.map((b, i) => (
                                  <p key={i}>
                                    {i + 1}. Page {b.page} — {Math.round(b.width)}&times;{Math.round(b.height)} pt
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : wizardActive ? (
                          /* — Wizard Step Through panel — */
                          <div className="space-y-3 rounded-md border border-teal-500 bg-teal-50/50 p-4 dark:bg-teal-950/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                                  {step1Blanks.length > 0 ? 'Step 2 — Name Fields' : 'Wizard Step Through'}
                                </p>
                                {step1Blanks.length > 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    Field {wizardFieldsAdded + 1} of {step1Blanks.length}
                                  </p>
                                ) : wizardFieldsAdded > 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    {wizardFieldsAdded} field{wizardFieldsAdded !== 1 ? 's' : ''} added this session
                                  </p>
                                ) : null}
                              </div>
                              <Button type="button" size="sm" variant="ghost" onClick={cancelWizardStepThrough}>
                                Exit
                              </Button>
                            </div>

                            {/* Phase: select */}
                            {wizardPhase === 'select' && (
                              <p className="text-sm text-teal-700 dark:text-teal-400">
                                Click on a field area in the PDF to begin defining it.
                              </p>
                            )}

                            {/* Phase: name */}
                            {wizardPhase === 'name' && (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Field label</Label>
                                  <Input
                                    autoFocus
                                    placeholder="e.g. Certificate Ref"
                                    value={wizardDraft.label}
                                    onChange={(e) => setWizardDraft((d) => ({ ...d, label: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && wizardDraft.label.trim()) setWizardPhase('type');
                                    }}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" variant="ghost" onClick={() => setWizardPhase('select')}>
                                    Back
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={!wizardDraft.label.trim()}
                                    onClick={() => setWizardPhase('type')}
                                  >
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Phase: type */}
                            {wizardPhase === 'type' && (
                              <div className="space-y-3">
                                <p className="text-xs text-muted-foreground">Select the data type for this field:</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {FIELD_TYPES.map((ft) => (
                                    <button
                                      key={ft.value}
                                      type="button"
                                      className={`rounded-md border px-2 py-2 text-left text-xs hover:bg-muted/50 ${
                                        wizardDraft.fieldType === ft.value
                                          ? 'border-primary bg-primary/10 font-semibold'
                                          : 'border-border'
                                      }`}
                                      onClick={() => {
                                        setWizardDraft((d) => ({ ...d, fieldType: ft.value }));
                                        setWizardPhase('logic');
                                      }}
                                    >
                                      {ft.label}
                                    </button>
                                  ))}
                                </div>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setWizardPhase('name')}>
                                  Back
                                </Button>
                              </div>
                            )}

                            {/* Phase: logic */}
                            {wizardPhase === 'logic' && (
                              <div className="space-y-3">
                                {wizardDraft.fieldType === 'state_enum' && (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Choose which states are valid:</p>
                                    {(['tick', 'cross', 'NA', 'LIM', 'NV'] as const).map((opt) => (
                                      <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={wizardDraft.stateOptions.includes(opt)}
                                          onChange={(e) =>
                                            setWizardDraft((d) => ({
                                              ...d,
                                              stateOptions: e.target.checked
                                                ? [...d.stateOptions, opt]
                                                : d.stateOptions.filter((s) => s !== opt),
                                            }))
                                          }
                                        />
                                        {opt === 'tick' ? '✓ Tick' : opt === 'cross' ? '✗ Cross' : opt}
                                      </label>
                                    ))}
                                  </div>
                                )}
                                {wizardDraft.fieldType === 'dropdown' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs">Options (one per line)</Label>
                                    <textarea
                                      title="Dropdown options — one per line"
                                      className="w-full rounded-md border bg-background px-2 py-1 text-xs"
                                      rows={4}
                                      value={wizardDraft.dropdownOptions.join('\n')}
                                      onChange={(e) =>
                                        setWizardDraft((d) => ({
                                          ...d,
                                          dropdownOptions: e.target.value.split('\n'),
                                        }))
                                      }
                                    />
                                  </div>
                                )}
                                {(wizardDraft.fieldType === 'text' || wizardDraft.fieldType === 'auto_reference') && (
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <div className="flex-1 space-y-1">
                                        <Label className="text-xs">Prefix</Label>
                                        <Input
                                          className="h-7 text-xs"
                                          placeholder="e.g. CERT-"
                                          value={wizardDraft.prefix}
                                          onChange={(e) => setWizardDraft((d) => ({ ...d, prefix: e.target.value }))}
                                        />
                                      </div>
                                      <div className="flex-1 space-y-1">
                                        <Label className="text-xs">Suffix</Label>
                                        <Input
                                          className="h-7 text-xs"
                                          value={wizardDraft.suffix}
                                          onChange={(e) => setWizardDraft((d) => ({ ...d, suffix: e.target.value }))}
                                        />
                                      </div>
                                    </div>
                                    {wizardDraft.fieldType === 'auto_reference' && (
                                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={wizardDraft.increment}
                                          onChange={(e) => setWizardDraft((d) => ({ ...d, increment: e.target.checked }))}
                                        />
                                        Auto-increment number
                                      </label>
                                    )}
                                  </div>
                                )}
                                {isNumericLikeFieldType(wizardDraft.fieldType) && (
                                  <div className="space-y-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Unit (optional)</Label>
                                      <Input
                                        className="h-7 text-xs"
                                        placeholder="e.g. Ω, V, mA"
                                        value={wizardDraft.numericUnit}
                                        onChange={(e) => setWizardDraft((d) => ({ ...d, numericUnit: e.target.value }))}
                                      />
                                    </div>
                                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={wizardDraft.increment}
                                        onChange={(e) => setWizardDraft((d) => ({ ...d, increment: e.target.checked }))}
                                      />
                                      Whole numbers only
                                    </label>
                                  </div>
                                )}
                                {!['state_enum', 'dropdown', 'text', 'auto_reference'].includes(wizardDraft.fieldType) &&
                                  !isNumericLikeFieldType(wizardDraft.fieldType) && (
                                    <p className="text-xs text-muted-foreground">
                                      No additional configuration needed for this type.
                                    </p>
                                  )}
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" variant="ghost" onClick={() => setWizardPhase('type')}>
                                    Back
                                  </Button>
                                  <Button type="button" size="sm" onClick={() => setWizardPhase('confirm')}>
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Phase: confirm */}
                            {wizardPhase === 'confirm' && (
                              <div className="space-y-3">
                                <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
                                  <p>
                                    <span className="text-xs text-muted-foreground">Label: </span>
                                    {wizardDraft.label}
                                  </p>
                                  <p>
                                    <span className="text-xs text-muted-foreground">Type: </span>
                                    {FIELD_TYPES.find((ft) => ft.value === wizardDraft.fieldType)?.label}
                                  </p>
                                  <p>
                                    <span className="text-xs text-muted-foreground">Page: </span>
                                    {wizardDraft.page}
                                  </p>
                                  {wizardDraft.prefix && (
                                    <p>
                                      <span className="text-xs text-muted-foreground">Prefix: </span>
                                      {wizardDraft.prefix}
                                    </p>
                                  )}
                                  {wizardDraft.suffix && (
                                    <p>
                                      <span className="text-xs text-muted-foreground">Suffix: </span>
                                      {wizardDraft.suffix}
                                    </p>
                                  )}
                                  {wizardDraft.increment && (
                                    <p className="text-xs text-teal-600 dark:text-teal-400">
                                      Auto-increment / whole numbers enabled
                                    </p>
                                  )}
                                  {wizardDraft.numericUnit && (
                                    <p>
                                      <span className="text-xs text-muted-foreground">Unit: </span>
                                      {wizardDraft.numericUnit}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" size="sm" variant="ghost" onClick={() => setWizardPhase('logic')}>
                                    Back
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!wizardDraft.boundingBox || !wizardDraft.label.trim()}
                                    onClick={confirmWizardField}
                                  >
                                    {step2Queue.length > 0 ? 'Save & Name Next' : 'Add & Define Next'}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={!wizardDraft.boundingBox || !wizardDraft.label.trim()}
                                    onClick={() => {
                                      confirmWizardField();
                                      setWizardActive(false);
                                      setStep2Queue([]);
                                      setStep1Blanks([]);
                                    }}
                                  >
                                    {step1Blanks.length > 0 ? 'Save & Finish' : 'Finish Wizard'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="space-y-3 rounded-md border p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">Manual Placement</p>
                                  <p className="text-xs text-muted-foreground">
                                    Auto Detect lets you click text to infer its bounds. Manual Box lets you draw and adjust a box with handles.
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {placedFieldCount} of {selected.fields.length} fields placed, {unplacedFields.length} remaining.
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Select value={placementMode} onValueChange={(value: 'auto' | 'manual') => setPlacementMode(value)}>
                                    <SelectTrigger className="w-[160px]" title="Choose whether mapping clicks auto-detect text bounds or use a manual box">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="auto">Auto Detect</SelectItem>
                                      <SelectItem value="manual">Manual Box</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={manualPlacementMode ? 'default' : 'outline'}
                                    disabled={!selected?.fields.length}
                                    title={selected?.fields.length ? 'Enable placement mode and target the selected or next unplaced field' : 'Add or extract fields before using placement mode'}
                                    onClick={toggleManualPlacementMode}
                                  >
                                    {manualPlacementMode ? 'Disable Mapping Mode' : 'Enable Mapping Mode'}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!mappingUndoStack.length}
                                    title="Undo the last mapping assignment (Cmd/Ctrl+Z)"
                                    onClick={undoLastMapping}
                                  >
                                    Undo
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!selectedField?.boundingBox}
                                    onClick={clearSelectedFieldPlacement}
                                  >
                                    Clear Placement
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    title="Step through each field one by one: click its area on the PDF, name it, choose its type and configure logic"
                                    onClick={startWizardStepThrough}
                                  >
                                    <Wand2 className="mr-1.5 h-3 w-3" />
                                    Wizard
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    title="Click all blank entry boxes on the PDF — the app detects each boundary and marks it. Then name them all in Step 2."
                                    onClick={startStep1}
                                  >
                                    Step 1: Mark Fields
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={textEditActive ? 'default' : 'outline'}
                                    title="Select text in the PDF to white-out or replace with static text or dynamic {{handlebars}} values"
                                    onClick={() => setTextEditActive((v) => !v)}
                                  >
                                    Edit Text
                                  </Button>
                                </div>
                              </div>
                              {selectedField && (
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <p>
                                    Selected field: {selectedField.label}
                                    {selectedField.boundingBox ? ` on page ${selectedField.page}` : ' has no placement yet'}
                                    {manualPlacementMode
                                      ? unplacedFields.some((field) => field.id !== selectedField.id)
                                        ? '. After placing it, mapping moves to the next unplaced field automatically.'
                                        : '. This is the last unplaced field.'
                                      : ''}
                                  </p>
                                  {!selectedField.boundingBox && selectedFieldPlacementSuggestion && (
                                    <p>
                                      Suggested placement: page {selectedFieldPlacementSuggestion.pageNumber},{' '}
                                      {selectedFieldPlacementSuggestion.relation === 'right_of_label'
                                        ? 'just to the right of'
                                        : 'just below'}{' '}
                                      "{selectedFieldPlacementSuggestion.anchorText}".
                                    </p>
                                  )}
                                  {!selectedField.boundingBox && placementSuggestions[selectedField.id] === undefined && (
                                    <p>Finding a likely label match in the PDF to suggest where this field should be mapped.</p>
                                  )}
                                </div>
                              )}
                              {manualPlacementMode && (
                                <p className="text-xs text-muted-foreground">
                                  Mapping mode shows the raw PDF by disabling preview redaction temporarily.
                                  {placementMode === 'auto'
                                    ? ' Click the relevant text area to infer a box automatically.'
                                    : ' Drag out a box, then move or resize it with handles if needed.'}
                                </p>
                              )}
                              {!selectedField && selected?.fields.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Enable mapping mode will automatically choose the next unplaced field if none is selected.
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Shortcuts: <span className="font-medium">n</span> next unplaced field, <span className="font-medium">c</span> clear placement, <span className="font-medium">⌘Z</span> undo last mapping.
                              </p>
                            </div>

                            <div className="space-y-3 rounded-md border p-4 lg:max-h-[calc(100vh-14rem)] lg:overflow-auto">
                              <div>
                                <p className="text-sm font-medium">Fields</p>
                                <p className="text-xs text-muted-foreground">
                                  Unplaced fields are listed first so you can work through the remaining placements quickly.
                                </p>
                              </div>
                              <div className="space-y-2">
                                {placementFields.map((field) => {
                                  const isSelected = field.id === selectedFieldId;
                                  const isPlaced = Boolean(field.boundingBox);
                                  return (
                                    <button
                                      key={field.id}
                                      type="button"
                                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                                      }`}
                                      onClick={() => setSelectedFieldId(field.id)}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="font-medium">{field.label}</span>
                                        <span className={`text-[10px] uppercase tracking-wide ${isPlaced ? 'text-emerald-600' : 'text-amber-600'}`}>
                                          {isPlaced ? 'placed' : 'unplaced'}
                                        </span>
                                      </div>
                                      <div className="mt-1 text-[11px] text-muted-foreground">
                                        {field.boundingBox ? `Page ${field.page}` : 'No placement yet'}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-3 min-w-0">
                        <RedactionLogicControls value={redactionOptions} onChange={setRedactionOptions} />
                        <p className="text-xs text-muted-foreground">
                          Preview Source helps verify that extracted fields are on the right page and roughly aligned with the original PDF.
                        </p>
                        <PdfDocumentPreview
                          pdfBase64={selected.sourcePdfBase64}
                          fields={selected.fields}
                          redactionOptions={sourcePreviewRedactionOptions}
                          selectedId={selectedFieldId}
                          onSelectField={setSelectedFieldId}
                          manualPlacementField={
                            wizardActive && wizardPhase === 'select'
                              ? { id: '__wizard__', label: 'Click to place new field' }
                              : manualPlacementMode && selectedField
                                ? { id: selectedField.id, label: selectedField.label }
                                : null
                          }
                          placementMode={wizardActive ? 'auto' : placementMode}
                          suggestedPlacement={
                            !wizardActive && manualPlacementMode && selectedField && !selectedField.boundingBox
                              ? selectedFieldPlacementSuggestion
                              : null
                          }
                          onAssignBoundingBox={
                            wizardActive && wizardPhase === 'select'
                              ? handleWizardBoundingBoxSelect
                              : assignBoundingBoxToSelectedField
                          }
                          step1Mode={step1Active}
                          step1Blanks={step1Blanks}
                          onStep1Click={handleStep1Click}
                          onStep1Update={handleStep1Update}
                          textEditMode={textEditActive}
                          textOverlays={textOverlays}
                          onAddTextOverlay={handleAddTextOverlay}
                          onUpdateTextOverlay={handleUpdateTextOverlay}
                          onRemoveTextOverlay={handleRemoveTextOverlay}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="preview-template" className="mt-4 space-y-3">
                    <RedactionLogicControls value={redactionOptions} onChange={setRedactionOptions} />
                    <p className="text-sm text-muted-foreground">
                      This preview renders the actual generated form layout from the uploaded source PDF with interactive
                      inputs for every extracted field.
                    </p>
                    <PdfFormDocumentPreview
                      pdfBase64={selected.sourcePdfBase64}
                      fields={selected.fields}
                      values={previewValues}
                      redactionOptions={redactionOptions}
                      onValueChange={updatePreviewValue}
                      selectedId={selectedFieldId}
                      onSelectField={setSelectedFieldId}
                    />

                    {unplacedFields.length > 0 && (
                      <div className="space-y-3 rounded-md border p-4">
                        <div>
                          <p className="text-sm font-medium">Fields Without Placement</p>
                          <p className="text-xs text-muted-foreground">
                            These extracted fields do not have page coordinates yet, so they are shown here for data entry.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {unplacedFields.map((field) => (
                            <div key={field.id} className="space-y-1">
                              <Label>{field.label}</Label>
                              {renderInlineFieldInput(field, previewValues, updatePreviewValue, selected.fields)}
                              {renderIncomingExclusionSummary(field, previewValues, selected.fields)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label>Template notes</Label>
                  <Textarea
                    title="Internal notes about assumptions, extraction quality, and reviewer guidance"
                    value={selected.wizardData?.notes || ''}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        wizardData: { ...selected.wizardData, notes: e.target.value },
                      })
                    }
                    placeholder="Capture assumptions and field intent notes..."
                    disabled={templateReadOnly}
                  />
                </div>

                {wizardStep === 4 && (
                  <div className="space-y-3 border rounded-md p-3">
                    <Label>Review & publish</Label>
                    <p className="text-sm text-muted-foreground">
                      No final template upload is needed here. Publishing uses the original uploaded PDF together with the
                      extracted fields and the layout metadata you have configured.
                    </p>
                  </div>
                )}

                {selectedSummary && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Fields: {selected.fields.length}</Badge>
                    <Badge variant="outline">Numeric: {selectedSummary.numericCount}</Badge>
                    <Badge variant="outline">Dropdown: {selectedSummary.dropdownCount}</Badge>
                    <Badge variant="outline">Address/Postcode: {selectedSummary.addressCount}</Badge>
                    <Badge variant="outline">Phone: {selectedSummary.phoneCount}</Badge>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {editorMode === 'template' && !templateReadOnly && autoSaveStatus !== 'idle' && (
                    <span className={`text-xs mr-2 ${autoSaveStatus === 'saving' ? 'text-muted-foreground' : autoSaveStatus === 'saved' ? 'text-green-600' : 'text-destructive'}`}>
                      {autoSaveStatus === 'saving' ? 'Auto-saving…' : autoSaveStatus === 'saved' ? 'Auto-saved' : 'Auto-save failed'}
                    </span>
                  )}
                  {selected.status === 'published' && (
                    <Button type="button" title="Clone this published template into a new editable draft" variant="default" onClick={cloneTemplate} disabled={savingTemplate}>
                      <Copy className="w-4 h-4 mr-2" />
                      Clone to Draft
                    </Button>
                  )}
                  {!templateReadOnly && (
                    <>
                      <Button type="button" title="Archive this template so it can no longer be edited or used" variant="outline" onClick={archiveTemplate} disabled={savingTemplate}>
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </Button>
                      <Button type="button" title="Save the current template as a separate named copy" variant="outline" onClick={() => {
                        setSaveTemplateName(selected.name);
                        setSaveDialogOpen(true);
                      }} disabled={savingTemplate}>
                        <Save className="w-4 h-4 mr-2" />
                        Save As
                      </Button>
                      <Button type="button" title="Save changes to this template" onClick={updateTemplate} disabled={savingTemplate}>
                        <Save className="w-4 h-4 mr-2" />
                        {savingTemplate ? 'Saving…' : 'Save Draft'}
                      </Button>
                      {(selected.status === 'draft' || selected.status === 'review') && (
                        <Button type="button" title="Publish this template — it will become immutable" variant="default" onClick={publishTemplate} disabled={savingTemplate || !selected.fields.length}>
                          <Send className="w-4 h-4 mr-2" />
                          Publish
                        </Button>
                      )}
                    </>
                  )}
                  {selected.status === 'archived' && (
                    <Button type="button" title="Clone this archived template into a new editable draft" variant="default" onClick={cloneTemplate} disabled={savingTemplate}>
                      <Copy className="w-4 h-4 mr-2" />
                      Clone to Draft
                    </Button>
                  )}
                </div>
              </>
            )}

            {editorMode === 'report' && !selectedReport && (
              <p className="text-sm text-muted-foreground">
                Select a saved report from the list, or create one from a template once the template is ready.
              </p>
            )}

            {editorMode === 'report' && selectedReport && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Report title</Label>
                    <Input
                      title="Name used to identify this saved report instance"
                      value={selectedReport.name}
                      onChange={(e) =>
                        setSelectedReport({ ...selectedReport, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={selectedReport.status}
                      onValueChange={(value: ReportStatus) =>
                        setSelectedReport({ ...selectedReport, status: value })
                      }
                    >
                      <SelectTrigger title="Lifecycle state for this saved report"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">draft</SelectItem>
                        <SelectItem value="completed">completed</SelectItem>
                        <SelectItem value="archived">archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Based on template</Label>
                    <Input title="Template version this report was created from" value={`${selectedReport.templateName} v${selectedReport.templateVersion}`} disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Report description</Label>
                  <Input
                    title="Optional context specific to this saved report"
                    value={selectedReport.description || ''}
                    onChange={(e) =>
                      setSelectedReport({ ...selectedReport, description: e.target.value })
                    }
                    placeholder="Optional description"
                  />
                </div>

                <Tabs value={reportTab} onValueChange={setReportTab} className="w-full">
                  <TabsList>
                    <TabsTrigger value="report-form" title="Rendered facsimile form for this saved report">
                      <Eye className="w-4 h-4 mr-2" />
                      Rendered Form
                    </TabsTrigger>
                    <TabsTrigger value="report-fields" title="Flat list of all fields for direct editing">
                      <List className="w-4 h-4 mr-2" />
                      All Fields
                    </TabsTrigger>
                    <TabsTrigger value="report-source" title="Original source PDF with field overlays for review">
                      <Eye className="w-4 h-4 mr-2" />
                      Source PDF
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="report-form" className="mt-4 space-y-3">
                    <RedactionLogicControls value={redactionOptions} onChange={setRedactionOptions} />
                    <p className="text-sm text-muted-foreground">
                      This is the saved report instance. Values entered here belong to this report, not the reusable template.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="report-field-search">Search report fields</Label>
                      <Input
                        id="report-field-search"
                        title="Filter report fields by label, type, hint, or page number"
                        value={reportFieldSearch}
                        onChange={(event) => setReportFieldSearch(event.target.value)}
                        placeholder="Search report fields..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Showing {filteredReportFields.length} of {selectedReport.fields.length} report fields.
                      </p>
                    </div>
                    <PdfFormDocumentPreview
                      pdfBase64={selectedReport.sourcePdfBase64}
                      fields={selectedReport.fields}
                      values={selectedReport.values}
                      redactionOptions={redactionOptions}
                      onValueChange={updateReportValue}
                      selectedId={selectedFieldId}
                      onSelectField={setSelectedFieldId}
                    />

                    {filteredReportUnplacedFields.length > 0 && (
                      <div className="space-y-3 rounded-md border p-4">
                        <div>
                          <p className="text-sm font-medium">Unplaced Fields</p>
                          <p className="text-xs text-muted-foreground">
                            These report fields do not have page coordinates, so they are editable below.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {filteredReportUnplacedFields.map((field) => (
                            <div key={field.id} className="space-y-1">
                              <Label>{field.label}</Label>
                              {renderInlineFieldInput(field, selectedReport.values, updateReportValue, selectedReport.fields)}
                              {renderIncomingExclusionSummary(field, selectedReport.values, selectedReport.fields)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {reportUnplacedFields.length > 0 && filteredReportUnplacedFields.length === 0 && (
                      <p className="text-sm text-muted-foreground">No unplaced report fields match that search.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="report-fields" className="mt-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {filteredReportFields.map((field) => (
                        <div key={field.id} className="space-y-1 rounded-md border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Label>{field.label}</Label>
                            <Badge variant="outline">{field.fieldType}</Badge>
                          </div>
                          {renderInlineFieldInput(field, selectedReport.values, updateReportValue, selectedReport.fields)}
                          {renderIncomingExclusionSummary(field, selectedReport.values, selectedReport.fields)}
                        </div>
                      ))}
                    </div>
                    {filteredReportFields.length === 0 && (
                      <p className="mt-3 text-sm text-muted-foreground">No report fields match that search.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="report-source" className="mt-4">
                    <RedactionLogicControls value={redactionOptions} onChange={setRedactionOptions} />
                    <PdfDocumentPreview
                      pdfBase64={selectedReport.sourcePdfBase64}
                      fields={selectedReport.fields}
                      redactionOptions={redactionOptions}
                      selectedId={selectedFieldId}
                      onSelectField={setSelectedFieldId}
                    />
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label>Report notes</Label>
                  <Textarea
                    title="Notes saved only against this report instance"
                    value={selectedReport.notes || ''}
                    onChange={(e) =>
                      setSelectedReport({ ...selectedReport, notes: e.target.value })
                    }
                    placeholder="Save contextual notes for this filled report..."
                  />
                </div>

                {selectedReportSummary && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Fields: {selectedReport.fields.length}</Badge>
                    <Badge variant="outline">Numeric: {selectedReportSummary.numericCount}</Badge>
                    <Badge variant="outline">Dropdown: {selectedReportSummary.dropdownCount}</Badge>
                    <Badge variant="outline">Address/Postcode: {selectedReportSummary.addressCount}</Badge>
                    <Badge variant="outline">Phone: {selectedReportSummary.phoneCount}</Badge>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  {editorMode === 'report' && autoSaveStatus !== 'idle' && (
                    <span className={`text-xs mr-2 ${autoSaveStatus === 'saving' ? 'text-muted-foreground' : autoSaveStatus === 'saved' ? 'text-green-600' : 'text-destructive'}`}>
                      {autoSaveStatus === 'saving' ? 'Auto-saving…' : autoSaveStatus === 'saved' ? 'Auto-saved' : 'Auto-save failed'}
                    </span>
                  )}
                  <Button type="button" title="Save values and notes for this saved report" onClick={openSaveReportDialog} disabled={savingReport}>
                    <Save className="w-4 h-4 mr-2" />
                    {savingReport ? 'Saving…' : 'Save Report'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Save As Template</h2>
              <p className="text-sm text-muted-foreground">
                Create a new reusable template entry from the current source PDF, extracted fields, and layout metadata.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="save-template-name">Template name</Label>
              <Input
                id="save-template-name"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="Enter template name"
                autoFocus
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSaveDialogOpen(false);
                  setSaveTemplateName('');
                }}
                disabled={savingTemplate}
              >
                Cancel
              </Button>
              <Button type="button" onClick={saveTemplateAsNew} disabled={savingTemplate}>
                {savingTemplate ? 'Saving…' : 'Save Template'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {createReportDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Create Draft Report</h2>
              <p className="text-sm text-muted-foreground">
                This creates a saved draft report from the current template snapshot and opens it in the report editor.
                Future edits to the template will not overwrite this report.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-name">Report name</Label>
                <Input
                  id="report-name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-description">Description</Label>
                <Input
                  id="report-description"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateReportDialogOpen(false);
                  setReportName('');
                  setReportDescription('');
                }}
                disabled={creatingReport}
              >
                Cancel
              </Button>
              <Button type="button" onClick={createReportFromTemplate} disabled={creatingReport}>
                {creatingReport ? 'Creating…' : 'Create Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {saveReportDialogOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Save Report</h2>
              <p className="text-sm text-muted-foreground">
                Choose the name to save this report under before persisting its values and notes.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="save-report-name">Report name</Label>
              <Input
                id="save-report-name"
                value={saveReportName}
                onChange={(e) => setSaveReportName(e.target.value)}
                placeholder="Enter report name"
                autoFocus
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSaveReportDialogOpen(false);
                  setSaveReportName('');
                }}
                disabled={savingReport}
              >
                Cancel
              </Button>
              <Button type="button" onClick={saveReport} disabled={savingReport}>
                {savingReport ? 'Saving…' : 'Save Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

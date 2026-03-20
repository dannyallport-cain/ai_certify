'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Upload, Wand2, Save, Eye, List } from 'lucide-react';
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
import { PdfPageCanvas } from '@/components/disseminator/PdfPageCanvas';
import { PdfFormPageCanvas } from '@/components/disseminator/PdfFormPageCanvas';
import { validateUkPostcode } from '@/lib/report-disseminator/postcode';

type FieldType = 'dropdown' | 'address' | 'state_enum' | 'numeric' | 'text' | 'linked_text';

type ReportField = {
  id: string;
  page: number;
  label: string;
  fieldType: FieldType;
  required: boolean;
  plainTextHint?: string;
  dropdownOptions?: string[];
  stateOptions?: Array<'tick' | 'cross' | 'NA' | 'LIM' | 'NV'>;
  addressConfig?: { mode: 'uk_postcode_format' };
  numericConfig?: { min?: number; max?: number; resolution?: number; unit?: string };
  linkedConfig?: { relatedSection: string; relatedFieldId: string; relationType: 'mirrors' | 'derived_from' | 'depends_on' };
  boundingBox?: { x: number; y: number; width: number; height: number };
};

type DisseminatorTemplate = {
  id: number;
  name: string;
  description?: string | null;
  status: 'draft' | 'review' | 'published' | 'archived';
  version: number;
  sourceFileName: string;
  sourceMimeType: string;
  sourcePdfBase64?: string;
  fields: ReportField[];
  wizardData: {
    currentStep?: number;
    notes?: string;
    aiSuggestionsEnabled?: boolean;
  };
};

const FIELD_TYPES: Array<{ value: FieldType; label: string }> = [
  { value: 'text', label: 'Plain text' },
  { value: 'dropdown', label: 'Dropdown options' },
  { value: 'address', label: 'Address (UK postcode format)' },
  { value: 'state_enum', label: 'Tick/Cross/NA/LIM/NV' },
  { value: 'numeric', label: 'Numeric value' },
  { value: 'linked_text', label: 'Related section text' },
];

function PdfDocumentPreview({
  pdfBase64,
  fields,
  selectedId,
  onSelectField,
}: {
  pdfBase64?: string;
  fields: ReportField[];
  selectedId: string | null;
  onSelectField: (id: string | null) => void;
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
              selectedId={selectedId}
              onSelectField={onSelectField}
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
}: {
  pdfBase64?: string;
  fields: ReportField[];
  values: Record<string, string>;
  onValueChange: (fieldId: string, value: string) => void;
  selectedId: string | null;
  onSelectField: (id: string | null) => void;
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
              fields={fields.filter((field) => field.page === pageNumber && field.boundingBox)}
              values={values}
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

function SortableFieldRow({ field, onUpdate, onAiSuggest }: { field: ReportField; onUpdate: (patch: Partial<ReportField>) => void; onAiSuggest: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [postcodeTest, setPostcodeTest] = useState('');
  const [postcodeResult, setPostcodeResult] = useState<{ valid: boolean; error?: string } | null>(null);

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
    <div ref={setNodeRef} style={style} className="border rounded p-3 space-y-3 bg-white">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Field label</Label>
          <Input value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Page</Label>
          <Input type="number" min={1} value={field.page} onChange={(e) => onUpdate({ page: Number(e.target.value || 1) })} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={field.fieldType} onValueChange={(value: FieldType) => onUpdate({ fieldType: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
      </div>

      {field.fieldType === 'dropdown' && (
        <div className="space-y-2">
          <Label>Dropdown options (comma-separated)</Label>
          <Input
            value={(field.dropdownOptions || []).join(', ')}
            onChange={(e) => onUpdate({ dropdownOptions: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
          />
        </div>
      )}

      {field.fieldType === 'state_enum' && (
        <div className="space-y-2">
          <Label>State options</Label>
          <Input value={(field.stateOptions || ['tick', 'cross', 'NA', 'LIM', 'NV']).join(', ')} disabled />
        </div>
      )}

      {field.fieldType === 'address' && (
        <div className="space-y-2">
          <Label>UK Postcode Validation</Label>
          <div className="flex gap-2">
            <Input
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

      {field.fieldType === 'numeric' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input
            placeholder="Min"
            type="number"
            value={field.numericConfig?.min ?? ''}
            onChange={(e) => onUpdate({ numericConfig: { ...field.numericConfig, min: e.target.value === '' ? undefined : Number(e.target.value) } })}
          />
          <Input
            placeholder="Max"
            type="number"
            value={field.numericConfig?.max ?? ''}
            onChange={(e) => onUpdate({ numericConfig: { ...field.numericConfig, max: e.target.value === '' ? undefined : Number(e.target.value) } })}
          />
          <Input
            placeholder="Resolution"
            type="number"
            value={field.numericConfig?.resolution ?? ''}
            onChange={(e) => onUpdate({ numericConfig: { ...field.numericConfig, resolution: e.target.value === '' ? undefined : Number(e.target.value) } })}
          />
          <Input
            placeholder="Unit"
            value={field.numericConfig?.unit ?? ''}
            onChange={(e) => onUpdate({ numericConfig: { ...field.numericConfig, unit: e.target.value } })}
          />
        </div>
      )}

      {field.fieldType === 'linked_text' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
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
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="depends_on">depends_on</SelectItem>
              <SelectItem value="mirrors">mirrors</SelectItem>
              <SelectItem value="derived_from">derived_from</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default function ReportDisseminatorPage() {
  const [templates, setTemplates] = useState<DisseminatorTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<DisseminatorTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

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
      const res = await fetch('/api/admin/report-disseminator');
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load report disseminator templates');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/report-disseminator/${id}`);
      if (!res.ok) throw new Error('Failed to load template');
      const data = await res.json();
      setSelected(data);
      
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

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadTemplate(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selected) {
      setPreviewValues({});
      return;
    }

    setPreviewValues((currentValues) => {
      const nextValues: Record<string, string> = {};
      for (const field of selected.fields) {
        nextValues[field.id] = currentValues[field.id] || '';
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

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('file', file);

    setCreating(true);
    try {
      const res = await fetch('/api/admin/report-disseminator', {
        method: 'POST',
        body: formData,
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to create template');
      }

      const message = 'Template created. Continue with field wizard.';
      setCreateFeedback({ type: 'success', message });
      toast.success(message);
      setName('');
      setDescription('');
      setFile(null);
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
            const acroFields: ReportField[] = acroData.fields.map((f: any) => ({
              id: f.id || crypto.randomUUID(),
              page: f.pageNumber || f.page || 1,
              label: f.key || f.label || 'Untitled',
              fieldType: f.fieldType || 'text',
              required: false,
              // boundingBox omitted - AcroForm doesn't reliably provide valid coordinates
            }));
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
        console.log('🔵 AI Gateway response status:', gatewayRes.status);
        
        if (gatewayRes.ok) {
          const gatewayData = await gatewayRes.json();
          console.log('🔵 AI Gateway data:', gatewayData.fields?.length || 0, 'fields');
          if (gatewayData.fields && gatewayData.fields.length > 0) {
            const gatewayFields: ReportField[] = gatewayData.fields.map((f: any) => {
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
                label: f.key || f.label || 'Untitled',
                fieldType: f.fieldType || 'text',
                required: false,
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
                const ocrFields = Array.from(fieldLabels).map((label) => ({
                  id: crypto.randomUUID(),
                  page: 1,
                  label,
                  fieldType: 'text' as const,
                  required: false,
                  // No boundingBox - OCR doesn't give us coordinates
                }));

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

  const applyAiSuggestion = (field: ReportField) => {
    const label = field.label.toLowerCase();
    let patch: Partial<ReportField>;

    if (
      label.includes('address') ||
      label.includes('postcode') ||
      label.includes('post code') ||
      label.includes('location')
    ) {
      patch = { fieldType: 'address', addressConfig: { mode: 'uk_postcode_format' } };
    } else if (
      label.includes('yes/no') ||
      label.includes('yes no') ||
      label.includes('pass/fail') ||
      label.includes('pass fail') ||
      label.includes('lim') ||
      label.includes('nv') ||
      label.includes('na') ||
      label.includes('satisfactory') ||
      label.includes('unsatisfactory')
    ) {
      patch = { fieldType: 'state_enum', stateOptions: ['tick', 'cross', 'NA', 'LIM', 'NV'] };
    } else if (
      label.includes('number') ||
      label.includes('value') ||
      label.includes('ohms') ||
      label.includes('amps') ||
      label.includes('volts') ||
      label.includes('voltage') ||
      label.includes('current') ||
      label.includes('resistance') ||
      label.includes('reading')
    ) {
      patch = { fieldType: 'numeric', numericConfig: { resolution: 0.01 } };
    } else if (
      label.includes('type') ||
      label.includes('classification') ||
      label.includes('category') ||
      label.includes('code') ||
      label.includes('method')
    ) {
      patch = { fieldType: 'dropdown', dropdownOptions: ['Option 1', 'Option 2'] };
    } else {
      patch = { fieldType: 'text' };
    }

    const changed =
      patch.fieldType !== field.fieldType ||
      (patch.dropdownOptions && JSON.stringify(patch.dropdownOptions) !== JSON.stringify(field.dropdownOptions)) ||
      (patch.stateOptions && JSON.stringify(patch.stateOptions) !== JSON.stringify(field.stateOptions)) ||
      (patch.addressConfig && JSON.stringify(patch.addressConfig) !== JSON.stringify(field.addressConfig)) ||
      (patch.numericConfig && JSON.stringify(patch.numericConfig) !== JSON.stringify(field.numericConfig));

    updateField(field.id, patch);

    if (changed) {
      toast.success(`AI suggestion applied: ${field.label} → ${patch.fieldType}`);
    } else {
      toast.info(`No stronger AI suggestion for "${field.label}"`);
    }
  };

  const saveTemplate = async () => {
    if (!selected) return;
    if (!saveTemplateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/report-disseminator/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'save_as',
          fields: selected.fields,
          wizardData: selected.wizardData,
          description: selected.description || '',
          name: saveTemplateName.trim(),
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to save template');
      }

      setSaveDialogOpen(false);
      setSaveTemplateName('');
      toast.success('Template saved');
      await loadTemplates();
      setSelectedId(payload.id);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
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

  const wizardStep = selected?.wizardData?.currentStep || 1;
  const unplacedFields = useMemo(
    () => selected?.fields.filter((field) => !field.boundingBox) || [],
    [selected]
  );

  const selectedSummary = useMemo(() => {
    if (!selected) return null;
    const numericCount = selected.fields.filter((f) => f.fieldType === 'numeric').length;
    const dropdownCount = selected.fields.filter((f) => f.fieldType === 'dropdown').length;
    const addressCount = selected.fields.filter((f) => f.fieldType === 'address').length;
    return { numericCount, dropdownCount, addressCount };
  }, [selected]);

  const updatePreviewValue = (fieldId: string, value: string) => {
    setPreviewValues((current) => ({
      ...current,
      [fieldId]: value,
    }));
  };

  const renderInlineFieldInput = (field: ReportField) => {
    const commonClassName = 'w-full rounded border border-input bg-background px-3 py-2 text-sm';
    const value = previewValues[field.id] || '';

    if (field.fieldType === 'dropdown') {
      return (
        <select
          className={commonClassName}
          value={value}
          onChange={(event) => updatePreviewValue(field.id, event.target.value)}
          onFocus={() => setSelectedFieldId(field.id)}
        >
          <option value="">Select {field.label}</option>
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
          onChange={(event) => updatePreviewValue(field.id, event.target.value)}
          onFocus={() => setSelectedFieldId(field.id)}
        >
          <option value="">Select {field.label}</option>
          {(field.stateOptions || ['tick', 'cross', 'NA', 'LIM', 'NV']).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <Input
        className="w-full"
        type={field.fieldType === 'numeric' ? 'number' : 'text'}
        placeholder={field.label}
        min={field.numericConfig?.min}
        max={field.numericConfig?.max}
        step={field.numericConfig?.resolution}
        value={value}
        onChange={(event) => updatePreviewValue(field.id, event.target.value)}
        onFocus={() => setSelectedFieldId(field.id)}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Report Disseminator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a source PDF and build a facsimile-ready template with per-field intent metadata.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create From Source PDF</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-2 md:col-span-1">
            <Label>Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="EICR Original Facsimile" />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Source PDF</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
          </div>
          <Button type="button" onClick={createTemplate} className="md:col-span-1" disabled={creating}>
            <Upload className="w-4 h-4 mr-2" />
            {creating ? 'Uploading…' : 'Upload & Create'}
          </Button>
          {createFeedback && (
            <p className={`text-sm md:col-span-4 ${createFeedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {createFeedback.message}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && templates.length === 0 && <p className="text-sm text-muted-foreground">No templates yet.</p>}
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`w-full text-left border rounded p-3 ${selectedId === template.id ? 'border-primary' : 'border-border'}`}
                onClick={() => setSelectedId(template.id)}
              >
                <p className="font-medium text-sm">{template.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{template.sourceFileName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary">v{template.version}</Badge>
                  <Badge variant={template.status === 'published' ? 'default' : 'outline'}>{template.status}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Wizard</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={String(wizardStep)}
                onValueChange={(value) => selected && setSelected({
                  ...selected,
                  wizardData: { ...selected.wizardData, currentStep: Number(value) },
                })}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Step 1: Field inventory</SelectItem>
                  <SelectItem value="2">Step 2: Intent type mapping</SelectItem>
                  <SelectItem value="3">Step 3: Validation rules</SelectItem>
                  <SelectItem value="4">Step 4: Review & publish state</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected && <p className="text-sm text-muted-foreground">Select a template to begin the wizard.</p>}

            {selected && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Template title</Label>
                    <Input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={selected.status} onValueChange={(value: 'draft' | 'review' | 'published' | 'archived') => setSelected({ ...selected, status: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">draft</SelectItem>
                        <SelectItem value="review">review</SelectItem>
                        <SelectItem value="published">published</SelectItem>
                        <SelectItem value="archived">archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input value={selected.sourceFileName} disabled />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="default" size="sm" onClick={autoExtractAllFields} disabled={extracting || !file || !selected}>
                    <Wand2 className="w-4 h-4 mr-1" />
                    {extracting ? 'Extracting Fields...' : 'Auto Extract'}
                  </Button>
                  <Button type="button" onClick={addField} variant="outline" size="sm" disabled={!selected}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Field Manually
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically extracts all possible fields from the PDF using AcroForm + AI Gateway
                </p>

                <Tabs defaultValue="fields" className="w-full">
                  <TabsList>
                    <TabsTrigger value="fields">
                      <List className="w-4 h-4 mr-2" />
                      Fields
                    </TabsTrigger>
                    <TabsTrigger value="preview-origin">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Source
                    </TabsTrigger>
                    <TabsTrigger value="preview-template">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Template
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="fields" className="space-y-3 mt-4">
                    {selected.fields.length === 0 && (
                      <p className="text-sm text-muted-foreground">No fields yet. Add a field or auto-extract them.</p>
                    )}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={selected.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                        {selected.fields.map((field) => (
                          <SortableFieldRow
                            key={field.id}
                            field={field}
                            onUpdate={(patch) => updateField(field.id, patch)}
                            onAiSuggest={() => applyAiSuggestion(field)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </TabsContent>
                  <TabsContent value="preview-origin" className="mt-4">
                    <PdfDocumentPreview
                      pdfBase64={selected.sourcePdfBase64}
                      fields={selected.fields}
                      selectedId={selectedFieldId}
                      onSelectField={setSelectedFieldId}
                    />
                  </TabsContent>
                  <TabsContent value="preview-template" className="mt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      This preview renders the actual generated form layout from the uploaded source PDF with interactive
                      inputs for every extracted field.
                    </p>
                    <PdfFormDocumentPreview
                      pdfBase64={selected.sourcePdfBase64}
                      fields={selected.fields}
                      values={previewValues}
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
                              {renderInlineFieldInput(field)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label>Wizard notes</Label>
                  <Textarea
                    value={selected.wizardData?.notes || ''}
                    onChange={(e) => setSelected({
                      ...selected,
                      wizardData: { ...selected.wizardData, notes: e.target.value },
                    })}
                    placeholder="Capture assumptions and field intent notes..."
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
                    <Badge variant="outline">Address: {selectedSummary.addressCount}</Badge>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (!selected) return;
                      setSaveTemplateName(selected.name);
                      setSaveDialogOpen(true);
                    }}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving…' : 'Save Template'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Save Template</h2>
              <p className="text-sm text-muted-foreground">
                Save the current source PDF, extracted fields, and layout metadata as a template entry.
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
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={saveTemplate} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

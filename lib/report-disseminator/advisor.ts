/**
 * Deterministic advisor for the Report Disseminator workflow.
 *
 * Provides contextual feedback, tips and warnings at each step of
 * the disseminator pipeline without requiring an LLM call.
 */

import type { DisseminatorFieldType } from './field-analysis';

// ── Types ──────────────────────────────────────────────────────────────

export type GuidanceSeverity = 'info' | 'tip' | 'warning' | 'error';

export type GuidanceItem = {
  id: string;
  severity: GuidanceSeverity;
  title: string;
  detail: string;
  fieldId?: string;
};

export type DisseminatorStep =
  | 'upload'
  | 'extract'
  | 'fields'
  | 'preview'
  | 'publish';

type FieldSummary = {
  id: string;
  label: string;
  fieldType: DisseminatorFieldType;
  required: boolean;
  hasBoundingBox: boolean;
  hasDropdownOptions: boolean;
  hasStateOptions: boolean;
};

// ── Step-level guidance ────────────────────────────────────────────────

const STEP_GUIDANCE: Record<DisseminatorStep, GuidanceItem[]> = {
  upload: [
    {
      id: 'upload-tip-quality',
      severity: 'tip',
      title: 'Use a high-quality source PDF',
      detail:
        'Upload clean, unscanned, vector-based PDFs when possible. Scanned documents with low DPI may produce lower-quality field extraction.',
    },
    {
      id: 'upload-info-limit',
      severity: 'info',
      title: 'File size limit: 10 MB',
      detail:
        'The maximum upload size is 10 MB. If your PDF is larger, consider compressing it or splitting it into sections.',
    },
  ],
  extract: [
    {
      id: 'extract-info-auto',
      severity: 'info',
      title: 'Auto-extraction in progress',
      detail:
        'The system is extracting form fields from your PDF using AcroForm metadata, AI analysis and OCR. This may take a moment for complex documents.',
    },
    {
      id: 'extract-tip-review',
      severity: 'tip',
      title: 'Review extracted fields carefully',
      detail:
        'Auto-detected fields may need label corrections or type changes. For example, a "Date" field may be detected as "Text" — change its type to "date" for proper validation.',
    },
  ],
  fields: [
    {
      id: 'fields-tip-types',
      severity: 'tip',
      title: 'Choose the right field type',
      detail:
        'state_enum fields cycle through tick/cross/NA/LIM/NV. Use "dropdown" for custom option lists. Use "numeric" for measured values (e.g. resistance, voltage).',
    },
    {
      id: 'fields-tip-required',
      severity: 'tip',
      title: 'Mark critical fields as required',
      detail:
        'Fields marked required must be filled before a report can be completed. Leave optional fields (like notes) as non-required.',
    },
  ],
  preview: [
    {
      id: 'preview-info-values',
      severity: 'info',
      title: 'Preview uses sample data',
      detail:
        'Values entered in the preview are temporary and not saved. Use them to verify layout and field placement before publishing.',
    },
    {
      id: 'preview-tip-placement',
      severity: 'tip',
      title: 'Check field alignment',
      detail:
        'Verify that overlaid field values align with the original PDF layout. Fields with missing bounding boxes will not appear on the generated PDF.',
    },
  ],
  publish: [
    {
      id: 'publish-info-readonly',
      severity: 'info',
      title: 'Published templates are read-only',
      detail:
        'After publishing, you cannot edit the template directly. To make changes, clone the template to create a new draft version.',
    },
    {
      id: 'publish-tip-version',
      severity: 'tip',
      title: 'Version tracking',
      detail:
        'Each clone increments the version number. Existing reports retain a reference to the version they were created from.',
    },
  ],
};

// ── Field-level analysis ───────────────────────────────────────────────

function analyzeFields(fields: FieldSummary[]): GuidanceItem[] {
  const items: GuidanceItem[] = [];

  if (fields.length === 0) {
    items.push({
      id: 'field-warn-empty',
      severity: 'warning',
      title: 'No fields defined',
      detail:
        'Your template has no fields. Use the Auto Extract button or the field wizard to add fields before publishing.',
    });
    return items;
  }

  // Check for fields missing bounding boxes
  const unmapped = fields.filter((f) => !f.hasBoundingBox);
  if (unmapped.length > 0) {
    items.push({
      id: 'field-warn-unmapped',
      severity: 'warning',
      title: `${unmapped.length} field${unmapped.length > 1 ? 's' : ''} without placement`,
      detail: `Fields without bounding boxes won't render on the PDF: ${unmapped
        .slice(0, 5)
        .map((f) => f.label)
        .join(', ')}${unmapped.length > 5 ? '…' : ''}.`,
    });
  }

  // Check for duplicate labels
  const labelCounts = new Map<string, number>();
  for (const f of fields) {
    const key = f.label.toLowerCase().trim();
    labelCounts.set(key, (labelCounts.get(key) || 0) + 1);
  }
  const duplicates = [...labelCounts.entries()].filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    items.push({
      id: 'field-warn-duplicates',
      severity: 'warning',
      title: `${duplicates.length} duplicate label${duplicates.length > 1 ? 's' : ''}`,
      detail: `Consider renaming to avoid confusion: ${duplicates
        .slice(0, 3)
        .map(([label, count]) => `"${label}" (×${count})`)
        .join(', ')}.`,
    });
  }

  // Check dropdowns without options
  const emptyDropdowns = fields.filter((f) => f.fieldType === 'dropdown' && !f.hasDropdownOptions);
  if (emptyDropdowns.length > 0) {
    items.push({
      id: 'field-warn-dropdown-options',
      severity: 'error',
      title: `${emptyDropdowns.length} dropdown${emptyDropdowns.length > 1 ? 's' : ''} with no options`,
      detail: `Dropdowns need at least one option to be usable: ${emptyDropdowns
        .map((f) => f.label)
        .join(', ')}.`,
    });
  }

  // Check state_enum without options
  const emptyState = fields.filter((f) => f.fieldType === 'state_enum' && !f.hasStateOptions);
  if (emptyState.length > 0) {
    items.push({
      id: 'field-warn-state-options',
      severity: 'warning',
      title: `${emptyState.length} state field${emptyState.length > 1 ? 's' : ''} with no state options`,
      detail: 'State enum fields should have at least one state option (e.g. tick, cross, NA).',
    });
  }

  // Info: field type distribution
  const typeCounts = new Map<string, number>();
  for (const f of fields) {
    typeCounts.set(f.fieldType, (typeCounts.get(f.fieldType) || 0) + 1);
  }
  const distribution = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');
  items.push({
    id: 'field-info-distribution',
    severity: 'info',
    title: `${fields.length} fields defined`,
    detail: `Field types: ${distribution}.`,
  });

  // Tip: many required fields
  const requiredCount = fields.filter((f) => f.required).length;
  if (requiredCount > fields.length * 0.8 && fields.length > 5) {
    items.push({
      id: 'field-tip-many-required',
      severity: 'tip',
      title: 'Most fields marked required',
      detail: `${requiredCount} of ${fields.length} fields are required. Consider if all need to be mandatory, as this may slow down report completion.`,
    });
  }

  return items;
}

// ── Public API ─────────────────────────────────────────────────────────

export function getStepGuidance(step: DisseminatorStep): GuidanceItem[] {
  return STEP_GUIDANCE[step] ?? [];
}

export function getFieldGuidance(fields: FieldSummary[]): GuidanceItem[] {
  return analyzeFields(fields);
}

export function getAllGuidance(
  step: DisseminatorStep,
  fields: FieldSummary[],
): GuidanceItem[] {
  return [...getStepGuidance(step), ...getFieldGuidance(fields)];
}

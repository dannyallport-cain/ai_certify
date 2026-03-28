import { bulkValidateUkPostcodes } from '@/lib/report-disseminator/postcode';
import { calculateMaxZs, isValidZsCombo } from '@/lib/utils/calculate-zs';

type FieldType =
  | 'auto_zs'
  | 'auto_reference'
  | 'date'
  | 'dropdown'
  | 'address'
  | 'postcode'
  | 'uk_phone'
  | 'state_enum'
  | 'cycling'
  | 'numeric'
  | 'resistance'
  | 'voltage'
  | 'text'
  | 'linked_text'
  | 'sentence_builder'
  | 'inspection_date_plus_period';

type ReportField = {
  id: string;
  page: number;
  label: string;
  fieldType: FieldType;
  required: boolean;
  dropdownOptions?: string[];
  stateOptions?: Array<'tick' | 'cross' | 'NA' | 'LIM' | 'NV'>;
  numericConfig?: { min?: number; max?: number; resolution?: number; unit?: string };
  inspectionPeriodConfig?: { period: '1y' | '3y' | '5y' | '10y' | 'custom'; inspectionDateFieldId: string };
  boundingBox?: { x: number; y: number; width: number; height: number };
};

export type ReportValidationIssue = {
  fieldId: string;
  severity: 'error' | 'warning' | 'info';
  category: 'required' | 'format' | 'range' | 'bs7671' | 'consistency';
  label: string;
  message: string;
};

export type ReportValidationResult = {
  issues: ReportValidationIssue[];
  checkedAt: string;
  references: string[];
};

const DEFAULT_STATE_OPTIONS = ['tick', 'cross', 'NA', 'LIM', 'NV'] as const;

function isBlank(value: string | undefined) {
  return !value || value.trim() === '';
}

function parseNumericValue(raw: string | undefined): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/,/g, '').replace(/[^0-9.+-]+/g, '');
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidPhoneNumber(raw: string) {
  const normalized = raw.replace(/[\s()-]+/g, '');
  return /^(?:\+44\d{9,10}|0\d{9,10})$/.test(normalized);
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isMeasuredZsLabel(label: string) {
  const normalized = normalizeLabel(label);
  return /(zs|earth fault loop impedance|loop impedance)/.test(normalized) &&
    !/(max|maximum|permitted|permissible|required)/.test(normalized);
}

function findMeasuredZsField(targetField: ReportField, fields: ReportField[]) {
  const samePageCandidates = fields.filter((field) =>
    field.id !== targetField.id &&
    field.page === targetField.page &&
    ['numeric', 'resistance', 'voltage', 'text', 'linked_text'].includes(field.fieldType) &&
    isMeasuredZsLabel(field.label)
  );

  const candidates = samePageCandidates.length
    ? samePageCandidates
    : fields.filter((field) =>
        field.id !== targetField.id &&
        ['numeric', 'resistance', 'voltage', 'text', 'linked_text'].includes(field.fieldType) &&
        isMeasuredZsLabel(field.label)
      );

  if (!candidates.length) return null;

  const targetX = targetField.boundingBox?.x ?? 0;
  const targetY = targetField.boundingBox?.y ?? 0;

  return [...candidates].sort((left, right) => {
    const leftDistance = Math.abs((left.boundingBox?.x ?? 0) - targetX) + Math.abs((left.boundingBox?.y ?? 0) - targetY);
    const rightDistance = Math.abs((right.boundingBox?.x ?? 0) - targetX) + Math.abs((right.boundingBox?.y ?? 0) - targetY);
    return leftDistance - rightDistance;
  })[0];
}

export async function validateReportValues(
  fields: ReportField[],
  values: Record<string, string>,
): Promise<ReportValidationResult> {
  const issues: ReportValidationIssue[] = [];

  for (const field of fields) {
    const rawValue = String(values[field.id] ?? '');

    if (field.required && isBlank(rawValue)) {
      issues.push({
        fieldId: field.id,
        severity: 'error',
        category: 'required',
        label: field.label,
        message: 'Required field is empty.',
      });
      continue;
    }

    if (isBlank(rawValue) && field.fieldType !== 'auto_zs') {
      continue;
    }

    if (field.fieldType === 'dropdown' && rawValue) {
      if (field.dropdownOptions?.length && !field.dropdownOptions.includes(rawValue)) {
        issues.push({
          fieldId: field.id,
          severity: 'warning',
          category: 'format',
          label: field.label,
          message: `Value "${rawValue}" is not in the configured dropdown options.`,
        });
      }
    }

    if (field.fieldType === 'state_enum' && rawValue) {
      const allowed = field.stateOptions ?? [...DEFAULT_STATE_OPTIONS];
      if (!allowed.includes(rawValue as (typeof DEFAULT_STATE_OPTIONS)[number])) {
        issues.push({
          fieldId: field.id,
          severity: 'warning',
          category: 'format',
          label: field.label,
          message: `Value "${rawValue}" is not one of ${allowed.join(', ')}.`,
        });
      }
    }

    if (field.fieldType === 'uk_phone' && rawValue && !isValidPhoneNumber(rawValue)) {
      issues.push({
        fieldId: field.id,
        severity: 'warning',
        category: 'format',
        label: field.label,
        message: 'Phone number does not match a typical UK format.',
      });
    }

    if (field.fieldType === 'date' || field.fieldType === 'inspection_date_plus_period') {
      if (rawValue && Number.isNaN(Date.parse(rawValue))) {
        issues.push({
          fieldId: field.id,
          severity: 'warning',
          category: 'format',
          label: field.label,
          message: 'Date value is not valid.',
        });
      }
    }

    if (field.fieldType === 'numeric' || field.fieldType === 'resistance' || field.fieldType === 'voltage') {
      const numericValue = parseNumericValue(rawValue);
      if (numericValue === null) {
        issues.push({
          fieldId: field.id,
          severity: 'warning',
          category: 'format',
          label: field.label,
          message: 'Value should be numeric.',
        });
        continue;
      }

      if (typeof field.numericConfig?.min === 'number' && numericValue < field.numericConfig.min) {
        issues.push({
          fieldId: field.id,
          severity: 'warning',
          category: 'range',
          label: field.label,
          message: `Value ${numericValue} is below the minimum ${field.numericConfig.min}.`,
        });
      }

      if (typeof field.numericConfig?.max === 'number' && numericValue > field.numericConfig.max) {
        issues.push({
          fieldId: field.id,
          severity: 'warning',
          category: 'range',
          label: field.label,
          message: `Value ${numericValue} is above the maximum ${field.numericConfig.max}.`,
        });
      }
    }

    if (field.fieldType === 'auto_zs') {
      const deviceType = String(values[`${field.id}_deviceType`] ?? '');
      const rating = String(values[`${field.id}_rating`] ?? '');

      if (field.required && (!deviceType || !rating)) {
        issues.push({
          fieldId: field.id,
          severity: 'error',
          category: 'required',
          label: field.label,
          message: 'BS 7671 Zs lookup needs both device type and rating.',
        });
        continue;
      }

      if ((deviceType || rating) && !isValidZsCombo(deviceType, rating)) {
        issues.push({
          fieldId: field.id,
          severity: 'error',
          category: 'bs7671',
          label: field.label,
          message: 'Device type / rating combination is not valid for the BS 7671 max Zs table.',
        });
        continue;
      }

      if (deviceType && rating) {
        const maxZs = parseNumericValue(calculateMaxZs(deviceType, rating));
        const measuredField = findMeasuredZsField(field, fields);
        const measuredZs = measuredField ? parseNumericValue(values[measuredField.id]) : null;

        if (maxZs !== null && measuredField && measuredZs !== null && measuredZs > maxZs * 1.05) {
          issues.push({
            fieldId: measuredField.id,
            severity: 'error',
            category: 'bs7671',
            label: measuredField.label,
            message: `Measured Zs ${measuredZs.toFixed(2)} exceeds calculated max Zs ${maxZs.toFixed(2)} for ${deviceType} ${rating}.`,
          });
        }
      }
    }
  }

  const postcodeFields = fields.filter((field) => field.fieldType === 'postcode' && !isBlank(values[field.id]));
  if (postcodeFields.length > 0) {
    const uniquePostcodes = [...new Set(postcodeFields.map((field) => values[field.id].trim()))];
    const postcodeResults = await bulkValidateUkPostcodes(uniquePostcodes);

    for (const field of postcodeFields) {
      const result = postcodeResults[values[field.id].trim()];
      if (result && !result.valid) {
        issues.push({
          fieldId: field.id,
          severity: 'warning',
          category: 'format',
          label: field.label,
          message: result.error || 'Postcode could not be validated.',
        });
      }
    }
  }

  return {
    issues,
    checkedAt: new Date().toISOString(),
    references: [
      'BS 7671 Table 41.3 max Zs lookup',
      'postcodes.io UK postcode validation',
    ],
  };
}

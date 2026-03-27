import { calculateMaxZs, type DeviceType, DEVICE_TYPE_OPTIONS, getValidRatingsForType } from '../utils/calculate-zs';

export const DISSEMINATOR_FIELD_TYPES = [
  'auto_zs',
  'auto_reference',
  'date',
  'dropdown',
  'address',
  'postcode',
  'uk_phone',
  'state_enum',
  'numeric',
  'resistance',
  'voltage',
  'text',
  'linked_text',
  'sentence_builder',
  'inspection_date_plus_period',
] as const;

export type DisseminatorFieldType = (typeof DISSEMINATOR_FIELD_TYPES)[number];

export const DEFAULT_STATE_OPTIONS = ['tick', 'cross', 'NA', 'LIM', 'NV'] as const;

export type StateOption = (typeof DEFAULT_STATE_OPTIONS)[number];

export type AddressConfig = {
  mode: 'uk_address' | 'uk_postcode_format';
};

export type PostcodeConfig = {
  country: 'GB';
  validateAddress: boolean;
};

export type PhoneConfig = {
  country: 'GB';
};

export type NumericConfig = {
  min?: number;
  max?: number;
  resolution?: number;
  unit?: string;
};

export type InspectionPeriod = '1y' | '3y' | '5y' | '10y' | 'custom';

export type InspectionPeriodConfig = {
  period: InspectionPeriod;
  inspectionDateFieldId: string;
};

export type FieldAnalysisResult = {
  label: string;
  fieldType: DisseminatorFieldType;
  plainTextHint?: string;
  dropdownOptions?: string[];
  stateOptions?: StateOption[];
  addressConfig?: AddressConfig;
  postcodeConfig?: PostcodeConfig;
  phoneConfig?: PhoneConfig;
  numericConfig?: NumericConfig;
};

type AnalyzeOptions = {
  fieldTypeHint?: string | null;
};

const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);
const ACRONYMS = new Set([
  'ac',
  'dc',
  'eicr',
  'rcd',
  'r1',
  'r2',
  'r1+r2',
  'zs',
  'ze',
  'uo',
  'uk',
  'bs',
  'bsen',
]);

export function humanizeFieldLabel(rawLabel: string): string {
  const cleaned = rawLabel
    .replace(/[_./]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/[:*]+$/g, '')
    .trim();

  if (!cleaned) {
    return 'Untitled Field';
  }

  return cleaned
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) {
        return lower.toUpperCase();
      }
      if (index > 0 && SMALL_WORDS.has(lower)) {
        return lower;
      }
      if (/^\d+[a-z]*$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function isNumericLikeFieldType(fieldType: DisseminatorFieldType): boolean {
  return fieldType === 'numeric' || fieldType === 'resistance' || fieldType === 'voltage';
}

export function analyzeFieldDefinition(rawLabel: string, options: AnalyzeOptions = {}): FieldAnalysisResult {
  const label = humanizeFieldLabel(rawLabel);
  const lower = label.toLowerCase();
  const hintedType = normalizeHint(options.fieldTypeHint);

  if (hintedType === 'auto_reference' || isAutoReferenceField(lower)) {
    return {
      label: normalizeAutoReferenceLabel(label),
      fieldType: 'auto_reference',
      plainTextHint: 'Auto-generated reference',
    };
  }

  if (hintedType === 'date' || isDateField(lower)) {
    return {
      label: normalizeDateLabel(label),
      fieldType: 'date',
      plainTextHint: 'Pick a date',
    };
  }

  if (hintedType === 'inspection_date_plus_period') {
    return {
      label: normalizeDateLabel(label),
      fieldType: 'inspection_date_plus_period',
      plainTextHint: 'Calculated from inspection date + selected period',
    };
  }

  if (hintedType === 'state_enum' || isStateEnumField(lower)) {
    return {
      label: normalizeStateLabel(label),
      fieldType: 'state_enum',
      plainTextHint: 'Tick/cross/NA/LIM/NV status',
      stateOptions: [...DEFAULT_STATE_OPTIONS],
    };
  }

  if (hintedType === 'uk_phone' || isUkPhoneField(lower)) {
    return {
      label: lower.includes('mobile') ? 'Mobile Number' : 'Phone Number',
      fieldType: 'uk_phone',
      plainTextHint: 'UK phone number',
      phoneConfig: { country: 'GB' },
    };
  }

  if (hintedType === 'postcode' || isPostcodeField(lower)) {
    return {
      label: 'Postcode',
      fieldType: 'postcode',
      plainTextHint: 'UK postcode',
      postcodeConfig: { country: 'GB', validateAddress: true },
    };
  }

  if (hintedType === 'address' || isAddressField(lower)) {
    return {
      label: normalizeAddressLabel(label),
      fieldType: 'address',
      plainTextHint: 'UK address',
      addressConfig: { mode: 'uk_address' },
    };
  }

  if (hintedType === 'auto_zs' || isZsField(lower)) {
    return {
      label: normalizeZsLabel(label),
      fieldType: 'auto_zs',
      plainTextHint: 'Auto-calculates from Device Type + Rating (BS7671)',
      dropdownOptions: [...DEVICE_TYPE_OPTIONS],
    };
  }

  if (hintedType === 'resistance' || isResistanceField(lower)) {
    return {
      label: normalizeMeasurementLabel(label, 'Resistance Reading'),
      fieldType: 'resistance',
      plainTextHint: 'Resistance or impedance reading',
      numericConfig: {
        min: 0,
        resolution: 0.01,
        unit: inferResistanceUnit(lower),
      },
    };
  }

  if (hintedType === 'voltage' || isVoltageField(lower)) {
    return {
      label: normalizeMeasurementLabel(label, 'Voltage Reading'),
      fieldType: 'voltage',
      plainTextHint: 'Voltage reading',
      numericConfig: {
        min: 0,
        resolution: 0.1,
        unit: 'V',
      },
    };
  }

  if (hintedType === 'dropdown' || isDropdownField(lower)) {
    return {
      label,
      fieldType: 'dropdown',
      plainTextHint: 'Choose one option',
    };
  }

  if (hintedType === 'sentence_builder') {
    return {
      label,
      fieldType: 'sentence_builder',
      plainTextHint: 'Build text from snippets',
    };
  }

  if (hintedType === 'linked_text') {
    return {
      label,
      fieldType: 'linked_text',
      plainTextHint: 'Linked to another field',
    };
  }

  if (hintedType === 'numeric' || isGenericNumericField(lower)) {
    return {
      label: normalizeMeasurementLabel(label, label),
      fieldType: 'numeric',
      plainTextHint: 'Numeric reading',
      numericConfig: inferGenericNumericConfig(lower),
    };
  }

  return {
    label,
    fieldType: 'text',
  };
}

function normalizeHint(fieldTypeHint?: string | null): DisseminatorFieldType | null {
  if (!fieldTypeHint) return null;
  return DISSEMINATOR_FIELD_TYPES.includes(fieldTypeHint as DisseminatorFieldType)
    ? (fieldTypeHint as DisseminatorFieldType)
    : null;
}

function isUkPhoneField(lower: string): boolean {
  return /\b(phone|telephone|tel|mobile|contact number|telephone number)\b/.test(lower);
}

function isDateField(lower: string): boolean {
  return /\b(date|dated|inspection date|test date|visit date|due date|expiry date|expiration date|next visit|next inspection|issued on)\b/.test(
    lower,
  );
}

function isAutoReferenceField(lower: string): boolean {
  return /\b(report reference|reference number|certificate number|certificate no\.?|document number|doc number|\bref\b|\breference\b)\b/.test(
    lower,
  );
}

function isPostcodeField(lower: string): boolean {
  return /\b(postcode|post code|postal code|zip code)\b/.test(lower);
}

function isAddressField(lower: string): boolean {
  if (isPostcodeField(lower)) return false;
  return /\b(address|site address|property address|premises|location)\b/.test(lower);
}

function isResistanceField(lower: string): boolean {
  return /\b(resistance|impedance|continuity|ohms?|insulation|earth loop|loop impedance|r1\+r2|r1|r2|zs|ze)\b/.test(lower);
}

function isVoltageField(lower: string): boolean {
  return /\b(voltage|volt|volts|test voltage|nominal voltage|supply voltage|phase voltage|uo|u)\b/.test(lower);
}

function isZsField(lower: string): boolean {
  return /\b(max(imum)?|permitted|permissible)?\s*(zs|earth fault loop impedance|earth loop|loop impedance)\b/i.test(lower);
}

function isGenericNumericField(lower: string): boolean {
  return /\b(number|reading|value|measured|measurement|current|amps?|amperage|frequency|hz)\b/.test(lower);
}

function isStateEnumField(lower: string): boolean {
  return /\b(pass|fail|satisfactory|unsatisfactory|na|n\/a|lim|nv|yes\/no|yes no|tick|cross)\b/.test(lower);
}

function isDropdownField(lower: string): boolean {
  return /\b(type|class|classification|category|method|code|rating|phase)\b/.test(lower);
}

function normalizeStateLabel(label: string): string {
  if (/satisfactory|unsatisfactory/i.test(label)) return 'Condition';
  if (/pass|fail/i.test(label)) return 'Pass / Fail';
  return label;
}

function normalizeAutoReferenceLabel(label: string): string {
  if (/report/i.test(label)) return 'Report Reference';
  if (/certificate/i.test(label)) return 'Certificate Reference';
  return 'Reference';
}

function normalizeDateLabel(label: string): string {
  if (/next visit|next inspection/i.test(label)) return 'Next Inspection Date';
  if (/expiry|expiration/i.test(label)) return 'Expiry Date';
  if (/inspection/i.test(label)) return 'Inspection Date';
  if (/test/i.test(label)) return 'Test Date';
  return /date/i.test(label) ? label : `${label} Date`;
}

function normalizeAddressLabel(label: string): string {
  if (/address line/i.test(label)) return label;
  if (/site address|property address|premises/i.test(label)) return label;
  return 'Address';
}

function normalizeMeasurementLabel(label: string, fallback: string): string {
  if (!label || label === 'Untitled Field') return fallback;
  if (/^(voltage|resistance)$/i.test(label)) return fallback;
  if (/\breading\b/i.test(label)) return label;
  return label;
}

function normalizeZsLabel(label: string): string {
  const normalized = label
    .replace(/maximum\s+permitted|permissible|maximum\s+value|value|required/gi, '')
    .replace(/[\(\[].*?[\)\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || 'Max Zs';
}

function inferResistanceUnit(lower: string): string {
  if (/\bmω\b|\bmegohm\b|\bmegaohm\b|insulation/.test(lower)) return 'MΩ';
  if (/\bkω\b|\bkohm\b/.test(lower)) return 'kΩ';
  return 'Ω';
}

function inferGenericNumericConfig(lower: string): NumericConfig {
  if (/\bamps?|amperage|current\b/.test(lower)) {
    return { min: 0, resolution: 0.01, unit: 'A' };
  }
  if (/\bfrequency|hz\b/.test(lower)) {
    return { min: 0, resolution: 0.1, unit: 'Hz' };
  }
  return { resolution: 0.01 };
}

export const INSPECTION_PERIOD_YEARS: Record<Exclude<InspectionPeriod, 'custom'>, number> = {
  '1y': 1,
  '3y': 3,
  '5y': 5,
  '10y': 10,
};

export function addYearsToISO(dateISO: string, years: number): string {
  if (!dateISO) return '';
  const d = new Date(dateISO);
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function computeNextInspectionDate(inspectionDateISO: string, period: InspectionPeriod): string {
  if (period === 'custom' || !inspectionDateISO) return '';
  return addYearsToISO(inspectionDateISO, INSPECTION_PERIOD_YEARS[period]);
}

export { calculateMaxZs, type DeviceType, DEVICE_TYPE_OPTIONS, getValidRatingsForType };

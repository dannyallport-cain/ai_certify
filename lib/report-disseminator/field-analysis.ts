export const DISSEMINATOR_FIELD_TYPES = [
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
const ACRONYMS = new Set(['ac', 'dc', 'eicr', 'rcd', 'r1', 'r2', 'r1+r2', 'zs', 'ze', 'u', 'uo', 'uk']);

export function humanizeFieldLabel(rawLabel: string) {
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

export function isNumericLikeFieldType(fieldType: DisseminatorFieldType) {
  return fieldType === 'numeric' || fieldType === 'resistance' || fieldType === 'voltage';
}

export function analyzeFieldDefinition(rawLabel: string, options: AnalyzeOptions = {}): FieldAnalysisResult {
  const label = humanizeFieldLabel(rawLabel);
  const lower = label.toLowerCase();
  const hintedType = normalizeHint(options.fieldTypeHint);

  if (hintedType === 'state_enum' || isStateEnumField(lower)) {
    return {
      label: normalizeStateLabel(label),
      fieldType: 'state_enum',
      plainTextHint: 'Tick/cross/NA/LIM/NV status',
      stateOptions: [...DEFAULT_STATE_OPTIONS],
    };
  }

  if (isUkPhoneField(lower) || hintedType === 'uk_phone') {
    return {
      label: lower.includes('mobile') ? 'Mobile Number' : 'Phone Number',
      fieldType: 'uk_phone',
      plainTextHint: 'UK phone number',
      phoneConfig: { country: 'GB' },
    };
  }

  if (isPostcodeField(lower) || hintedType === 'postcode') {
    return {
      label: 'Postcode',
      fieldType: 'postcode',
      plainTextHint: 'UK postcode',
      postcodeConfig: { country: 'GB', validateAddress: true },
    };
  }

  if (isAddressField(lower) || hintedType === 'address') {
    return {
      label: normalizeAddressLabel(label),
      fieldType: 'address',
      plainTextHint: 'UK address',
      addressConfig: { mode: 'uk_address' },
    };
  }

  if (isResistanceField(lower) || hintedType === 'resistance') {
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

  if (isVoltageField(lower) || hintedType === 'voltage') {
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

  if (hintedType === 'numeric' || isGenericNumericField(lower)) {
    return {
      label: normalizeMeasurementLabel(label, label),
      fieldType: 'numeric',
      plainTextHint: 'Numeric reading',
      numericConfig: inferGenericNumericConfig(lower),
    };
  }

  if (hintedType === 'linked_text') {
    return {
      label,
      fieldType: 'linked_text',
    };
  }

  return {
    label,
    fieldType: hintedType === 'text' ? 'text' : 'text',
  };
}

function normalizeHint(fieldTypeHint?: string | null): DisseminatorFieldType | null {
  if (!fieldTypeHint) return null;
  return DISSEMINATOR_FIELD_TYPES.includes(fieldTypeHint as DisseminatorFieldType)
    ? (fieldTypeHint as DisseminatorFieldType)
    : null;
}

function isUkPhoneField(lower: string) {
  return /\b(phone|telephone|tel|mobile|contact number|telephone number)\b/.test(lower);
}

function isPostcodeField(lower: string) {
  return /\b(postcode|post code|postal code|zip code)\b/.test(lower);
}

function isAddressField(lower: string) {
  if (isPostcodeField(lower)) return false;
  return /\b(address|site address|property address|premises|location)\b/.test(lower);
}

function isResistanceField(lower: string) {
  return /\b(resistance|impedance|continuity|ohms?|insulation|earth loop|loop impedance|r1\+r2|r1|r2|zs|ze)\b/.test(lower);
}

function isVoltageField(lower: string) {
  return /\b(voltage|volt|volts|test voltage|nominal voltage|supply voltage|phase voltage|uo|u)\b/.test(lower);
}

function isGenericNumericField(lower: string) {
  return /\b(number|reading|value|measured|measurement|current|amps?|amperage|frequency|hz)\b/.test(lower);
}

function isStateEnumField(lower: string) {
  return /\b(pass|fail|satisfactory|unsatisfactory|na|n\/a|lim|nv|yes\/no|yes no|tick|cross)\b/.test(lower);
}

function isDropdownField(lower: string) {
  return /\b(type|class|classification|category|method|code|rating|phase)\b/.test(lower);
}

function normalizeStateLabel(label: string) {
  if (/satisfactory|unsatisfactory/i.test(label)) return 'Condition';
  if (/pass|fail/i.test(label)) return 'Pass / Fail';
  return label;
}

function normalizeAddressLabel(label: string) {
  if (/address line/i.test(label)) return label;
  if (/site address|property address|premises/i.test(label)) return label;
  return 'Address';
}

function normalizeMeasurementLabel(label: string, fallback: string) {
  if (!label || label === 'Untitled Field') return fallback;

  if (/^(voltage|resistance)$/i.test(label)) {
    return fallback;
  }

  if (/\breading\b/i.test(label)) {
    return label;
  }

  return label;
}

function inferResistanceUnit(lower: string) {
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

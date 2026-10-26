import type { DetectorKind } from './detector-types';

/**
 * Text-derived detector hints.
 *
 * Detector casings carry a small, very regular set of markings: the product
 * standard, the manufacturer, a model code, a power source note and often a
 * "replace by" date. When a vision model is not configured, or is unsure,
 * reading those marks out of the OCR text still gives the inspector usable
 * evidence instead of an empty result.
 */

const MANUFACTURERS: ReadonlyArray<readonly [pattern: string, name: string]> = [
  ['ei electronics', 'Ei Electronics'],
  ['aico', 'Aico'],
  ['kidde', 'Kidde'],
  ['fireangel', 'FireAngel'],
  ['fire angel', 'FireAngel'],
  ['brk', 'BRK'],
  ['deta', 'Deta'],
  ['dicon', 'Dicon'],
  ['hochiki', 'Hochiki'],
  ['apollo', 'Apollo'],
  ['cavius', 'Cavius'],
  ['jablotron', 'Jablotron'],
  ['siterwell', 'Siterwell'],
  ['honeywell', 'Honeywell'],
  ['gent', 'Gent'],
  ['nest', 'Nest'],
  ['c-tec', 'C-TEC'],
  ['elro', 'ELRO'],
  ['wagner', 'Wagner'],
];

const SMOKE_STANDARDS = /bs\s*en\s*1460[46]|bs\s*5446[- ]?[12]|en\s*14604/i;
const CO_STANDARDS = /bs\s*en\s*5029[0-9]|en\s*50291/i;

const STANDARD_PATTERN = /(bs\s*en\s*\d{4,5}(?:[-:]\d+)?|bs\s*\d{4,5}(?:[-:]\d+)?|en\s*\d{4,5})/gi;

// Detector model codes are routinely mixed case with a trailing letter, for
// example "Ei146e", "Ei650i" or "FA6620". An upper-case-only pattern silently
// misses every one of those.
const MODEL_PATTERN = /\b([A-Za-z]{1,4}[- ]?\d{2,4}[A-Za-z]{0,4}|\d{3,4}[A-Za-z]{2,4})\b/g;

// Tokens that look like model codes but are electrical abbreviations or units.
const MODEL_PREFIX_DENYLIST = new Set([
  'BS',
  'EN',
  'AC',
  'DC',
  'IP',
  'LED',
  'MCB',
  'RCBO',
  'RCD',
  'MCCB',
  'PCB',
  'SMD',
  'CO',
  'V',
  'MA',
]);

const REPLACE_BY_PATTERN =
  /replace\s*(?:by|before|date)?[^0-9]{0,12}(\d{1,2}\s*[/.-]\s*\d{2,4}|\d{4})/i;

export interface DetectorTextHints {
  manufacturer: string | null;
  model: string | null;
  powerSource: string | null;
  standards: string[];
  replaceByDate: string | null;
  /** True when the marks belong to the detector family that was requested. */
  matchesRequestedKind: boolean | null;
}

function normaliseLines(textLines: string[]): string[] {
  return textLines
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function findManufacturer(joined: string): string | null {
  const haystack = joined.toLowerCase();
  for (const [pattern, name] of MANUFACTURERS) {
    if (haystack.includes(pattern)) {
      return name;
    }
  }
  return null;
}

function findStandards(textLines: string[]): string[] {
  const found = new Set<string>();
  for (const line of textLines) {
    const matches = line.match(STANDARD_PATTERN);
    if (!matches) {
      continue;
    }
    for (const match of matches) {
      found.add(match.replace(/\s+/g, ' ').trim().toUpperCase());
    }
  }
  return Array.from(found).slice(0, 5);
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findModel(textLines: string[], manufacturerName: string | null): string | null {
  // Strip the manufacturer name first so "Deta 1131" does not come back as a
  // model code of "DETA1131" when the brand is already known.
  const manufacturerPattern = manufacturerName
    ? new RegExp(escapeForRegExp(manufacturerName), 'gi')
    : null;

  for (const rawLine of textLines) {
    const line = manufacturerPattern ? rawLine.replace(manufacturerPattern, ' ') : rawLine;

    // Standards codes and dates also match the alphanumeric model pattern, so
    // skip any line that carries a standard mark.
    if (STANDARD_PATTERN.test(line)) {
      STANDARD_PATTERN.lastIndex = 0;
      continue;
    }
    STANDARD_PATTERN.lastIndex = 0;

    const matches = line.match(MODEL_PATTERN);
    if (!matches) {
      continue;
    }

    for (const match of matches) {
      const normalised = match.replace(/[\s-]+/g, '').toUpperCase();
      const prefix = (normalised.match(/^[A-Z]+/) ?? [''])[0];

      if (MODEL_PREFIX_DENYLIST.has(prefix) || normalised.length < 4) {
        continue;
      }

      return normalised;
    }
  }

  return null;
}

function findPowerSource(joined: string): string | null {
  const haystack = joined.toLowerCase();

  if (/10\s*[- ]?\s*year\s*(?:sealed\s*)?(?:lithium\s*)?battery/.test(haystack)) {
    return 'Sealed 10-year lithium battery';
  }
  if (/mains/.test(haystack) && /(backup|back-up|battery)/.test(haystack)) {
    return 'Mains powered with battery backup';
  }
  if (/mains|230\s*v|240\s*v/.test(haystack)) {
    return 'Mains powered';
  }
  if (/battery|9\s*v|aa\b|aaa\b/.test(haystack)) {
    return 'Battery powered';
  }
  return null;
}

function findReplaceByDate(joined: string): string | null {
  const match = joined.match(REPLACE_BY_PATTERN);
  if (!match || !match[1]) {
    return null;
  }
  const raw = match[1].replace(/\s+/g, '').replace(/[.-]/g, '/');
  if (/^\d{1,2}\/\d{2,4}$/.test(raw) || /^\d{4}$/.test(raw)) {
    return raw;
  }
  return null;
}

/**
 * Reads detector markings out of OCR text lines.
 *
 * `matchesRequestedKind` is only ever false when a standard belonging to the
 * *other* detector family is printed and none belonging to the requested one
 * is, which is a strong signal that the wrong photo was captured.
 */
export function deriveDetectorTextHints(
  textLines: string[],
  detectorType: DetectorKind,
): DetectorTextHints {
  const lines = normaliseLines(textLines);
  const joined = lines.join(' ');

  const standards = findStandards(lines);
  const hasSmokeStandard = SMOKE_STANDARDS.test(joined);
  const hasCoStandard = CO_STANDARDS.test(joined);

  let matchesRequestedKind: boolean | null = null;
  if (hasSmokeStandard && !hasCoStandard) {
    matchesRequestedKind = detectorType === 'smoke';
  } else if (hasCoStandard && !hasSmokeStandard) {
    matchesRequestedKind = detectorType === 'co';
  }

  const manufacturer = findManufacturer(joined);

  return {
    manufacturer,
    model: findModel(lines, manufacturer),
    powerSource: findPowerSource(joined),
    standards,
    replaceByDate: findReplaceByDate(joined),
    matchesRequestedKind,
  };
}

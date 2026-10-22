import type {
  HousingRepeatableGroup,
  HousingReportTemplate,
} from '@/lib/housing/types';

export type HousingValueMap = Record<string, string>;
export type HousingRow = Record<string, string>;
export type HousingRowMap = Record<string, HousingRow[]>;

export interface HousingReportPayload {
  templateKey: string;
  certificateType: string;
  reportTitle: string;
  certificateNumber: string;
  customerName: string;
  siteName: string;
  siteAddress: string;
  inspectionDate: string;
  nextInspectionDate: string;
  inspectorName: string;
  values: HousingValueMap;
  rows: HousingRowMap;
}

export function createEmptyRow(group: HousingRepeatableGroup): HousingRow {
  return group.columns.reduce<HousingRow>((row, column) => {
    row[column.id] = '';
    return row;
  }, {});
}

export function createInitialRows(group: HousingRepeatableGroup): HousingRow[] {
  const count = Math.max(1, group.defaultRows ?? 1);
  return Array.from({ length: count }, () => createEmptyRow(group));
}

/** Repeatable rows are stored in `formData` as a JSON string. */
export function serialiseRows(rows: HousingRow[]): string {
  return JSON.stringify(rows);
}

export function parseRows(value: unknown): HousingRow[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(isPlainObject).map(normaliseRow);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('[')) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isPlainObject).map(normaliseRow);
  } catch {
    return [];
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normaliseRow(value: Record<string, unknown>): HousingRow {
  return Object.entries(value).reduce<HousingRow>((row, [key, cell]) => {
    row[key] = cell === null || cell === undefined ? '' : String(cell);
    return row;
  }, {});
}

/** True when every cell in the row is blank, which lets us drop unused rows. */
export function isRowEmpty(row: HousingRow): boolean {
  return Object.values(row).every((cell) => !cell || cell.trim().length === 0);
}

export function readValues(source: Record<string, unknown> | null | undefined): HousingValueMap {
  if (!source) {
    return {};
  }

  return Object.entries(source).reduce<HousingValueMap>((values, [key, value]) => {
    if (value === null || value === undefined) {
      values[key] = '';
    } else if (typeof value === 'object') {
      values[key] = '';
    } else {
      values[key] = String(value);
    }
    return values;
  }, {});
}

export function readRows(
  template: HousingReportTemplate,
  source: Record<string, unknown> | null | undefined,
): HousingRowMap {
  if (!source) {
    return {};
  }

  return template.sections.reduce<HousingRowMap>((rows, section) => {
    if (section.repeatable) {
      rows[section.repeatable.id] = parseRows(source[section.repeatable.id]);
    }
    return rows;
  }, {});
}

/**
 * Builds the single payload consumed by the live preview and the PDF writer, so
 * what the user previews is exactly what gets downloaded.
 */
export function buildHousingReportPayload(
  template: HousingReportTemplate,
  source: {
    certificateNumber?: string;
    customerName?: string;
    siteName?: string;
    siteAddress?: string;
    inspectionDate?: string;
    nextInspectionDate?: string;
    inspectorName?: string;
    values?: HousingValueMap;
    rows?: HousingRowMap;
  },
): HousingReportPayload {
  return {
    templateKey: template.key,
    certificateType: template.certificateType,
    reportTitle: template.reportTitle,
    certificateNumber: source.certificateNumber ?? '',
    customerName: source.customerName ?? '',
    siteName: source.siteName ?? '',
    siteAddress: source.siteAddress ?? '',
    inspectionDate: source.inspectionDate ?? '',
    nextInspectionDate: source.nextInspectionDate ?? '',
    inspectorName: source.inspectorName ?? '',
    values: source.values ?? {},
    rows: source.rows ?? {},
  };
}

export function formatUkDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

import type { Plan3DLegendConfig } from './plan3d-types';

/** A blank legend: the company block is filled in by the user before the plan is shared. */
export const DEFAULT_LEGEND_CONFIG: Plan3DLegendConfig = {
  planTitle: 'Fire alarm zone plan',
  jobReference: '',
  siteName: '',
  siteAddress: '',
  preparedBy: '',
  preparedOn: '',
  revision: 'A',
  notes: '',
  company: {
    name: '',
    addressLines: [''],
    phone: '',
    email: '',
    website: '',
    accreditation: '',
  },
  showZoneLegend: true,
  showDeviceLegend: true,
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function readString(source: Record<string, unknown>, key: string, fallback = ''): string {
  const value = source[key];

  return typeof value === 'string' ? value.trim() : fallback;
}

function readBoolean(source: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = source[key];

  return typeof value === 'boolean' ? value : fallback;
}

function readAddressLines(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Merges a stored legend over the defaults. Stored records arrive from a JSON column and from
 * a publicly editable viewer, so every field is validated rather than trusted.
 */
export function normaliseLegendConfig(value: unknown): Plan3DLegendConfig {
  const record = asRecord(value);
  const company = asRecord(record.company);

  return {
    planTitle: readString(record, 'planTitle', DEFAULT_LEGEND_CONFIG.planTitle),
    jobReference: readString(record, 'jobReference'),
    siteName: readString(record, 'siteName'),
    siteAddress: readString(record, 'siteAddress'),
    preparedBy: readString(record, 'preparedBy'),
    preparedOn: readString(record, 'preparedOn'),
    revision: readString(record, 'revision', DEFAULT_LEGEND_CONFIG.revision),
    notes: readString(record, 'notes'),
    company: {
      name: readString(company, 'name'),
      addressLines: readAddressLines(company.addressLines),
      phone: readString(company, 'phone'),
      email: readString(company, 'email'),
      website: readString(company, 'website'),
      accreditation: readString(company, 'accreditation'),
    },
    showZoneLegend: readBoolean(record, 'showZoneLegend', true),
    showDeviceLegend: readBoolean(record, 'showDeviceLegend', true),
  };
}

/** True when the company block would print as nothing, used to nudge the user before sharing. */
export function isLegendCompanyEmpty(config: Plan3DLegendConfig): boolean {
  return (
    !config.company.name &&
    config.company.addressLines.length === 0 &&
    !config.company.phone &&
    !config.company.email &&
    !config.company.website &&
    !config.company.accreditation
  );
}

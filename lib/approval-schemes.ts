export type ApprovalSchemeId = string;

export type ApprovalSchemeInfo = {
  id: ApprovalSchemeId;
  code?: string;
  label: string;
  shortLabel: string;
  description: string;
  accentColor: string;
  textColor: string;
  symbol: string;
  logoSrc?: string;
  logoAlt?: string;
};

export const APPROVAL_SCHEMES: ApprovalSchemeInfo[] = [
  {
    id: 'Gas Safe',
    code: 'gas-safe',
    label: 'Gas Safe',
    shortLabel: 'Gas Safe',
    description: 'Gas safety registrations',
    accentColor: '#f59e0b',
    textColor: '#111827',
    symbol: 'GS',
    logoSrc: '/gas-safe-logo.png',
    logoAlt: 'Gas Safe Register logo',
  },
  {
    id: 'NICEIC',
    code: 'niceic',
    label: 'NICEIC',
    shortLabel: 'NICEIC',
    description: 'Electrical contracting',
    accentColor: '#1d4ed8',
    textColor: '#ffffff',
    symbol: 'NC',
    logoSrc: '/logos/niceic-logo.png',
    logoAlt: 'NICEIC logo',
  },
  {
    id: 'NAPIT',
    code: 'napit',
    label: 'NAPIT',
    shortLabel: 'NAPIT',
    description: 'Electrical and building',
    accentColor: '#15803d',
    textColor: '#ffffff',
    symbol: 'NP',
    logoSrc: '/NAPIT-Member-Logo.webp',
    logoAlt: 'NAPIT Member logo',
  },
  {
    id: 'ELECSA',
    code: 'elecsa',
    label: 'ELECSA',
    shortLabel: 'ELECSA',
    description: 'Domestic electrical certification',
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    symbol: 'EL',
  },
  {
    id: 'Stroma',
    code: 'stroma',
    label: 'Stroma',
    shortLabel: 'Stroma',
    description: 'Inspection and compliance',
    accentColor: '#0f766e',
    textColor: '#ffffff',
    symbol: 'ST',
    logoSrc: '/logos/stroma.png',
    logoAlt: 'Stroma logo',
  },
  {
    id: 'SELECT',
    code: 'select',
    label: 'SELECT',
    shortLabel: 'SELECT',
    description: 'Scottish electrical trade',
    accentColor: '#0f172a',
    textColor: '#ffffff',
    symbol: 'SL',
  },
  {
    id: 'BAFE',
    code: 'bafe',
    label: 'BAFE',
    shortLabel: 'BAFE',
    description: 'Fire safety certification',
    accentColor: '#b91c1c',
    textColor: '#ffffff',
    symbol: 'BF',
    logoSrc: '/logos/bafe-logo.png',
    logoAlt: 'BAFE logo',
  },
  {
    id: 'CHAS',
    code: 'chas',
    label: 'CHAS',
    shortLabel: 'CHAS',
    description: 'Contractor health and safety compliance',
    accentColor: '#0f4c81',
    textColor: '#ffffff',
    symbol: 'CH',
  },
  {
    id: 'SafeContractor',
    code: 'safecontractor',
    label: 'SafeContractor',
    shortLabel: 'SafeContractor',
    description: 'Health, safety and supply chain certification',
    accentColor: '#006837',
    textColor: '#ffffff',
    symbol: 'SC',
  },
  {
    id: 'ISO 9001',
    code: 'iso-9001',
    label: 'ISO 9001',
    shortLabel: 'ISO 9001',
    description: 'Quality management systems',
    accentColor: '#111827',
    textColor: '#ffffff',
    symbol: 'QMS',
  },
  {
    id: 'ISO 14001',
    code: 'iso-14001',
    label: 'ISO 14001',
    shortLabel: 'ISO 14001',
    description: 'Environmental management systems',
    accentColor: '#14532d',
    textColor: '#ffffff',
    symbol: 'EMS',
  },
  {
    id: 'ISO 45001',
    code: 'iso-45001',
    label: 'ISO 45001',
    shortLabel: 'ISO 45001',
    description: 'Occupational health and safety management',
    accentColor: '#7f1d1d',
    textColor: '#ffffff',
    symbol: 'OHS',
  },
];

export function normalizeApprovalSchemeInfo(input: Partial<ApprovalSchemeInfo> & { label: string }): ApprovalSchemeInfo {
  return {
    id: input.id ?? input.label,
    code: input.code,
    label: input.label,
    shortLabel: input.shortLabel ?? input.label,
    description: input.description ?? '',
    accentColor: input.accentColor ?? '#1d4ed8',
    textColor: input.textColor ?? '#ffffff',
    symbol: input.symbol ?? input.label.slice(0, 2).toUpperCase(),
    logoSrc: input.logoSrc,
    logoAlt: input.logoAlt,
  };
}

export function getApprovalSchemeInfo(id: string, availableSchemes?: ApprovalSchemeInfo[]): ApprovalSchemeInfo | null {
  if (!id) {
    return null;
  }

  const source = Array.isArray(availableSchemes) && availableSchemes.length > 0 ? availableSchemes : APPROVAL_SCHEMES;
  const normalizedId = id.trim().toLowerCase();
  const found = source.find((scheme) => {
    const byId = scheme.id?.trim().toLowerCase() === normalizedId;
    const byLabel = scheme.label?.trim().toLowerCase() === normalizedId;
    const byCode = scheme.code?.trim().toLowerCase() === normalizedId;
    return byId || byLabel || byCode;
  });

  return found ? normalizeApprovalSchemeInfo(found) : null;
}

export function getApprovalSchemeIds(values: unknown): ApprovalSchemeId[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}
/**
 * Shape returned by `GET /api/approval-schemes`. The database is the single
 * source of truth for approval scheme metadata, including logos uploaded
 * through the admin screen, so user-facing pages map these rows rather than
 * trusting the bundled catalogue above.
 */
export type ApprovalSchemeRow = {
  id?: number;
  code?: string | null;
  label?: string | null;
  shortLabel?: string | null;
  description?: string | null;
  accentColor?: string | null;
  textColor?: string | null;
  symbol?: string | null;
  logoSrc?: string | null;
  logoAlt?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
};

function optionalTrimmed(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Converts a database row into the shape the UI consumes.
 *
 * The `id` is intentionally the row label rather than the row code: stored user
 * preferences and the MEIWC form both persist the label as the scheme
 * identifier, so reusing the label keeps existing selections valid.
 */
export function mapApprovalSchemeRowToInfo(row: ApprovalSchemeRow): ApprovalSchemeInfo | null {
  const label = optionalTrimmed(row.label);
  if (!label) {
    return null;
  }

  return normalizeApprovalSchemeInfo({
    id: label,
    code: optionalTrimmed(row.code),
    label,
    shortLabel: optionalTrimmed(row.shortLabel) ?? label,
    description: optionalTrimmed(row.description) ?? '',
    accentColor: optionalTrimmed(row.accentColor) ?? '#1d4ed8',
    textColor: optionalTrimmed(row.textColor) ?? '#ffffff',
    symbol: optionalTrimmed(row.symbol) ?? label.slice(0, 2).toUpperCase(),
    logoSrc: optionalTrimmed(row.logoSrc),
    logoAlt: optionalTrimmed(row.logoAlt),
  });
}

/** Maps an unknown API payload into a de-duplicated list of scheme info. */
export function buildApprovalSchemesFromRows(payload: unknown): ApprovalSchemeInfo[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const seen = new Set<string>();
  const schemes: ApprovalSchemeInfo[] = [];

  for (const row of payload) {
    if (!row || typeof row !== 'object') {
      continue;
    }

    const scheme = mapApprovalSchemeRowToInfo(row as ApprovalSchemeRow);
    if (!scheme) {
      continue;
    }

    const key = scheme.id.trim().toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    schemes.push(scheme);
  }

  return schemes;
}

/**
 * Keeps only the stored scheme identifiers that still resolve against the
 * supplied catalogue, preserving the original order. Falls back to the bundled
 * catalogue when no database-backed list is available yet.
 */
export function filterKnownApprovalSchemes(
  values: unknown,
  availableSchemes?: ApprovalSchemeInfo[]
): ApprovalSchemeId[] {
  const catalogue =
    Array.isArray(availableSchemes) && availableSchemes.length > 0
      ? availableSchemes
      : APPROVAL_SCHEMES;

  return getApprovalSchemeIds(values).filter(
    (schemeId) => getApprovalSchemeInfo(schemeId, catalogue) !== null
  );
}

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

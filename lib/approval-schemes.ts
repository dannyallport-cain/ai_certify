export type ApprovalSchemeId =
  | 'Gas Safe'
  | 'NICEIC'
  | 'NAPIT'
  | 'ELECSA'
  | 'Stroma'
  | 'SELECT'
  | 'BAFE';

export type ApprovalSchemeInfo = {
  id: ApprovalSchemeId;
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
    label: 'Gas Safe',
    shortLabel: 'Gas Safe',
    description: 'Gas safety registrations',
    accentColor: '#f59e0b',
    textColor: '#111827',
    symbol: 'GS',
  },
  {
    id: 'NICEIC',
    label: 'NICEIC',
    shortLabel: 'NICEIC',
    description: 'Electrical contracting',
    accentColor: '#1d4ed8',
    textColor: '#ffffff',
    symbol: 'NC',
  },
  {
    id: 'NAPIT',
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
    label: 'ELECSA',
    shortLabel: 'ELECSA',
    description: 'Domestic electrical certification',
    accentColor: '#7c3aed',
    textColor: '#ffffff',
    symbol: 'EL',
  },
  {
    id: 'Stroma',
    label: 'Stroma',
    shortLabel: 'Stroma',
    description: 'Inspection and compliance',
    accentColor: '#0f766e',
    textColor: '#ffffff',
    symbol: 'ST',
  },
  {
    id: 'SELECT',
    label: 'SELECT',
    shortLabel: 'SELECT',
    description: 'Scottish electrical trade',
    accentColor: '#0f172a',
    textColor: '#ffffff',
    symbol: 'SL',
  },
  {
    id: 'BAFE',
    label: 'BAFE',
    shortLabel: 'BAFE',
    description: 'Fire safety certification',
    accentColor: '#b91c1c',
    textColor: '#ffffff',
    symbol: 'BF',
    logoSrc: '/BAFE-Logo.webp',
    logoAlt: 'BAFE logo',
  },
];

const approvalSchemeMap = new Map<ApprovalSchemeId, ApprovalSchemeInfo>(
  APPROVAL_SCHEMES.map((scheme) => [scheme.id, scheme]),
);

export function getApprovalSchemeInfo(id: string): ApprovalSchemeInfo | null {
  return approvalSchemeMap.get(id as ApprovalSchemeId) ?? null;
}

export function getApprovalSchemeIds(values: unknown): ApprovalSchemeId[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const validIds = new Set<ApprovalSchemeId>(APPROVAL_SCHEMES.map((scheme) => scheme.id));
  return values.filter((value): value is ApprovalSchemeId => typeof value === 'string' && validIds.has(value as ApprovalSchemeId));
}

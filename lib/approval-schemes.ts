export type ApprovalSchemeId =
  | 'Gas Safe'
  | 'NICEIC'
  | 'NAPIT'
  | 'ELECSA'
  | 'Stroma'
  | 'SELECT'
  | 'BAFE'
  | 'CHAS'
  | 'SafeContractor'
  | 'ISO 9001'
  | 'ISO 14001'
  | 'ISO 45001';

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
    logoSrc: '/gas-safe-vector-6231473.webp',
    logoAlt: 'Gas Safe Register logo',
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
  {
    id: 'CHAS',
    label: 'CHAS',
    shortLabel: 'CHAS',
    description: 'Contractor health and safety compliance',
    accentColor: '#0f4c81',
    textColor: '#ffffff',
    symbol: 'CH',
    logoSrc: 'https://www.chas.co.uk/wp-content/uploads/2023/11/veriforce-chas-x.png',
    logoAlt: 'Veriforce CHAS logo',
  },
  {
    id: 'SafeContractor',
    label: 'SafeContractor',
    shortLabel: 'SafeContractor',
    description: 'Health, safety and supply chain certification',
    accentColor: '#006837',
    textColor: '#ffffff',
    symbol: 'SC',
    logoSrc: 'https://www.safecontractor.com/wp-content/uploads/2023/09/safecontractor-1-81x80.png',
    logoAlt: 'SafeContractor logo',
  },
  {
    id: 'ISO 9001',
    label: 'ISO 9001',
    shortLabel: 'ISO 9001',
    description: 'Quality management systems',
    accentColor: '#111827',
    textColor: '#ffffff',
    symbol: 'QMS',
    logoSrc: '/logos/iso-9001.svg',
    logoAlt: 'ISO 9001 badge',
  },
  {
    id: 'ISO 14001',
    label: 'ISO 14001',
    shortLabel: 'ISO 14001',
    description: 'Environmental management systems',
    accentColor: '#14532d',
    textColor: '#ffffff',
    symbol: 'EMS',
    logoSrc: '/logos/iso-14001.svg',
    logoAlt: 'ISO 14001 badge',
  },
  {
    id: 'ISO 45001',
    label: 'ISO 45001',
    shortLabel: 'ISO 45001',
    description: 'Occupational health and safety management',
    accentColor: '#7f1d1d',
    textColor: '#ffffff',
    symbol: 'OHS',
    logoSrc: '/logos/iso-45001.svg',
    logoAlt: 'ISO 45001 badge',
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

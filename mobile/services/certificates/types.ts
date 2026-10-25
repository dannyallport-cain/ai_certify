import type { ServiceM8JobRecord } from '@/services/api';

/**
 * The certificate types the mobile workflow can actually complete.
 *
 * The mobile editor collects BS 7671 electrical detail (circuits, observations,
 * supply characteristics), so only electrical certificates are offered here.
 * Gas, fire alarm and emergency lighting certificates have their own web
 * workflows and forms that the app does not reproduce.
 */
export interface MobileCertificateTypeOption {
  /** Stored in `certificates.certificate_type`. */
  value: string;
  label: string;
  description: string;
  /** Words that identify this type in a job description. */
  keywords: string[];
}

export const MOBILE_CERTIFICATE_TYPES: MobileCertificateTypeOption[] = [
  {
    value: 'EICR',
    label: 'EICR',
    description: 'Electrical Installation Condition Report — periodic inspection of existing wiring.',
    keywords: ['eicr', 'condition report', 'periodic', 'piri', 'fixed wiring'],
  },
  {
    value: 'EIC',
    label: 'EIC',
    description: 'Electrical Installation Certificate — new circuits, boards or alterations.',
    keywords: ['eic', 'new installation', 'new circuit', 'new board', 'consumer unit replacement', 'rewire'],
  },
  {
    value: 'MEIWC',
    label: 'Minor works',
    description: 'Minor Electrical Installation Works Certificate — small additions or alterations.',
    keywords: ['minor works', 'meiwc', 'minor electrical', 'extra socket', 'additional socket', 'swap'],
  },
];

export const DEFAULT_CERTIFICATE_TYPE = 'EICR';

const KNOWN_VALUES = new Set(MOBILE_CERTIFICATE_TYPES.map((option) => option.value.toUpperCase()));

export function isMobileCertificateType(value: string | null | undefined): boolean {
  return typeof value === 'string' && KNOWN_VALUES.has(value.toUpperCase());
}

export function getMobileCertificateTypeLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = MOBILE_CERTIFICATE_TYPES.find(
    (option) => option.value.toUpperCase() === value.toUpperCase()
  );

  return match?.label ?? value;
}

/**
 * Suggests a certificate type from the ServiceM8 job the surveyor picked.
 *
 * This is only a starting point — the wizard shows the suggestion with the
 * reason and lets the user override it, because a job description is often a
 * rough note rather than a specification.
 */
export function inferCertificateTypeFromJob(
  job: Pick<ServiceM8JobRecord, 'description' | 'workDoneDescription'> | null | undefined
): { type: string; matchedKeyword: string | null } {
  if (!job) {
    return { type: DEFAULT_CERTIFICATE_TYPE, matchedKeyword: null };
  }

  const haystack = [job.description, job.workDoneDescription]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();

  if (!haystack) {
    return { type: DEFAULT_CERTIFICATE_TYPE, matchedKeyword: null };
  }

  for (const option of MOBILE_CERTIFICATE_TYPES) {
    const keyword = option.keywords.find((candidate) => haystack.includes(candidate));
    if (keyword) {
      return { type: option.value, matchedKeyword: keyword };
    }
  }

  return { type: DEFAULT_CERTIFICATE_TYPE, matchedKeyword: null };
}

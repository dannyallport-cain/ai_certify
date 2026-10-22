import { HOUSING_REPORT_TEMPLATES } from '@/lib/housing';

/**
 * Human-readable names for every certificate and report type stored in
 * `certificates.certificate_type`. Both the underscored and dashed spellings
 * are mapped because historical rows use either form.
 */
const BASE_LABELS: Record<string, string> = {
  BS5839_1: 'BS5839-1 Fire alarm',
  'BS5839-1': 'BS5839-1 Fire alarm',
  BS5839_6: 'BS5839-6 Domestic fire alarm',
  'BS5839-6': 'BS5839-6 Domestic fire alarm',
  BS5266: 'BS5266 Emergency lighting',
  FIRE_EXTINGUISHER: 'Fire extinguisher',
  DRY_RISER: 'Dry riser',
  CP12: 'CP12 Gas safety',
  EICR: 'EICR',
  EICR_STREAMLINED: 'EICR — Streamlined',
  EIC: 'Electrical installation certificate',
  MEIWC: 'Minor electrical installation works certificate',
};

const HOUSING_LABELS: Record<string, string> = HOUSING_REPORT_TEMPLATES.reduce<
  Record<string, string>
>((labels, template) => {
  labels[template.certificateType] = template.title;
  return labels;
}, {});

export const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  ...BASE_LABELS,
  ...HOUSING_LABELS,
};

export function getCertificateTypeLabel(type: string | null | undefined): string {
  if (!type) {
    return 'Unspecified';
  }

  return CERTIFICATE_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}

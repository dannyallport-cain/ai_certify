export const CERTIFICATE_EDIT_ROUTE_SEGMENTS: Record<string, string> = {
  EICR: 'eicr',
  EICR_STREAMLINED: 'eicr/streamlined',
};

const EDITABLE_CERTIFICATE_TYPES = new Set(Object.keys(CERTIFICATE_EDIT_ROUTE_SEGMENTS));

function normalizeCertificateType(type: string) {
  return type.trim().replace(/-/g, '_').toUpperCase();
}

export function getCertificateDetailPath(certificateId: number) {
  return `/certificates/${certificateId}`;
}

export function getCertificateEditPath(certificateType: string, certificateId: number) {
  const normalizedType = normalizeCertificateType(certificateType);
  const segment = CERTIFICATE_EDIT_ROUTE_SEGMENTS[normalizedType];

  if (!segment) {
    return null;
  }

  return `/certificates/new/${segment}?editId=${certificateId}`;
}

export function isEditableCertificateType(certificateType: string) {
  return EDITABLE_CERTIFICATE_TYPES.has(normalizeCertificateType(certificateType));
}

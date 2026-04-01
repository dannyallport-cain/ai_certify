export type CertificateAssessment = 'SATISFACTORY' | 'UNSATISFACTORY';
export type ObservationCode = 'C1' | 'C2' | 'C3' | 'FI';

export interface CertificateCustomerSummary {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface CertificateObservation {
  id: string;
  description: string;
  code: ObservationCode;
}

export interface CertificateCircuit {
  circuitNumber?: string;
  designation?: string;
  rating?: string;
  deviceType?: string;
  measuredZs?: string;
  maxZs?: string;
}

export interface CertificateEditorFormData {
  overallAssessment?: CertificateAssessment;
  reasonForReport?: string;
  extentOfInspection?: string;
  agreedLimitations?: string;
  operationalLimitations?: string;
  generalCondition?: string;
  observations?: CertificateObservation[];
  circuits?: CertificateCircuit[];
  [key: string]: unknown;
}

export interface MobileCertificateEditorRecord {
  id: number;
  certificateNumber: string;
  status: string;
  siteAddress: string | null;
  inspectionDate: string | null;
  inspectorName: string | null;
  customer: CertificateCustomerSummary | null;
  formData: CertificateEditorFormData;
}

export interface UpdateMobileCertificateInput {
  siteAddress?: string;
  inspectionDate?: string;
  inspectorName?: string;
  formData?: Partial<CertificateEditorFormData>;
}

export function createEmptyObservation(): CertificateObservation {
  return {
    id: createLocalRowId(),
    description: '',
    code: 'C3',
  };
}

export function createEmptyCircuit(): CertificateCircuit {
  return {
    designation: '',
    rating: '',
    deviceType: '',
    measuredZs: '',
    maxZs: '',
  };
}

export function normalizeCertificateEditorRecord(
  record: MobileCertificateEditorRecord,
): MobileCertificateEditorRecord {
  const formData = (record.formData ?? {}) as CertificateEditorFormData;

  return {
    ...record,
    formData: {
      ...formData,
      overallAssessment:
        formData.overallAssessment === 'UNSATISFACTORY' ? 'UNSATISFACTORY' : 'SATISFACTORY',
      reasonForReport: toStringOrEmpty(formData.reasonForReport),
      extentOfInspection: toStringOrEmpty(formData.extentOfInspection),
      agreedLimitations: toStringOrEmpty(formData.agreedLimitations),
      operationalLimitations: toStringOrEmpty(formData.operationalLimitations),
      generalCondition: toStringOrEmpty(formData.generalCondition),
      observations: normalizeObservations(formData.observations),
      circuits: normalizeCircuits(formData.circuits),
    },
  };
}

export function buildCertificateEditorPayload(
  record: MobileCertificateEditorRecord,
): UpdateMobileCertificateInput {
  return {
    siteAddress: record.siteAddress ?? '',
    inspectionDate: record.inspectionDate ?? '',
    inspectorName: record.inspectorName ?? '',
    formData: {
      overallAssessment:
        record.formData.overallAssessment === 'UNSATISFACTORY'
          ? 'UNSATISFACTORY'
          : 'SATISFACTORY',
      reasonForReport: toStringOrEmpty(record.formData.reasonForReport),
      extentOfInspection: toStringOrEmpty(record.formData.extentOfInspection),
      agreedLimitations: toStringOrEmpty(record.formData.agreedLimitations),
      operationalLimitations: toStringOrEmpty(record.formData.operationalLimitations),
      generalCondition: toStringOrEmpty(record.formData.generalCondition),
      observations: normalizeObservations(record.formData.observations),
      circuits: normalizeCircuits(record.formData.circuits),
    },
  };
}

function normalizeObservations(value: unknown): CertificateObservation[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const source = isRecord(item) ? item : {};
    const rawCode = typeof source.code === 'string' ? source.code : 'C3';

    return {
      id: typeof source.id === 'string' && source.id ? source.id : `obs-${index + 1}-${createLocalRowId()}`,
      description: toStringOrEmpty(source.description),
      code: rawCode === 'C1' || rawCode === 'C2' || rawCode === 'FI' ? rawCode : 'C3',
    };
  });
}

function normalizeCircuits(value: unknown): CertificateCircuit[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const source = isRecord(item) ? item : {};
    return {
      circuitNumber: toOptionalString(source.circuitNumber),
      designation: toOptionalString(source.designation),
      rating: toOptionalString(source.rating),
      deviceType: toOptionalString(source.deviceType),
      measuredZs: toOptionalString(source.measuredZs),
      maxZs: toOptionalString(source.maxZs),
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toOptionalString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function createLocalRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
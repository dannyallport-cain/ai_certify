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
  id?: string;
  circuitNumber?: string;
  designation?: string;
  rating?: string;
  deviceType?: string;
  deviceMake?: string;
  cableType?: string;
  csaLine?: string;
  csaCpc?: string;
  wiringMethod?: string;
  rcdProtection?: string;
  afddProtection?: string;
  spdProtected?: string;
  continuityR1R2?: string;
  continuityRn?: string;
  insulationResistance?: string;
  polarity?: string;
  measuredZs?: string;
  maxZs?: string;
  rcdTripTime?: string;
  arcFaultNotes?: string;
  functionalNotes?: string;
}

export interface CertificateEditorFormData {
  overallAssessment?: CertificateAssessment;
  reasonForReport?: string;
  extentOfInspection?: string;
  agreedLimitations?: string;
  operationalLimitations?: string;
  generalCondition?: string;
  dataEntryMode?: 'guided_photo' | 'manual_only' | 'hybrid';
  installationType?: string;
  occupancyType?: string;
  supplyPhase?: string;
  earthingArrangement?: string;
  mainSwitchRating?: string;
  supplyVoltage?: string;
  numberOfDistributionBoards?: string;
  numberOfCircuits?: string;
  hasSurgeProtection?: string;
  hasRcboProtection?: string;
  hasRcdProtection?: string;
  emergencyNotes?: string;
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
    id: createLocalRowId(),
    circuitNumber: '',
    designation: '',
    rating: '',
    deviceType: '',
    deviceMake: '',
    cableType: '',
    csaLine: '',
    csaCpc: '',
    wiringMethod: '',
    rcdProtection: '',
    afddProtection: '',
    spdProtected: '',
    continuityR1R2: '',
    continuityRn: '',
    insulationResistance: '',
    polarity: '',
    measuredZs: '',
    maxZs: '',
    rcdTripTime: '',
    arcFaultNotes: '',
    functionalNotes: '',
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
      dataEntryMode: normalizeDataEntryMode(formData.dataEntryMode),
      installationType: toStringOrEmpty(formData.installationType),
      occupancyType: toStringOrEmpty(formData.occupancyType),
      supplyPhase: toStringOrEmpty(formData.supplyPhase),
      earthingArrangement: toStringOrEmpty(formData.earthingArrangement),
      mainSwitchRating: toStringOrEmpty(formData.mainSwitchRating),
      supplyVoltage: toStringOrEmpty(formData.supplyVoltage),
      numberOfDistributionBoards: toStringOrEmpty(formData.numberOfDistributionBoards),
      numberOfCircuits: toStringOrEmpty(formData.numberOfCircuits),
      hasSurgeProtection: toStringOrEmpty(formData.hasSurgeProtection),
      hasRcboProtection: toStringOrEmpty(formData.hasRcboProtection),
      hasRcdProtection: toStringOrEmpty(formData.hasRcdProtection),
      emergencyNotes: toStringOrEmpty(formData.emergencyNotes),
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
      dataEntryMode: normalizeDataEntryMode(record.formData.dataEntryMode),
      installationType: toStringOrEmpty(record.formData.installationType),
      occupancyType: toStringOrEmpty(record.formData.occupancyType),
      supplyPhase: toStringOrEmpty(record.formData.supplyPhase),
      earthingArrangement: toStringOrEmpty(record.formData.earthingArrangement),
      mainSwitchRating: toStringOrEmpty(record.formData.mainSwitchRating),
      supplyVoltage: toStringOrEmpty(record.formData.supplyVoltage),
      numberOfDistributionBoards: toStringOrEmpty(record.formData.numberOfDistributionBoards),
      numberOfCircuits: toStringOrEmpty(record.formData.numberOfCircuits),
      hasSurgeProtection: toStringOrEmpty(record.formData.hasSurgeProtection),
      hasRcboProtection: toStringOrEmpty(record.formData.hasRcboProtection),
      hasRcdProtection: toStringOrEmpty(record.formData.hasRcdProtection),
      emergencyNotes: toStringOrEmpty(record.formData.emergencyNotes),
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

  return value.map((item, index) => {
    const source = isRecord(item) ? item : {};
    return {
      id: typeof source.id === 'string' && source.id ? source.id : `circuit-${index + 1}-${createLocalRowId()}`,
      circuitNumber: toOptionalString(source.circuitNumber),
      designation: toOptionalString(source.designation),
      rating: toOptionalString(source.rating),
      deviceType: toOptionalString(source.deviceType),
      deviceMake: toOptionalString(source.deviceMake),
      cableType: toOptionalString(source.cableType),
      csaLine: toOptionalString(source.csaLine),
      csaCpc: toOptionalString(source.csaCpc),
      wiringMethod: toOptionalString(source.wiringMethod),
      rcdProtection: toOptionalString(source.rcdProtection),
      afddProtection: toOptionalString(source.afddProtection),
      spdProtected: toOptionalString(source.spdProtected),
      continuityR1R2: toOptionalString(source.continuityR1R2),
      continuityRn: toOptionalString(source.continuityRn),
      insulationResistance: toOptionalString(source.insulationResistance),
      polarity: toOptionalString(source.polarity),
      measuredZs: toOptionalString(source.measuredZs),
      maxZs: toOptionalString(source.maxZs),
      rcdTripTime: toOptionalString(source.rcdTripTime),
      arcFaultNotes: toOptionalString(source.arcFaultNotes),
      functionalNotes: toOptionalString(source.functionalNotes),
    };
  });
}

function normalizeDataEntryMode(value: unknown): 'guided_photo' | 'manual_only' | 'hybrid' {
  return value === 'manual_only' || value === 'hybrid' ? value : 'guided_photo';
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

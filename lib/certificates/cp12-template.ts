import type { Step } from '@/components/GuidedModeModal';

export const CP12_APPLIANCE_COUNT = 6;

export const CP12_FLUE_TYPE_OPTIONS = ['FL', 'OF', 'RS-BF', 'RS-FF'] as const;
export const CP12_YES_NO_OPTIONS = ['Yes', 'No'] as const;
export const CP12_YES_NO_NA_OPTIONS = ['Yes', 'No', 'N/A'] as const;
export const CP12_SAFE_TO_USE_OPTIONS = ['Yes', 'No', 'At Risk', 'Immediately Dangerous'] as const;
export const CP12_INSPECTION_TYPE_OPTIONS = [
  'Annual Gas Safety Check',
  'New Tenancy Check',
  'Follow-up Safety Check',
  'Boiler Service',
  'Commissioning',
  'Tightness Test',
] as const;
export const CP12_APPLIANCE_STATUS_OPTIONS = ['Yes', 'No', 'N/A'] as const;
export const CP12_COMBUSTION_READING_LABELS = [
  '1st Reading / Min / Low',
  '2nd Reading / Max / High',
  '3rd Reading / Ign / Other',
] as const;

export type Cp12FlueType = (typeof CP12_FLUE_TYPE_OPTIONS)[number];
export type Cp12YesNo = (typeof CP12_YES_NO_OPTIONS)[number];
export type Cp12YesNoNa = (typeof CP12_YES_NO_NA_OPTIONS)[number];
export type Cp12SafeToUse = (typeof CP12_SAFE_TO_USE_OPTIONS)[number];
export type Cp12InspectionType = (typeof CP12_INSPECTION_TYPE_OPTIONS)[number];

export interface Cp12ApplianceRow {
  location: string;
  applianceType: string;
  makeModel: string;
  flueType: string;
  landlordsAppliance: Cp12YesNoNa;
  applianceInspected: Cp12YesNo;
  operatingPressure: string;
  safetyDevicesCorrect: Cp12YesNoNa;
  ventilationSatisfactory: Cp12YesNoNa;
  flueConditionSatisfactory: Cp12YesNoNa;
  fluePerformanceResult: Cp12YesNoNa;
  applianceServiced: Cp12YesNo;
  applianceSafeToUse: Cp12SafeToUse;
  warningNoticeIssued: Cp12YesNo;
  warningNoticeSerial: string;
  notes: string;
}

export interface Cp12CombustionReading {
  readingLabel: string;
  co: string;
  co2: string;
  ratio: string;
}

export function createEmptyCp12ApplianceRow(): Cp12ApplianceRow {
  return {
    location: '',
    applianceType: '',
    makeModel: '',
    flueType: '',
    landlordsAppliance: 'N/A',
    applianceInspected: 'Yes',
    operatingPressure: '',
    safetyDevicesCorrect: 'Yes',
    ventilationSatisfactory: 'Yes',
    flueConditionSatisfactory: 'Yes',
    fluePerformanceResult: 'N/A',
    applianceServiced: 'Yes',
    applianceSafeToUse: 'Yes',
    warningNoticeIssued: 'No',
    warningNoticeSerial: '',
    notes: '',
  };
}

export function createDefaultCp12Appliances() {
  return Array.from({ length: CP12_APPLIANCE_COUNT }, () => createEmptyCp12ApplianceRow());
}

export function createDefaultCp12CombustionReadings() {
  return [
    {
      readingLabel: CP12_COMBUSTION_READING_LABELS[0],
      co: '',
      co2: '',
      ratio: '',
    },
    {
      readingLabel: CP12_COMBUSTION_READING_LABELS[1],
      co: '',
      co2: '',
      ratio: '',
    },
    {
      readingLabel: CP12_COMBUSTION_READING_LABELS[2],
      co: '',
      co2: '',
      ratio: '',
    },
  ] satisfies Cp12CombustionReading[];
}

export function createCp12GuidedSteps(): Step[] {
  return [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'landlordName', label: 'Landlord / Agent Name', type: 'text' },
    { name: 'siteName', label: 'Site / Property Name', type: 'text' },
    { name: 'siteAddress', label: 'Site / Property Address', type: 'textarea' },
    { name: 'businessName', label: 'Registered Business Name', type: 'text' },
    { name: 'inspectorName', label: 'Gas Operative / Engineer Name', type: 'text' },
    { name: 'gasSafeNumber', label: 'Gas Safe Registration No.', type: 'text' },
    { name: 'inspectionDate', label: 'Inspection Date', type: 'text' },
    { name: 'nextInspectionDate', label: 'Next Safety Check Due', type: 'text' },
    { name: 'appliance-1-location', label: 'Appliance 1 Location', type: 'text' },
    { name: 'appliance-1-type', label: 'Appliance 1 Type', type: 'text' },
    { name: 'defectsRemedialAction', label: 'Defects / Remedial Action', type: 'textarea' },
  ];
}

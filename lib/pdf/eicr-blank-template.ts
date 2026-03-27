/**
 * EICR Blank Template
 * ===================
 * Fully-structured blank data model for an Electrical Installation Condition Report
 * conforming to BS 7671:2018 (as amended) Appendix 6 model forms.
 *
 * Exports:
 *   - TypeScript interfaces for every section
 *   - BLANK_INSPECTION_SCHEDULE  — all 50+ BS 7671 schedule items, outcomes empty
 *   - BLANK_CIRCUIT_ROW          — one empty circuit row (spread/clone to add rows)
 *   - BLANK_EICR_FORM_DATA       — complete formData blob, all fields '' / default
 *   - createBlankEICR()          — factory: returns a fresh CertificateData-compatible object
 *   - calculateNextInspectionDate() — derives ISO date from inspection date + period string
 *   - deriveOverallAssessment()  — returns 'SATISFACTORY' | 'UNSATISFACTORY' from observations
 *   - validateEICRFormData()     — lightweight validation, returns array of error strings
 */

import type { CertificateData } from './generator';
import { calculateMaxZs, type DeviceType, DEVICE_TYPE_OPTIONS } from '../utils/calculate-zs';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ObservationCode = 'C1' | 'C2' | 'C3' | 'FI';

/** Classification of an EICR observation */
export interface EICRObservation {
  /** Plain-text description of the observation */
  description: string;
  /** C1 = Danger Present, C2 = Potentially Dangerous, C3 = Improvement Recommended, FI = Further Investigation */
  code: ObservationCode;
  /** Optional location reference */
  location?: string;
}

/** Outcome tick for each inspection-schedule item */
export type InspectionOutcome = '✓' | '✗' | 'N/A' | 'LIM' | '';

export interface InspectionScheduleItem {
  /** Free-text comment/note for this item */
  comment?: string;
  /** Result – ✓ satisfactory, ✗ not satisfactory, N/A not applicable, LIM limitation, '' not inspected */
  outcome?: InspectionOutcome;
}

/** Keyed by the BS 7671 reference number (e.g. '1.1', '4.14', '5.12.3') */
export type InspectionSchedule = Record<string, InspectionScheduleItem>;

/** Single row in the Section 16 circuit schedule */
export interface EICRCircuitRow {
  circuitNumber: string;
  designation: string;
  /** Wiring type code: A=Thermoplastic, B=Thermosetting, C=Armoured, D=Flexible */
  wiringType: string;
  /** Installation reference method (BS 7671 Appendix 4 table) */
  refMethod: string;
  /** Live conductor CSA (mm²) */
  liveCsa: string;
  /** CPC / earth conductor CSA (mm²) */
  cpcCsa: string;
  /** Max disconnection time (s) */
  maxDiscTime: string;
  /** BS EN standard (e.g. 60898) */
  bsen: string;
  /** Protective device type (B / C / D / RCBO / BS88 / TT) — drives auto maxZs */
  deviceType: DeviceType;
  /** Rated current (A) */
  rating: string;
  /** Short-circuit capacity (kA) */
  capacity: string;
  /** RCD operating current (mA) */
  rcdRating: string;
  /** Max permissible Zs (Ω) */
  maxZs: string;
  /** r1 (Line) measured end-to-end – ring final circuits only */
  r1Line: string;
  /** rn (Neutral) measured end-to-end – ring final circuits only */
  rnNeutral: string;
  /** r2 (cpc) measured end-to-end – ring final circuits only */
  r2Cpc: string;
  /** R1+R2 (Ω) – all circuits */
  r1r2: string;
  /** R2 only (Ω) – all circuits */
  r2: string;
  /** Insulation resistance L–L (MΩ) */
  insResLL: string;
  /** Insulation resistance L–E (MΩ) */
  insResLE: string;
  /** Test voltage (V) */
  testVoltage: string;
  /** Polarity confirmed */
  polarity: string;
  /** Measured Zs (Ω) */
  measuredZs: string;
  /** RCD operating time (ms) */
  discTime: string;
  /** RCD integral test button checked */
  rcdTestButton: string;
  /** AFDD integral test button checked */
  afddTestButton: string;
}

/** Complete EICR formData blob (stored in certificates.formData JSON column) */
export interface EICRFormData {
  // ── Section 9 – Company / Inspector declaration ─────────────────────────
  tradingTitle: string;
  companyAddress: string;
  companyEmail: string;
  companyTelephone: string;
  registrationNumber: string;
  inspectorPosition: string;

  // ── Test instruments ─────────────────────────────────────────────────────
  instrumentMultiFunction: string;
  instrumentInsulationResistance: string;
  instrumentContinuity: string;
  instrumentEarthElectrode: string;
  instrumentEarthLoop: string;
  instrumentRCD: string;

  // ── Section 2 – Reason for Report ────────────────────────────────────────
  reasonForReport: string;

  // ── Section 3 – Installation Details ─────────────────────────────────────
  installationAddress: string;
  /** Domestic | Commercial | Industrial | Other */
  premisesType: string;
  estimatedAgeOfWiring: string;
  evidenceOfAdditions: string;
  evidenceOfAdditionsAge: string;
  installationRecordsAvailable: string;
  dateOfLastInspection: string;

  // ── Section 4 – Extent & Limitations ─────────────────────────────────────
  extentOfInspection: string;
  agreedLimitations: string;
  agreedLimitationsWith: string;
  operationalLimitations: string;

  // ── Section 5 – Overall Assessment ───────────────────────────────────────
  /** SATISFACTORY | UNSATISFACTORY */
  overallAssessment: string;

  // ── Section 6 – Recommendations ──────────────────────────────────────────
  /** e.g. '5 Years or change of tenant/owner' */
  nextInspectionPeriod: string;

  // ── General condition (Page 3) ────────────────────────────────────────────
  generalCondition: string;

  // ── Section I – Supply Characteristics ───────────────────────────────────
  /** TN-S | TN-C-S | TT | IT */
  earthingArrangements: string;
  /** e.g. '1-phase (2 wire)' */
  natureOfSupply: string;
  supplyPolarityConfirmed: string;
  /** Nominal voltage U line-to-line (V) */
  nominalVoltageU: string;
  /** Nominal voltage Uo line-to-earth (V) */
  nominalVoltageUo: string;
  /** Nominal frequency (Hz) */
  nominalFrequency: string;
  /** Prospective fault current at supply (kA) */
  prospectiveFaultCurrent: string;
  /** External earth fault loop impedance Ze (Ω) */
  externalEarthFaultLoopImpedance: string;
  supplyProtectiveDeviceStandard: string;
  supplyProtectiveDeviceType: string;
  /** Supply protective device rating (A) */
  supplyProtectiveDeviceRating: string;
  /** Short-circuit capacity (kA) */
  shortCircuitCapacity: string;

  // ── Section J – Installation Particulars ─────────────────────────────────
  meansOfEarthing: string;
  maximumDemand: string;
  protectiveMeasures: string;

  // ── Main Switch ───────────────────────────────────────────────────────────
  mainSwitchType: string;
  mainSwitchPoles: string;
  mainSwitchCurrentRating: string;
  mainSwitchFuseRating: string;
  mainSwitchVoltageRating: string;

  // ── Supply Conductors ─────────────────────────────────────────────────────
  supplyConductorMaterial: string;
  /** Supply conductor CSA (mm²) */
  supplyConductorCSA: string;

  // ── Earthing Conductor ────────────────────────────────────────────────────
  earthingConductorMaterial: string;
  /** Earthing conductor CSA (mm²) */
  earthingConductorCSA: string;

  // ── Main Protective Bonding Conductors ────────────────────────────────────
  mainBondingMaterial: string;
  /** Main bonding CSA (mm²) */
  mainBondingCSA: string;

  // ── Bonding of Extraneous-Conductive Parts ────────────────────────────────
  bondingWater: string;
  bondingGas: string;
  bondingOil: string;
  bondingLightning: string;
  bondingSteel: string;

  // ── Consumer Unit ─────────────────────────────────────────────────────────
  consumerUnitDesignation: string;
  consumerUnitLocation: string;
  /** PFC measured at distribution board (kA) */
  consumerUnitPfc: string;

  // ── Section 16 – Circuit Schedule ─────────────────────────────────────────
  circuits: EICRCircuitRow[];

  // ── Inspection Schedule (keyed by BS 7671 ref, e.g. '1.1', '4.14') ───────
  inspectionSchedule: InspectionSchedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLANK CIRCUIT ROW
// ─────────────────────────────────────────────────────────────────────────────

export const BLANK_CIRCUIT_ROW: EICRCircuitRow = {
  circuitNumber: '',
  designation: '',
  wiringType: '',
  refMethod: '',
  liveCsa: '',
  cpcCsa: '',
  maxDiscTime: '0.4',  // default 0.4s for ADS
  bsen: '60898',
  deviceType: 'MCB Type B' as DeviceType,  // demo for auto-calc
  rating: '32',  // demo for auto-calc
  capacity: '',
  rcdRating: '',
  maxZs: calculateMaxZs('MCB Type B', '32'),  // "1.44Ω" — auto-calculated demo
  r1Line: '',
  rnNeutral: '',
  r2Cpc: '',
  r1r2: '',
  r2: '',
  insResLL: '',
  insResLE: '',
  testVoltage: '500',   // default test voltage for LV installations
  polarity: '',
  measuredZs: '1.20',  // demo: PASS (1.20 < 1.44)
  discTime: '',
  rcdTestButton: '',
  afddTestButton: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// BLANK INSPECTION SCHEDULE
// All items from BS 7671:2018 Appendix 6 / Section 651 with empty outcomes.
// ─────────────────────────────────────────────────────────────────────────────

export const BLANK_INSPECTION_SCHEDULE: InspectionSchedule = {
  // 1.0  External condition of intake equipment (visual inspection only)
  '1.1': { outcome: '', comment: '' },  // Service cable
  '1.2': { outcome: '', comment: '' },  // Service head
  '1.3': { outcome: '', comment: '' },  // Earthing arrangement
  '1.4': { outcome: '', comment: '' },  // Meter tails
  '1.5': { outcome: '', comment: '' },  // Metering equipment
  '1.6': { outcome: '', comment: '' },  // Isolator (where present)

  // 2.0  Presence of adequate arrangements for other sources such as microgenerators (551.6; 551.7)
  // (no sub-items — recorded at section level via the section comment)

  // 3.0  Earthing / Bonding arrangements (411.3; Chap 54)
  '3.1': { outcome: '', comment: '' },  // Distributor's earthing arrangement (542.1.2.1; 542.1.2.2)
  '3.2': { outcome: '', comment: '' },  // Earth electrode connection (542.1.2.3)
  '3.3': { outcome: '', comment: '' },  // Earthing/bonding labels (514.13.1)
  '3.4': { outcome: '', comment: '' },  // Earthing conductor size (542.3; 543.1.1)
  '3.5': { outcome: '', comment: '' },  // Accessibility of earthing conductor at MET (543.3.2)
  '3.6': { outcome: '', comment: '' },  // Main protective bonding conductor sizes (544.1)
  '3.7': { outcome: '', comment: '' },  // Bonding conductor connections (543.3.2; 544.1.2)
  '3.8': { outcome: '', comment: '' },  // Other protective bonding connections (543.3.1; 543.3.2)

  // 4.0  Consumer unit(s) / distribution board(s)
  '4.1':  { outcome: '', comment: '' }, // Working space/accessibility (132.12; 513.1)
  '4.2':  { outcome: '', comment: '' }, // Security of fixing (134.1.1)
  '4.3':  { outcome: '', comment: '' }, // IP rating of enclosure (416.2)
  '4.4':  { outcome: '', comment: '' }, // Fire rating of enclosure (421.1.201; 526.5)
  '4.5':  { outcome: '', comment: '' }, // Enclosure condition (651.2)
  '4.6':  { outcome: '', comment: '' }, // Main linked switch (462.1.201)
  '4.7':  { outcome: '', comment: '' }, // Operation of main switch (643.10)
  '4.8':  { outcome: '', comment: '' }, // Manual operation of MCBs and RCDs (643.10)
  '4.9':  { outcome: '', comment: '' }, // Circuit identification (514.8.1; 514.9.1)
  '4.10': { outcome: '', comment: '' }, // RCD 6-month test notice (514.12.2)
  '4.11': { outcome: '', comment: '' }, // Mixed cable colour notice (514.14)
  '4.12': { outcome: '', comment: '' }, // Alternative supply warning notice (514.15)
  '4.13': { outcome: '', comment: '' }, // Other labelling (Section 514)
  '4.14': { outcome: '', comment: '' }, // Compatibility of protective devices (411.3.2; 411.4–6; Sects 432, 433)
  '4.15': { outcome: '', comment: '' }, // Single-pole devices in line conductor (132.14.1; 530.3.3)
  '4.16': { outcome: '', comment: '' }, // Cable protection at entry (132.14.1; 522.8.1; 522.8.5; 522.8.11)
  '4.17': { outcome: '', comment: '' }, // Anti-electromagnetic effects (521.5.1)
  '4.18': { outcome: '', comment: '' }, // RCDs for fault protection (411.4.204; 411.5.2; 531.2)
  '4.19': { outcome: '', comment: '' }, // RCDs for additional protection (411.3.3; 415.1)
  '4.20': { outcome: '', comment: '' }, // SPD functional indication (651.4)
  '4.21': { outcome: '', comment: '' }, // Conductor connections tight and secure (526.1)
  '4.22': { outcome: '', comment: '' }, // Generating set – switched alternative (551.6)
  '4.23': { outcome: '', comment: '' }, // Generating set – parallel operation (551.7)

  // 5.0  Final circuits
  '5.1':   { outcome: '', comment: '' }, // Conductor identification (514.3.1)
  '5.2':   { outcome: '', comment: '' }, // Cable support (521.10.202; 522.8.5)
  '5.3':   { outcome: '', comment: '' }, // Insulation of live parts (416.1)
  '5.4':   { outcome: '', comment: '' }, // Non-sheathed cables in enclosure (521.10.1)
  '5.4.1': { outcome: '', comment: '' }, // Conduit/trunking system integrity
  '5.5':   { outcome: '', comment: '' }, // Current-carrying capacity (Section 523)
  '5.6':   { outcome: '', comment: '' }, // Overload co-ordination (433.1; 533.2.1)
  '5.7':   { outcome: '', comment: '' }, // Overcurrent protective devices (411.3)
  '5.8':   { outcome: '', comment: '' }, // Circuit protective conductors (411.3.1; Sect 543)
  '5.9':   { outcome: '', comment: '' }, // Wiring system suitability (Section 522)
  '5.10':  { outcome: '', comment: '' }, // Concealed cables in prescribed zones (522.6.202)
  '5.11':  { outcome: '', comment: '' }, // Cables under floors/above ceilings (522.6.204)
  '5.12':  { outcome: '', comment: '' }, // Additional RCD protection (30mA)
  '5.12.1':{ outcome: '', comment: '' }, // Socket-outlets ≤32A (411.3.3)
  '5.12.2':{ outcome: '', comment: '' }, // Mobile equipment outdoors (411.3.3)
  '5.12.3':{ outcome: '', comment: '' }, // Concealed cables <50mm depth (522.6.202; 522.6.203)
  '5.12.4':{ outcome: '', comment: '' }, // Cables in walls with metal parts (522.6.203)
  '5.12.5':{ outcome: '', comment: '' }, // Luminaire circuits in domestic premises (411.3.4)
  '5.13':  { outcome: '', comment: '' }, // Fire barriers and sealing (Section 527)
  '5.14':  { outcome: '', comment: '' }, // Band I/II cable segregation (528.1)
  '5.15':  { outcome: '', comment: '' }, // Separation from comms cabling (528.2)
  '5.16':  { outcome: '', comment: '' }, // Separation from non-electrical services (528.3)
  '5.17':  { outcome: '', comment: '' }, // Cable terminations (Section 526)
  '5.17.1':{ outcome: '', comment: '' }, // Connections sound, no undue strain (526.6)
  '5.17.2':{ outcome: '', comment: '' }, // No bare conductor visible (526.8)
  '5.17.3':{ outcome: '', comment: '' }, // Live conductors enclosed (526.5)
  '5.17.4':{ outcome: '', comment: '' }, // Cable entry glands/bushes (522.8.5)
  '5.18':  { outcome: '', comment: '' }, // Accessories condition (651.2(v))
  '5.19':  { outcome: '', comment: '' }, // Suitability for external influences (512.2)
  '5.20':  { outcome: '', comment: '' }, // Working space at equipment (132.12; 513.1)
  '5.21':  { outcome: '', comment: '' }, // Single-pole devices in line conductors (132.14.1; 530.3.3)

  // 6.0  Locations containing a bath or shower
  '6.1': { outcome: '', comment: '' }, // All LV circuits RCD ≤30mA (701.411.3.3)
  '6.2': { outcome: '', comment: '' }, // SELV/PELV requirements (701.414.4.5)
  '6.3': { outcome: '', comment: '' }, // Shaver sockets BS EN 61558-2-5 (701.512.3)
  '6.4': { outcome: '', comment: '' }, // Supplementary bonding (701.415.2)
  '6.5': { outcome: '', comment: '' }, // 230V sockets ≥3m from Zone 1 (701.512.3)
  '6.6': { outcome: '', comment: '' }, // IP rating of equipment (701.512.2)
  '6.7': { outcome: '', comment: '' }, // Accessories/controlgear for correct zone (701.512.3)
  '6.8': { outcome: '', comment: '' }, // Current-using equipment zone suitability (701.55)

  // 7.0  Other Part 7 special installations or locations (free-form rows)
  '7.1':  { outcome: '', comment: '' },
  '7.2':  { outcome: '', comment: '' },
  '7.3':  { outcome: '', comment: '' },
  '7.4':  { outcome: '', comment: '' },
  '7.5':  { outcome: '', comment: '' },
  '7.6':  { outcome: '', comment: '' },
  '7.7':  { outcome: '', comment: '' },
  '7.8':  { outcome: '', comment: '' },
  '7.9':  { outcome: '', comment: '' },
  '7.10': { outcome: '', comment: '' },
};

// ─────────────────────────────────────────────────────────────────────────────
// BLANK FORM DATA
// ─────────────────────────────────────────────────────────────────────────────

/** Generate an array of N circuit rows with 3x demo data */
function blankCircuits(count = 20): EICRCircuitRow[] {
  const demos: EICRCircuitRow[] = [
    // Demo 1: MCB B32 → 1.44Ω
    {
      ...BLANK_CIRCUIT_ROW,
      circuitNumber: '1',
      designation: 'Lighting 1st Floor',
      deviceType: 'MCB Type B' as DeviceType,
      rating: '32',
      maxZs: calculateMaxZs('MCB Type B', '32'),
      measuredZs: '1.15',  // PASS
    },
    // Demo 2: RCBO C16 → 1.92Ω  
    {
      ...BLANK_CIRCUIT_ROW,
      circuitNumber: '2',
      designation: 'Ring Socket Kitchen',
      deviceType: 'RCBO Type C' as DeviceType,
      rating: '16',
      maxZs: calculateMaxZs('RCBO Type C', '16'),
      measuredZs: '1.75',  // PASS
      rcdRating: '30',
    },
    // Demo 3: BS88 Fuse 20A → 2.30Ω
    {
      ...BLANK_CIRCUIT_ROW,
      circuitNumber: '3', 
      designation: 'Radial Socket Utility',
      deviceType: 'BS88 Fuse' as DeviceType,
      rating: '20',
      maxZs: calculateMaxZs('BS88 Fuse', '20'),
      measuredZs: '2.65',  // FAIL → triggers validation warning
    },
  ];
  
  // Pad remaining with blanks
  const blanks = Array.from({ length: Math.max(0, count - 3) }, () => ({ ...BLANK_CIRCUIT_ROW }));
  return [...demos, ...blanks];
}

export const BLANK_EICR_FORM_DATA: EICRFormData = {
  // ── Section 9 – Company / Inspector declaration ─────────────────────────
  tradingTitle: '',
  companyAddress: '',
  companyEmail: '',
  companyTelephone: '',
  registrationNumber: '',
  inspectorPosition: '',

  // ── Test instruments ─────────────────────────────────────────────────────
  instrumentMultiFunction: '',
  instrumentInsulationResistance: '',
  instrumentContinuity: '',
  instrumentEarthElectrode: '',
  instrumentEarthLoop: '',
  instrumentRCD: '',

  // ── Section 2 ─────────────────────────────────────────────────────────────
  reasonForReport: '',

  // ── Section 3 ─────────────────────────────────────────────────────────────
  installationAddress: '',
  premisesType: 'Domestic',
  estimatedAgeOfWiring: '',
  evidenceOfAdditions: 'No',
  evidenceOfAdditionsAge: '',
  installationRecordsAvailable: 'No',
  dateOfLastInspection: '',

  // ── Section 4 ─────────────────────────────────────────────────────────────
  extentOfInspection: '',
  agreedLimitations: '',
  agreedLimitationsWith: '',
  operationalLimitations: '',

  // ── Section 5 ─────────────────────────────────────────────────────────────
  overallAssessment: 'SATISFACTORY',

  // ── Section 6 ─────────────────────────────────────────────────────────────
  nextInspectionPeriod: '',

  // ── General condition ─────────────────────────────────────────────────────
  generalCondition: '',

  // ── Supply characteristics ────────────────────────────────────────────────
  earthingArrangements: 'TN-C-S',
  natureOfSupply: '1-phase (2 wire)',
  supplyPolarityConfirmed: '',
  nominalVoltageU: '240',
  nominalVoltageUo: '230',
  nominalFrequency: '50',
  prospectiveFaultCurrent: '',
  externalEarthFaultLoopImpedance: '',
  supplyProtectiveDeviceStandard: '',
  supplyProtectiveDeviceType: '',
  supplyProtectiveDeviceRating: '',
  shortCircuitCapacity: '',

  // ── Installation particulars ──────────────────────────────────────────────
  meansOfEarthing: "Distributor's facility",
  maximumDemand: '',
  protectiveMeasures: 'ADS',

  // ── Main switch ───────────────────────────────────────────────────────────
  mainSwitchType: '',
  mainSwitchPoles: '2',
  mainSwitchCurrentRating: '',
  mainSwitchFuseRating: '',
  mainSwitchVoltageRating: '230',

  // ── Supply conductors ─────────────────────────────────────────────────────
  supplyConductorMaterial: 'Copper',
  supplyConductorCSA: '',

  // ── Earthing conductor ────────────────────────────────────────────────────
  earthingConductorMaterial: 'Copper',
  earthingConductorCSA: '',

  // ── Main protective bonding ───────────────────────────────────────────────
  mainBondingMaterial: 'Copper',
  mainBondingCSA: '',

  // ── Bonding of extraneous-conductive parts ────────────────────────────────
  bondingWater: '',
  bondingGas: '',
  bondingOil: '',
  bondingLightning: '',
  bondingSteel: '',

  // ── Consumer unit ─────────────────────────────────────────────────────────
  consumerUnitDesignation: 'D.B.1',
  consumerUnitLocation: '',
  consumerUnitPfc: '',

  // ── Circuit schedule (20 blank rows) ─────────────────────────────────────
  circuits: blankCircuits(20),

  // ── Inspection schedule (all items blank) ────────────────────────────────
  inspectionSchedule: { ...BLANK_INSPECTION_SCHEDULE },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Calculate next inspection date
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the recommended next inspection date from an inspection date and
 * a re-inspection period label (e.g. '5 Years', '1 Year', '3 Years').
 *
 * @param inspectionDate  ISO date string 'YYYY-MM-DD'
 * @param periodLabel     Plain-text period (e.g. '5 Years', '10 Years', '6 Months')
 * @returns               ISO date string for the next inspection, or '' if inputs invalid
 */
export function calculateNextInspectionDate(inspectionDate: string, periodLabel: string): string {
  if (!inspectionDate || !periodLabel) return '';

  const base = new Date(inspectionDate);
  if (isNaN(base.getTime())) return '';

  // Parse years and months from the period label
  const yearsMatch = periodLabel.match(/(\d+)\s*[Yy]ear/);
  const monthsMatch = periodLabel.match(/(\d+)\s*[Mm]onth/);

  const years  = yearsMatch  ? parseInt(yearsMatch[1],  10) : 0;
  const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 0;

  if (years === 0 && months === 0) return '';

  const next = new Date(base);
  next.setFullYear(next.getFullYear() + years);
  next.setMonth(next.getMonth() + months);

  return next.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Derive overall assessment from observations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns 'UNSATISFACTORY' if any observation carries a C1 or C2 code;
 * otherwise returns 'SATISFACTORY'.
 *
 * Per BS 7671 Section 651: the report should be declared unsatisfactory if there
 * are any Danger (C1) or Potentially Dangerous (C2) observations present.
 */
export function deriveOverallAssessment(observations: EICRObservation[]): 'SATISFACTORY' | 'UNSATISFACTORY' {
  const hasC1orC2 = observations.some(o => o.code === 'C1' || o.code === 'C2');
  return hasC1orC2 ? 'UNSATISFACTORY' : 'SATISFACTORY';
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Validate EICR form data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate single circuit row (Zs compliance + basics).
 */
function validateCircuitRow(row: Partial<EICRCircuitRow>): string[] {
  const errors: string[] = [];

  // Basic presence
  if (!String(row.deviceType ?? '').trim()) errors.push('Device type required');
  if (!String(row.rating ?? '').trim()) errors.push('Rating required');
  const maxZsStr = String(row.maxZs ?? '');
  const measuredZsStr = String(row.measuredZs ?? '');

  if (!maxZsStr.trim()) errors.push('Max Zs required');
  if (!measuredZsStr.trim()) return errors;  // measuredZs optional

  // Zs compliance check
  const maxZsNum = parseFloat(maxZsStr.replace(/[ΩΩ]/g, ''));
  const measuredNum = parseFloat(measuredZsStr.replace(/[ΩΩ]/g, ''));
  
  if (!isNaN(maxZsNum) && !isNaN(measuredNum) && measuredNum > maxZsNum * 1.05) {  // 5% tolerance
    errors.push(`FAIL: Measured Zs ${measuredNum.toFixed(2)}Ω > Max ${maxZsNum.toFixed(2)}Ω`);
  }

  return errors;
}

/**
 * Runs lightweight field-presence validation against an EICRFormData object.
 * Returns an array of human-readable error strings (empty = valid).
 *
 * This does NOT replace server-side validation — it is intended to drive
 * UI-level feedback before form submission.
 */
export function validateEICRFormData(
  data: Partial<EICRFormData>,
  topLevel: { certificateNumber?: string; siteName?: string; inspectionDate?: string; inspectorName?: string },
): string[] {
  const errors: string[] = [];

  const req = (value: string | undefined | null, fieldLabel: string) => {
    if (!value || value.trim() === '') errors.push(`${fieldLabel} is required`);
  };

  // Top-level required fields
  req(topLevel.certificateNumber, 'Certificate Number');
  req(topLevel.siteName,          'Client / Organisation (Section 1)');
  req(topLevel.inspectionDate,    'Date of Inspection (Section 2)');
  req(topLevel.inspectorName,     'Inspector Name (Section 9)');

  // Section 3
  req(data.installationAddress, 'Installation Address (Section 3)');
  req(data.premisesType,        'Description of Premises (Section 3)');

  // Section 4
  req(data.extentOfInspection, 'Extent of Inspection (Section 4)');

  // Section 5
  if (!data.overallAssessment || (data.overallAssessment !== 'SATISFACTORY' && data.overallAssessment !== 'UNSATISFACTORY')) {
    errors.push('Overall Assessment must be SATISFACTORY or UNSATISFACTORY (Section 5)');
  }

  // Section 6
  req(data.nextInspectionPeriod, 'Recommended Re-inspection Period (Section 6)');

  // Section 9 – Company
  req(data.tradingTitle,       'Trading Title (Section 9)');
  req(data.registrationNumber, 'Registration / Scheme Number (Section 9)');

  // Supply characteristics
  req(data.earthingArrangements,           'Earthing Arrangements');
  req(data.externalEarthFaultLoopImpedance, 'External Earth Fault Loop Impedance (Ze)');

  // NEW: Circuit Zs validation
  if (data.circuits) {
    data.circuits.forEach((row, index) => {
      const rowErrors = validateCircuitRow(row);
      if (rowErrors.length) {
        errors.push(`Circuit ${index + 1}: ${rowErrors.join('; ')}`);
      }
    });
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY: createBlankEICR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a fresh, fully-structured blank CertificateData-compatible object
 * ready for populating and passing straight to generateCertificatePDF().
 *
 * @param overrides  Optional partial overrides applied on top of the blank defaults
 */
export function createBlankEICR(overrides?: {
  certificateNumber?: string;
  inspectionDate?: string;
  inspectorName?: string;
  siteName?: string;
  siteAddress?: string;
  formDataOverrides?: Partial<EICRFormData>;
  customerName?: string;
  customerAddress?: string;
}): CertificateData {
  const today = new Date().toISOString().split('T')[0];
  const certNumber = overrides?.certificateNumber ?? `CE${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;
  const inspDate   = overrides?.inspectionDate ?? today;

  // Deep-clone the blank form data to avoid shared-reference mutation
  const formData: EICRFormData = {
    ...BLANK_EICR_FORM_DATA,
    circuits: blankCircuits(20),
    inspectionSchedule: { ...BLANK_INSPECTION_SCHEDULE },
    ...(overrides?.formDataOverrides ?? {}),
  };

  return {
    id: 0,
    certificateNumber: certNumber,
    certificateType:   'EICR',
    siteName:          overrides?.siteName    ?? '',
    siteAddress:       overrides?.siteAddress ?? '',
    inspectionDate:    inspDate,
    nextInspectionDate: formData.nextInspectionPeriod
      ? calculateNextInspectionDate(inspDate, formData.nextInspectionPeriod)
      : '',
    inspectorName: overrides?.inspectorName ?? '',
    status:        'draft',

    templateConfig: {
      colors: {
        primary:    '#C8102E',  // NICEIC red
        secondary:  '#C8102E',
        accent:     '#ffc107',
        background: '#ffffff',
        text:       '#1a202c',
      },
    },

    formData,

    customer: {
      name:    overrides?.customerName    ?? '',
      address: overrides?.customerAddress ?? '',
    },

    items: [],
  };
}

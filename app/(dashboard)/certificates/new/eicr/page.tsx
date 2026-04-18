'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCertificate } from '../../../actions';
import { useState, useEffect, useRef, type ChangeEvent, type ReactNode, type InputHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { CertificateNumberField } from '@/components/CertificateNumberField';
import { DateDropdownField } from '@/components/DateDropdownField';
import { NextVisitField } from '@/components/NextVisitField';
import { AddressAutocompleteField } from '@/components/AddressAutocompleteField';
import { getSignInRedirectPath, isSessionExpiredError } from '@/lib/auth/errors';
import { OrganisationAutocompleteField } from '@/components/OrganisationAutocompleteField';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  Plus,
  Trash2,
  ShieldCheck,
  SpellCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Sparkles,
  Upload,
  ListPlus,
  GripVertical,
} from 'lucide-react';
import { isAdminRole } from '@/lib/auth/roles';
import { calculateMaxZs } from '@/lib/utils/calculate-zs';
import { cn } from '@/lib/utils';
import {
  InspectionScheduleSection,
  type InspCode,
  type InspScheduleValue,
  SCHEDULE_GROUPS,
} from '@/components/InspectionScheduleSection';
import type { AnalyzeImageResponse, AnalyzeImageScheduleItem } from '@/lib/ai/railway-client';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Observation {
  id: string;
  description: string;
  code: 'C1' | 'C2' | 'C3' | 'FI';
  /** Set when auto-generated from the inspection schedule */
  fromInspRef?: string;
  /** Set when auto-generated from a Zs exceedance in the circuit table (value = circuit number) */
  fromCircuitZs?: string;
}

type CircuitRow = {
  circuitNumber: string;
  ringFinal: string;
  designation: string;
  wiringType: string;
  refMethod: string;
  numPoints: string;
  liveCsa: string;
  cpcCsa: string;
  maxDiscTime: string;
  bsen: string;
  deviceType: string;
  rating: string;
  capacity: string;
  rcdRating: string;
  maxZs: string;
  r1Line: string;
  rnNeutral: string;
  r2Cpc: string;
  r1r2: string;
  r2: string;
  insResLN: string;
  insResLL: string;
  insResLE: string;
  testVoltage: string;
  polarity: string;
  measuredZs: string;
  discTime: string;
  rcdTestButton: string;
  afddTestButton: string;
};

const codeColors: Record<string, string> = {
  C1: 'bg-red-100 text-red-800 border-red-200',
  C2: 'bg-orange-100 text-orange-800 border-orange-200',
  C3: 'bg-blue-100 text-blue-800 border-blue-200',
  FI: 'bg-purple-100 text-purple-800 border-purple-200',
};

const codeLabels: Record<string, string> = {
  C1: 'C1 – Danger Present',
  C2: 'C2 – Potentially Dangerous',
  C3: 'C3 – Improvement Recommended',
  FI: 'FI – Further Investigation Required',
};

const REINSPECTION_PERIODS = [
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 },
  { label: '5 Years', months: 60 },
  { label: '10 Years', months: 120 },
] as const;

const REASON_FOR_REPORT_OPTIONS = [
  'Safety assessment requested by client. To assess compliance with BS 7671.',
  'Periodic inspection and testing.',
  'Change of occupancy / tenancy.',
  'Landlord safety compliance.',
  'Insurance requirement.',
  'Routine condition assessment to BS 7671.',
  'Pre-purchase / pre-acquisition inspection.',
  'Post-remedial verification of existing installation.',
] as const;

const GENERAL_CONDITION_OPTIONS = [
  'The installation appears to be in a generally satisfactory condition for continued service.',
  'The installation is in serviceable condition, however minor improvements are recommended.',
  'The installation shows signs of age-related wear and should be monitored and maintained accordingly.',
  'The general condition of the installation is consistent with continued use subject to the observations recorded in this report.',
  'The installation was found to be in generally good condition with no immediate danger observed at the time of inspection.',
] as const;

 const EICR_INTERVAL_PRESETS = {
   Domestic: {
     label: 'Domestic',
     period: '5 Years',
     note: 'Typical recommendation: every 5 years, or earlier where occupancy/risk factors warrant it.',
   },
   DomesticRented: {
     label: 'Domestic (rented accommodation)',
     period: '5 Years',
     note: 'Typical recommendation: every 5 years or at change of tenancy.',
   },
   HMO: {
     label: 'HMO / communal landlord areas',
     period: '5 Years',
     note: 'Typical landlord/HMO recommendation: every 5 years unless risk assessment or licensing conditions require earlier.',
   },
   Commercial: {
     label: 'Commercial premises',
     period: '5 Years',
     note: 'Typical recommendation: every 5 years, subject to use and risk profile.',
   },
   Industrial: {
     label: 'Industrial installation',
     period: '2 Years',
     note: 'Typical recommendation: every 2 years, subject to environment and maintenance regime.',
   },
   HighRisk: {
     label: 'High-risk or special installation',
     period: '1 Year',
     note: 'Typical recommendation: every 1 year where the environment or duty of care warrants a shorter interval.',
   },
 } as const;
 
 const DECLARED_SUPPLY_PARAMETER_PRESETS = {
   Domestic: {
     natureOfSupply: '1-phase (2 wire) ac',
     nominalVoltageUo: '230',
     nominalVoltageU: '230',
     nominalFrequency: '50',
     numberOfSupplies: '1',
   },
   Commercial: {
     natureOfSupply: '3-phase (4 wire) ac',
     nominalVoltageUo: '230',
     nominalVoltageU: '400',
     nominalFrequency: '50',
     numberOfSupplies: '1',
   },
   Industrial: {
     natureOfSupply: '3-phase (4 wire) ac',
     nominalVoltageUo: '230',
     nominalVoltageU: '400',
     nominalFrequency: '50',
     numberOfSupplies: '1',
   },
   Other: {
     natureOfSupply: '1-phase (2 wire) ac',
     nominalVoltageUo: '230',
     nominalVoltageU: '230',
     nominalFrequency: '50',
     numberOfSupplies: '1',
   },
 } as const;

type EicrIntervalPresetKey = keyof typeof EICR_INTERVAL_PRESETS;
type NextInspectionPeriodLabel = (typeof REINSPECTION_PERIODS)[number]['label'];

const OBSERVATION_CODE_GUIDANCE: Array<{
  code: Observation['code'];
  title: string;
  summary: string;
  examples: string;
}> = [
  {
    code: 'C1',
    title: 'Danger present',
    summary: 'Immediate risk of injury. Immediate remedial action is required.',
    examples: 'Examples: exposed live parts, missing earthing/bonding creating immediate danger, severe overheating.',
  },
  {
    code: 'C2',
    title: 'Potentially dangerous',
    summary: 'Urgent remedial action is required because injury may arise under fault conditions.',
    examples: 'Examples: inadequate fault protection, missing CPC continuity, absent RCD protection where required.',
  },
  {
    code: 'C3',
    title: 'Improvement recommended',
    summary: 'The installation is not unsafe, but improvement is recommended to align with current standards.',
    examples: 'Examples: older but serviceable equipment, labelling improvements, non-dangerous departures from current BS 7671.',
  },
  {
    code: 'FI',
    title: 'Further investigation',
    summary: 'Further investigation is required without delay before the item can be properly classified.',
    examples: 'Examples: inaccessible areas, unclear test results, suspected concealed defects requiring additional work.',
  },
];

const SUPPLY_PROTECTIVE_DEVICE_TYPE_OPTIONS = [
  'BS 1361 Type IIb cartridge fuse',
  'BS 88 gG cartridge fuse',
  'BS 88 aM cartridge fuse',
  'BS 88 switch-fuse',
  'BS 88 other fuse',
  'BS EN 60898 MCB',
  'BS EN 60947-2 MCCB',
  'BS EN 61009 RCBO',
  'BS EN 61008 RCCB/RCD',
  'Other',
] as const;
const SUPPLY_PROTECTIVE_DEVICE_STANDARDS = [
  'BS 1361 Type IIb',
  'BS 88 gG',
  'BS 88 aM',
  'BS 88 switch-fuse',
  'BS 88 other',
  'BS EN 60898',
  'BS EN 61009',
  'BS EN 61008',
  'BS EN 60947-2',
  'Other',
] as const;
const CONDUCTOR_MATERIAL_OPTIONS = ['Copper', 'Aluminium', 'Other'] as const;
const EARTH_ELECTRODE_TYPE_OPTIONS = ['Rod', 'Tape', 'Plate', 'Foundation', 'Mesh', 'N/A', 'Other'] as const;
const EARTH_ELECTRODE_MEASUREMENT_OPTIONS = ['Measured', 'By calculation', 'Estimated', 'N/A', 'Other'] as const;
const PROTECTIVE_MEASURE_OPTIONS = ['ADS', 'Double or reinforced insulation', 'Electrical separation', 'SELV', 'PELV', 'Other'] as const;
const MAIN_SWITCH_TYPE_OPTIONS = [
  'Isolator',
  'Switch-fuse',
  'Circuit-breaker',
  'RCD',
  'RCBO',
  'MCCB',
  'Other',
] as const;
const MAIN_SWITCH_POLE_OPTIONS = ['1', '2', '3', '4'] as const;

const DEFAULT_CIRCUIT_ROW_COUNT = 15;
const EDITOR_CARD_CLASS = 'overflow-hidden rounded-none border-[#c8102e] py-0 shadow-none';
const EDITOR_HEADER_CLASS = 'border-b border-[#96172b] bg-[#c8102e] px-4 py-2 text-white [&_[data-slot=card-title]]:text-[13px] [&_[data-slot=card-title]]:font-semibold [&_[data-slot=card-title]]:uppercase [&_[data-slot=card-title]]:tracking-[0.06em] [&_[data-slot=card-description]]:text-[11px] [&_[data-slot=card-description]]:leading-4 [&_[data-slot=card-description]]:text-red-100/95';
const EDITOR_CONTENT_CLASS = 'p-0 [&_label]:text-[10px] [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-[0.05em] [&_label]:text-slate-700 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:h-8 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:rounded-none [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:border-slate-300 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:bg-white [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:px-2 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:text-xs [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:shadow-none [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:focus-visible:ring-1 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:focus-visible:ring-[#c8102e]/20 [&_[data-slot=textarea]]:rounded-none [&_[data-slot=textarea]]:border-slate-300 [&_[data-slot=textarea]]:bg-white [&_[data-slot=textarea]]:px-2 [&_[data-slot=textarea]]:py-1.5 [&_[data-slot=textarea]]:text-xs [&_[data-slot=textarea]]:leading-4 [&_[data-slot=textarea]]:shadow-none [&_[data-slot=textarea]]:focus-visible:ring-1 [&_[data-slot=textarea]]:focus-visible:ring-[#c8102e]/20 [&_[role=combobox]]:h-8 [&_[role=combobox]]:rounded-none [&_[role=combobox]]:border-slate-300 [&_[role=combobox]]:bg-white [&_[role=combobox]]:px-2 [&_[role=combobox]]:pr-8 [&_[role=combobox]]:text-left [&_[role=combobox]]:text-xs [&_[role=combobox]]:shadow-none [&_[role=combobox]]:focus:ring-1 [&_[role=combobox]]:focus:ring-[#c8102e]/20 [&_[role=combobox]]:focus:ring-offset-0 [&_[role=combobox]>span]:truncate [&_[role=combobox]>svg]:ml-2 [&_[role=combobox]>svg]:h-4 [&_[role=combobox]>svg]:w-4 [&_[role=combobox]>svg]:shrink-0 [&_[role=combobox]>svg]:opacity-70';
const EDITOR_GRID_TWO_CLASS = 'grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-2 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2.5';
const EDITOR_GRID_THREE_CLASS = 'grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-3 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2.5';
const EDITOR_PANEL_GRID_CLASS = 'grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-3 xl:grid-cols-4 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2.5';
const EDITOR_NATIVE_INPUT_CLASS = 'flex h-8 w-full rounded-none border border-slate-300 bg-white px-2 text-xs shadow-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-[#c8102e]/20';
const EDITOR_STACK_CLASS = 'space-y-px border-t border-border bg-border [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2.5';
const EDITOR_FORM_SHEET_CLASS = 'w-full space-y-3 border border-slate-300 bg-[#f7f3ed] p-2 md:p-3';
const EDITOR_SECTION_BODY_CLASS = 'space-y-3 p-3';
const EXPECTED_VALUES_FADE_CLASS =
  '[&_input]:transition-opacity [&_textarea]:transition-opacity [&_[role=combobox]]:transition-opacity [&_button]:transition-opacity';
const EXPECTED_VALUES_LOCKED_CLASS =
  '[&_input]:pointer-events-none [&_textarea]:pointer-events-none [&_[role=combobox]]:pointer-events-none [&_button]:pointer-events-none';

type CertificateGroupColumns = 1 | 2 | 3 | 4;

const CERTIFICATE_GROUP_GRID_CLASSES: Record<CertificateGroupColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
};

function CertificateGroup({
  title,
  hint,
  columns = 2,
  className,
  children,
}: {
  title: string;
  hint?: string;
  columns?: CertificateGroupColumns;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('border border-slate-300 bg-white', className)}>
      <div className="border-b border-slate-300 bg-[#ebe4d9] px-3 py-1.5">
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700">{title}</h4>
        {hint ? <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{hint}</p> : null}
      </div>
      <div
        className={cn(
          'grid gap-px bg-slate-300 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2',
          CERTIFICATE_GROUP_GRID_CLASSES[columns],
        )}
      >
        {children}
      </div>
    </section>
  );
}

type CircuitColumn = {
  key: keyof CircuitRow;
  label: string;
  title?: string;
  widthClass?: string;
  cellClass?: string;
  group?: string;
  groupTitle?: string;
  cycling?: readonly string[];
};

type CircuitTemplate = {
  id: string;
  label: string;
  values: Partial<CircuitRow>;
};

const STICKY_CIRCUIT_COLUMN_KEYS: Array<keyof CircuitRow> = ['circuitNumber', 'ringFinal', 'designation'];

function getCircuitColumnCellClass(column: CircuitColumn): string {
  return column.cellClass || column.widthClass || '';
}

function getStickyCircuitColumnClass(key: keyof CircuitRow): string {
  if (key === 'circuitNumber') {
    return 'sticky left-0 z-30';
  }

  if (key === 'ringFinal') {
    return 'sticky left-[calc(3.2rem-1px)] z-30';
  }

  if (key === 'designation') {
    return 'sticky left-[calc(6rem-2px)] z-30';
  }

  return '';
}

function getStickyCircuitColumnBackgroundClass(isSelectedRow: boolean, isEvenRow: boolean): string {
  if (isSelectedRow) {
    return 'bg-blue-50 border-r border-slate-200 opacity-100 bg-clip-padding shadow-[1px_0_0_0_rgb(226,232,240)]';
  }

  return isEvenRow
    ? 'bg-white border-r border-slate-200 opacity-100 bg-clip-padding shadow-[1px_0_0_0_rgb(226,232,240)]'
    : 'bg-slate-50 border-r border-slate-200 opacity-100 bg-clip-padding shadow-[1px_0_0_0_rgb(226,232,240)]';
}

function getStickyCircuitHeaderBackgroundClass(): string {
  return 'bg-slate-100/95 border-r border-slate-300 opacity-100 bg-clip-padding shadow-none backdrop-blur-0';
}

const CIRCUIT_TEMPLATES: readonly CircuitTemplate[] = [
  {
    id: 'lighting-6a',
    label: 'Lights – 6A MCB',
    values: {
      designation: 'Lighting',
      wiringType: 'A',
      refMethod: 'C',
      liveCsa: '1.5',
      cpcCsa: '1.0',
      maxDiscTime: '0.4',
      bsen: 'BS EN 60898',
      deviceType: 'B curve',
      rating: '6',
      capacity: '6',
      rcdRating: '30',
      testVoltage: '500',
      polarity: '✓',
      rcdTestButton: '✓',
      afddTestButton: 'N/A',
    },
  },
  {
    id: 'socket-ring-32a',
    label: 'Sockets ring – 32A RCBO/MCB',
    values: {
      designation: 'Socket ring final',
      wiringType: 'A',
      refMethod: 'C',
      liveCsa: '2.5',
      cpcCsa: '1.5',
      maxDiscTime: '0.4',
      bsen: 'BS EN 60898',
      deviceType: 'B curve',
      rating: '32',
      capacity: '6',
      rcdRating: '30',
      testVoltage: '500',
      polarity: '✓',
      rcdTestButton: '✓',
      afddTestButton: 'N/A',
    },
  },
  {
    id: 'socket-radial-20a',
    label: 'Sockets radial – 20A',
    values: {
      designation: 'Socket radial',
      wiringType: 'A',
      refMethod: 'C',
      liveCsa: '2.5',
      cpcCsa: '1.5',
      maxDiscTime: '0.4',
      bsen: 'BS EN 60898',
      deviceType: 'B curve',
      rating: '20',
      capacity: '6',
      rcdRating: '30',
      testVoltage: '500',
      polarity: '✓',
      rcdTestButton: '✓',
      afddTestButton: 'N/A',
    },
  },
  {
    id: 'cooker-32a',
    label: 'Cooker – 32A',
    values: {
      designation: 'Cooker',
      wiringType: 'A',
      refMethod: 'C',
      liveCsa: '6.0',
      cpcCsa: '2.5',
      maxDiscTime: '0.4',
      bsen: 'BS EN 60898',
      deviceType: 'B curve',
      rating: '32',
      capacity: '6',
      rcdRating: '30',
      testVoltage: '500',
      polarity: '✓',
      rcdTestButton: '✓',
      afddTestButton: 'N/A',
    },
  },
  {
    id: 'shower-40a',
    label: 'Shower – 40A',
    values: {
      designation: 'Shower',
      wiringType: 'A',
      refMethod: 'C',
      liveCsa: '10',
      cpcCsa: '4.0',
      maxDiscTime: '0.4',
      bsen: 'BS EN 61009',
      deviceType: 'B curve',
      rating: '40',
      capacity: '6',
      rcdRating: '30',
      testVoltage: '500',
      polarity: '✓',
      rcdTestButton: '✓',
      afddTestButton: 'N/A',
    },
  },
  {
    id: 'radial-32a',
    label: 'Radial – 32A',
    values: {
      designation: 'Power radial',
      wiringType: 'A',
      refMethod: 'C',
      liveCsa: '4.0',
      cpcCsa: '2.5',
      maxDiscTime: '0.4',
      bsen: 'BS EN 60898',
      deviceType: 'B curve',
      rating: '32',
      capacity: '6',
      rcdRating: '30',
      testVoltage: '500',
      polarity: '✓',
      rcdTestButton: '✓',
      afddTestButton: 'N/A',
    },
  },
  {
    id: 'immersion-16a',
    label: 'Immersion / water heater – 16A',
    values: {
      designation: 'Immersion heater',
      wiringType: 'A',
      refMethod: 'C',
      liveCsa: '2.5',
      cpcCsa: '1.5',
      maxDiscTime: '0.4',
      bsen: 'BS EN 60898',
      deviceType: 'B curve',
      rating: '16',
      capacity: '6',
      rcdRating: '30',
      testVoltage: '500',
      polarity: '✓',
      rcdTestButton: '✓',
      afddTestButton: 'N/A',
    },
  },
] as const;

const CIRCUIT_COLUMNS: CircuitColumn[] = [
  {
    key: 'circuitNumber',
    label: 'Circuit details',
    title: 'Circuit details — Circuit number',
    widthClass: 'w-[3.2rem]',
    cellClass: 'w-[3.2rem] min-w-[3.2rem] max-w-[3.2rem]',
  },
  {
    key: 'designation',
    label: 'Circuit designation',
    title: 'Circuit details — Circuit designation',
    widthClass: 'w-[12rem]',
    cellClass: 'w-[12rem] min-w-[12rem] max-w-[12rem]',
  },
  {
    key: 'ringFinal',
    label: 'Ring',
    title: 'Tick if this row is a ring final circuit',
    widthClass: 'w-[2.8rem]',
    cellClass: 'w-[2.8rem] min-w-[2.8rem] max-w-[2.8rem]',
    cycling: ['✓', ''] as const,
  },
  { key: 'wiringType', label: 'Type', title: 'Type of wiring', widthClass: 'w-[4.2rem]' },
  { key: 'refMethod', label: 'Ref method', title: 'Reference method', widthClass: 'w-[4rem]' },
  { key: 'numPoints', label: 'No. of points served', title: 'Number of points served', widthClass: 'w-[3rem]' },
  { key: 'liveCsa', label: 'Line', title: 'Circuit conductor CSA (mm²) — Line', widthClass: 'w-[4.2rem]', group: 'Circuit conductor CSA (mm²)', groupTitle: 'Circuit conductor CSA (mm²)' },
  { key: 'cpcCsa', label: 'cpc', title: 'Circuit conductor CSA (mm²) — cpc', widthClass: 'w-[3.6rem]', group: 'Circuit conductor CSA (mm²)', groupTitle: 'Circuit conductor CSA (mm²)' },
  { key: 'maxDiscTime', label: 'Max disconnection time (s)', title: 'Maximum disconnection time (s)', widthClass: 'w-[3.2rem]' },
  { key: 'bsen', label: 'BS(EN)', title: 'Overcurrent protective device — BS(EN)', widthClass: 'w-[7rem]', group: 'Overcurrent protective device', groupTitle: 'Overcurrent protective device' },
  { key: 'deviceType', label: 'Type', title: 'Overcurrent protective device — Type', widthClass: 'w-[5rem]', group: 'Overcurrent protective device', groupTitle: 'Overcurrent protective device' },
  { key: 'rating', label: 'Rating (A)', title: 'Overcurrent protective device — Rating (A)', widthClass: 'w-[4.3rem]', group: 'Overcurrent protective device', groupTitle: 'Overcurrent protective device' },
  { key: 'capacity', label: 'Capacity (kA)', title: 'Overcurrent protective device — Capacity (kA)', widthClass: 'w-[4.3rem]', group: 'Overcurrent protective device', groupTitle: 'Overcurrent protective device' },
  { key: 'rcdRating', label: 'IΔn (mA)', title: 'Residual current device — IΔn (mA)', widthClass: 'w-[4.2rem]', group: 'Residual current device', groupTitle: 'Residual current device' },
  { key: 'maxZs', label: 'Max Zs (Ω)', title: 'Maximum permitted Zs (Ω)', widthClass: 'w-[4.6rem]' },
  { key: 'r1Line', label: 'r1', title: 'Ring final circuit conductors — r1', widthClass: 'w-[3rem]', group: 'Ring final circuit conductors (Ω)', groupTitle: 'Ring final circuit conductors (Ω)' },
  { key: 'rnNeutral', label: 'rn', title: 'Ring final circuit conductors — rn', widthClass: 'w-[3.2rem]', group: 'Ring final circuit conductors (Ω)', groupTitle: 'Ring final circuit conductors (Ω)' },
  { key: 'r2Cpc', label: 'r2', title: 'Ring final circuit conductors — r2', widthClass: 'w-[3rem]', group: 'Ring final circuit conductors (Ω)', groupTitle: 'Ring final circuit conductors (Ω)' },
  { key: 'r1r2', label: 'R1+R2', title: 'Circuit impedances (Ω) — R1+R2', widthClass: 'w-[3.4rem]', group: 'Circuit impedances (Ω)', groupTitle: 'Circuit impedances (Ω)' },
  { key: 'r2', label: 'R2', title: 'Circuit impedances (Ω) — R2', widthClass: 'w-[3rem]', group: 'Circuit impedances (Ω)', groupTitle: 'Circuit impedances (Ω)' },
  { key: 'insResLN', label: 'L-N', title: 'Insulation resistance (MΩ) — L-N', widthClass: 'w-[3.3rem]', group: 'Insulation resistance (MΩ)', groupTitle: 'Insulation resistance (MΩ)' },
  { key: 'insResLL', label: 'L-L', title: 'Insulation resistance (MΩ) — L-L', widthClass: 'w-[3.3rem]', group: 'Insulation resistance (MΩ)', groupTitle: 'Insulation resistance (MΩ)' },
  { key: 'insResLE', label: 'L-E', title: 'Insulation resistance (MΩ) — L-E', widthClass: 'w-[3.3rem]', group: 'Insulation resistance (MΩ)', groupTitle: 'Insulation resistance (MΩ)' },
  { key: 'testVoltage', label: 'Test voltage (V)', title: 'Insulation resistance — Test voltage (V)', widthClass: 'w-[3.4rem]', group: 'Insulation resistance (MΩ)', groupTitle: 'Insulation resistance (MΩ)', cycling: ['250', '500', '1000'] as const },
  { key: 'polarity', label: 'Polarity', title: 'Polarity', widthClass: 'w-[4rem]', cycling: ['✓', '✗', 'N/A'] as const },
  { key: 'measuredZs', label: 'Measured Zs (Ω)', title: 'Measured Zs (Ω)', widthClass: 'w-[3.3rem]' },
  { key: 'discTime', label: 'Operating time (ms)', title: 'Residual current device — Operating time (ms)', widthClass: 'w-[3.2rem]', group: 'Residual current device', groupTitle: 'Residual current device' },
  { key: 'rcdTestButton', label: 'Test button', title: 'Residual current device — Test button', widthClass: 'w-[4rem]', group: 'Residual current device', groupTitle: 'Residual current device', cycling: ['✓', '✗', 'N/A'] as const },
  { key: 'afddTestButton', label: 'Test button', title: 'AFDD — Test button', widthClass: 'w-[4rem]', group: 'AFDD', groupTitle: 'AFDD', cycling: ['✓', '✗', 'N/A'] as const },
];

const STREAMLINED_HIDDEN_CIRCUIT_KEYS: Array<keyof CircuitRow> = [
  'numPoints',
  'r2',
];

const getVisibleCircuitColumns = (threePhase: boolean, streamlined = false) =>
  CIRCUIT_COLUMNS.filter((col) => {
    if (!threePhase && col.key === 'insResLL') return false;
    if (streamlined && STREAMLINED_HIDDEN_CIRCUIT_KEYS.includes(col.key)) return false;
    return true;
  });

const getCircuitHeaderGroups = (columns: CircuitColumn[]) =>
  columns.reduce<Array<{ label: string; title: string; start: number; end: number }>>((acc, col, index) => {
  if (!col.group) return acc;
  const prev = acc[acc.length - 1];
  if (prev && prev.label === col.group && prev.end === index - 1) {
    prev.end = index;
    return acc;
  }
  acc.push({ label: col.group, title: col.groupTitle || col.group, start: index, end: index });
  return acc;
}, []);

type CircuitSelectOption = {
  value: string;
  menuLabel: string;
  title?: string;
};

type EicrProfileDefaults = {
  tradingTitle?: string;
  companyAddress?: string;
  registrationNumber?: string;
  companyTelephone?: string;
  companyEmail?: string;
};

type EicrInspectorHistoryItem = {
  name: string;
  position: string;
};

type EicrDraftUser = {
  id?: string | number;
  email?: string;
  name?: string;
  role?: string;
  eicrProfileDefaults?: EicrProfileDefaults | null;
  eicrInspectorHistory?: EicrInspectorHistoryItem[] | null;
};

type EicrDraftState = {
  selectedCustomer: string;
  selectedCustomerName: string;
  siteName: string;
  clientAddress: string;
  installationAddress: string;
  isSiteNameAuto: boolean;
  isClientAddressAuto: boolean;
  certificateNumber: string;
  inspectionDate: string;
  isInspectionDateAuto: boolean;
  nextInspectionDate: string;
  nextInspectionPeriod: NextInspectionPeriodLabel;
  overallAssessment: string;
  instrumentMultiFunction: string;
  earthingArrangement: string;
  meansOfEarthing: string;
  supplyConductorCSA: string;
  supplyConductorCSACustom: string;
  observations: Observation[];
  evidenceOfAdditions: string;
  premisesType: string;
  inspSchedule: InspScheduleValue;
  circuits: CircuitRow[];
  selectedCircuitRow: number;
  selectedCircuitTemplate: string;
  natureOfSupply: string;
  externalEarthFaultLoopImpedance: string;
  extentQuickOption: string;
  limitationsQuickOption: string;
  operationalQuickOption: string;
};

const EICR_DRAFT_STORAGE_PREFIX = 'eicr-form-draft';
const EICR_PROFILE_DEFAULT_FIELDS = [
  'tradingTitle',
  'companyAddress',
  'registrationNumber',
  'companyTelephone',
  'companyEmail',
] as const;

function buildEicrDraftUserKey(user?: EicrDraftUser | null): string {
  if (user?.id !== undefined && user?.id !== null) {
    return `user-${String(user.id)}`;
  }

  if (user?.email) {
    return `email-${user.email.trim().toLowerCase()}`;
  }

  if (user?.name) {
    return `name-${user.name.trim().toLowerCase()}`;
  }

  return 'anonymous';
}

function buildEicrDraftStorageKey(user: EicrDraftUser | null | undefined, certificateNumber: string, inspectionDate: string) {
  return [
    EICR_DRAFT_STORAGE_PREFIX,
    buildEicrDraftUserKey(user),
    certificateNumber.trim() || 'no-certificate-number',
    inspectionDate || 'no-date',
  ].join(':');
}

function readEicrDraftState(storageKey: string): EicrDraftState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as EicrDraftState;
  } catch (error) {
    console.error('Unable to read EICR draft from local storage:', error);
    return null;
  }
}

const asSimpleOptions = (values: readonly string[]): readonly CircuitSelectOption[] =>
  values.map((value) => ({ value, menuLabel: value }));

const LIVE_CSA_TO_CPC_MAP: Record<string, string> = {
  '1.0': '1.0',
  '1.5': '1.0',
  '2.5': '1.5',
  '4.0': '2.5',
  '6.0': '2.5',
  '10': '4.0',
  '16': '6.0',
  '25': '10',
};

const CIRCUIT_SELECT_OPTIONS: Partial<Record<keyof CircuitRow, readonly CircuitSelectOption[]>> = {
  liveCsa: asSimpleOptions(['1.0', '1.5', '2.5', '4.0', '6.0', '10', '16', '25', 'Other']),
  wiringType: [
    { value: 'A', menuLabel: 'A — Thermoplastic insulated/sheathed cables', title: 'Thermoplastic insulated/sheathed cables' },
    { value: 'B', menuLabel: 'B — Thermoplastic cables in metallic conduit', title: 'Thermoplastic cables in metallic conduit' },
    { value: 'C', menuLabel: 'C — Thermoplastic cables in nonmetallic conduit', title: 'Thermoplastic cables in nonmetallic conduit' },
    { value: 'D', menuLabel: 'D — Thermoplastic cables in metallic trunking', title: 'Thermoplastic cables in metallic trunking' },
    { value: 'E', menuLabel: 'E — Thermoplastic cables in nonmetallic trunking', title: 'Thermoplastic cables in nonmetallic trunking' },
    { value: 'F', menuLabel: 'F — Thermoplastic/SWA cables', title: 'Thermoplastic/SWA cables' },
    { value: 'G', menuLabel: 'G — Thermosetting/SWA cables', title: 'Thermosetting/SWA cables' },
    { value: 'H', menuLabel: 'H — Mineral insulated cables', title: 'Mineral insulated cables' },
    { value: 'O', menuLabel: 'O — Other', title: 'Other' },
  ],
  refMethod: [
    { value: 'A', menuLabel: 'A', title: 'Enclosed in thermal insulation' },
    { value: 'B', menuLabel: 'B', title: 'Enclosed in conduit or trunking' },
    { value: 'C', menuLabel: 'C', title: 'Clipped direct / on surface' },
    { value: '100', menuLabel: '100', title: 'In free air' },
    { value: '101', menuLabel: '101', title: 'In conduit in thermally insulating wall' },
    { value: '102', menuLabel: '102', title: 'In trunking on a wall' },
    { value: '103', menuLabel: '103', title: 'Buried direct in ground' },
    { value: 'Other', menuLabel: 'Other' },
  ],
  bsen: asSimpleOptions(['BS EN 60898', 'BS EN 61009', 'BS EN 60947-2', 'BS 88-2', 'BS 1361 Type IIb', 'Other']),
  deviceType: asSimpleOptions(['B curve', 'C curve', 'D curve', 'Type IIb', 'Type 1', 'Type 2', 'Type 3', 'Other']),
  rating: asSimpleOptions(['6', '10', '16', '20', '25', '32', '40', '50', '63', '80', '100', 'Other']),
  capacity: asSimpleOptions(['3', '4.5', '6', '10', '16', '25', '36', 'Other']),
  rcdRating: asSimpleOptions(['10', '30', '100', '300', '500', 'Other']),
};

const INSTALL_METHOD_DERATING_FACTORS: Record<string, number> = {
  A: 0.75,
  B: 0.87,
  C: 1,
  '100': 1,
  '101': 0.9,
  '102': 0.9,
  '103': 0.95,
};

const WIRING_TYPE_DERATING_FACTORS: Record<string, number> = {
  A: 0.97,
  B: 0.92,
  C: 0.92,
  D: 0.92,
  E: 0.92,
  F: 1,
  G: 1,
  H: 1.02,
  O: 1,
  'PVC/PVC': 0.97,
  'XLPE/SWA/PVC': 1,
  MICC: 1.02,
  'Singles in conduit': 0.92,
  Other: 1,
};

function getZsDeviceTypeFromRow(row: Pick<CircuitRow, 'bsen' | 'deviceType' | 'rating'>): string | null {
  const standard = row.bsen.trim().toUpperCase();
  const deviceType = row.deviceType.trim();
  if (!standard || !deviceType || !row.rating.trim()) {
    return null;
  }

  const normalizedDeviceType = deviceType.toUpperCase();

  // BS EN 60898 / 61009 / 60947-2 use B/C/D trip-curve device letters.
  if (standard.includes('60898') || standard.includes('61009') || standard.includes('60947-2')) {
    if (normalizedDeviceType.includes('B')) return 'B';
    if (normalizedDeviceType.includes('C')) return 'C';
    if (normalizedDeviceType.includes('D')) return 'D';
    return deviceType;
  }

  // BS EN 88 and BS 1361 map to the fuse curve in the shared lookup.
  if (standard.includes('88') || standard.includes('1361')) {
    return 'BS88';
  }

  return null;
}

function getDeratingFactorForCircuit(row: Pick<CircuitRow, 'wiringType' | 'refMethod'>): number {
  const methodFactor = INSTALL_METHOD_DERATING_FACTORS[row.refMethod.trim()] ?? 1;
  const wiringFactor = WIRING_TYPE_DERATING_FACTORS[row.wiringType.trim()] ?? 1;
  return methodFactor * wiringFactor;
}

function getDeratedMaxZsDisplay(row: Pick<CircuitRow, 'maxZs' | 'wiringType' | 'refMethod'>): string | null {
  const maxZsNumeric = Number.parseFloat(row.maxZs.replace(/[^0-9.]+/g, ''));
  if (!Number.isFinite(maxZsNumeric) || maxZsNumeric <= 0) {
    return null;
  }

  const deratingFactor = getDeratingFactorForCircuit(row);
  const derated = maxZsNumeric * deratingFactor;
  return `${derated.toFixed(2)}Ω`;
}

/**
 * Returns true when the row's measured Zs exceeds the (derated) max permitted Zs.
 * Returns false when either value is absent or non-numeric.
 */
function zsExceedsMax(row: Pick<CircuitRow, 'measuredZs' | 'maxZs' | 'wiringType' | 'refMethod'>): boolean {
  const measured = Number.parseFloat(row.measuredZs.replace(/[^0-9.]+/g, ''));
  if (!Number.isFinite(measured) || measured <= 0) return false;

  const maxZsStr = getDeratedMaxZsDisplay(row) ?? row.maxZs;
  const maxAllowed = Number.parseFloat(maxZsStr.replace(/[^0-9.]+/g, ''));
  if (!Number.isFinite(maxAllowed) || maxAllowed <= 0) return false;

  return measured > maxAllowed;
}

type ZsValidationMode = 'ring' | 'radial' | 'equal-r1-r2';
type CircuitInconsistencyClass = 'bg-green-100 text-green-800 font-semibold' | 'bg-red-100 text-red-800 font-semibold' | '';

const CIRCUIT_RESISTANCE_TEMPERATURE_CORRECTION_FACTOR = 1.2;

function parseCircuitResistance(value: string): number | null {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]+/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getTemperatureCorrectedCircuitResistance(resistance: number): number {
  return resistance * CIRCUIT_RESISTANCE_TEMPERATURE_CORRECTION_FACTOR;
}

function areNearlyEqual(left: number, right: number, tolerancePercent: number): boolean {
  const base = Math.max(Math.abs(left), Math.abs(right));
  if (base === 0) {
    return true;
  }

  return (Math.abs(left - right) / base) * 100 <= tolerancePercent;
}

function inferZsValidationMode(
  row: Pick<CircuitRow, 'designation' | 'ringFinal' | 'r1Line' | 'rnNeutral' | 'r2Cpc' | 'r1r2'>,
): ZsValidationMode | null {
  const designation = row.designation.trim().toLowerCase();
  const isRingFinal = row.ringFinal.trim() === '✓';
  const r1 = parseCircuitResistance(row.r1Line);
  const rn = parseCircuitResistance(row.rnNeutral);
  const r2 = parseCircuitResistance(row.r2Cpc);
  const r1r2 = parseCircuitResistance(row.r1r2);

  const hasAllRingValues = r1 !== null && rn !== null && r2 !== null;
  const mentionsRadial = /\bradial\b/.test(designation);
  const mentionsRing = /\bring\b|\bring final\b/.test(designation);

  if (mentionsRadial && !isRingFinal) {
    return 'radial';
  }

  if (hasAllRingValues) {
    const ringLikeLineNeutral = areNearlyEqual(r1, rn, 10);
    const equalR1R2 = areNearlyEqual(r1, r2, 10);
    const ringLikeR1R2 =
      r1r2 !== null &&
      (areNearlyEqual(r1r2, (r1 + r2) / 4, 15) || areNearlyEqual(r1r2, (rn + r2) / 4, 15));

    if (equalR1R2 && (isRingFinal || mentionsRing || ringLikeLineNeutral || ringLikeR1R2)) {
      return 'equal-r1-r2';
    }

    if (isRingFinal || mentionsRing || ringLikeLineNeutral || ringLikeR1R2) {
      return 'ring';
    }
  }

  if (isRingFinal || mentionsRing) {
    return r1 !== null && r2 !== null && areNearlyEqual(r1, r2, 10) ? 'equal-r1-r2' : 'ring';
  }

  return 'radial';
}

function getMeasuredZsValidation(
  row: Pick<CircuitRow, 'designation' | 'ringFinal' | 'r1r2' | 'measuredZs' | 'r1Line' | 'rnNeutral' | 'r2Cpc'>,
  externalEarthFaultLoopImpedance: string,
): {
  expected: number;
  expectedCircuitResistance: number;
  correctedCircuitResistance: number;
  ze: number;
  measured: number;
  delta: number;
  percent: number;
  withinTolerance: boolean;
  mode: ZsValidationMode;
  tolerance: number;
} | null {
  const r1r2 = parseCircuitResistance(row.r1r2);
  const measured = parseCircuitResistance(row.measuredZs);
  const ze = parseCircuitResistance(externalEarthFaultLoopImpedance);
  const r1 = parseCircuitResistance(row.r1Line);
  const rn = parseCircuitResistance(row.rnNeutral);
  const r2 = parseCircuitResistance(row.r2Cpc);

  if (r1r2 === null || measured === null || ze === null) {
    return null;
  }

  const mode = inferZsValidationMode(row);
  if (!mode) {
    return null;
  }

  let expectedCircuitResistance: number;
  let tolerance: number;

  if (mode === 'radial') {
    expectedCircuitResistance = r1r2;
    tolerance = 15;
  } else {
    if (r1 === null || r2 === null) {
      return null;
    }

    expectedCircuitResistance = (r1 + r2) / 4;

    if (mode === 'equal-r1-r2') {
      tolerance = 8;
    } else {
      if (rn === null) {
        return null;
      }

      const rnBalancedWithR1 = areNearlyEqual(r1, rn, 10);
      tolerance = rnBalancedWithR1 ? 12 : 10;
    }
  }

  if (expectedCircuitResistance <= 0) {
    return null;
  }

  const correctedCircuitResistance = getTemperatureCorrectedCircuitResistance(expectedCircuitResistance);
  const expected = ze + correctedCircuitResistance;
  const delta = measured - expected;
  const percent = Math.abs(delta / expected) * 100;

  return {
    expected,
    expectedCircuitResistance,
    correctedCircuitResistance,
    ze,
    measured,
    delta,
    percent,
    withinTolerance: percent <= tolerance,
    mode,
    tolerance,
  };
}

function hasCircuitInconsistency(
  row: Pick<CircuitRow, 'designation' | 'ringFinal' | 'r1r2' | 'measuredZs' | 'r1Line' | 'rnNeutral' | 'r2Cpc' | 'wiringType'>,
  externalEarthFaultLoopImpedance: string,
): boolean {
  const zsValidation = getMeasuredZsValidation(row, externalEarthFaultLoopImpedance);
  if (zsValidation && !zsValidation.withinTolerance) {
    return true;
  }

  const r1r2Validation = getR1R2ValidationState(row);
  if (r1r2Validation && !r1r2Validation.withinTolerance) {
    return true;
  }

  const twinAndEarthValidation = getTwinAndEarthR2RatioAssessment(row);
  if (twinAndEarthValidation && !twinAndEarthValidation.withinTolerance) {
    return true;
  }

  return false;
}

function getMeasuredZsValidationTitle(
  row: Pick<CircuitRow, 'designation' | 'ringFinal' | 'r1r2' | 'measuredZs' | 'r1Line' | 'rnNeutral' | 'r2Cpc'>,
  externalEarthFaultLoopImpedance: string,
): string | undefined {
  const result = getMeasuredZsValidation(row, externalEarthFaultLoopImpedance);
  if (!result) return undefined;

  const direction = result.delta === 0 ? 'matches' : result.delta > 0 ? 'above' : 'below';
  const offBy = Math.abs(result.delta).toFixed(2);
  const percent = result.percent.toFixed(1);
  const toleranceText = result.withinTolerance
    ? `Within ${result.tolerance}% tolerance`
    : `Outside ${result.tolerance}% tolerance`;

  if (result.mode === 'ring') {
    return `Ring circuit check: measured Zs is being compared against Ze + corrected ring-derived circuit resistance. Using Ze ${result.ze.toFixed(2)}Ω and corrected circuit resistance ${result.correctedCircuitResistance.toFixed(2)}Ω (from raw ring expected resistance ${result.expectedCircuitResistance.toFixed(2)}Ω, based on (r1 + r2) / 4), expected Zs is ${result.expected.toFixed(2)}Ω. The reading is ${offBy}Ω (${percent}%) ${direction} expected. ${toleranceText}.`;
  }

  if (result.mode === 'equal-r1-r2') {
    return `Equal R1 and R2 ring check: measured Zs is being compared against Ze + corrected circuit resistance. Using Ze ${result.ze.toFixed(2)}Ω and corrected circuit resistance ${result.correctedCircuitResistance.toFixed(2)}Ω (from raw ${(result.expectedCircuitResistance).toFixed(2)}Ω), expected Zs is ${result.expected.toFixed(2)}Ω. Current reading is ${offBy}Ω (${percent}%) ${direction} expected. ${toleranceText}.`;
  }

  return `Radial circuit check: measured Zs is being compared against Ze + corrected R1+R2. Using Ze ${result.ze.toFixed(2)}Ω and corrected circuit resistance ${result.correctedCircuitResistance.toFixed(2)}Ω (from raw R1+R2 ${result.expectedCircuitResistance.toFixed(2)}Ω), expected Zs is ${result.expected.toFixed(2)}Ω. Current reading is ${offBy}Ω (${percent}%) ${direction} expected. ${toleranceText}.`;
}

function getTwinAndEarthR2RatioAssessment(
  row: Pick<CircuitRow, 'designation' | 'ringFinal' | 'wiringType' | 'r1Line' | 'rnNeutral' | 'r2Cpc' | 'r1r2'>,
): { expected: number; actual: number; delta: number; percent: number; withinTolerance: boolean } | null {
  const normalizedWiringType = row.wiringType.trim().toUpperCase();
  const r1 = parseCircuitResistance(row.r1Line);
  const r2 = parseCircuitResistance(row.r2Cpc);

  if (inferZsValidationMode(row) !== 'radial' || normalizedWiringType !== 'A' || r1 === null || r2 === null) {
    return null;
  }

  const expected = r1 * 1.75;
  const delta = r2 - expected;
  const percent = expected === 0 ? 0 : Math.abs(delta / expected) * 100;

  return {
    expected,
    actual: r2,
    delta,
    percent,
    withinTolerance: percent <= 10,
  };
}

function getTwinAndEarthR2RatioTitle(
  row: Pick<CircuitRow, 'designation' | 'ringFinal' | 'wiringType' | 'r1Line' | 'rnNeutral' | 'r2Cpc' | 'r1r2'>,
): string | undefined {
  const result = getTwinAndEarthR2RatioAssessment(row);
  const r1 = parseCircuitResistance(row.r1Line);

  if (!result || r1 === null) return undefined;

  const direction = result.delta === 0 ? 'matches' : result.delta > 0 ? 'above' : 'below';
  const offBy = Math.abs(result.delta).toFixed(2);
  const percent = result.percent.toFixed(1);
  const toleranceText = result.withinTolerance ? 'Within 10% tolerance' : 'Outside 10% tolerance';

  return `For a typical twin and earth circuit, R2 is expected to be approximately 1.75 × R1. Expected R2 is ${result.expected.toFixed(2)}Ω from R1 ${r1.toFixed(2)}Ω. Current R2 is ${result.actual.toFixed(2)}Ω, which is ${offBy}Ω (${percent}%) ${direction} expected. ${toleranceText}.`;
}

function getR1R2ValidationState(
  row: Pick<CircuitRow, 'designation' | 'ringFinal' | 'r1r2' | 'r1Line' | 'rnNeutral' | 'r2Cpc' | 'wiringType'>,
): { title: string; withinTolerance: boolean } | null {
  const r1r2 = parseCircuitResistance(row.r1r2);
  if (r1r2 === null) {
    return null;
  }

  const mode = inferZsValidationMode(row);
  const r1 = parseCircuitResistance(row.r1Line);
  const rn = parseCircuitResistance(row.rnNeutral);
  const r2 = parseCircuitResistance(row.r2Cpc);

  if (mode === 'ring') {
    if (r1 === null || rn === null || r2 === null) {
      return null;
    }

    const expected = (r1 + r2) / 4;
    const delta = r1r2 - expected;
    const percent = expected === 0 ? 0 : Math.abs(delta / expected) * 100;
    const direction = delta === 0 ? 'matches' : delta > 0 ? 'above' : 'below';
    const tolerance = areNearlyEqual(r1, rn, 10) ? 12 : 10;
    const toleranceText = percent <= tolerance ? `Within ${tolerance}% tolerance` : `Outside ${tolerance}% tolerance`;

    return {
      title: `Ring final circuit check: expected R1+R2 is approximately (r1 + r2) / 4 = ${expected.toFixed(2)}Ω. Current R1+R2 is ${r1r2.toFixed(2)}Ω, which is ${Math.abs(delta).toFixed(2)}Ω (${percent.toFixed(1)}%) ${direction} expected. rn is ${rn.toFixed(2)}Ω and is ${areNearlyEqual(r1, rn, 10) ? 'consistent with' : 'not closely aligned to'} r1 ${r1.toFixed(2)}Ω. ${toleranceText}.`,
      withinTolerance: percent <= tolerance,
    };
  }

  if (mode === 'equal-r1-r2') {
    if (r1 === null || r2 === null) {
      return null;
    }

    const expected = (r1 + r2) / 4;
    const delta = r1r2 - expected;
    const percent = expected === 0 ? 0 : Math.abs(delta / expected) * 100;
    const direction = delta === 0 ? 'matches' : delta > 0 ? 'above' : 'below';
    const tolerance = 8;
    const toleranceText = percent <= tolerance ? `Within ${tolerance}% tolerance` : `Outside ${tolerance}% tolerance`;

    return {
      title: `Equal R1 and R2 ring check: expected R1+R2 is approximately (r1 + r2) / 4 = ${expected.toFixed(2)}Ω. Current R1+R2 is ${r1r2.toFixed(2)}Ω, which is ${Math.abs(delta).toFixed(2)}Ω (${percent.toFixed(1)}%) ${direction} expected. ${toleranceText}.`,
      withinTolerance: percent <= tolerance,
    };
  }

  if (mode === 'radial') {
    const twinAndEarthCheck = getTwinAndEarthR2RatioAssessment(row);
    if (twinAndEarthCheck) {
      return {
        title: `Radial circuit check: R1+R2 entered as ${r1r2.toFixed(2)}Ω. ${getTwinAndEarthR2RatioTitle(row) ?? ''}`.trim(),
        withinTolerance: twinAndEarthCheck.withinTolerance,
      };
    }

    if (r1 !== null && r2 !== null) {
      const expected = r1 + r2;
      const delta = r1r2 - expected;
      const percent = expected === 0 ? 0 : Math.abs(delta / expected) * 100;
      const direction = delta === 0 ? 'matches' : delta > 0 ? 'above' : 'below';
      const tolerance = 15;
      const toleranceText = percent <= tolerance ? `Within ${tolerance}% tolerance` : `Outside ${tolerance}% tolerance`;

      return {
        title: `Radial circuit check: expected R1+R2 is approximately r1 + r2 = ${expected.toFixed(2)}Ω. Current R1+R2 is ${r1r2.toFixed(2)}Ω, which is ${Math.abs(delta).toFixed(2)}Ω (${percent.toFixed(1)}%) ${direction} expected. ${toleranceText}.`,
        withinTolerance: percent <= tolerance,
      };
    }
  }

  return null;
}

function getCircuitFieldInconsistencyClass(
  row: Pick<CircuitRow, 'designation' | 'ringFinal' | 'r1r2' | 'measuredZs' | 'r1Line' | 'rnNeutral' | 'r2Cpc' | 'wiringType'>,
  key: keyof CircuitRow,
  externalEarthFaultLoopImpedance: string,
): CircuitInconsistencyClass {
  const zsValidation = getMeasuredZsValidation(row, externalEarthFaultLoopImpedance);
  const r1r2Validation = getR1R2ValidationState(row);
  const twinAndEarthValidation = getTwinAndEarthR2RatioAssessment(row);

  if (key === 'measuredZs' && zsValidation) {
    return zsValidation.withinTolerance ? 'bg-green-100 text-green-800 font-semibold' : 'bg-red-100 text-red-800 font-semibold';
  }

  if (key === 'r1r2' && r1r2Validation) {
    return r1r2Validation.withinTolerance ? 'bg-green-100 text-green-800 font-semibold' : 'bg-red-100 text-red-800 font-semibold';
  }

  if (key === 'r2Cpc' && twinAndEarthValidation && inferZsValidationMode(row) === 'radial') {
    return twinAndEarthValidation.withinTolerance
      ? 'bg-green-100 text-green-800 font-semibold'
      : 'bg-red-100 text-red-800 font-semibold';
  }

  if ((key === 'r1Line' || key === 'rnNeutral' || key === 'r2Cpc') && r1r2Validation) {
    const mode = inferZsValidationMode(row);
    if (mode === 'ring' || mode === 'equal-r1-r2') {
      return r1r2Validation.withinTolerance
        ? 'bg-green-100 text-green-800 font-semibold'
        : 'bg-red-100 text-red-800 font-semibold';
    }
  }

  return '';
}

function createEmptyCircuitRow(index: number): CircuitRow {
  return {
    circuitNumber: String(index + 1),
    ringFinal: '',
    designation: '',
    wiringType: '',
    refMethod: '',
    numPoints: '',
    liveCsa: '',
    cpcCsa: '',
    maxDiscTime: '',
    bsen: '',
    deviceType: '',
    rating: '',
    capacity: '',
    rcdRating: '',
    maxZs: '',
    r1Line: '',
    rnNeutral: '',
    r2Cpc: '',
    r1r2: '',
    r2: '',
    insResLN: '',
    insResLL: '',
    insResLE: '',
    testVoltage: '',
    polarity: '',
    measuredZs: '',
    discTime: '',
    rcdTestButton: '',
    afddTestButton: '',
  };
}

function circuitLabel(idx: number, threePhase: boolean): string {
  if (!threePhase) return String(idx + 1);
  return `${Math.floor(idx / 3) + 1} L${(idx % 3) + 1}`;
}

function normalizeCircuitRows(rows: CircuitRow[], threePhase = false): CircuitRow[] {
  return rows.map((row, idx) => ({ ...row, circuitNumber: circuitLabel(idx, threePhase) }));
}

function normalizeYesNoValue(value: unknown): 'Yes' | 'No' | 'N/A' | null {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (['yes', 'present', 'true', 'fitted'].includes(normalized)) {
    return 'Yes';
  }

  if (['no', 'absent', 'false', 'not present', 'not fitted'].includes(normalized)) {
    return 'No';
  }

  if (['n/a', 'na', 'not applicable'].includes(normalized)) {
    return 'N/A';
  }

  return null;
}

function normalizeInspectionOutcome(value: unknown): InspCode {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === 'SAT' || normalized === 'S') {
    return '✓';
  }

  if (normalized === 'UNSAT') {
    return 'C2';
  }

  if (normalized === 'LIMITATION') {
    return 'LIM';
  }

  if (normalized === 'NOT VERIFIED') {
    return 'NV';
  }

  const allowedOutcomes: InspCode[] = ['', 'N/A', '✓', 'C1', 'C2', 'C3', 'LIM', 'NV'];

  return allowedOutcomes.includes(normalized as InspCode) ? (normalized as InspCode) : '';
}

function getScheduleRef(item: AnalyzeImageScheduleItem): string | null {
  const candidates = [item.item, item.description];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const match = candidate.match(/\b\d+(?:\.\d+)+\b/);
    if (match) {
      return match[0];
    }
  }

  return null;
}

function buildObservationDescription(item: AnalyzeImageScheduleItem) {
  return [item.item, item.description, item.comments]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' — ');
}

type ExpectedValueInfo = {
  label: string;
  average: string;
  range: string;
  note?: string;
};

const EXPECTED_VALUE_MAP = {
  consumerUnitDesignation: {
    label: 'Distribution board / consumer unit reference',
    average: 'DB1',
    range: 'Typical range: DB1 to DB4',
    note: 'Uses the BS 7671 model form board reference wording.',
  },
  consumerUnitLocation: {
    label: 'Location of distribution board / consumer unit',
    average: 'Meter cupboard',
    range: 'Typical range: meter cupboard, intake position, hallway cupboard',
    note: 'Uses the BS 7671 model form location wording for the board / consumer unit.',
  },
  consumerUnitPfc: {
    label: 'Prospective fault current (kA)',
    average: '1.2',
    range: 'Typical acceptable range: 0.8 to 3.0',
    note: 'Uses the BS 7671 model form wording for prospective fault current at the board / consumer unit.',
  },
  r1Line: {
    label: 'Ring final circuit conductors — r1 (Ω)',
    average: '0.50',
    range: 'Typical range: 0.20 to 1.50',
    note: 'Expected for ring final line conductor continuity readings, depending on circuit length and conductor size.',
  },
  rnNeutral: {
    label: 'Ring final circuit conductors — rn (Ω)',
    average: '0.50',
    range: 'Typical range: 0.20 to 1.50',
    note: 'Neutral continuity should typically be close to the r1 reading on a balanced ring final circuit.',
  },
  r2Cpc: {
    label: 'Ring final circuit conductors — r2 (Ω)',
    average: '0.80',
    range: 'Typical range: 0.30 to 2.50',
    note: 'cpc resistance is normally higher than r1/rn because of smaller conductor CSA.',
  },
  r1r2: {
    label: 'Circuit impedance — R1 + R2 (Ω)',
    average: '0.70',
    range: 'Typical range: 0.20 to 2.00',
    note: 'Use as a guide only; expected R1+R2 varies materially with circuit length, CSA, and installation method.',
  },
  insResLN: {
    label: 'Insulation resistance — L-N (MΩ)',
    average: '>200',
    range: 'Typical acceptable range: ≥1.0, commonly >200 on sound circuits',
    note: 'BS 7671 minimum is generally 1 MΩ for LV circuits, though healthy installations are often much higher.',
  },
  insResLL: {
    label: 'Insulation resistance — L-L (MΩ)',
    average: '>200',
    range: 'Typical acceptable range: ≥1.0, commonly >200 on sound circuits',
    note: 'Shown for multi-phase testing where applicable.',
  },
  insResLE: {
    label: 'Insulation resistance — L-E (MΩ)',
    average: '>200',
    range: 'Typical acceptable range: ≥1.0, commonly >200 on sound circuits',
    note: 'BS 7671 minimum is generally 1 MΩ for LV circuits, though healthy installations are often much higher.',
  },
  measuredZs: {
    label: 'Measured Zs (Ω)',
    average: 'Varies by protective device and circuit',
    range: 'Expected to be at or below the maximum permitted Zs',
    note: 'Compare directly with the maximum/derated Zs for that circuit and protective device.',
  },
} satisfies Record<string, ExpectedValueInfo>;

function ExpectedValuePopover({
  fieldKey,
  currentValue,
  showExpectedValues,
  children,
}: {
  fieldKey: keyof typeof EXPECTED_VALUE_MAP;
  currentValue: string;
  showExpectedValues: boolean;
  children: ReactNode;
}) {
  const info = EXPECTED_VALUE_MAP[fieldKey];

  return (
    <div className="group/expected relative">
      {children}
      {showExpectedValues ? (
        <div className="pointer-events-none absolute left-0 top-full z-50 w-[18rem] pt-2 opacity-0 transition-opacity duration-150 group-hover/expected:opacity-100">
          <div className="rounded-md border border-amber-300 bg-white p-3 shadow-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{info.label}</p>
            <div className="mt-2 space-y-1.5 text-xs text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Current actual value:</span>{' '}
                {currentValue?.trim() ? currentValue : 'Not entered'}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Expected average:</span> {info.average}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Acceptable range:</span> {info.range}
              </p>
              {info.note ? <p className="text-[11px] leading-4 text-slate-500">{info.note}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExpectedValueInput({
  fieldKey,
  showExpectedValues,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  fieldKey: keyof typeof EXPECTED_VALUE_MAP;
  showExpectedValues: boolean;
}) {
  const currentValue =
    typeof props.value === 'string'
      ? props.value
      : typeof props.defaultValue === 'string'
        ? props.defaultValue
        : '';

  const { readOnly, tabIndex } = props;

  return (
    <ExpectedValuePopover fieldKey={fieldKey} currentValue={currentValue} showExpectedValues={showExpectedValues}>
      <Input
        {...props}
        readOnly={showExpectedValues || readOnly}
        aria-readonly={showExpectedValues || readOnly}
        tabIndex={showExpectedValues ? -1 : tabIndex}
        className={cn(className, showExpectedValues ? 'cursor-help opacity-50 hover:opacity-60' : '')}
      />
    </ExpectedValuePopover>
  );
}

export function EICRCertificatePage({ streamlined = false }: { streamlined?: boolean } = {}) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const formRef = useRef<HTMLFormElement>(null);
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const { data: customersData } = useSWR('/api/customers', fetcher);
  const customers = Array.isArray(customersData) ? customersData : [];
  const [siteName, setSiteName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [installationAddress, setInstallationAddress] = useState('');
  const [isSiteNameAuto, setIsSiteNameAuto] = useState(false);
  const [isClientAddressAuto, setIsClientAddressAuto] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [inspectionDate, setInspectionDate] = useState(getTodayDate());
  const [isInspectionDateAuto, setIsInspectionDateAuto] = useState(true);
  const [nextInspectionDate, setNextInspectionDate] = useState('');
  const [nextInspectionPeriod, setNextInspectionPeriod] = useState<(typeof REINSPECTION_PERIODS)[number]['label']>('3 Years');
  const [formError, setFormError] = useState('');
  const [showExpectedValues, setShowExpectedValues] = useState(false);
  const [overallAssessment, setOverallAssessment] = useState('SATISFACTORY');
  const [instrumentMultiFunction, setInstrumentMultiFunction] = useState('');
  const [earthingArrangement, setEarthingArrangement] = useState('TN-C-S');
  const [meansOfEarthing, setMeansOfEarthing] = useState("Distributor's facility");
  const [supplyConductorCSA, setSupplyConductorCSA] = useState('25');
  const [supplyConductorCSACustom, setSupplyConductorCSACustom] = useState('');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [evidenceOfAdditions, setEvidenceOfAdditions] = useState('No');
  const [premisesType, setPremisesType] = useState('Domestic');
  const [inspSchedule, setInspSchedule] = useState<InspScheduleValue>({
    codes: {},
    comments: {},
  });
  const [circuits, setCircuits] = useState<CircuitRow[]>(
    Array.from({ length: DEFAULT_CIRCUIT_ROW_COUNT }, (_, index) => createEmptyCircuitRow(index)),
  );
  const [selectedCircuitRow, setSelectedCircuitRow] = useState<number>(0);
  const [selectedCircuitTemplate, setSelectedCircuitTemplate] = useState('__template');
  const [draggedCircuitRow, setDraggedCircuitRow] = useState<number | null>(null);
  const [dragOverCircuitRow, setDragOverCircuitRow] = useState<number | null>(null);
  const [natureOfSupply, setNatureOfSupply] = useState('1-phase (2 wire) ac');
  const [externalEarthFaultLoopImpedance, setExternalEarthFaultLoopImpedance] = useState('');
  const isThreePhase = natureOfSupply.startsWith('3-phase');
  const [extentQuickOption, setExtentQuickOption] = useState('__custom');
  const [limitationsQuickOption, setLimitationsQuickOption] = useState('__custom');
  const [operationalQuickOption, setOperationalQuickOption] = useState('__custom');
  const { data: currentUser } = useSWR<EicrDraftUser>('/api/user', fetcher);
  const hasHydratedDraftRef = useRef(false);
  const lastSavedDraftKeyRef = useRef<string | null>(null);
  const [profilePrefillApplied, setProfilePrefillApplied] = useState(false);
  const [showSaveProfilePrompt, setShowSaveProfilePrompt] = useState(false);
  const [isSavingProfileDefaults, setIsSavingProfileDefaults] = useState(false);
  const [profileDefaultsSaveMessage, setProfileDefaultsSaveMessage] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorPosition, setInspectorPosition] = useState('');

  type VerifyResult = { type: 'error' | 'warning' | 'pass'; message: string };
  const [verifyResults, setVerifyResults] = useState<VerifyResult[] | null>(null);
  const [spellCheckActive, setSpellCheckActive] = useState(false);
  const aiUploadInputRef = useRef<HTMLInputElement>(null);
  const [aiAnalysisState, setAiAnalysisState] = useState<{
    isSubmitting: boolean;
    fileName: string;
    error: string;
    summary: string;
  }>({
    isSubmitting: false,
    fileName: '',
    error: '',
    summary: '',
  });
  const earthElectrodeInspectionRef = '3.2';
  const ttOnlyRcdFaultProtectionRef = '4.18';
  const earthingArrangementRequiresEarthElectrode = earthingArrangement === 'TT' || earthingArrangement === 'IT';
  const isTTEarthingArrangement = earthingArrangement === 'TT';
  const disabledInspectionRefs = [
    ...(earthingArrangementRequiresEarthElectrode ? [] : [earthElectrodeInspectionRef]),
    ...(isTTEarthingArrangement ? [] : [ttOnlyRcdFaultProtectionRef]),
  ];

  // When an inspection code changes to C1/C2, auto-add an observation and vice-versa
  const handleInspCodeChange = (
    ref: string,
    desc: string,
    newCode: InspCode,
    prevCode: InspCode,
  ) => {
    setInspSchedule((prev) => ({
      ...prev,
      codes: { ...prev.codes, [ref]: newCode },
    }));

    const wasAlert = prevCode === 'C1' || prevCode === 'C2';
    const isAlert  = newCode  === 'C1' || newCode  === 'C2';
    const autoId   = `auto-insp-${ref}`;

    if (isAlert && !wasAlert) {
      // Add a new auto observation and force unsatisfactory overall assessment
      setOverallAssessment('UNSATISFACTORY');
      setObservations((prev) => [
        ...prev,
        {
          id: autoId,
          description: `Inspection Item ${ref}: ${desc}`,
          code: newCode as 'C1' | 'C2',
          fromInspRef: ref,
        },
      ]);
    } else if (!isAlert && wasAlert) {
      // Remove the auto observation (only if it hasn't been manually edited)
      setObservations((prev) =>
        prev.filter((o) => o.fromInspRef !== ref),
      );
    } else if (isAlert && wasAlert && newCode !== prevCode) {
      // C1 ↔ C2 code swap – update code in existing observation
      setObservations((prev) =>
        prev.map((o) =>
          o.fromInspRef === ref
            ? { ...o, code: newCode as 'C1' | 'C2' }
            : o,
        ),
      );
    }
  };

  const handleInspCommentChange = (ref: string, comment: string) => {
    setInspSchedule((prev) => ({
      ...prev,
      comments: { ...prev.comments, [ref]: comment },
    }));
    // Keep auto-observation description in sync with the comment
    setObservations((prev) =>
      prev.map((o) =>
        o.fromInspRef === ref
          ? { ...o, description: comment || `Inspection Item ${ref}` }
          : o,
      ),
    );
  };

  useEffect(() => {
    const prevEarthElectrodeCode = inspSchedule.codes[earthElectrodeInspectionRef] ?? '';
    const prevEarthElectrodeComment = inspSchedule.comments[earthElectrodeInspectionRef] ?? '';

    if (earthingArrangementRequiresEarthElectrode) {
      if (prevEarthElectrodeCode === 'N/A') {
        handleInspCodeChange(
          earthElectrodeInspectionRef,
          'Presence and condition of earth electrode connection where applicable (542.1.2.3)',
          '',
          prevEarthElectrodeCode,
        );
      }

      if (prevEarthElectrodeComment) {
        handleInspCommentChange(earthElectrodeInspectionRef, '');
      }
    } else {
      if (prevEarthElectrodeCode !== 'N/A') {
        handleInspCodeChange(
          earthElectrodeInspectionRef,
          'Presence and condition of earth electrode connection where applicable (542.1.2.3)',
          'N/A',
          prevEarthElectrodeCode,
        );
      }

      if (prevEarthElectrodeComment !== '') {
        handleInspCommentChange(earthElectrodeInspectionRef, '');
      }
    }

    const prevTTRcdFaultProtectionCode = inspSchedule.codes[ttOnlyRcdFaultProtectionRef] ?? '';
    const prevTTRcdFaultProtectionComment = inspSchedule.comments[ttOnlyRcdFaultProtectionRef] ?? '';

    if (isTTEarthingArrangement) {
      if (prevTTRcdFaultProtectionCode === 'N/A') {
        handleInspCodeChange(
          ttOnlyRcdFaultProtectionRef,
          'RCD(s) provided for fault protection – includes RCBOs (411.4.204; 411.5.2; 531.2)',
          '',
          prevTTRcdFaultProtectionCode,
        );
      }

      if (prevTTRcdFaultProtectionComment) {
        handleInspCommentChange(ttOnlyRcdFaultProtectionRef, '');
      }

      return;
    }

    if (prevTTRcdFaultProtectionCode !== 'N/A') {
      handleInspCodeChange(
        ttOnlyRcdFaultProtectionRef,
        'RCD(s) provided for fault protection – includes RCBOs (411.4.204; 411.5.2; 531.2)',
        'N/A',
        prevTTRcdFaultProtectionCode,
      );
    }

    if (prevTTRcdFaultProtectionComment !== '') {
      handleInspCommentChange(ttOnlyRcdFaultProtectionRef, '');
    }
  }, [earthingArrangementRequiresEarthElectrode, inspSchedule.codes, inspSchedule.comments, isTTEarthingArrangement]);

  const generateCertificateNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `CE${rand}`;
  };

  useEffect(() => {
    setCertificateNumber(generateCertificateNumber());
  }, []);

  useEffect(() => {
    if (hasHydratedDraftRef.current) {
      return;
    }

    if (!certificateNumber || !inspectionDate) {
      return;
    }

    const draftStorageKey = buildEicrDraftStorageKey(currentUser, certificateNumber, inspectionDate);
    const savedDraft = readEicrDraftState(draftStorageKey);

    if (savedDraft) {
      setSelectedCustomer(savedDraft.selectedCustomer ?? '');
      setSelectedCustomerName(savedDraft.selectedCustomerName ?? '');
      setSiteName(savedDraft.siteName ?? '');
      setClientAddress(savedDraft.clientAddress ?? '');
      setInstallationAddress(savedDraft.installationAddress ?? '');
      setIsSiteNameAuto(savedDraft.isSiteNameAuto ?? false);
      setIsClientAddressAuto(savedDraft.isClientAddressAuto ?? false);
      setCertificateNumber(savedDraft.certificateNumber ?? certificateNumber);
      setInspectionDate(savedDraft.inspectionDate ?? inspectionDate);
      setIsInspectionDateAuto(savedDraft.isInspectionDateAuto ?? false);
      setNextInspectionDate(savedDraft.nextInspectionDate ?? '');
      setNextInspectionPeriod(savedDraft.nextInspectionPeriod ?? '3 Years');
      setOverallAssessment(savedDraft.overallAssessment ?? 'SATISFACTORY');
      setInstrumentMultiFunction(savedDraft.instrumentMultiFunction ?? '');
      setEarthingArrangement(savedDraft.earthingArrangement ?? 'TN-C-S');
      setMeansOfEarthing(savedDraft.meansOfEarthing ?? "Distributor's facility");
      setSupplyConductorCSA(savedDraft.supplyConductorCSA ?? '25');
      setSupplyConductorCSACustom(savedDraft.supplyConductorCSACustom ?? '');
      setObservations(savedDraft.observations ?? []);
      setEvidenceOfAdditions(savedDraft.evidenceOfAdditions ?? 'No');
      setPremisesType(savedDraft.premisesType ?? 'Domestic');
      setInspSchedule(
        savedDraft.inspSchedule ?? {
          codes: {},
          comments: {},
        },
      );
      setCircuits(
        Array.isArray(savedDraft.circuits) && savedDraft.circuits.length > 0
          ? savedDraft.circuits
          : Array.from({ length: DEFAULT_CIRCUIT_ROW_COUNT }, (_, index) => createEmptyCircuitRow(index)),
      );
      setSelectedCircuitRow(savedDraft.selectedCircuitRow ?? 0);
      setSelectedCircuitTemplate(savedDraft.selectedCircuitTemplate ?? '__template');
      setNatureOfSupply(savedDraft.natureOfSupply ?? '1-phase (2 wire) ac');
      setExternalEarthFaultLoopImpedance(savedDraft.externalEarthFaultLoopImpedance ?? '');
      setExtentQuickOption(savedDraft.extentQuickOption ?? '__custom');
      setLimitationsQuickOption(savedDraft.limitationsQuickOption ?? '__custom');
      setOperationalQuickOption(savedDraft.operationalQuickOption ?? '__custom');
    }

    lastSavedDraftKeyRef.current = draftStorageKey;
    hasHydratedDraftRef.current = true;
  }, [currentUser, certificateNumber, inspectionDate]);

  useEffect(() => {
    if (!hasHydratedDraftRef.current || !certificateNumber || !inspectionDate || typeof window === 'undefined') {
      return;
    }

    const draftStorageKey = buildEicrDraftStorageKey(currentUser, certificateNumber, inspectionDate);
    const draftState: EicrDraftState = {
      selectedCustomer,
      selectedCustomerName,
      siteName,
      clientAddress,
      installationAddress,
      isSiteNameAuto,
      isClientAddressAuto,
      certificateNumber,
      inspectionDate,
      isInspectionDateAuto,
      nextInspectionDate,
      nextInspectionPeriod,
      overallAssessment,
      instrumentMultiFunction,
      earthingArrangement,
      meansOfEarthing,
      supplyConductorCSA,
      supplyConductorCSACustom,
      observations,
      evidenceOfAdditions,
      premisesType,
      inspSchedule,
      circuits,
      selectedCircuitRow,
      selectedCircuitTemplate,
      natureOfSupply,
      externalEarthFaultLoopImpedance,
      extentQuickOption,
      limitationsQuickOption,
      operationalQuickOption,
    };

    try {
      if (lastSavedDraftKeyRef.current && lastSavedDraftKeyRef.current !== draftStorageKey) {
        window.localStorage.removeItem(lastSavedDraftKeyRef.current);
      }

      window.localStorage.setItem(draftStorageKey, JSON.stringify(draftState));
      lastSavedDraftKeyRef.current = draftStorageKey;
    } catch (error) {
      console.error('Unable to save EICR draft to local storage:', error);
    }
  }, [
    currentUser,
    selectedCustomer,
    selectedCustomerName,
    siteName,
    clientAddress,
    installationAddress,
    isSiteNameAuto,
    isClientAddressAuto,
    certificateNumber,
    inspectionDate,
    isInspectionDateAuto,
    nextInspectionDate,
    nextInspectionPeriod,
    overallAssessment,
    instrumentMultiFunction,
    earthingArrangement,
    meansOfEarthing,
    supplyConductorCSA,
    supplyConductorCSACustom,
    observations,
    evidenceOfAdditions,
    premisesType,
    inspSchedule,
    circuits,
    selectedCircuitRow,
    selectedCircuitTemplate,
    natureOfSupply,
    externalEarthFaultLoopImpedance,
    extentQuickOption,
    limitationsQuickOption,
    operationalQuickOption,
  ]);

  const addObservation = () => {
    setObservations(prev => [...prev, { id: Date.now().toString(), description: '', code: 'C3' }]);
  };

  const updateObservation = (id: string, field: keyof Observation, value: string) => {
    setObservations(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const removeObservation = (id: string) => {
    setObservations(prev => prev.filter(o => o.id !== id));
  };

  const updateCircuitField = (rowIndex: number, key: keyof CircuitRow, value: string) => {
    let updatedRow: CircuitRow | null = null;

    setCircuits((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;

        const nextRow: CircuitRow = { ...row, [key]: value };

        if (key === 'liveCsa') {
          nextRow.cpcCsa = LIVE_CSA_TO_CPC_MAP[value] ?? '';
        }

        if (key === 'bsen' || key === 'deviceType' || key === 'rating') {
          const zsDeviceType = getZsDeviceTypeFromRow(nextRow);
          if (zsDeviceType) {
            const maxZsComputed = calculateMaxZs(zsDeviceType, nextRow.rating).replace(/Ω$/u, '');
            if (maxZsComputed !== 'N/A') {
              nextRow.maxZs = maxZsComputed;
            }
          }
        }

        updatedRow = nextRow;
        return nextRow;
      }),
    );

    const ZS_AFFECTING_KEYS: Array<keyof CircuitRow> = [
      'measuredZs',
      'maxZs',
      'wiringType',
      'refMethod',
      'bsen',
      'deviceType',
      'rating',
      'designation',
      'ringFinal',
      'r1Line',
      'rnNeutral',
      'r2Cpc',
      'r1r2',
    ];

    if (updatedRow && ZS_AFFECTING_KEYS.includes(key)) {
      const currentRow: CircuitRow = updatedRow;
      const circuitId = `auto-zs-${currentRow.circuitNumber}`;
      const label = currentRow.designation
        ? `Circuit ${currentRow.circuitNumber} (${currentRow.designation})`
        : `Circuit ${currentRow.circuitNumber}`;
      const exceeds = zsExceedsMax(currentRow);
      const logicalValidation = getMeasuredZsValidation(currentRow, externalEarthFaultLoopImpedance);
      const hasLogicalInconsistency = hasCircuitInconsistency(currentRow, externalEarthFaultLoopImpedance);

      setObservations((obs) => {
        const existing = obs.find((o) => o.fromCircuitZs === currentRow.circuitNumber);

        let description = '';
        if (exceeds) {
          const maxStr = getDeratedMaxZsDisplay(currentRow) ?? currentRow.maxZs;
          description = `${label}: Measured Zs (${currentRow.measuredZs}Ω) exceeds maximum permitted Zs (${maxStr}) – earth fault loop impedance too high`;
        } else if (logicalValidation && hasLogicalInconsistency) {
          const modeLabel =
            logicalValidation.mode === 'equal-r1-r2'
              ? 'equal R1/R2 ring logic'
              : logicalValidation.mode === 'ring'
                ? 'ring circuit logic'
                : 'radial circuit logic';
          description = `${label}: Measured Zs (${logicalValidation.measured.toFixed(2)}Ω) is inconsistent with the recorded continuity results for ${modeLabel}. Using Ze ${logicalValidation.ze.toFixed(2)}Ω plus corrected circuit resistance ${logicalValidation.correctedCircuitResistance.toFixed(2)}Ω, expected Zs is about ${logicalValidation.expected.toFixed(2)}Ω (tolerance ${logicalValidation.tolerance}%)`;
        }

        if (description && !existing) {
          return [
            ...obs,
            {
              id: circuitId,
              description,
              code: 'C2',
              fromCircuitZs: currentRow.circuitNumber,
            },
          ];
        }

        if (description && existing) {
          return obs.map((o) =>
            o.fromCircuitZs === currentRow.circuitNumber
              ? {
                  ...o,
                  description,
                }
              : o,
          );
        }

        if (!description && existing) {
          return obs.filter((o) => o.fromCircuitZs !== currentRow.circuitNumber);
        }

        return obs;
      });
    }
  };

  const applyCircuitTemplate = (rowIndex: number, templateId: string) => {
    const template = CIRCUIT_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    setCircuits((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const nextRow: CircuitRow = { ...row, ...template.values };

        const zsDeviceType = getZsDeviceTypeFromRow(nextRow);
        if (zsDeviceType) {
          const maxZsComputed = calculateMaxZs(zsDeviceType, nextRow.rating).replace(/Ω$/u, '');
          if (maxZsComputed !== 'N/A') {
            nextRow.maxZs = maxZsComputed;
          }
        }

        return nextRow;
      }),
    );
  };

  // Re-number circuits when supply type changes between single-phase and 3-phase
  // (useEffect runs after render so isThreePhase is already up to date)
  const prevIsThreePhaseRef = useRef(isThreePhase);
  useEffect(() => {
    if (prevIsThreePhaseRef.current !== isThreePhase) {
      prevIsThreePhaseRef.current = isThreePhase;
      setCircuits((prev) => normalizeCircuitRows(prev, isThreePhase));
    }
  }, [isThreePhase]);

  const moveCircuitRow = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    setCircuits((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const [movedRow] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedRow);
      return normalizeCircuitRows(next, isThreePhase);
    });

    setSelectedCircuitRow(toIndex);
  };

  const addCircuitRow = () => {
    setCircuits((prev) => {
      setSelectedCircuitRow(prev.length);
      return normalizeCircuitRows([...prev, createEmptyCircuitRow(prev.length)], isThreePhase);
    });
  };

  const insertCircuitRow = () => {
    setCircuits((prev) => {
      const insertIndex = Math.max(0, Math.min(selectedCircuitRow, prev.length));
      const nextRows = [...prev];
      nextRows.splice(insertIndex, 0, createEmptyCircuitRow(insertIndex));
      return normalizeCircuitRows(nextRows, isThreePhase);
    });
  };

  const copyCircuitRow = () => {
    setCircuits((prev) => {
      if (selectedCircuitRow < 0 || selectedCircuitRow >= prev.length) {
        return prev;
      }
      const next = [...prev];
      next.splice(selectedCircuitRow + 1, 0, { ...prev[selectedCircuitRow] });
      return normalizeCircuitRows(next, isThreePhase);
    });
    setSelectedCircuitRow((prev) => prev + 1);
  };

  const removeCircuitRow = (rowIndex: number) => {
    setCircuits((prev) => {
      const removedCircuitNumber = prev[rowIndex]?.circuitNumber;
      if (removedCircuitNumber) {
        setObservations((obs) => obs.filter((o) => o.fromCircuitZs !== removedCircuitNumber));
      }
      const next = prev.filter((_, idx) => idx !== rowIndex);
      return normalizeCircuitRows(next, isThreePhase);
    });
    setSelectedCircuitRow((prev) => {
      if (rowIndex < prev) return prev - 1;
      if (rowIndex === prev) return Math.max(0, prev - 1);
      return prev;
    });
  };

  const deleteSelectedCircuitRow = () => {
    if (circuits.length <= 1) return;
    removeCircuitRow(selectedCircuitRow);
  };

  const nextInspectionPeriodMonths = REINSPECTION_PERIODS.find(
    (period) => period.label === nextInspectionPeriod,
  )?.months;

  const setRecommendedInspectionInterval = (presetKey: EicrIntervalPresetKey) => {
    const preset = EICR_INTERVAL_PRESETS[presetKey];
    setNextInspectionPeriod(preset.period as NextInspectionPeriodLabel);
  };

  const recommendedIntervalPresetKey: EicrIntervalPresetKey =
    premisesType === 'Industrial'
      ? 'Industrial'
      : premisesType === 'Domestic'
        ? 'Domestic'
        : premisesType === 'Commercial'
          ? 'Commercial'
          : 'HighRisk';

  const recommendedIntervalPreset = EICR_INTERVAL_PRESETS[recommendedIntervalPresetKey];
  const declaredSupplyPreset =
    DECLARED_SUPPLY_PARAMETER_PRESETS[premisesType as keyof typeof DECLARED_SUPPLY_PARAMETER_PRESETS] ??
    DECLARED_SUPPLY_PARAMETER_PRESETS.Other;
  const canUseSampleFill = isAdminRole(currentUser?.role);
  const hasMultiFunctionInstrument = instrumentMultiFunction.trim().length > 0;

  const setFieldValue = (name: string, value: string) => {
    const form = formRef.current;
    if (!form) return;

    const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`);
    fields.forEach((field) => {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  const getProfileDefaultValuesFromState = (): EicrProfileDefaults => ({
    tradingTitle: formRef.current?.querySelector<HTMLInputElement>('[name="tradingTitle"]')?.value ?? '',
    companyAddress: formRef.current?.querySelector<HTMLInputElement>('[name="companyAddress"]')?.value ?? '',
    registrationNumber: formRef.current?.querySelector<HTMLInputElement>('[name="registrationNumber"]')?.value ?? '',
    companyTelephone: formRef.current?.querySelector<HTMLInputElement>('[name="companyTelephone"]')?.value ?? '',
    companyEmail: formRef.current?.querySelector<HTMLInputElement>('[name="companyEmail"]')?.value ?? '',
  });

  const hasAnyProfileDefaultValue = (values: EicrProfileDefaults) =>
    EICR_PROFILE_DEFAULT_FIELDS.some((field) => Boolean(values[field]?.trim()));

  const hasExistingProfileDefaults = hasAnyProfileDefaultValue(currentUser?.eicrProfileDefaults ?? {});

  const saveProfileDefaultsToUser = async () => {
    const defaults = getProfileDefaultValuesFromState();

    if (!hasAnyProfileDefaultValue(defaults)) {
      setProfileDefaultsSaveMessage('Add at least one business detail before saving to your profile.');
      return;
    }

    setIsSavingProfileDefaults(true);
    setProfileDefaultsSaveMessage('');

    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eicrProfileDefaults: defaults,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save profile defaults.');
      }

      await mutate('/api/user', payload, false);
      setShowSaveProfilePrompt(false);
      setProfileDefaultsSaveMessage('Business details saved to your profile for next time.');
    } catch (error) {
      setProfileDefaultsSaveMessage(error instanceof Error ? error.message : 'Unable to save profile defaults.');
    } finally {
      setIsSavingProfileDefaults(false);
    }
  };

  const saveInspectorHistoryToUser = async (name: string, position: string) => {
    const trimmedName = name.trim();
    const trimmedPosition = position.trim();

    if (!trimmedName || !trimmedPosition) {
      return;
    }

    const existingHistory = currentUser?.eicrInspectorHistory ?? [];
    const alreadyExists = existingHistory.some(
      (item) =>
        item.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        item.position.trim().toLowerCase() === trimmedPosition.toLowerCase(),
    );

    if (alreadyExists) {
      return;
    }

    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eicrInspectorHistory: [{ name: trimmedName, position: trimmedPosition }],
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save inspector history.');
      }

      await mutate('/api/user', payload, false);
    } catch (error) {
      console.error('Unable to save EICR inspector history:', error);
    }
  };

  const appendSentenceToField = (name: string, sentence: string) => {
    const form = formRef.current;
    if (!form) return;

    const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (!field) return;

    const cleanSentence = sentence.trim();
    if (!cleanSentence) return;

    const normalizedSentence = /[.!?]$/.test(cleanSentence) ? cleanSentence : `${cleanSentence}.`;
    const current = field.value.trim();

    if (!current) {
      setFieldValue(name, normalizedSentence);
      return;
    }

    if (current.includes(normalizedSentence)) {
      return;
    }

    const spacer = /[.!?]$/.test(current) ? ' ' : '. ';
    setFieldValue(name, `${current}${spacer}${normalizedSentence}`);
  };

  useEffect(() => {
    setNextInspectionPeriod(EICR_INTERVAL_PRESETS[recommendedIntervalPresetKey].period as NextInspectionPeriodLabel);
    setNatureOfSupply(declaredSupplyPreset.natureOfSupply);
    setFieldValue('nominalVoltageUo', declaredSupplyPreset.nominalVoltageUo);
    setFieldValue('nominalVoltageU', declaredSupplyPreset.nominalVoltageU);
    setFieldValue('nominalFrequency', declaredSupplyPreset.nominalFrequency);
    setFieldValue('numberOfSupplies', declaredSupplyPreset.numberOfSupplies);
  }, [recommendedIntervalPresetKey, declaredSupplyPreset]);

  useEffect(() => {
    if (profilePrefillApplied || !currentUser?.eicrProfileDefaults) {
      return;
    }

    const defaults = currentUser.eicrProfileDefaults;
    const fieldsWithValues = EICR_PROFILE_DEFAULT_FIELDS.filter((field) => defaults[field]?.trim());

    if (fieldsWithValues.length === 0) {
      return;
    }

    fieldsWithValues.forEach((field) => {
      const input = formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`);
      if (!input || input.value.trim()) {
        return;
      }

      setFieldValue(field, defaults[field] ?? '');
    });

    setProfilePrefillApplied(true);
  }, [currentUser, profilePrefillApplied]);

  useEffect(() => {
    if (hasExistingProfileDefaults) {
      setShowSaveProfilePrompt(false);
      return;
    }

    const currentValues = getProfileDefaultValuesFromState();
    setShowSaveProfilePrompt(hasAnyProfileDefaultValue(currentValues));
  }, [hasExistingProfileDefaults, profilePrefillApplied]);

  const fillFormWithSampleData = () => {
    const today = new Date();
    const inspectionDateValue = today.toISOString().split('T')[0];
    const nextDate = new Date(today);
    nextDate.setFullYear(nextDate.getFullYear() + 5);
    const nextInspectionDateValue = nextDate.toISOString().split('T')[0];
    const stripOhms = (value: string) => value.replace(/Ω$/u, '');

    const sampleInspectionCodes = Object.fromEntries(
      SCHEDULE_GROUPS.flatMap((group) =>
        group.items.map((item) => [item.ref, item.desc ? '✓' : 'N/A' as InspCode]),
      ),
    ) as Record<string, InspCode>;

    Object.assign(sampleInspectionCodes, {
      '4.10': 'C3',
      '4.13': 'C3',
      '5.2': 'C3',
      '5.12.5': 'N/A',
      '6.1': 'N/A',
      '6.2': 'N/A',
      '6.3': 'N/A',
      '6.4': 'N/A',
      '6.5': 'N/A',
      '6.6': 'N/A',
      '6.7': 'N/A',
      '6.8': 'N/A',
    });

    const sampleInspectionComments: Record<string, string> = {
      '4.10': 'RCD test notice not fixed adjacent to DB1. Add durable six-monthly test label.',
      '4.13': 'Circuit chart present but additional warning label for mixed cable colours is recommended.',
      '5.2': 'Cables in the storeroom ceiling void would benefit from improved support and dressing.',
      '5.12.5': 'Not applicable to this commercial installation.',
      '6.1': 'No locations containing a bath or shower were included within the inspected installation.',
      '7.1': 'No additional Part 7 special installations or locations identified during this inspection.',
    };

    const sampleCircuits: CircuitRow[] = [
      {
        ...createEmptyCircuitRow(0),
        circuitNumber: '1',
        designation: 'Ground floor lighting',
        wiringType: 'A',
        refMethod: 'C',
        numPoints: '18',
        liveCsa: '1.5',
        cpcCsa: '1.0',
        maxDiscTime: '0.4',
        bsen: 'BS EN 60898',
        deviceType: 'B curve',
        rating: '6',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('B', '6')),
        r1r2: '1.12',
        insResLN: '>200',
        insResLL: '>200',
        insResLE: '>200',
        testVoltage: '500',
        polarity: 'OK',
        measuredZs: '1.31',
        discTime: '22',
        rcdTestButton: 'Pass',
      },
      {
        ...createEmptyCircuitRow(1),
        circuitNumber: '2',
        designation: 'First floor lighting',
        wiringType: 'A',
        refMethod: 'C',
        numPoints: '16',
        liveCsa: '1.5',
        cpcCsa: '1.0',
        maxDiscTime: '0.4',
        bsen: 'BS EN 60898',
        deviceType: 'B curve',
        rating: '6',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('B', '6')),
        r1r2: '1.05',
        insResLN: '>200',
        insResLL: '>200',
        insResLE: '>200',
        testVoltage: '500',
        polarity: 'OK',
        measuredZs: '1.24',
        discTime: '20',
        rcdTestButton: 'Pass',
      },
      {
        ...createEmptyCircuitRow(2),
        circuitNumber: '3',
        ringFinal: '✓',
        designation: 'Ring final sockets',
        wiringType: 'A',
        refMethod: 'C',
        numPoints: '24',
        liveCsa: '2.5',
        cpcCsa: '1.5',
        maxDiscTime: '0.4',
        bsen: 'BS EN 60898',
        deviceType: 'B curve',
        rating: '32',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('B', '32')),
        r1Line: '0.63',
        rnNeutral: '0.61',
        r2Cpc: '1.02',
        r1r2: '0.89',
        insResLN: '>200',
        insResLL: '>200',
        insResLE: '>200',
        testVoltage: '500',
        polarity: 'OK',
        measuredZs: '0.78',
        discTime: '18',
        rcdTestButton: 'Pass',
      },
      {
        ...createEmptyCircuitRow(3),
        circuitNumber: '4',
        designation: 'Small power radial',
        wiringType: 'A',
        refMethod: 'C',
        numPoints: '8',
        liveCsa: '2.5',
        cpcCsa: '1.5',
        maxDiscTime: '0.4',
        bsen: 'BS EN 61009',
        deviceType: 'C curve',
        rating: '20',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('C', '20')),
        r1r2: '0.54',
        insResLN: '>200',
        insResLL: '>200',
        insResLE: '>200',
        testVoltage: '500',
        polarity: 'OK',
        measuredZs: '1.04',
        discTime: '24',
        rcdTestButton: 'Pass',
        afddTestButton: 'N/A',
      },
      {
        ...createEmptyCircuitRow(4),
        circuitNumber: '5',
        designation: 'Water heater',
        wiringType: 'A',
        refMethod: 'B',
        numPoints: '1',
        liveCsa: '2.5',
        cpcCsa: '1.5',
        maxDiscTime: '5.0',
        bsen: 'BS EN 61009',
        deviceType: 'C curve',
        rating: '20',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('C', '20')),
        r1r2: '0.49',
        insResLN: '>200',
        insResLL: '>200',
        insResLE: '>200',
        testVoltage: '500',
        polarity: 'OK',
        measuredZs: '0.96',
        discTime: '23',
        rcdTestButton: 'Pass',
        afddTestButton: 'N/A',
      },
      {
        ...createEmptyCircuitRow(5),
        circuitNumber: '6',
        designation: 'Boiler controls',
        wiringType: 'B',
        refMethod: 'B',
        numPoints: '2',
        liveCsa: '1.5',
        cpcCsa: '1.0',
        maxDiscTime: '0.4',
        bsen: 'BS EN 60898',
        deviceType: 'B curve',
        rating: '16',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('B', '16')),
        r1r2: '0.71',
        insResLN: '>200',
        insResLL: '>200',
        insResLE: '>200',
        testVoltage: '500',
        polarity: 'OK',
        measuredZs: '1.18',
        discTime: '17',
        rcdTestButton: 'Pass',
      },
      {
        ...createEmptyCircuitRow(6),
        circuitNumber: '7',
        designation: 'Kitchen equipment',
        wiringType: 'F',
        refMethod: '100',
        numPoints: '6',
        liveCsa: '4.0',
        cpcCsa: '2.5',
        maxDiscTime: '0.4',
        bsen: 'BS EN 61009',
        deviceType: 'C curve',
        rating: '32',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('C', '32')),
        r1r2: '0.33',
        insResLN: '>200',
        insResLL: '>200',
        insResLE: '>200',
        testVoltage: '500',
        polarity: 'OK',
        measuredZs: '0.62',
        discTime: '19',
        rcdTestButton: 'Pass',
        afddTestButton: 'N/A',
      },
      {
        ...createEmptyCircuitRow(7),
        circuitNumber: '8',
        designation: 'Air conditioning radial',
        wiringType: 'F',
        refMethod: '100',
        numPoints: '2',
        liveCsa: '4.0',
        cpcCsa: '2.5',
        maxDiscTime: '5.0',
        bsen: 'BS EN 60898',
        deviceType: 'C curve',
        rating: '25',
        capacity: '10',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('C', '25')),
        r1r2: '0.28',
        insResLN: '>200',
        insResLL: '>200',
        insResLE: '>200',
        testVoltage: '500',
        polarity: 'OK',
        measuredZs: '0.74',
        discTime: '21',
        rcdTestButton: 'Pass',
      },
    ];

    setSelectedCustomer('');
    setSelectedCustomerName('Acme Properties Ltd');
    setSiteName('Acme Distribution Centre');
    setClientAddress('Unit 4, Riverside Industrial Estate, Manchester, M11 2AB');
    setInstallationAddress('Unit 4, Riverside Industrial Estate, Manchester, M11 2AB');
    setIsSiteNameAuto(false);
    setIsClientAddressAuto(false);
    setInspectionDate(inspectionDateValue);
    setIsInspectionDateAuto(false);
    setNextInspectionPeriod('5 Years');
    setNextInspectionDate(nextInspectionDateValue);
    setOverallAssessment('SATISFACTORY');
    setEarthingArrangement('TN-C-S');
    setMeansOfEarthing("Distributor's facility");
    setSupplyConductorCSA('25');
    setSupplyConductorCSACustom('');
    setEvidenceOfAdditions('Yes');
    setObservations([
      {
        id: 'sample-observation-1',
        description: 'RCD six-monthly test notice should be fixed adjacent to DB1 for user guidance.',
        code: 'C3',
      },
      {
        id: 'sample-observation-2',
        description: 'Circuit chart and warning labels at DB1 should be updated to reflect current board arrangement.',
        code: 'C3',
      },
      {
        id: 'sample-observation-3',
        description: 'Cables above the storeroom suspended ceiling should be better supported and dressed.',
        code: 'C3',
      },
    ]);
    setInspSchedule({ codes: sampleInspectionCodes, comments: sampleInspectionComments });
    setNatureOfSupply('3-phase (4 wire) ac');
    setExternalEarthFaultLoopImpedance('0.18');
    setCircuits(sampleCircuits);
    setSelectedCircuitRow(0);

    const sampleFieldValues: Record<string, string> = {
      customerName: 'Acme Properties Ltd',
      siteName: 'Acme Distribution Centre',
      clientAddress: 'Unit 4, Riverside Industrial Estate, Manchester, M11 2AB',
      installationAddress: 'Unit 4, Riverside Industrial Estate, Manchester, M11 2AB',
      inspectionDate: inspectionDateValue,
      nextInspectionDate: nextInspectionDateValue,
      reasonForReport: 'Safety assessment requested by client. To assess compliance with BS 7671.',
      premisesType: 'Commercial',
      estimatedAgeOfWiring: '15',
      estimatedAgeOfAdditions: '5',
      installationRecordsAvailable: 'No',
      dateOfLastInspection: '2021-06-15',
      extentOfInspection: 'The full fixed wiring installation at the above premises, including all accessible final circuits, distribution equipment and accessories.',
      agreedLimitations: 'No access above fixed ceilings in the office area and no disconnection of production equipment during business hours.',
      agreedLimitationsWith: 'R. Taylor, Site Manager',
      operationalLimitations: 'Warehouse remained in operation during the inspection, so some equipment was visually inspected only.',
      generalCondition: 'The installation was found to be in generally serviceable condition. Minor improvements to labelling and cable support are recommended.',
      tradingTitle: 'Example Contracting Business Ltd',
      companyAddress: 'Business address',
      companyTelephone: '01234 567890',
      inspectorName: 'Inspector name',
      inspectorPosition: 'Qualified Supervisor',
      registrationNumber: 'Registration number',
      instrumentMultiFunction: 'Megger MFT-X1 SN MFT10452',
      instrumentInsulationResistance: 'Megger MFT-X1 SN MFT10452',
      instrumentContinuity: 'Megger MFT-X1 SN MFT10452',
      instrumentEarthElectrode: 'Metrel MI3290 SN MI3290-3321',
      instrumentEarthLoop: 'Megger MFT-X1 SN MFT10452',
      instrumentRCD: 'Megger MFT-X1 SN MFT10452',
      nominalVoltageUo: '230',
      nominalVoltageU: '400',
      nominalFrequency: '50',
      numberOfSupplies: '1',
      natureOfSupply: '3-phase (4 wire) ac',
      maximumDemand: '78',
      prospectiveFaultCurrent: '2.4',
      externalEarthFaultLoopImpedance: '0.18',
      shortCircuitCapacity: '16',
      mainSwitchType: 'Isolator',
      mainSwitchPoles: '4',
      mainSwitchCurrentRating: '100',
      mainSwitchVoltageRating: '400',
      mainSwitchFuseRating: '100',
      supplyPolarityConfirmed: 'Yes',
      supplyProtectiveDeviceType: 'BS 1361 Type IIb cartridge fuse',
      supplyProtectiveDeviceStandard: 'BS 1361 Type IIb',
      supplyProtectiveDeviceRating: '100',
      earthElectrodeMeasurementMethod: 'N/A',
      earthElectrodeType: 'N/A',
      earthElectrodeResistance: 'N/A',
      earthElectrodeLocation: 'N/A',
      protectiveMeasures: 'ADS',
      supplyConductorMaterial: 'Copper',
      rcdRatedResidualCurrent: '30',
      rcdRatedTimeDelay: '0',
      rcdMeasuredTime: '24',
      earthingConductorMaterial: 'Copper',
      earthingConductorCSA: '16',
      earthingConductorVerified: 'Yes',
      mainBondingMaterial: 'Copper',
      mainBondingCSA: '10',
      mainBondingVerified: 'Yes',
      bondingWater: 'Yes',
      bondingGas: 'Yes',
      bondingOil: 'N/A',
      bondingLightning: 'N/A',
      bondingSteel: 'N/A',
      consumerUnitDesignation: 'DB1',
      consumerUnitLocation: 'Meter cupboard',
      consumerUnitPfc: '1.2',
      overallAssessment: 'SATISFACTORY',
      nextInspectionPeriod: '5 Years',
      earthingArrangements: 'TN-C-S',
      meansOfEarthing: "Distributor's facility",
    };

    Object.entries(sampleFieldValues).forEach(([name, value]) => {
      setFieldValue(name, value);
    });
  };

  const handleVerify = () => {
    const results: Array<{ type: 'error' | 'warning' | 'pass'; message: string }> = [];

    if (!selectedCustomerName.trim()) results.push({ type: 'error', message: 'No client selected' });
    else results.push({ type: 'pass', message: 'Client selected' });

    if (!certificateNumber) results.push({ type: 'error', message: 'Certificate number missing' });
    else results.push({ type: 'pass', message: 'Certificate number present' });

    if (!installationAddress) results.push({ type: 'error', message: 'Installation address missing' });
    else results.push({ type: 'pass', message: 'Installation address present' });

    if (!inspectionDate) results.push({ type: 'error', message: 'Inspection date missing' });
    else results.push({ type: 'pass', message: 'Inspection date set' });

    const inspectorNameEl = formRef.current?.querySelector<HTMLInputElement>('[name="inspectorName"]');
    if (!inspectorNameEl?.value?.trim()) results.push({ type: 'warning', message: 'Inspector name is blank' });
    else results.push({ type: 'pass', message: 'Inspector name present' });

    if (!nextInspectionDate) results.push({ type: 'warning', message: 'Next inspection date not set' });
    else results.push({ type: 'pass', message: 'Next inspection date set' });

    const hasC1 = observations.some((o) => o.code === 'C1');
    if (hasC1 && overallAssessment === 'SATISFACTORY') {
      results.push({ type: 'error', message: 'C1 observation present but overall assessment is SATISFACTORY' });
    } else if (observations.length > 0) {
      results.push({ type: 'pass', message: `${observations.length} observation(s) recorded` });
    } else {
      results.push({ type: 'warning', message: 'No observations recorded' });
    }

    const filledCircuits = circuits.filter((c) => c.designation.trim());
    if (filledCircuits.length === 0) results.push({ type: 'warning', message: 'No circuit designations entered' });
    else results.push({ type: 'pass', message: `${filledCircuits.length} circuit(s) with designations` });

    setVerifyResults(results);
  };

  const handleSpellCheck = () => {
    if (!formRef.current) return;
    const fields = Array.from(
      formRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'textarea, input[type="text"], input:not([type])',
      ),
    );
    fields.forEach((f) => { f.spellcheck = true; });
    setSpellCheckActive(true);
    const firstFilled = fields.find((f) => f.value.trim().length > 0);
    (firstFilled ?? fields[0])?.focus();
  };

  const applyAiPrefill = (payload: AnalyzeImageResponse) => {
    const reportSections = payload.prefill?.reportSections;
    const findingsConsumerUnit = payload.findings?.consumerUnit;
    const combinedObservationText = [
      ...(payload.findings?.observations ?? []),
      ...(payload.prefill?.observations ?? []),
    ]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    if (payload.summary) {
      setAiAnalysisState((current) => ({
        ...current,
        summary: payload.summary,
      }));
      appendSentenceToField('generalCondition', payload.summary);
    }

    if (findingsConsumerUnit) {
      if (typeof findingsConsumerUnit.brand === 'string' && findingsConsumerUnit.brand.trim()) {
        setFieldValue('consumerUnitDesignation', findingsConsumerUnit.brand.trim());
      }

      if (typeof findingsConsumerUnit.model === 'string' && findingsConsumerUnit.model.trim()) {
        appendSentenceToField(
          'generalCondition',
          `Consumer unit model identified as ${findingsConsumerUnit.model.trim()}`,
        );
      }

      if (typeof findingsConsumerUnit.condition === 'string' && findingsConsumerUnit.condition.trim()) {
        appendSentenceToField('generalCondition', findingsConsumerUnit.condition.trim());
      }
    }

    const gasBondingValue = normalizeYesNoValue(
      reportSections?.supplyCharacteristicsAndEarthingArrangements?.mainProtectiveBonding?.gas?.present,
    );
    if (gasBondingValue) {
      setFieldValue('bondingGas', gasBondingValue);
    }

    const nextObservationEntries: Observation[] = [];
    const seenObservationKeys = new Set<string>();

    const pushObservation = (description: string, code: Observation['code']) => {
      const normalizedDescription = description.trim();
      if (!normalizedDescription) {
        return;
      }

      const key = `${code}:${normalizedDescription.toLowerCase()}`;
      if (seenObservationKeys.has(key)) {
        return;
      }

      seenObservationKeys.add(key);
      nextObservationEntries.push({
        id: `ai-${Date.now()}-${seenObservationKeys.size}`,
        description: normalizedDescription,
        code,
      });
    };

    combinedObservationText.forEach((text) => {
      pushObservation(text, 'C3');
    });

    (reportSections?.identifiedDefects ?? []).forEach((defect) => {
      const description = [defect.item, defect.description, defect.sourceText]
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
        .join(' — ');
      const normalizedCode = typeof defect.code === 'string' ? defect.code.trim().toUpperCase() : '';
      const code: Observation['code'] =
        normalizedCode === 'C1' || normalizedCode === 'C2' || normalizedCode === 'C3' || normalizedCode === 'FI'
          ? (normalizedCode as Observation['code'])
          : 'C3';

      pushObservation(description, code);
    });

    (reportSections?.observationsAndRecommendations?.items ?? []).forEach((item) => {
      const description = [item.observation, item.recommendation]
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
        .join(' — ');
      const normalizedCode = typeof item.code === 'string' ? item.code.trim().toUpperCase() : '';
      const code: Observation['code'] =
        normalizedCode === 'C1' || normalizedCode === 'C2' || normalizedCode === 'C3' || normalizedCode === 'FI'
          ? (normalizedCode as Observation['code'])
          : 'C3';

      pushObservation(description, code);
    });

    (reportSections?.observationSchedule?.items ?? []).forEach((item) => {
      const description = buildObservationDescription(item);
      const normalizedCode = typeof item.code === 'string' ? item.code.trim().toUpperCase() : '';
      const code: Observation['code'] =
        normalizedCode === 'C1' || normalizedCode === 'C2' || normalizedCode === 'C3' || normalizedCode === 'FI'
          ? (normalizedCode as Observation['code'])
          : 'C3';

      pushObservation(description, code);
    });

    if (nextObservationEntries.length > 0) {
      setObservations((prev) => {
        const existingKeys = new Set(
          prev.map((item) => `${item.code}:${item.description.trim().toLowerCase()}`),
        );

        const dedupedAdditions = nextObservationEntries.filter((item) => {
          const key = `${item.code}:${item.description.trim().toLowerCase()}`;
          if (existingKeys.has(key)) {
            return false;
          }
          existingKeys.add(key);
          return true;
        });

        return dedupedAdditions.length > 0 ? [...prev, ...dedupedAdditions] : prev;
      });
    }

    const inspectionUpdates = (reportSections?.inspectionSchedule?.items ?? []).reduce<{
      codes: Record<string, InspCode>;
      comments: Record<string, string>;
    }>(
      (accumulator, item) => {
        const ref = getScheduleRef(item);
        if (!ref) {
          return accumulator;
        }

        const outcome = normalizeInspectionOutcome(item.outcome || item.result || item.code || item.classification);
        if (outcome) {
          accumulator.codes[ref] = outcome;
        }

        const comment = buildObservationDescription(item);
        if (comment) {
          accumulator.comments[ref] = comment;
        }

        return accumulator;
      },
      { codes: {}, comments: {} },
    );

    if (Object.keys(inspectionUpdates.codes).length > 0 || Object.keys(inspectionUpdates.comments).length > 0) {
      setInspSchedule((prev) => ({
        codes: {
          ...prev.codes,
          ...inspectionUpdates.codes,
        },
        comments: {
          ...prev.comments,
          ...inspectionUpdates.comments,
        },
      }));
    }
  };

  const handleAiImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setAiAnalysisState((current) => ({
        ...current,
        isSubmitting: true,
        error: '',
        fileName: file.name,
      }));

      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
            return;
          }

          reject(new Error('Unable to read the selected image.'));
        };

        reader.onerror = () => {
          reject(reader.error ?? new Error('Unable to read the selected image.'));
        };

        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          reportType: 'electrical-installation-condition-report',
          inspectionType: 'consumer-unit-ocr',
          requestedSections: ['summary', 'consumerUnit', 'observations', 'reportSections'],
          metadata: {
            source: 'eicr-certificate-editor',
            fileName: file.name,
            capturedAt: new Date().toISOString(),
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as AnalyzeImageResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Image analysis failed.');
      }

      applyAiPrefill(payload);

      setAiAnalysisState((current) => ({
        ...current,
        isSubmitting: false,
        error: '',
        summary: payload.summary || current.summary,
      }));
    } catch (error) {
      setAiAnalysisState((current) => ({
        ...current,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Unable to analyze the selected image.',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.set('certificateType', 'EICR');

      const scheduleForPdf = Object.fromEntries(
        Array.from(new Set([
          ...Object.keys(inspSchedule.codes),
          ...Object.keys(inspSchedule.comments),
        ])).map((ref) => [
          ref,
          {
            outcome: inspSchedule.codes[ref] || '',
            comment: inspSchedule.comments[ref] || '',
          },
        ]),
      );

      // Serialize observations as certificate items JSON
      const obsJson = JSON.stringify(observations.map(o => ({
        itemType: 'observation',
        description: o.description,
        status: o.code === 'C1' || o.code === 'C2' ? 'unsatisfactory' : o.code === 'FI' ? 'not_tested' : 'satisfactory',
        defects: o.code,
        recommendations: codeLabels[o.code],
      })));
      formData.set('items', obsJson);
      formData.set('inspectionSchedule', JSON.stringify(scheduleForPdf));
      formData.set('circuits', JSON.stringify(circuits));

      const result = await createCertificate({}, formData);
      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/eicr'));
          return;
        }
        setFormError(result.error);
      } else {
        await saveInspectorHistoryToUser(inspectorName, inspectorPosition);
      }
    } catch (error) {
      console.error('Error creating certificate:', error);
      setFormError('Unable to create certificate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleCircuitColumns = getVisibleCircuitColumns(isThreePhase, streamlined);
  const circuitHeaderGroups = getCircuitHeaderGroups(visibleCircuitColumns);

  return (
    <div className="flex-1 bg-[#e8e1d6] p-4 pt-6 md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-col gap-3 border border-slate-300 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {streamlined ? 'EICR Stremlined' : 'EICR – Electrical Installation Condition Report'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Requirements For Electrical Installations – BS 7671 IET Wiring Regulations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canUseSampleFill && (
            <Button type="button" variant="secondary" onClick={fillFormWithSampleData}>
              Fill Form With Sample Data
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/certificates/new">← Back to Certificate Types</Link>
          </Button>
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={cn(
          EDITOR_FORM_SHEET_CLASS,
          EXPECTED_VALUES_FADE_CLASS,
          showExpectedValues &&
            `${EXPECTED_VALUES_LOCKED_CLASS} [&_input]:opacity-55 [&_textarea]:opacity-55 [&_[role=combobox]]:opacity-55 [&_button]:opacity-55 [&_[data-expected-values-button=true]]:pointer-events-auto [&_[data-expected-values-button=true]]:opacity-100 [&_[data-expected-values-panel=true]]:opacity-100`,
        )}
      >
        <input type="hidden" name="certificateType" value="EICR" />
        {formError && (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}>
            <CardTitle>AI Image Prefill</CardTitle>
            <CardDescription>Upload a consumer-unit or certificate image to prefill observations, bonding, and schedule details.</CardDescription>
          </CardHeader>
          <CardContent className={cn(EDITOR_CONTENT_CLASS, EDITOR_SECTION_BODY_CLASS)}>
            <div className="flex flex-col gap-3 border border-slate-300 bg-white p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => aiUploadInputRef.current?.click()}
                  disabled={aiAnalysisState.isSubmitting}
                >
                  {aiAnalysisState.isSubmitting ? (
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {aiAnalysisState.isSubmitting ? 'Analyzing image...' : 'Upload image for AI prefill'}
                </Button>
                {aiAnalysisState.fileName ? (
                  <span className="text-xs text-slate-600">Selected image: {aiAnalysisState.fileName}</span>
                ) : null}
              </div>

              <input
                ref={aiUploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAiImageSelect}
              />

              {aiAnalysisState.summary ? (
                <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <span className="font-medium">AI summary:</span> {aiAnalysisState.summary}
                </div>
              ) : null}

              {aiAnalysisState.error ? (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {aiAnalysisState.error}
                </div>
              ) : null}

              <p className="text-xs text-slate-500">
                The AI prefill appends observations, updates gas bonding when available, and applies recognised
                inspection schedule outcomes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Basic / Certificate Number ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}>
            <CardTitle>Report Reference</CardTitle>
            <CardDescription>Certificate reference taken from the CE numbering series</CardDescription>
          </CardHeader>
          <CardContent className={EDITOR_CONTENT_CLASS}>
            <div className={EDITOR_GRID_TWO_CLASS}>
              <div className="space-y-2">
                <CertificateNumberField
                  value={certificateNumber}
                  onChange={setCertificateNumber}
                  certificateType="EICR"
                />
                <input type="hidden" name="certificateNumber" value={certificateNumber} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer *</Label>
                <input type="hidden" name="customerId" value={selectedCustomer} />
                <Input
                  name="customerName"
                  id="customerName"
                  required
                  list="customers-list-eicr"
                  placeholder="Type customer name"
                  className={EDITOR_NATIVE_INPUT_CLASS}
                  value={selectedCustomerName}
                  onChange={e => {
                    const value = e.target.value;
                    setSelectedCustomerName(value);
                    const normalizedValue = value.trim().toLowerCase();
                    const exactMatch = customers.find((c: any) => c.name?.trim().toLowerCase() === normalizedValue);
                    const prefixMatches = customers.filter((c: any) => c.name?.trim().toLowerCase().startsWith(normalizedValue));
                    const customer = exactMatch || (normalizedValue && prefixMatches.length === 1 ? prefixMatches[0] : null);
                    setSelectedCustomer(customer ? String(customer.id) : '');

                    if (customer && !siteName && (customer.name || customer.address)) {
                      setSiteName(customer.name || customer.address || '');
                      setIsSiteNameAuto(true);
                    }

                    if (customer && !clientAddress && customer.address) {
                      setClientAddress(customer.address);
                      setIsClientAddressAuto(true);
                    }
                  }}
                />
                <datalist id="customers-list-eicr">
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 1: Client ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Details of the Person Ordering the Report</CardTitle></CardHeader>
          <CardContent className={EDITOR_CONTENT_CLASS}>
            <div className={EDITOR_GRID_TWO_CLASS}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="siteName">Client / Organisation *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => {
                      if (!selectedCustomerName) return;
                      setSiteName(selectedCustomerName);
                      setIsSiteNameAuto(true);
                    }}
                    disabled={!selectedCustomerName}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy from customer
                  </Button>
                </div>
                <OrganisationAutocompleteField
                  id="siteName"
                  name="siteName"
                  required
                  placeholder="Highfield Hall Community Centre"
                  value={siteName}
                  onChange={(v) => {
                    setSiteName(v);
                    setIsSiteNameAuto(false);
                  }}
                  onAddressPick={(address) => {
                    setClientAddress(address);
                    setIsClientAddressAuto(true);
                    if (!installationAddress) {
                      setInstallationAddress(address);
                    }
                  }}
                  className={cn(EDITOR_NATIVE_INPUT_CLASS, isSiteNameAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : '')}
                  title={isSiteNameAuto ? 'Auto-populated from selected customer details. Edit if needed.' : undefined}
                />
                {isSiteNameAuto && (
                  <p className="text-xs text-amber-700" title="This value was auto-filled from the selected customer.">
                    Auto-populated from customer details. Hover the field for details.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientAddress">Client Address *</Label>
                <AddressAutocompleteField
                  id="clientAddress"
                  name="clientAddress"
                  required
                  placeholder="Marsh Lane, Farnworth, Bolton, BL4 0AW"
                  value={clientAddress}
                  onChange={(newValue) => {
                    setClientAddress(newValue);
                    setIsClientAddressAuto(false);
                  }}
                  className={cn(EDITOR_NATIVE_INPUT_CLASS, isClientAddressAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : '')}
                  title={isClientAddressAuto ? 'Auto-populated from selected customer address. Edit if needed.' : undefined}
                />
                {isClientAddressAuto && (
                  <p className="text-xs text-amber-700" title="This value was auto-filled from the selected customer address.">
                    Auto-populated from customer address. Hover the field for details.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: Reason ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Reason for Producing This Report</CardTitle></CardHeader>
          <CardContent className={EDITOR_CONTENT_CLASS}>
            <div className={EDITOR_GRID_TWO_CLASS}>
              <div className="space-y-2">
                <Label htmlFor="reasonForReport">Reason for Report</Label>
                <Select
                  value="__custom"
                  onValueChange={(value) => {
                    if (value !== '__custom') {
                      appendSentenceToField('reasonForReport', value);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose a preset reason (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__custom">Custom / manual entry</SelectItem>
                    {REASON_FOR_REPORT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  id="reasonForReport"
                  name="reasonForReport"
                  rows={3}
                  className="min-h-[4.5rem]"
                  placeholder="Safety assessment requested by client. To assess compliance with BS 7671."
                />
              </div>
              <div className="space-y-2">
                <DateDropdownField
                  id="inspectionDate"
                  name="inspectionDate"
                  label="Date(s) of Inspection"
                  value={inspectionDate}
                  onChange={(newDate) => {
                    setInspectionDate(newDate);
                    setIsInspectionDateAuto(false);
                  }}
                  required
                  isAutoPopulated={isInspectionDateAuto}
                  autoTitle="Auto-populated with today's date. Edit if required."
                  autoHelpText="Auto-populated with today's date. Hover the field for details."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Installation ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Details of the Installation</CardTitle></CardHeader>
          <CardContent className={EDITOR_CONTENT_CLASS}>
            <div className={EDITOR_GRID_TWO_CLASS}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="installationAddress">Installation Address</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => setInstallationAddress(clientAddress)}
                    disabled={!clientAddress}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy from client address
                  </Button>
                </div>
                <AddressAutocompleteField
                  id="installationAddress"
                  name="installationAddress"
                  placeholder="Same as client address"
                  value={installationAddress}
                  onChange={setInstallationAddress}
                  className={EDITOR_NATIVE_INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="premisesType">Description of Premises</Label>
                <Select name="premisesType" value={premisesType} onValueChange={setPremisesType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Domestic">Domestic</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Other">Other / special installation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedAgeOfWiring">Estimated Age of Wiring System (years)</Label>
                <Input id="estimatedAgeOfWiring" name="estimatedAgeOfWiring" type="number" placeholder="15" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidenceOfAdditions">Evidence of Additions/Alterations?</Label>
                <Select
                  name="evidenceOfAdditions"
                  value={evidenceOfAdditions}
                  onValueChange={setEvidenceOfAdditions}
                >
                  <SelectTrigger className="pr-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {evidenceOfAdditions === 'Yes' && (
                <div className="space-y-2">
                  <Label htmlFor="estimatedAgeOfAdditions">Estimated Age of Additions (years)</Label>
                  <Input id="estimatedAgeOfAdditions" name="estimatedAgeOfAdditions" type="number" placeholder="5" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="installationRecordsAvailable">Installation Records Available? (Reg 651.1)</Label>
                <Select name="installationRecordsAvailable" defaultValue="No">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfLastInspection">Date of Last Inspection</Label>
                <Input id="dateOfLastInspection" name="dateOfLastInspection" type="date" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 4: Extent & Limitations ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Extent and Limitations of Inspection and Testing</CardTitle></CardHeader>
          <CardContent className={EDITOR_CONTENT_CLASS}>
            <div className={EDITOR_STACK_CLASS}>
              <div className="space-y-2">
              <Label htmlFor="extentOfInspection">Extent of Electrical Installation Covered</Label>
              <Select
                value={extentQuickOption}
                onValueChange={(value) => {
                  setExtentQuickOption(value);
                  if (value !== '__custom') {
                    appendSentenceToField('extentOfInspection', value);
                    setExtentQuickOption('__custom');
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Add one or more extent options (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom">Custom / manual entry</SelectItem>
                  <SelectItem value="100% of the fixed wiring installation at the premises, including all accessible final circuits.">Full installation (all accessible circuits)</SelectItem>
                  <SelectItem value="A sample inspection and testing regime covering approximately 50% of the installation in accordance with agreed scope.">Sample scope (approx. 50%)</SelectItem>
                  <SelectItem value="Distribution boards, protective devices and associated final circuits accessible at the time of inspection.">DBs and associated accessible circuits</SelectItem>
                  <SelectItem value="Inspection and testing limited to landlord/common-area installation and associated distribution equipment.">Landlord/common-area installation only</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                id="extentOfInspection"
                name="extentOfInspection"
                rows={2}
                className="min-h-[3.75rem]"
                placeholder="50% of the installation in accordance with item 3.8.4 of Guidance Note 3."
              />
              </div>
              <div className="space-y-2">
              <Label htmlFor="agreedLimitations">Agreed Limitations (including reasons)</Label>
              <Select
                value={limitationsQuickOption}
                onValueChange={(value) => {
                  setLimitationsQuickOption(value);
                  if (value !== '__custom') {
                    appendSentenceToField('agreedLimitations', value);
                    setLimitationsQuickOption('__custom');
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Add one or more limitation options (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom">Custom / manual entry</SelectItem>
                  <SelectItem value="No access above fixed ceilings, within floor voids, or within roof spaces due to building constraints.">No access to concealed spaces</SelectItem>
                  <SelectItem value="No access was available to locked rooms, risers, cupboards, or landlord-only areas at the time of inspection.">No access to locked/restricted areas</SelectItem>
                  <SelectItem value="Furniture, fixtures, stored goods, or fixed equipment prevented access to parts of the installation.">Obstructed by furniture or stored goods</SelectItem>
                  <SelectItem value="No disconnection of essential services or IT systems during occupied operational hours.">No disconnection of essential services</SelectItem>
                  <SelectItem value="Certain circuits could not be isolated without unacceptable disruption to occupants, tenants, or business operations.">Some circuits could not be isolated</SelectItem>
                  <SelectItem value="Inspection excludes specialist control wiring and extra-low-voltage systems outside scope of this report.">Excludes specialist control/ELV systems</SelectItem>
                  <SelectItem value="Portable appliances, luminaires requiring specialist access equipment, and removable equipment were excluded from this report.">Excludes portable appliances and removable equipment</SelectItem>
                  <SelectItem value="No intrusive inspection works undertaken and no dismantling of fixed equipment agreed.">No intrusive inspection or dismantling</SelectItem>
                  <SelectItem value="Underground cables, concealed wiring routes, and circuits buried in the fabric of the building were not exposed for inspection.">No exposure of concealed/underground wiring</SelectItem>
                  <SelectItem value="No inspection was carried out within hazardous areas, roof plant, or external locations requiring specialist access arrangements.">No access to roof plant / hazardous / external specialist areas</SelectItem>
                  <SelectItem value="Outbuildings, detached structures, or external supplies were excluded unless specifically identified within the agreed scope.">Excludes outbuildings or external supplies</SelectItem>
                  <SelectItem value="The inspection was limited to a sample of accessible circuits and accessories in accordance with the agreed scope.">Sample inspection only</SelectItem>
                  <SelectItem value="No verification of equipment belonging to the distributor, meter operator, or telecommunications provider was undertaken.">Excludes DNO / metering / telecoms equipment</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                id="agreedLimitations"
                name="agreedLimitations"
                rows={3}
                className="min-h-[4.5rem]"
                placeholder="No testing of HVAC control cables. No lifting of floor boards or inspection of loft space..."
              />
              </div>
            </div>
            <div className={EDITOR_GRID_TWO_CLASS}>
              <div className="space-y-2">
                <Label htmlFor="agreedLimitationsWith">Agreed With</Label>
                <Input id="agreedLimitationsWith" name="agreedLimitationsWith" placeholder="Client name / representative" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operationalLimitations">Operational Limitations</Label>
                <Select
                  value={operationalQuickOption}
                  onValueChange={(value) => {
                    setOperationalQuickOption(value);
                    if (value !== '__custom') {
                      appendSentenceToField('operationalLimitations', value);
                      setOperationalQuickOption('__custom');
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Add one or more operational limitations (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__custom">Custom / manual entry</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                    <SelectItem value="Inspection and testing performed outside normal production hours to avoid operational disruption.">Out-of-hours testing only</SelectItem>
                    <SelectItem value="Certain circuits remained energized due to operational requirements and could not be fully isolated.">Some circuits could not be isolated</SelectItem>
                  </SelectContent>
                </Select>
                <Input id="operationalLimitations" name="operationalLimitations" placeholder="N/A" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 5: Overall Assessment ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Overall Assessment</CardTitle></CardHeader>
          <CardContent className={EDITOR_CONTENT_CLASS}>
            <div className="grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-2 [&>label]:flex [&>label]:items-center [&>label]:justify-between [&>label]:gap-3 [&>label]:bg-white [&>label]:px-3 [&>label]:py-2.5">
              {(['SATISFACTORY', 'UNSATISFACTORY'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <span className={`font-semibold tracking-[0.05em] ${opt === 'SATISFACTORY' ? 'text-green-700' : 'text-red-700'}`}>{opt}</span>
                  <input
                    type="radio"
                    name="overallAssessment"
                    value={opt}
                    checked={overallAssessment === opt}
                    onChange={() => setOverallAssessment(opt)}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
            <p className="border-t border-border bg-white px-3 py-2 text-[11px] text-slate-500">
              Any C1, C2 or FI outcome results in an unsatisfactory report.
            </p>
          </CardContent>
        </Card>

        {/* ── Section 6: Recommendations ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Recommendations</CardTitle></CardHeader>
          <CardContent className={EDITOR_CONTENT_CLASS}>
            <div className={EDITOR_GRID_TWO_CLASS}>
              <div className="space-y-2">
                <Label htmlFor="nextInspectionPeriod">Recommended Reinspection Period</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      name="nextInspectionPeriod"
                      value={nextInspectionPeriod}
                      onValueChange={(value) => setNextInspectionPeriod(value as (typeof REINSPECTION_PERIODS)[number]['label'])}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1 Year">1 Year</SelectItem>
                        <SelectItem value="2 Years">2 Years</SelectItem>
                        <SelectItem value="3 Years">3 Years</SelectItem>
                        <SelectItem value="5 Years">5 Years</SelectItem>
                        <SelectItem value="10 Years">10 Years</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-[10px]"
                      onClick={() => setRecommendedInspectionInterval(recommendedIntervalPresetKey)}
                    >
                      Use suggested interval
                    </Button>
                  </div>
                  <div className="rounded border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-4 text-amber-900">
                    <span className="font-semibold">Suggested for {recommendedIntervalPreset.label}:</span>{' '}
                    {recommendedIntervalPreset.period}. {recommendedIntervalPreset.note}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Next Inspection Date</Label>
                <NextVisitField
                  visitDate={inspectionDate}
                  value={nextInspectionDate}
                  onChange={setNextInspectionDate}
                  periodMonths={nextInspectionPeriodMonths}
                  showPeriodSelect={false}
                />
                <input type="hidden" name="nextInspectionDate" value={nextInspectionDate} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 7: Observations ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Observations and Recommendations</CardTitle>
                <CardDescription>Record each item in schedule order with its classification code</CardDescription>
              </div>
              <Button type="button" size="sm" onClick={addObservation}>
                <Plus className="h-4 w-4 mr-2" />Add Observation
              </Button>
            </div>
          </CardHeader>
          <CardContent className={EDITOR_CONTENT_CLASS}>
            <div className="border-t border-border bg-white px-3 py-3">
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {OBSERVATION_CODE_GUIDANCE.map((item) => (
                  <div key={item.code} className={`rounded border px-3 py-2 text-xs ${codeColors[item.code]}`}>
                    <div className="font-semibold">{item.code} — {item.title}</div>
                    <p className="mt-1 leading-4">{item.summary}</p>
                    <p className="mt-1 text-[11px] leading-4 opacity-90">{item.examples}</p>
                  </div>
                ))}
              </div>
            </div>
            {observations.length === 0 && (
              <p className="border-t border-border bg-white py-4 text-center text-sm text-muted-foreground">
                No observations — the installation has no items adversely affecting electrical safety.
              </p>
            )}
            <div className="border-t border-border bg-white px-2 py-2">
              <div className="flex flex-wrap gap-2">
                {Object.entries(codeLabels).map(([code, label]) => (
                  <Badge key={code} variant="outline" className={`text-[11px] ${codeColors[code]}`}>{label}</Badge>
                ))}
              </div>
            </div>
            {observations.length > 0 && (
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-slate-100 text-[11px] uppercase tracking-[0.04em] text-slate-700">
                    <tr>
                      <th className="w-12 border border-border px-2 py-1 text-center font-semibold">No.</th>
                      <th className="border border-border px-2 py-1 text-left font-semibold">Observation / Recommendation</th>
                      <th className="w-28 border border-border px-2 py-1 text-center font-semibold">Code</th>
                      <th className="w-16 border border-border px-2 py-1 text-center font-semibold">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.map((obs, idx) => (
                      <tr key={obs.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-border px-2 py-1 text-center font-medium text-slate-600">{idx + 1}</td>
                        <td className="border border-border p-0 align-top">
                          <Textarea
                            rows={2}
                            value={obs.description}
                            onChange={e => updateObservation(obs.id, 'description', e.target.value)}
                            placeholder="Inspection Schedule Item X: ..."
                            className="min-h-[3.5rem] rounded-none border-0 bg-transparent px-2 py-1.5 text-xs shadow-none focus-visible:ring-0"
                          />
                        </td>
                        <td className="border border-border p-0 align-top">
                          <Select
                            value={obs.code}
                            onValueChange={v => updateObservation(obs.id, 'code', v)}
                          >
                            <SelectTrigger className="h-10 rounded-none border-0 bg-transparent text-xs shadow-none focus:ring-0 focus:ring-offset-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="C1">C1 – Danger Present</SelectItem>
                              <SelectItem value="C2">C2 – Potentially Dangerous</SelectItem>
                              <SelectItem value="C3">C3 – Improvement Recommended</SelectItem>
                              <SelectItem value="FI">FI – Further Investigation</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="border border-border p-0 text-center align-middle">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-10 w-full rounded-none p-0 text-red-600"
                            onClick={() => removeObservation(obs.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-3">
            {/* ── Section 8: General Condition ── */}
            <Card className={EDITOR_CARD_CLASS}>
              <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>General Condition of the Installation</CardTitle></CardHeader>
              <CardContent className={cn(EDITOR_CONTENT_CLASS, EDITOR_SECTION_BODY_CLASS)}>
                <CertificateGroup title="Summary of the General Condition" columns={1}>
                  <div className="space-y-2">
                    <Label htmlFor="generalCondition">General Condition</Label>
                    <Select
                      value="__custom"
                      onValueChange={(value) => {
                        if (value !== '__custom') {
                          setFieldValue('generalCondition', value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Choose a preset general condition (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__custom">Custom / manual entry</SelectItem>
                        {GENERAL_CONDITION_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      id="generalCondition"
                      name="generalCondition"
                      rows={3}
                      className="min-h-[5rem]"
                      placeholder="Adequate as per BS 7671 (2018)"
                    />
                  </div>
                </CertificateGroup>
              </CardContent>
            </Card>

            {/* ── Section 9: Declaration ── */}
            <Card className={EDITOR_CARD_CLASS}>
              <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Declaration for the Inspection, Testing and Assessment</CardTitle></CardHeader>
              <CardContent className={cn(EDITOR_CONTENT_CLASS, EDITOR_SECTION_BODY_CLASS)}>
                <CertificateGroup title="Contracting Enterprise Responsible for the Report" columns={2}>
                  <div className="space-y-2">
                    <Label htmlFor="tradingTitle">Trading Title</Label>
                    <Input
                      id="tradingTitle"
                      name="tradingTitle"
                      placeholder="Contracting business name"
                      onChange={() => {
                        if (!hasExistingProfileDefaults) {
                          setShowSaveProfilePrompt(true);
                          setProfileDefaultsSaveMessage('');
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      name="registrationNumber"
                      placeholder="Registration number"
                      onChange={() => {
                        if (!hasExistingProfileDefaults) {
                          setShowSaveProfilePrompt(true);
                          setProfileDefaultsSaveMessage('');
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyAddress">Company Address</Label>
                    <Input
                      id="companyAddress"
                      name="companyAddress"
                      placeholder="Business address"
                      onChange={() => {
                        if (!hasExistingProfileDefaults) {
                          setShowSaveProfilePrompt(true);
                          setProfileDefaultsSaveMessage('');
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyTelephone">Telephone Number</Label>
                    <Input
                      id="companyTelephone"
                      name="companyTelephone"
                      placeholder="Business telephone number"
                      onChange={() => {
                        if (!hasExistingProfileDefaults) {
                          setShowSaveProfilePrompt(true);
                          setProfileDefaultsSaveMessage('');
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <Input
                      id="companyEmail"
                      name="companyEmail"
                      type="email"
                      placeholder="business@example.co.uk"
                      onChange={() => {
                        if (!hasExistingProfileDefaults) {
                          setShowSaveProfilePrompt(true);
                          setProfileDefaultsSaveMessage('');
                        }
                      }}
                    />
                  </div>
                  {!hasExistingProfileDefaults && showSaveProfilePrompt ? (
                    <div className="space-y-2 md:col-span-2">
                      <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <p className="text-xs text-amber-900">
                            Save these business details to your profile so Section 9 is prefilled next time.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-amber-300 bg-white text-[11px] text-amber-900 hover:bg-amber-100"
                            onClick={saveProfileDefaultsToUser}
                            disabled={isSavingProfileDefaults}
                          >
                            {isSavingProfileDefaults ? 'Saving…' : 'Save to profile'}
                          </Button>
                        </div>
                        {profileDefaultsSaveMessage ? (
                          <p className="mt-2 text-[11px] text-amber-800">{profileDefaultsSaveMessage}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : profileDefaultsSaveMessage ? (
                    <div className="space-y-2 md:col-span-2">
                      <p className="text-[11px] text-emerald-700">{profileDefaultsSaveMessage}</p>
                    </div>
                  ) : null}
                </CertificateGroup>
                <CertificateGroup title="Person Responsible for the Inspection and Testing" columns={2}>
                  <div className="space-y-2">
                    <Label htmlFor="inspectorName">Inspector Name *</Label>
                    <Input
                      id="inspectorName"
                      name="inspectorName"
                      required
                      placeholder="Inspector name"
                      list="eicr-inspector-name-history"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                    />
                    <datalist id="eicr-inspector-name-history">
                      {(currentUser?.eicrInspectorHistory ?? []).map((item, index) => (
                        <option key={`inspector-name-${index}`} value={item.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspectorPosition">Position / Role</Label>
                    <Input
                      id="inspectorPosition"
                      name="inspectorPosition"
                      placeholder="Qualified Supervisor"
                      list="eicr-inspector-position-history"
                      value={inspectorPosition}
                      onChange={(e) => setInspectorPosition(e.target.value)}
                    />
                    <datalist id="eicr-inspector-position-history">
                      {(currentUser?.eicrInspectorHistory ?? []).map((item, index) => (
                        <option key={`inspector-position-${index}`} value={item.position} />
                      ))}
                    </datalist>
                    {(currentUser?.eicrInspectorHistory?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {(currentUser?.eicrInspectorHistory ?? []).map((item, index) => (
                          <button
                            key={`inspector-history-chip-${index}`}
                            type="button"
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                              setInspectorName(item.name);
                              setInspectorPosition(item.position);
                            }}
                            title="Reuse previous inspector details"
                          >
                            {item.name} — {item.position}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </CertificateGroup>
              </CardContent>
            </Card>

            {/* ── Section 10: Test Instruments ── */}
            <Card className={EDITOR_CARD_CLASS}>
              <CardHeader className={EDITOR_HEADER_CLASS}>
                <CardTitle>Details of Test Instruments Used</CardTitle>
              </CardHeader>
              <CardContent className={cn(EDITOR_CONTENT_CLASS, EDITOR_SECTION_BODY_CLASS)}>
                <CertificateGroup title="Instruments Used for this Report" columns={2}>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentMultiFunction">Multi-functional</Label>
                    <Input
                      id="instrumentMultiFunction"
                      name="instrumentMultiFunction"
                      placeholder="Serial/asset"
                      value={instrumentMultiFunction}
                      onChange={(e) => setInstrumentMultiFunction(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentInsulationResistance">Insulation Resistance Instrument</Label>
                    <Input
                      id="instrumentInsulationResistance"
                      name="instrumentInsulationResistance"
                      placeholder="Serial/asset"
                      disabled={hasMultiFunctionInstrument}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentEarthLoop">Earth Fault Loop Impedance Instrument</Label>
                    <Input
                      id="instrumentEarthLoop"
                      name="instrumentEarthLoop"
                      placeholder="Serial/asset"
                      disabled={hasMultiFunctionInstrument}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentContinuity">Continuity Instrument</Label>
                    <Input
                      id="instrumentContinuity"
                      name="instrumentContinuity"
                      placeholder="Serial/asset"
                      disabled={hasMultiFunctionInstrument}
                    />
                  </div>
                </CertificateGroup>
                <CertificateGroup title="Additional Instruments" columns={2}>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentEarthElectrode">Earth Electrode Resistance Instrument</Label>
                    <Input id="instrumentEarthElectrode" name="instrumentEarthElectrode" placeholder="Serial/asset" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentRCD">RCD Instrument</Label>
                    <Input
                      id="instrumentRCD"
                      name="instrumentRCD"
                      placeholder="Serial/asset"
                      disabled={hasMultiFunctionInstrument}
                    />
                  </div>
                </CertificateGroup>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {/* ── Section 11: Supply Characteristics ── */}
            <Card className={EDITOR_CARD_CLASS}>
              <CardHeader className={EDITOR_HEADER_CLASS}>
                <CardTitle>Supply Characteristics and Earthing Arrangements at the Origin</CardTitle>
              </CardHeader>
              <CardContent className={cn(EDITOR_CONTENT_CLASS, EDITOR_SECTION_BODY_CLASS)}>
                <CertificateGroup title="Supply Arrangement at the Origin" columns={3}>
                  <div className="space-y-2">
                    <Label htmlFor="earthingArrangements">Earthing Arrangement</Label>
                    <Select name="earthingArrangements" value={earthingArrangement} onValueChange={setEarthingArrangement}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TN-S">TN-S</SelectItem>
                        <SelectItem value="TN-C-S">TN-C-S (PME)</SelectItem>
                        <SelectItem value="TNC">TNC</SelectItem>
                        <SelectItem value="TT">TT</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="natureOfSupply">Nature of Supply</Label>
                    <Select name="natureOfSupply" value={natureOfSupply} onValueChange={setNatureOfSupply}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-phase (2 wire) ac">1-phase (2 wire) ac</SelectItem>
                        <SelectItem value="1-phase (3 wire) ac">1-phase (3 wire) ac</SelectItem>
                        <SelectItem value="2-phase (3 wire) ac">2-phase (3 wire) ac</SelectItem>
                        <SelectItem value="3-phase (3 wire) ac">3-phase (3 wire) ac</SelectItem>
                        <SelectItem value="3-phase (4 wire) ac">3-phase (4 wire) ac</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numberOfSupplies">Number of Supplies</Label>
                    <Input id="numberOfSupplies" name="numberOfSupplies" placeholder="1" />
                  </div>
                </CertificateGroup>
                 <CertificateGroup title="Declared Supply Parameters" columns={3}>
                   <div className="space-y-2">
                     <Label htmlFor="nominalVoltageU">Nominal Voltage U (V)</Label>
                     <Input
                       id="nominalVoltageU"
                       name="nominalVoltageU"
                       defaultValue={DECLARED_SUPPLY_PARAMETER_PRESETS[premisesType as keyof typeof DECLARED_SUPPLY_PARAMETER_PRESETS]?.nominalVoltageU ?? DECLARED_SUPPLY_PARAMETER_PRESETS.Other.nominalVoltageU}
                       placeholder="400"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="nominalVoltageUo">Nominal Voltage Uo (V)</Label>
                     <Input
                       id="nominalVoltageUo"
                       name="nominalVoltageUo"
                       defaultValue={DECLARED_SUPPLY_PARAMETER_PRESETS[premisesType as keyof typeof DECLARED_SUPPLY_PARAMETER_PRESETS]?.nominalVoltageUo ?? DECLARED_SUPPLY_PARAMETER_PRESETS.Other.nominalVoltageUo}
                       placeholder="230"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="nominalFrequency">Nominal Frequency (Hz)</Label>
                     <Input
                       id="nominalFrequency"
                       name="nominalFrequency"
                       defaultValue={DECLARED_SUPPLY_PARAMETER_PRESETS[premisesType as keyof typeof DECLARED_SUPPLY_PARAMETER_PRESETS]?.nominalFrequency ?? DECLARED_SUPPLY_PARAMETER_PRESETS.Other.nominalFrequency}
                       placeholder="50"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="prospectiveFaultCurrent">Prospective Fault Current, Ipf (kA)</Label>
                     <Input id="prospectiveFaultCurrent" name="prospectiveFaultCurrent" placeholder="1.8" />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="externalEarthFaultLoopImpedance">External Earth Fault Loop Impedance, Ze (Ω)</Label>
                     <Input
                       id="externalEarthFaultLoopImpedance"
                       name="externalEarthFaultLoopImpedance"
                       placeholder="0.13"
                       value={externalEarthFaultLoopImpedance}
                       onChange={(e) => setExternalEarthFaultLoopImpedance(e.target.value)}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="shortCircuitCapacity">Short-Circuit Capacity (kA)</Label>
                     <Input id="shortCircuitCapacity" name="shortCircuitCapacity" placeholder="33" />
                   </div>
                 </CertificateGroup>
                <CertificateGroup title="Distributor's Protective Device" columns={2}>
                  <div className="space-y-2">
                    <Label htmlFor="supplyProtectiveDeviceType">Supply Protective Device Type (BS EN)</Label>
                    <Select name="supplyProtectiveDeviceType" defaultValue="BS 1361 Type IIb cartridge fuse">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUPPLY_PROTECTIVE_DEVICE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplyProtectiveDeviceRating">Supply Protective Device Rating (A)</Label>
                    <Input id="supplyProtectiveDeviceRating" name="supplyProtectiveDeviceRating" placeholder="100" />
                  </div>
                </CertificateGroup>
              </CardContent>
            </Card>

            {/* ── Section 12: Particulars of Installation ── */}
            <Card className={EDITOR_CARD_CLASS}>
              <CardHeader className={EDITOR_HEADER_CLASS}>
                <CardTitle>Particulars of Installation Referred to in this Report</CardTitle>
              </CardHeader>
              <CardContent className={cn(EDITOR_CONTENT_CLASS, EDITOR_SECTION_BODY_CLASS)}>
                <div className="grid gap-3 xl:grid-cols-2">
                  <CertificateGroup title="Means of Earthing" columns={1}>
                    <div className="space-y-2">
                      <Label htmlFor="meansOfEarthing">Means of Earthing</Label>
                      <Select name="meansOfEarthing" value={meansOfEarthing} onValueChange={setMeansOfEarthing}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Distributor's facility">Distributor's facility</SelectItem>
                          <SelectItem value="Installation earth electrode">Installation earth electrode</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="earthElectrodeMeasurementMethod">Earth Electrode Measurement Method</Label>
                      <Select name="earthElectrodeMeasurementMethod" defaultValue="N/A">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EARTH_ELECTRODE_MEASUREMENT_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CertificateGroup>
                  <CertificateGroup title="Protective Measures and Demand" columns={1}>
                    <div className="space-y-2">
                      <Label htmlFor="protectiveMeasures">Protective Measure(s) Against Electric Shock</Label>
                      <Select name="protectiveMeasures" defaultValue="ADS">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROTECTIVE_MEASURE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maximumDemand">Maximum Demand (Load)</Label>
                      <Input id="maximumDemand" name="maximumDemand" placeholder="100 Amps" />
                    </div>
                  </CertificateGroup>
                </div>
              </CardContent>
            </Card>

            {/* ── Section 12: Detailed Particulars of Installation ── */}
            <Card className={EDITOR_CARD_CLASS}>
              <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Particulars of Installation Referred to in this Report (continued)</CardTitle></CardHeader>
              <CardContent className={cn(EDITOR_CONTENT_CLASS, EDITOR_SECTION_BODY_CLASS)}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <CertificateGroup title="Origin Verification and Supply Conductors" columns={1} className="h-fit">
                    <div className="space-y-2">
                      <Label htmlFor="supplyPolarityConfirmed">Supply Polarity Confirmed</Label>
                      <Select name="supplyPolarityConfirmed" defaultValue="Yes">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplyProtectiveDeviceStandard">Supply Protective Device Standard</Label>
                      <Select name="supplyProtectiveDeviceStandard" defaultValue="BS 1361 Type IIb">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SUPPLY_PROTECTIVE_DEVICE_STANDARDS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplyConductorMaterial">Supply Conductor Material</Label>
                      <Select name="supplyConductorMaterial" defaultValue="Copper">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDUCTOR_MATERIAL_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplyConductorCSA">Supply Conductor CSA (mm²)</Label>
                      <Input
                        id="supplyConductorCSA"
                        name="supplyConductorCSA"
                        placeholder="25"
                        value={supplyConductorCSA}
                        onChange={(e) => setSupplyConductorCSA(e.target.value)}
                      />
                    </div>
                  </CertificateGroup>
                  <CertificateGroup title="Earth Electrode Details" columns={1} className="h-fit">
                    <div className="space-y-2">
                      <Label htmlFor="earthElectrodeType">Earth Electrode Type</Label>
                      <Select name="earthElectrodeType" defaultValue="N/A">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EARTH_ELECTRODE_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="earthElectrodeResistance">Earth Electrode Resistance (ohms)</Label>
                      <Input id="earthElectrodeResistance" name="earthElectrodeResistance" placeholder="N/A" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="earthElectrodeLocation">Earth Electrode Location</Label>
                      <Input id="earthElectrodeLocation" name="earthElectrodeLocation" placeholder="N/A" />
                    </div>
                  </CertificateGroup>
                  <CertificateGroup title="Main Switch" columns={2} className="h-fit">
                    <div className="space-y-2">
                      <Label htmlFor="mainSwitchType">Main Switch Type / BS(EN)</Label>
                      <Select name="mainSwitchType" defaultValue="Isolator">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MAIN_SWITCH_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mainSwitchPoles">Main Switch Number of Poles</Label>
                      <Select name="mainSwitchPoles" defaultValue="2">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MAIN_SWITCH_POLE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mainSwitchCurrentRating">Main Switch Current Rating (A)</Label>
                      <Input id="mainSwitchCurrentRating" name="mainSwitchCurrentRating" placeholder="100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mainSwitchFuseRating">Main Switch Fuse/Device Rating (A)</Label>
                      <Input id="mainSwitchFuseRating" name="mainSwitchFuseRating" placeholder="100" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="mainSwitchVoltageRating">Main Switch Voltage Rating (V)</Label>
                      <Input id="mainSwitchVoltageRating" name="mainSwitchVoltageRating" placeholder="240" />
                    </div>
                  </CertificateGroup>
                  <CertificateGroup title="RCD Main Switch Details" columns={1} className="h-fit">
                    <div className="space-y-2">
                      <Label htmlFor="rcdRatedResidualCurrent">RCD Rated Residual Current IΔn (mA)</Label>
                      <Input id="rcdRatedResidualCurrent" name="rcdRatedResidualCurrent" placeholder="30" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rcdRatedTimeDelay">RCD Rated Time Delay (ms)</Label>
                      <Input id="rcdRatedTimeDelay" name="rcdRatedTimeDelay" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rcdMeasuredTime">RCD Measured Operating Time (ms)</Label>
                      <Input id="rcdMeasuredTime" name="rcdMeasuredTime" placeholder="N/A" />
                    </div>
                  </CertificateGroup>
                  <CertificateGroup title="Earthing Conductor" columns={1} className="h-fit">
                    <div className="space-y-2">
                      <Label htmlFor="earthingConductorMaterial">Earthing Conductor Material</Label>
                      <Select name="earthingConductorMaterial" defaultValue="Copper">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDUCTOR_MATERIAL_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="earthingConductorCSA">Earthing Conductor CSA (mm2)</Label>
                      <Input id="earthingConductorCSA" name="earthingConductorCSA" placeholder="16" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="earthingConductorVerified">Earthing Conductor Verified</Label>
                      <Select name="earthingConductorVerified" defaultValue="Yes">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CertificateGroup>
                  <CertificateGroup title="Main Protective Bonding Conductor" columns={1} className="h-fit">
                    <div className="space-y-2">
                      <Label htmlFor="mainBondingMaterial">Main Bonding Material</Label>
                      <Select name="mainBondingMaterial" defaultValue="Copper">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDUCTOR_MATERIAL_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mainBondingCSA">Main Bonding CSA (mm2)</Label>
                      <Input id="mainBondingCSA" name="mainBondingCSA" placeholder="10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mainBondingVerified">Main Bonding Verified</Label>
                      <Select name="mainBondingVerified" defaultValue="Yes">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CertificateGroup>
                  <CertificateGroup title="Bonding to Extraneous-Conductive-Parts" columns={3} className="h-fit md:col-span-2 xl:col-span-3">
                    <div className="space-y-2">
                      <Label htmlFor="bondingWater">Bonding: Water Pipes</Label>
                      <Select name="bondingWater" defaultValue="Yes">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bondingGas">Bonding: Gas Pipes</Label>
                      <Select name="bondingGas" defaultValue="Yes">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bondingOil">Bonding: Oil Pipes</Label>
                      <Select name="bondingOil" defaultValue="N/A">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bondingLightning">Bonding: Lightning Protection</Label>
                      <Select name="bondingLightning" defaultValue="N/A">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bondingSteel">Bonding: Structural Steel</Label>
                      <Select name="bondingSteel" defaultValue="N/A">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CertificateGroup>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Section 14: Inspection Schedule ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}>
            <CardTitle>Inspection Schedule — Domestic and Similar Premises (≤ 100 A)</CardTitle>
            <CardDescription>
              Click any outcome cell to cycle through codes: blank → N/A → ✓ → C1 → C2 → C3 → LIM → NV.
              Selecting C1 or C2 automatically adds an entry in Section 7.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InspectionScheduleSection
              value={inspSchedule}
              onCodeChange={handleInspCodeChange}
              onCommentChange={handleInspCommentChange}
              disabledRefs={disabledInspectionRefs}
            />
          </CardContent>
        </Card>

        {/* ── Section 16: Schedule of Circuit Details and Test Results ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Schedule of Circuit Details and Test Results</CardTitle>
                <CardDescription>
                  {streamlined
                    ? 'A streamlined circuit schedule with unnecessary continuity-detail columns removed for faster entry.'
                    : 'Complete the distribution board and circuit result entries as they will appear on the certificate schedule.'}
                </CardDescription>
              </div>
              <Button type="button" size="sm" onClick={addCircuitRow}>
                <Plus className="h-4 w-4 mr-2" />Add Circuit Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className={cn(EDITOR_CONTENT_CLASS, EDITOR_SECTION_BODY_CLASS)}>
            <div
              data-expected-values-panel="true"
              className={cn(
                'rounded-md border border-slate-300 bg-white p-3 transition-colors',
                showExpectedValues ? 'border-amber-400 bg-amber-50/70' : '',
              )}
            >
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                    Distribution Board / Consumer Unit Details
                  </h4>
                  <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
                    Top fields now follow the BS 7671 model form wording used for the board schedule.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={showExpectedValues ? 'default' : 'outline'}
                  size="sm"
                  data-expected-values-button="true"
                  onClick={() => setShowExpectedValues((prev) => !prev)}
                  className={cn('h-8 px-3 text-[11px]', showExpectedValues ? 'bg-amber-600 hover:bg-amber-700' : '')}
                >
                  {showExpectedValues ? 'Hide expected values' : 'Show expected values'}
                </Button>
              </div>

              {showExpectedValues ? (
                <div className="mb-3 rounded border border-amber-300 bg-amber-100/70 px-3 py-2 text-[11px] text-amber-900">
                  Expected-values mode is active. Form entry is temporarily locked and the form is faded to indicate review mode.
                  Hover the relevant readings in the table below to compare the actual value with an expected average and an acceptable range.
                </div>
              ) : null}

              <div className="grid gap-px bg-slate-300 md:grid-cols-3 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2">
                <div className="space-y-2">
                  <Label htmlFor="consumerUnitDesignation">Distribution board / consumer unit reference</Label>
                  <ExpectedValueInput
                    fieldKey="consumerUnitDesignation"
                    showExpectedValues={showExpectedValues}
                    id="consumerUnitDesignation"
                    name="consumerUnitDesignation"
                    placeholder="DB1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consumerUnitLocation">Location of distribution board / consumer unit</Label>
                  <ExpectedValueInput
                    fieldKey="consumerUnitLocation"
                    showExpectedValues={showExpectedValues}
                    id="consumerUnitLocation"
                    name="consumerUnitLocation"
                    defaultValue=""
                    placeholder="Location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consumerUnitPfc">Prospective fault current (kA)</Label>
                  <ExpectedValueInput
                    fieldKey="consumerUnitPfc"
                    showExpectedValues={showExpectedValues}
                    id="consumerUnitPfc"
                    name="consumerUnitPfc"
                    placeholder="1.2"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-border">
              <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/20 px-1 py-1">
                <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={insertCircuitRow}>
                  Insert Row
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={copyCircuitRow}>
                  <Copy className="mr-1 h-3 w-3" />Copy Row
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px] text-red-700"
                  onClick={deleteSelectedCircuitRow}
                  disabled={circuits.length <= 1}
                >
                  Delete Row
                </Button>
                <Select
                  value={selectedCircuitTemplate}
                  onValueChange={setSelectedCircuitTemplate}
                >
                  <SelectTrigger className="h-6 w-[13rem] rounded-none border-slate-300 bg-white px-2 text-[10px] shadow-none focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Choose circuit template…" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] max-h-64 min-w-[16rem] overflow-y-auto border-border bg-white text-slate-900 text-[10px]">
                    <SelectItem className="text-[10px]" value="__template">Choose circuit template…</SelectItem>
                    {CIRCUIT_TEMPLATES.map((template) => (
                      <SelectItem className="text-[10px]" key={template.id} value={template.id}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => {
                    if (selectedCircuitTemplate !== '__template') {
                      applyCircuitTemplate(selectedCircuitRow, selectedCircuitTemplate);
                      setSelectedCircuitTemplate('__template');
                    }
                  }}
                  disabled={selectedCircuitTemplate === '__template'}
                >
                  <ListPlus className="mr-1 h-3 w-3" />
                  Apply Template
                </Button>
                <span className="ml-auto text-[10px] text-muted-foreground">Selected row: {selectedCircuitRow + 1}</span>
              </div>
              <table className="w-full border-collapse text-[10px]">
                <thead className="bg-muted/30 text-[9px]">
                  <tr>
                    {visibleCircuitColumns.map((col, index) => {
                      const stickyColumnClass = getStickyCircuitColumnClass(col.key);

                      if (!col.group) {
                        return (
                          <th
                            key={`head-single-${col.key}`}
                            rowSpan={2}
                            title={col.title || col.label}
                            className={cn(
                              'border border-border px-0.5 py-px text-center font-semibold leading-tight whitespace-normal align-middle',
                              getCircuitColumnCellClass(col) || 'w-12',
                              stickyColumnClass,
                              stickyColumnClass && getStickyCircuitHeaderBackgroundClass(),
                            )}
                          >
                            {col.key === 'circuitNumber' ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span>No.</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNatureOfSupply(isThreePhase ? '1-phase (2 wire) ac' : '3-phase (4 wire) ac');
                                  }}
                                  className="rounded px-0.5 py-px text-[7px] font-normal leading-none bg-slate-200 hover:bg-blue-100 transition-colors"
                                  title="Toggle 1-phase / 3-phase circuit numbering"
                                >
                                  <span className={isThreePhase ? 'opacity-40' : 'font-bold'}>1φ</span>
                                  <span className="opacity-40">/</span>
                                  <span className={isThreePhase ? 'font-bold' : 'opacity-40'}>3φ</span>
                                </button>
                              </div>
                            ) : col.label}
                          </th>
                        );
                      }

                      const group = circuitHeaderGroups.find((g) => g.start === index);
                      if (!group) return null;

                      return (
                        <th
                          key={`head-group-${group.label}-${group.start}`}
                          colSpan={group.end - group.start + 1}
                          title={group.title}
                          className={cn(
                            'border border-border px-0.5 py-px text-center font-semibold leading-none',
                            STICKY_CIRCUIT_COLUMN_KEYS.includes(col.key) && getStickyCircuitColumnClass(col.key),
                            STICKY_CIRCUIT_COLUMN_KEYS.includes(col.key) && getStickyCircuitHeaderBackgroundClass(),
                          )}
                        >
                          {group.label}
                        </th>
                      );
                    })}
                    <th
                      rowSpan={2}
                      className="border border-border px-0.5 py-px text-center font-semibold leading-none align-middle"
                    >
                      Actions
                    </th>
                  </tr>
                  <tr>
                    {visibleCircuitColumns.filter((col) => Boolean(col.group)).map((col) => (
                      <th
                        key={`head-sub-${col.key}`}
                        title={col.title || col.label}
                        className={cn(
                          'border border-border px-0.5 py-px text-center font-semibold leading-tight whitespace-normal',
                          getCircuitColumnCellClass(col) || 'w-12',
                          getStickyCircuitColumnClass(col.key),
                          STICKY_CIRCUIT_COLUMN_KEYS.includes(col.key) && getStickyCircuitHeaderBackgroundClass(),
                        )}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {circuits.map((row, rowIndex) => (
                    <tr
                      key={`circuit-row-${rowIndex}`}
                      draggable
                      onDragStart={() => {
                        setDraggedCircuitRow(rowIndex);
                        setSelectedCircuitRow(rowIndex);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (dragOverCircuitRow !== rowIndex) {
                          setDragOverCircuitRow(rowIndex);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedCircuitRow !== null) {
                          moveCircuitRow(draggedCircuitRow, rowIndex);
                        }
                        setDraggedCircuitRow(null);
                        setDragOverCircuitRow(null);
                      }}
                      onDragEnd={() => {
                        setDraggedCircuitRow(null);
                        setDragOverCircuitRow(null);
                      }}
                      className={`border-t ${
                        selectedCircuitRow === rowIndex ? 'bg-blue-50/60' : ''
                      } ${
                        dragOverCircuitRow === rowIndex ? 'border-t-2 border-t-blue-500' : ''
                      } ${
                        draggedCircuitRow === rowIndex ? 'opacity-60' : ''
                      }`}
                      onClick={() => setSelectedCircuitRow(rowIndex)}
                    >
                      {visibleCircuitColumns.map((col) => {
                        const options = CIRCUIT_SELECT_OPTIONS[col.key];
                        const stickyColumnClass = getStickyCircuitColumnClass(col.key);

                        return (
                          <td
                            key={`${rowIndex}-${col.key}`}
                            className={cn(
                              'border border-border p-0 align-top',
                              getCircuitColumnCellClass(col),
                              stickyColumnClass,
                              stickyColumnClass && getStickyCircuitColumnBackgroundClass(selectedCircuitRow === rowIndex, rowIndex % 2 === 0),
                            )}
                          >
                            {col.key === 'ringFinal' ? (
                              <button
                                type="button"
                                title="Click to cycle ring final between tick and blank"
                                onClick={() =>
                                  updateCircuitField(rowIndex, col.key, row[col.key] === '✓' ? '' : '✓')
                                }
                                className={`h-6 w-full flex items-center justify-center text-[9px] font-medium leading-none cursor-pointer transition-colors ${getCircuitColumnCellClass(col) || 'w-12'} ${
                                  row[col.key] === '✓'
                                    ? 'text-green-700 hover:bg-green-50'
                                    : 'text-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {row[col.key] || '☐'}
                              </button>
                            ) : options ? (
                              <Select
                                value={row[col.key] || '__unset'}
                                onValueChange={(value) =>
                                  updateCircuitField(rowIndex, col.key, value === '__unset' ? '' : value)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    'relative h-6 rounded-none border-0 px-0 pr-[6px] text-[9px] leading-none shadow-none gap-0 justify-center text-center',
                                    '[&>span]:block [&>span]:min-w-0 [&>span]:flex-none [&>span]:truncate [&>span]:text-center [&>span]:mx-auto [&>span]:pr-0',
                                    '[&>svg]:absolute [&>svg]:right-[1px] [&>svg]:top-1/2 [&>svg]:h-[4px] [&>svg]:w-[4px] [&>svg]:-translate-y-1/2 [&>svg]:shrink-0',
                                    getCircuitColumnCellClass(col) || 'w-12',
                                  )}
                                  title={options.find((option) => option.value === row[col.key])?.title}
                                >
                                  <SelectValue placeholder="-">
                                    {row[col.key] || '-'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="z-[100] max-h-64 min-w-[10rem] overflow-y-auto border-border bg-white text-slate-900 text-[10px]">
                                  <SelectItem className="text-[10px]" value="__unset">
                                    -
                                  </SelectItem>
                                  {options.map((option) => (
                                    <SelectItem
                                      className="text-[10px]"
                                      key={option.value}
                                      value={option.value}
                                      title={option.title}
                                      textValue={option.menuLabel}
                                    >
                                      <span className="font-medium">{option.value}</span>
                                      {option.title ? <span className="text-slate-500"> — {option.title}</span> : null}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : col.key === 'designation' ? (
                              <Input
                                value={row[col.key]}
                                onChange={(e) => updateCircuitField(rowIndex, col.key, e.target.value)}
                                className={`h-6 rounded-none border-0 px-0 text-center text-[9px] leading-none shadow-none focus-visible:ring-0 ${getCircuitColumnCellClass(col) || 'w-12'}`}
                              />
                            ) : ['r1Line', 'rnNeutral', 'r2Cpc', 'r1r2', 'insResLN', 'insResLL', 'insResLE'].includes(col.key) ? (
                              <ExpectedValueInput
                                fieldKey={col.key as keyof typeof EXPECTED_VALUE_MAP}
                                showExpectedValues={showExpectedValues}
                                value={row[col.key]}
                                onChange={(e) => updateCircuitField(rowIndex, col.key, e.target.value)}
                                title={
                                  col.key === 'r2Cpc'
                                      ? getTwinAndEarthR2RatioTitle(row)
                                      : col.key === 'r1r2'
                                        ? getR1R2ValidationState(row)?.title
                                        : undefined
                                }
                                className={`h-6 rounded-none border-0 px-0 text-center text-[9px] leading-none shadow-none focus-visible:ring-0 ${getCircuitColumnCellClass(col) || 'w-12'} ${getCircuitFieldInconsistencyClass(row, col.key, externalEarthFaultLoopImpedance)}`}
                              />
                            ) : col.key === 'maxZs' ? (
                              <div className={`grid h-10 grid-cols-2 divide-x divide-border ${getCircuitColumnCellClass(col) || 'w-12'}`}>
                                <Input
                                  value={row[col.key]}
                                  onChange={(e) => updateCircuitField(rowIndex, col.key, e.target.value)}
                                  className="h-10 rounded-none border-0 px-0 text-center text-[9px] leading-none shadow-none focus-visible:ring-0"
                                  title="Maximum permitted Zs"
                                />
                                <div
                                  className="flex items-center justify-center px-0 text-center text-[8px] font-medium leading-none text-green-700"
                                  title={`Derated by installation method and wiring type (factor ${getDeratingFactorForCircuit(row).toFixed(2)})`}
                                >
                                  {getDeratedMaxZsDisplay(row) || '-'}
                                </div>
                              </div>
                            ) : col.key === 'measuredZs' ? (
                              <ExpectedValueInput
                                fieldKey="measuredZs"
                                showExpectedValues={showExpectedValues}
                                value={row[col.key]}
                                onChange={(e) => updateCircuitField(rowIndex, col.key, e.target.value)}
                                title={
                                  getMeasuredZsValidationTitle(row, externalEarthFaultLoopImpedance) ??
                                  (zsExceedsMax(row)
                                    ? `Exceeds maximum permitted Zs (${getDeratedMaxZsDisplay(row) ?? row.maxZs}) – C2 observation added to Section 7`
                                    : undefined)
                                }
                                className={`h-6 rounded-none border-0 px-0 text-center text-[9px] leading-none shadow-none focus-visible:ring-0 ${getCircuitColumnCellClass(col) || 'w-12'} ${
                                  getMeasuredZsValidation(row, externalEarthFaultLoopImpedance)
                                    ? getCircuitFieldInconsistencyClass(row, 'measuredZs', externalEarthFaultLoopImpedance)
                                    : zsExceedsMax(row) || hasCircuitInconsistency(row, externalEarthFaultLoopImpedance)
                                      ? 'bg-orange-100 text-orange-900 font-semibold'
                                      : row.measuredZs.trim() && row.r1r2.trim()
                                        ? 'bg-amber-100 text-amber-900 font-semibold'
                                        : ''
                                }`}
                              />
                            ) : col.cycling ? (
                              <button
                                type="button"
                                title={`Click to cycle: ${(col.cycling ?? []).join(' → ')}`}
                                onClick={() => {
                                  const cyclingOptions = col.cycling ?? [];
                                  const val = row[col.key] as string;
                                  const idx = cyclingOptions.indexOf(val);
                                  updateCircuitField(
                                    rowIndex,
                                    col.key,
                                    cyclingOptions[(idx + 1) % cyclingOptions.length] ?? cyclingOptions[0] ?? '',
                                  );
                                }}
                                className={`h-6 w-full flex items-center justify-center text-[9px] font-medium leading-none cursor-pointer transition-colors ${getCircuitColumnCellClass(col) || 'w-12'} ${
                                  (row[col.key] as string) === '✓'
                                    ? 'text-green-700 hover:bg-green-50'
                                    : (row[col.key] as string) === '✗'
                                      ? 'text-red-600 hover:bg-red-50'
                                      : (row[col.key] as string) === 'N/A'
                                        ? 'text-slate-400 hover:bg-slate-50'
                                        : (row[col.key] as string)
                                          ? 'text-slate-700 hover:bg-slate-50'
                                          : 'text-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {(row[col.key] as string) || '-'}
                              </button>
                            ) : (
                              <Input
                                value={row[col.key]}
                                onChange={(e) => updateCircuitField(rowIndex, col.key, e.target.value)}
                                className={`h-6 rounded-none border-0 px-0 text-center text-[9px] leading-none shadow-none focus-visible:ring-0 ${getCircuitColumnCellClass(col) || 'w-12'}`}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-border p-0.5 align-top">
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) => {
                              event.stopPropagation();
                              setDraggedCircuitRow(rowIndex);
                              setSelectedCircuitRow(rowIndex);
                            }}
                            onDragEnd={() => {
                              setDraggedCircuitRow(null);
                              setDragOverCircuitRow(null);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            title="Drag to reorder row"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-600"
                            onClick={() => removeCircuitRow(rowIndex)}
                            disabled={circuits.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Spell check banner ── */}
        {spellCheckActive && (
          <div className="flex items-center justify-between rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <SpellCheck className="h-4 w-4 shrink-0" />
              <span>Spell check active — misspellings are underlined in text fields. Tab through fields to review.</span>
            </div>
            <button type="button" aria-label="Dismiss spell check" onClick={() => setSpellCheckActive(false)} className="ml-3 shrink-0 text-blue-600 hover:text-blue-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Verify results panel ── */}
        {verifyResults && (
          <div className="rounded border border-slate-300 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Verification Results</span>
              <button type="button" aria-label="Dismiss results" onClick={() => setVerifyResults(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {verifyResults.map((r, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  {r.type === 'error' && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                  {r.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                  {r.type === 'pass' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />}
                  <span className={r.type === 'error' ? 'text-red-700' : r.type === 'warning' ? 'text-amber-700' : 'text-slate-600'}>
                    {r.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Pre-submit actions ── */}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleVerify} className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Verify
          </Button>
          <Button type="button" variant="outline" onClick={handleSpellCheck} className="flex items-center gap-2">
            <SpellCheck className="h-4 w-4" />
            Spell Check
          </Button>
        </div>

        {/* ── Submit ── */}
        <div className="flex gap-4 pb-8">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Creating EICR...' : 'Create EICR Certificate'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/certificates">Cancel</Link>
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}

export default function Page() {
  return <EICRCertificatePage />;
}

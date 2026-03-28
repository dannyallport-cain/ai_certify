'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCertificate } from '../../../actions';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { CertificateNumberField } from '@/components/CertificateNumberField';
import { DateDropdownField } from '@/components/DateDropdownField';
import { NextVisitField } from '@/components/NextVisitField';
import { AddressAutocompleteField } from '@/components/AddressAutocompleteField';
import { getSignInRedirectPath, isSessionExpiredError } from '@/lib/auth/errors';
import { OrganisationAutocompleteField } from '@/components/OrganisationAutocompleteField';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Trash2, ShieldCheck, SpellCheck, CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { isAdminRole } from '@/lib/auth/roles';
import { calculateMaxZs } from '@/lib/utils/calculate-zs';
import { cn } from '@/lib/utils';
import {
  InspectionScheduleSection,
  type InspCode,
  type InspScheduleValue,
  SCHEDULE_GROUPS,
} from '@/components/InspectionScheduleSection';

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

const SUPPLY_PROTECTIVE_DEVICE_TYPE_OPTIONS = ['Fuse', 'MCB', 'MCCB', 'RCBO', 'RCD', 'Switch-fuse', 'Other'] as const;
const SUPPLY_PROTECTIVE_DEVICE_STANDARDS = ['BS 1361', 'BS 88', 'BS EN 60898', 'BS EN 61009', 'BS EN 60947-2', 'Other'] as const;
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
const EDITOR_CONTENT_CLASS = 'p-0 [&_label]:text-[10px] [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-[0.05em] [&_label]:text-slate-700 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:h-8 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:rounded-none [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:border-slate-300 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:bg-white [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:px-2 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:text-xs [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:shadow-none [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:focus-visible:ring-1 [&_input:not([type=radio]):not([type=checkbox]):not([type=hidden])]:focus-visible:ring-[#c8102e]/20 [&_[data-slot=textarea]]:rounded-none [&_[data-slot=textarea]]:border-slate-300 [&_[data-slot=textarea]]:bg-white [&_[data-slot=textarea]]:px-2 [&_[data-slot=textarea]]:py-1.5 [&_[data-slot=textarea]]:text-xs [&_[data-slot=textarea]]:leading-4 [&_[data-slot=textarea]]:shadow-none [&_[data-slot=textarea]]:focus-visible:ring-1 [&_[data-slot=textarea]]:focus-visible:ring-[#c8102e]/20 [&_[role=combobox]]:h-8 [&_[role=combobox]]:rounded-none [&_[role=combobox]]:border-slate-300 [&_[role=combobox]]:bg-white [&_[role=combobox]]:px-2 [&_[role=combobox]]:text-xs [&_[role=combobox]]:shadow-none [&_[role=combobox]]:focus:ring-1 [&_[role=combobox]]:focus:ring-[#c8102e]/20 [&_[role=combobox]]:focus:ring-offset-0';
const EDITOR_GRID_TWO_CLASS = 'grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-2 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2.5';
const EDITOR_GRID_THREE_CLASS = 'grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-3 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2.5';
const EDITOR_PANEL_GRID_CLASS = 'grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-3 xl:grid-cols-4 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2.5';
const EDITOR_NATIVE_INPUT_CLASS = 'flex h-8 w-full rounded-none border border-slate-300 bg-white px-2 text-xs shadow-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-[#c8102e]/20';
const EDITOR_STACK_CLASS = 'space-y-px border-t border-border bg-border [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2.5';
const EDITOR_FORM_SHEET_CLASS = 'w-full space-y-3 border border-slate-300 bg-[#f7f3ed] p-2 md:p-3';
const EDITOR_SECTION_BODY_CLASS = 'space-y-3 p-3';

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
  group?: string;
  groupTitle?: string;
  cycling?: readonly string[];
};

const CIRCUIT_COLUMNS: CircuitColumn[] = [
  { key: 'circuitNumber', label: 'No.', title: 'Circuit number', widthClass: 'w-[3.2rem]' },
  { key: 'designation', label: 'Designation', title: 'Circuit designation', widthClass: 'w-[7rem]' },
  { key: 'wiringType', label: 'Wiring', title: 'Type of wiring code', widthClass: 'w-[4.2rem]' },
  { key: 'refMethod', label: 'Ref.', title: 'Reference method', widthClass: 'w-[4rem]' },
  { key: 'numPoints', label: 'Pts', title: 'Number of points', widthClass: 'w-[3rem]' },
  { key: 'liveCsa', label: 'Live', title: 'Live conductor CSA (mm2)', widthClass: 'w-[3rem]', group: 'Conductors', groupTitle: 'Circuit conductors: CSA' },
  { key: 'cpcCsa', label: 'cpc', title: 'cpc CSA (mm2)', widthClass: 'w-[3rem]', group: 'Conductors', groupTitle: 'Circuit conductors: CSA' },
  { key: 'maxDiscTime', label: 'Max s', title: 'Maximum disconnection time (s)', widthClass: 'w-[3.2rem]' },
  { key: 'bsen', label: 'BS(EN)', title: 'BS(EN)', widthClass: 'w-[7rem]', group: 'OCPD', groupTitle: 'Overcurrent protective devices' },
  { key: 'deviceType', label: 'Type', title: 'Protective device type', widthClass: 'w-[5rem]', group: 'OCPD', groupTitle: 'Overcurrent protective devices' },
  { key: 'rating', label: 'A', title: 'Rating (A)', widthClass: 'w-[4.3rem]', group: 'OCPD', groupTitle: 'Overcurrent protective devices' },
  { key: 'capacity', label: 'kA', title: 'Capacity (kA)', widthClass: 'w-[4.3rem]', group: 'OCPD', groupTitle: 'Overcurrent protective devices' },
  { key: 'rcdRating', label: 'IΔn', title: 'RCD IΔn (mA)', widthClass: 'w-[4.2rem]', group: 'RCD', groupTitle: 'Residual current devices' },
  { key: 'maxZs', label: 'Max Zs', title: 'Maximum permitted Zs (Ω)', widthClass: 'w-[6.2rem]' },
  { key: 'r1Line', label: 'r1', title: 'r1 (Line)', widthClass: 'w-[3rem]', group: 'Ring final', groupTitle: 'Ring final circuits only' },
  { key: 'rnNeutral', label: 'rn', title: 'rn (Neutral)', widthClass: 'w-[3.2rem]', group: 'Ring final', groupTitle: 'Ring final circuits only' },
  { key: 'r2Cpc', label: 'r2', title: 'r2 (cpc)', widthClass: 'w-[3rem]', group: 'Ring final', groupTitle: 'Ring final circuits only' },
  { key: 'r1r2', label: 'R1+R2', title: 'R1+R2 (Ω)', widthClass: 'w-[3.4rem]', group: 'Impedance', groupTitle: 'Circuit impedances: all circuits' },
  { key: 'r2', label: 'R2', title: 'R2 (Ω)', widthClass: 'w-[3rem]', group: 'Impedance', groupTitle: 'Circuit impedances: all circuits' },
  { key: 'insResLL', label: 'L-L', title: 'Live-Live (MΩ)', widthClass: 'w-[3.3rem]', group: 'Insulation', groupTitle: 'Insulation resistance' },
  { key: 'insResLE', label: 'L-E', title: 'Live-Earth (MΩ)', widthClass: 'w-[3.3rem]', group: 'Insulation', groupTitle: 'Insulation resistance' },
  { key: 'testVoltage', label: 'V', title: 'Test voltage (V)', widthClass: 'w-[3.4rem]', group: 'Insulation', groupTitle: 'Insulation resistance', cycling: ['250', '500', '1000'] as const },
  { key: 'polarity', label: 'Pol.', title: 'Polarity', widthClass: 'w-[4rem]', cycling: ['✓', '✗', 'N/A'] as const },
  { key: 'measuredZs', label: 'Zs', title: 'Measured Zs (Ω)', widthClass: 'w-[3.3rem]' },
  { key: 'discTime', label: 'ms', title: 'Disconnection time (ms)', widthClass: 'w-[3.2rem]', group: 'RCD', groupTitle: 'Residual current devices' },
  { key: 'rcdTestButton', label: 'Btn', title: 'RCD test button', widthClass: 'w-[4rem]', group: 'RCD', groupTitle: 'Residual current devices', cycling: ['✓', '✗', 'N/A'] as const },
  { key: 'afddTestButton', label: 'Btn', title: 'AFDD test button', widthClass: 'w-[4rem]', group: 'AFDD', groupTitle: 'Arc fault detection devices', cycling: ['✓', '✗', 'N/A'] as const },
];

const CIRCUIT_HEADER_GROUPS = CIRCUIT_COLUMNS.reduce<Array<{ label: string; title: string; start: number; end: number }>>((acc, col, index) => {
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

const asSimpleOptions = (values: readonly string[]): readonly CircuitSelectOption[] =>
  values.map((value) => ({ value, menuLabel: value }));

const CIRCUIT_SELECT_OPTIONS: Partial<Record<keyof CircuitRow, readonly CircuitSelectOption[]>> = {
  wiringType: [
    { value: 'A', menuLabel: 'A', title: 'Thermoplastic insulated/sheathed cables' },
    { value: 'B', menuLabel: 'B', title: 'Thermoplastic cables in metallic conduit' },
    { value: 'C', menuLabel: 'C', title: 'Thermoplastic cables in nonmetallic conduit' },
    { value: 'D', menuLabel: 'D', title: 'Thermoplastic cables in metallic trunking' },
    { value: 'E', menuLabel: 'E', title: 'Thermoplastic cables in nonmetallic trunking' },
    { value: 'F', menuLabel: 'F', title: 'Thermoplastic/SWA cables' },
    { value: 'G', menuLabel: 'G', title: 'Thermosetting/SWA cables' },
    { value: 'H', menuLabel: 'H', title: 'Mineral insulated cables' },
    { value: 'O', menuLabel: 'O', title: 'Other' },
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
  bsen: asSimpleOptions(['BS EN 60898', 'BS EN 61009', 'BS EN 60947-2', 'BS EN 88', 'BS 1361', 'Other']),
  deviceType: asSimpleOptions(['B', 'C', 'D', 'Type 1', 'Type 2', 'Type 3', 'Other']),
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
  if (!standard || !row.deviceType.trim() || !row.rating.trim()) {
    return null;
  }

  // BS EN 60898 / 61009 / 60947-2 use B/C/D trip-curve device letters.
  if (standard.includes('60898') || standard.includes('61009') || standard.includes('60947-2')) {
    return row.deviceType.trim();
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

function createEmptyCircuitRow(index: number): CircuitRow {
  return {
    circuitNumber: String(index + 1),
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

export default function EICRCertificatePage() {
  const router = useRouter();
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
  const [overallAssessment, setOverallAssessment] = useState('SATISFACTORY');
  const [earthingArrangement, setEarthingArrangement] = useState('TN-C-S');
  const [meansOfEarthing, setMeansOfEarthing] = useState("Distributor's facility");
  const [supplyConductorCSA, setSupplyConductorCSA] = useState('25');
  const [supplyConductorCSACustom, setSupplyConductorCSACustom] = useState('');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [evidenceOfAdditions, setEvidenceOfAdditions] = useState('No');
  const [inspSchedule, setInspSchedule] = useState<InspScheduleValue>({
    codes: {},
    comments: {},
  });
  const [circuits, setCircuits] = useState<CircuitRow[]>(
    Array.from({ length: DEFAULT_CIRCUIT_ROW_COUNT }, (_, index) => createEmptyCircuitRow(index)),
  );
  const [selectedCircuitRow, setSelectedCircuitRow] = useState<number>(0);
  const [natureOfSupply, setNatureOfSupply] = useState('1-phase (2 wire) ac');
  const isThreePhase = natureOfSupply.startsWith('3-phase');
  const [extentQuickOption, setExtentQuickOption] = useState('__custom');
  const [limitationsQuickOption, setLimitationsQuickOption] = useState('__custom');
  const [operationalQuickOption, setOperationalQuickOption] = useState('__custom');
  const { data: currentUser } = useSWR<{ role?: string }>('/api/user', fetcher);

  type VerifyResult = { type: 'error' | 'warning' | 'pass'; message: string };
  const [verifyResults, setVerifyResults] = useState<VerifyResult[] | null>(null);
  const [spellCheckActive, setSpellCheckActive] = useState(false);

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

  const generateCertificateNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `CE${rand}`;
  };

  useEffect(() => {
    setCertificateNumber(generateCertificateNumber());
  }, []);

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
    setCircuits((prev) => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      const nextRow = { ...row, [key]: value };

      if (key === 'bsen' || key === 'deviceType' || key === 'rating') {
        const zsDeviceType = getZsDeviceTypeFromRow(nextRow);
        if (zsDeviceType) {
          const maxZsComputed = calculateMaxZs(zsDeviceType, nextRow.rating).replace(/Ω$/u, '');
          if (maxZsComputed !== 'N/A') {
            nextRow.maxZs = maxZsComputed;
          }
        }
      }

      return nextRow;
    }));

    // When a Zs-affecting field changes, sync the auto-observation for that circuit
    const ZS_AFFECTING_KEYS: Array<keyof CircuitRow> = ['measuredZs', 'maxZs', 'wiringType', 'refMethod', 'bsen', 'deviceType', 'rating'];
    if (ZS_AFFECTING_KEYS.includes(key)) {
      // Read the post-update circuit row (we need the full updated row for the comparison)
      setCircuits((prev) => {
        const row = prev[rowIndex];
        if (!row) return prev;
        const circuitId = `auto-zs-${row.circuitNumber}`;
        const label = row.designation ? `Circuit ${row.circuitNumber} (${row.designation})` : `Circuit ${row.circuitNumber}`;
        const exceeds = zsExceedsMax(row);
        setObservations((obs) => {
          const existing = obs.find((o) => o.fromCircuitZs === row.circuitNumber);
          if (exceeds && !existing) {
            const maxStr = getDeratedMaxZsDisplay(row) ?? row.maxZs;
            return [
              ...obs,
              {
                id: circuitId,
                description: `${label}: Measured Zs (${row.measuredZs}Ω) exceeds maximum permitted Zs (${maxStr}) – earth fault loop impedance too high`,
                code: 'C2',
                fromCircuitZs: row.circuitNumber,
              },
            ];
          } else if (exceeds && existing) {
            // Update description in case values changed
            const maxStr = getDeratedMaxZsDisplay(row) ?? row.maxZs;
            return obs.map((o) =>
              o.fromCircuitZs === row.circuitNumber
                ? { ...o, description: `${label}: Measured Zs (${row.measuredZs}Ω) exceeds maximum permitted Zs (${maxStr}) – earth fault loop impedance too high` }
                : o
            );
          } else if (!exceeds && existing) {
            return obs.filter((o) => o.fromCircuitZs !== row.circuitNumber);
          }
          return obs;
        });
        return prev; // circuits state is unchanged by this second setState call
      });
    }
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

  const addCircuitRow = () => {
    setCircuits((prev) => {
      setSelectedCircuitRow(prev.length);
      return normalizeCircuitRows([...prev, createEmptyCircuitRow(prev.length)], isThreePhase);
    });
  };

  const insertCircuitRow = () => {
    setCircuits((prev) => {
      const insertIndex = Math.max(0, Math.min(selectedCircuitRow, prev.length));
      const next = [...prev];
      next.splice(insertIndex, 0, createEmptyCircuitRow(insertIndex));
      return normalizeCircuitRows(next, isThreePhase);
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

  const canUseSampleFill = isAdminRole(currentUser?.role);

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
        deviceType: 'B',
        rating: '6',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('B', '6')),
        r1r2: '1.12',
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
        deviceType: 'B',
        rating: '6',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('B', '6')),
        r1r2: '1.05',
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
        designation: 'Ring final sockets',
        wiringType: 'A',
        refMethod: 'C',
        numPoints: '24',
        liveCsa: '2.5',
        cpcCsa: '1.5',
        maxDiscTime: '0.4',
        bsen: 'BS EN 60898',
        deviceType: 'B',
        rating: '32',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('B', '32')),
        r1Line: '0.63',
        rnNeutral: '0.61',
        r2Cpc: '1.02',
        r1r2: '0.89',
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
        deviceType: 'C',
        rating: '20',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('C', '20')),
        r1r2: '0.54',
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
        deviceType: 'C',
        rating: '20',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('C', '20')),
        r1r2: '0.49',
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
        deviceType: 'B',
        rating: '16',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('B', '16')),
        r1r2: '0.71',
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
        deviceType: 'C',
        rating: '32',
        capacity: '6',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('C', '32')),
        r1r2: '0.33',
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
        deviceType: 'C',
        rating: '25',
        capacity: '10',
        rcdRating: '30',
        maxZs: stripOhms(calculateMaxZs('C', '25')),
        r1r2: '0.28',
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
    setCircuits(sampleCircuits);
    setSelectedCircuitRow(0);

    const sampleFieldValues: Record<string, string> = {
      customerName: 'Acme Properties Ltd',
      siteName: 'Acme Distribution Centre',
      clientAddress: 'Unit 4, Riverside Industrial Estate, Manchester, M11 2AB',
      installationAddress: 'Unit 4, Riverside Industrial Estate, Manchester, M11 2AB',
      inspectionDate: inspectionDateValue,
      nextInspectionDate: nextInspectionDateValue,
      reasonForReport: 'Periodic inspection and testing in accordance with BS 7671 requirements for landlord and insurer compliance.',
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
      tradingTitle: 'Acme Electrical Services Ltd',
      companyAddress: '12 Contractor Park, Manchester, M40 8AA',
      companyTelephone: '0161 555 0101',
      inspectorName: 'J. Smith',
      inspectorPosition: 'Qualified Supervisor',
      registrationNumber: 'NICEIC 123456',
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
      supplyProtectiveDeviceType: 'Fuse',
      supplyProtectiveDeviceStandard: 'BS EN 1361',
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
      consumerUnitLocation: 'Main intake room',
      consumerUnitPfc: '2.4',
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
      }
    } catch (error) {
      console.error('Error creating certificate:', error);
      setFormError('Unable to create certificate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#e8e1d6] p-4 pt-6 md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-col gap-3 border border-slate-300 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">EICR – Electrical Installation Condition Report</h2>
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

      <form ref={formRef} onSubmit={handleSubmit} className={EDITOR_FORM_SHEET_CLASS}>
        <input type="hidden" name="certificateType" value="EICR" />
        {formError && (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

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
                <Label htmlFor="siteName">Client / Organisation *</Label>
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
                <Label htmlFor="installationAddress">Installation Address</Label>
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
                <Select name="premisesType" defaultValue="Commercial">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Domestic">Domestic</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectItem value="No disconnection of essential services or IT systems during occupied operational hours.">No disconnection of essential services</SelectItem>
                  <SelectItem value="Inspection excludes specialist control wiring and extra-low-voltage systems outside scope of this report.">Excludes specialist control/ELV systems</SelectItem>
                  <SelectItem value="No intrusive inspection works undertaken and no dismantling of fixed equipment agreed.">No intrusive inspection or dismantling</SelectItem>
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
                    <Input id="tradingTitle" name="tradingTitle" placeholder="Cain Enabled Engineering Ltd" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input id="registrationNumber" name="registrationNumber" placeholder="611716000" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyAddress">Company Address</Label>
                    <Input id="companyAddress" name="companyAddress" placeholder="Piccadilly Business Centre, Manchester, M12 6AE" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyTelephone">Telephone Number</Label>
                    <Input id="companyTelephone" name="companyTelephone" placeholder="01246 387 450" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <Input id="companyEmail" name="companyEmail" type="email" placeholder="office@example.co.uk" />
                  </div>
                </CertificateGroup>
                <CertificateGroup title="Person Responsible for the Inspection and Testing" columns={2}>
                  <div className="space-y-2">
                    <Label htmlFor="inspectorName">Inspector Name *</Label>
                    <Input id="inspectorName" name="inspectorName" required placeholder="Daniel Allport" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspectorPosition">Position / Role</Label>
                    <Input id="inspectorPosition" name="inspectorPosition" placeholder="Qualified Supervisor" />
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
                    <Input id="instrumentMultiFunction" name="instrumentMultiFunction" placeholder="Serial/asset" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentInsulationResistance">Insulation Resistance Instrument</Label>
                    <Input id="instrumentInsulationResistance" name="instrumentInsulationResistance" placeholder="Serial/asset" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentEarthLoop">Earth Fault Loop Impedance Instrument</Label>
                    <Input id="instrumentEarthLoop" name="instrumentEarthLoop" placeholder="Serial/asset" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentContinuity">Continuity Instrument</Label>
                    <Input id="instrumentContinuity" name="instrumentContinuity" placeholder="Serial/asset" />
                  </div>
                </CertificateGroup>
                <CertificateGroup title="Additional Instruments" columns={2}>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentEarthElectrode">Earth Electrode Resistance Instrument</Label>
                    <Input id="instrumentEarthElectrode" name="instrumentEarthElectrode" placeholder="Serial/asset" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instrumentRCD">RCD Instrument</Label>
                    <Input id="instrumentRCD" name="instrumentRCD" placeholder="Serial/asset" />
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
                    <Input id="nominalVoltageU" name="nominalVoltageU" placeholder="400" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nominalVoltageUo">Nominal Voltage Uo (V)</Label>
                    <Input id="nominalVoltageUo" name="nominalVoltageUo" placeholder="230" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nominalFrequency">Nominal Frequency (Hz)</Label>
                    <Input id="nominalFrequency" name="nominalFrequency" placeholder="50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prospectiveFaultCurrent">Prospective Fault Current, Ipf (kA)</Label>
                    <Input id="prospectiveFaultCurrent" name="prospectiveFaultCurrent" placeholder="1.8" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="externalEarthFaultLoopImpedance">External Earth Fault Loop Impedance, Ze (Ω)</Label>
                    <Input id="externalEarthFaultLoopImpedance" name="externalEarthFaultLoopImpedance" placeholder="0.13" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shortCircuitCapacity">Short-Circuit Capacity (kA)</Label>
                    <Input id="shortCircuitCapacity" name="shortCircuitCapacity" placeholder="33" />
                  </div>
                </CertificateGroup>
                <CertificateGroup title="Distributor's Protective Device" columns={2}>
                  <div className="space-y-2">
                    <Label htmlFor="supplyProtectiveDeviceType">Supply Protective Device Type (BS EN)</Label>
                    <Select name="supplyProtectiveDeviceType" defaultValue="Fuse">
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
                <div className="grid gap-3 xl:grid-cols-2">
                  <CertificateGroup title="Origin Verification and Supply Conductors" columns={1}>
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
                      <Select name="supplyProtectiveDeviceStandard" defaultValue="BS 1361">
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
                  <CertificateGroup title="Earth Electrode Details" columns={1}>
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
                  <CertificateGroup title="Main Switch" columns={2}>
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
                  <CertificateGroup title="RCD Main Switch Details" columns={1}>
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
                  <CertificateGroup title="Earthing Conductor" columns={1}>
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
                  <CertificateGroup title="Main Protective Bonding Conductor" columns={1}>
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
                  <CertificateGroup title="Bonding to Extraneous-Conductive-Parts" columns={3} className="xl:col-span-2">
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
            />
          </CardContent>
        </Card>

        {/* ── Section 16: Schedule of Circuit Details and Test Results ── */}
        <Card className={EDITOR_CARD_CLASS}>
          <CardHeader className={EDITOR_HEADER_CLASS}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Schedule of Circuit Details and Test Results</CardTitle>
                <CardDescription>Complete the distribution board and circuit result entries as they will appear on the certificate schedule.</CardDescription>
              </div>
              <Button type="button" size="sm" onClick={addCircuitRow}>
                <Plus className="h-4 w-4 mr-2" />Add Circuit Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className={cn(EDITOR_CONTENT_CLASS, EDITOR_SECTION_BODY_CLASS)}>
            <CertificateGroup title="Distribution Board / Consumer Unit Details" columns={3}>
              <div className="space-y-2">
                <Label htmlFor="consumerUnitDesignation">Distribution board designation</Label>
                <Input id="consumerUnitDesignation" name="consumerUnitDesignation" placeholder="D.B.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumerUnitLocation">Distribution board location</Label>
                <Input id="consumerUnitLocation" name="consumerUnitLocation" placeholder="Meter Cupboard" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumerUnitPfc">Prospective fault current (kA)</Label>
                <Input id="consumerUnitPfc" name="consumerUnitPfc" placeholder="1.8" />
              </div>
            </CertificateGroup>

            <div className="overflow-x-auto border border-border">
              <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-1 py-1">
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
                <span className="ml-auto text-[10px] text-muted-foreground">Selected row: {selectedCircuitRow + 1}</span>
              </div>
              <table className="w-full border-collapse text-[10px]">
                <thead className="bg-muted/30 text-[9px]">
                  <tr>
                    {CIRCUIT_COLUMNS.map((col, index) => {
                      if (!col.group) {
                        return (
                          <th
                            key={`head-single-${col.key}`}
                            rowSpan={2}
                            title={col.title || col.label}
                            className={`border border-border px-0.5 py-px text-center font-semibold leading-none whitespace-nowrap align-middle ${col.widthClass || 'w-12'}`}
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

                      const group = CIRCUIT_HEADER_GROUPS.find((g) => g.start === index);
                      if (!group) return null;

                      return (
                        <th
                          key={`head-group-${group.label}-${group.start}`}
                          colSpan={group.end - group.start + 1}
                          title={group.title}
                          className="border border-border px-0.5 py-px text-center font-semibold leading-none"
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
                    {CIRCUIT_COLUMNS.filter((col) => Boolean(col.group)).map((col) => (
                      <th
                        key={`head-sub-${col.key}`}
                        title={col.title || col.label}
                        className={`border border-border px-0.5 py-px text-center font-semibold leading-none whitespace-nowrap ${col.widthClass || 'w-12'}`}
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
                      className={`border-t ${selectedCircuitRow === rowIndex ? 'bg-blue-50/60' : ''}`}
                      onClick={() => setSelectedCircuitRow(rowIndex)}
                    >
                      {CIRCUIT_COLUMNS.map((col) => {
                        const options = CIRCUIT_SELECT_OPTIONS[col.key];

                        return (
                          <td key={`${rowIndex}-${col.key}`} className="border border-border p-0 align-top">
                            {options ? (
                              <Select
                                value={row[col.key] || '__unset'}
                                onValueChange={(value) => updateCircuitField(rowIndex, col.key, value === '__unset' ? '' : value)}
                              >
                                <SelectTrigger className={`h-6 rounded-none border-0 px-0.5 text-[9px] leading-none shadow-none gap-0.5 [&>svg]:h-3 [&>svg]:w-3 focus:ring-0 focus:ring-offset-0 ${col.widthClass || 'w-12'}`}>
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent
                                  position="item-aligned"
                                  className="z-[100] max-h-64 min-w-[16rem] overflow-y-auto border-border bg-white text-slate-900 text-[10px]"
                                >
                                  <SelectItem className="text-[10px]" value="__unset">-</SelectItem>
                                  {options.map((option) => (
                                    <SelectItem
                                      className="text-[10px]"
                                      key={`${col.key}-${option.value}`}
                                      value={option.value}
                                      title={option.title || option.menuLabel}
                                    >
                                      {option.menuLabel}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : col.key === 'maxZs' ? (
                              <div className={`flex h-6 items-center gap-0.5 px-0.5 ${col.widthClass || 'w-12'}`}>
                                <Input
                                  value={row[col.key]}
                                  onChange={(e) => updateCircuitField(rowIndex, col.key, e.target.value)}
                                  className="h-5 w-[2.8rem] rounded-none border-0 px-0.5 text-[9px] leading-none shadow-none focus-visible:ring-0"
                                />
                                {getDeratedMaxZsDisplay(row) && (
                                  <span
                                    className="whitespace-nowrap text-[9px] font-medium text-green-700"
                                    title={`Derated by installation method and wiring type (factor ${getDeratingFactorForCircuit(row).toFixed(2)})`}
                                  >
                                    ({getDeratedMaxZsDisplay(row)})
                                  </span>
                                )}
                              </div>
                            ) : col.key === 'measuredZs' ? (
                              <Input
                                value={row[col.key]}
                                onChange={(e) => updateCircuitField(rowIndex, col.key, e.target.value)}
                                title={zsExceedsMax(row) ? `Exceeds maximum permitted Zs (${getDeratedMaxZsDisplay(row) ?? row.maxZs}) – C2 observation added to Section 7` : undefined}
                                className={`h-6 rounded-none border-0 px-0.5 text-[9px] leading-none shadow-none focus-visible:ring-0 ${col.widthClass || 'w-12'} ${zsExceedsMax(row) ? 'bg-orange-100 text-orange-900 font-semibold' : ''}`}
                              />
                            ) : col.cycling ? (
                              <button
                                type="button"
                                title={`Click to cycle: ${col.cycling.join(' → ')}`}
                                onClick={() => {
                                  const val = row[col.key] as string;
                                  const idx = col.cycling!.indexOf(val);
                                  updateCircuitField(rowIndex, col.key, col.cycling![(idx + 1) % col.cycling!.length]);
                                }}
                                className={`h-6 w-full flex items-center justify-center text-[9px] font-medium leading-none cursor-pointer transition-colors ${col.widthClass || 'w-12'} ${
                                  (row[col.key] as string) === '\u2713' ? 'text-green-700 hover:bg-green-50' :
                                  (row[col.key] as string) === '\u2717' ? 'text-red-600 hover:bg-red-50' :
                                  (row[col.key] as string) === 'N/A' ? 'text-slate-400 hover:bg-slate-50' :
                                  (row[col.key] as string) ? 'text-slate-700 hover:bg-slate-50' :
                                  'text-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {(row[col.key] as string) || '-'}
                              </button>
                            ) : (
                              <Input
                                value={row[col.key]}
                                onChange={(e) => updateCircuitField(rowIndex, col.key, e.target.value)}
                                className={`h-6 rounded-none border-0 px-0.5 text-[9px] leading-none shadow-none focus-visible:ring-0 ${col.widthClass || 'w-12'}`}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-border p-0.5 align-top">
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

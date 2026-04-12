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
  fromInspRef?: string;
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
const EDITOR_NATIVE_INPUT_CLASS = 'flex h-8 w-full rounded-none border border-slate-300 bg-white px-2 text-xs shadow-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-[#c8102e]/20';
const EDITOR_GRID_TWO_CLASS = 'grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-2 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2.5';
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
      <div className={cn('grid gap-px bg-slate-300 [&>div]:space-y-1 [&>div]:bg-white [&>div]:p-2', CERTIFICATE_GROUP_GRID_CLASSES[columns])}>
        {children}
      </div>
    </section>
  );
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

function getZsDeviceTypeFromRow(row: Pick<CircuitRow, 'bsen' | 'deviceType' | 'rating'>): string | null {
  const standard = row.bsen.trim().toUpperCase();
  if (!standard || !row.deviceType.trim() || !row.rating.trim()) {
    return null;
  }

  if (standard.includes('60898') || standard.includes('61009') || standard.includes('60947-2')) {
    return row.deviceType.trim();
  }

  if (standard.includes('88') || standard.includes('1361')) {
    return 'BS88';
  }

  return null;
}

function getDeratedMaxZsDisplay(row: Pick<CircuitRow, 'maxZs'>): string | null {
  const maxZsNumeric = Number.parseFloat(row.maxZs.replace(/[^0-9.]+/g, ''));
  if (!Number.isFinite(maxZsNumeric) || maxZsNumeric <= 0) {
    return null;
  }
  return `${maxZsNumeric.toFixed(2)}Ω`;
}

function zsExceedsMax(row: Pick<CircuitRow, 'measuredZs' | 'maxZs'>): boolean {
  const measured = Number.parseFloat(row.measuredZs.replace(/[^0-9.]+/g, ''));
  if (!Number.isFinite(measured) || measured <= 0) return false;

  const maxAllowed = Number.parseFloat(row.maxZs.replace(/[^0-9.]+/g, ''));
  if (!Number.isFinite(maxAllowed) || maxAllowed <= 0) return false;

  return measured > maxAllowed;
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
  const [observations, setObservations] = useState<Observation[]>([]);
  const [evidenceOfAdditions, setEvidenceOfAdditions] = useState('No');
  const [inspSchedule, setInspSchedule] = useState<InspScheduleValue>({ codes: {}, comments: {} });
  const [circuits, setCircuits] = useState<CircuitRow[]>(Array.from({ length: DEFAULT_CIRCUIT_ROW_COUNT }, (_, index) => createEmptyCircuitRow(index)));
  const [selectedCircuitRow, setSelectedCircuitRow] = useState<number>(0);
  const [natureOfSupply, setNatureOfSupply] = useState('1-phase (2 wire) ac');
  const isThreePhase = natureOfSupply.startsWith('3-phase');
  const { data: currentUser } = useSWR<{ role?: string }>('/api/user', fetcher);
  const [verifyResults, setVerifyResults] = useState<Array<{ type: 'error' | 'warning' | 'pass'; message: string }> | null>(null);
  const [spellCheckActive, setSpellCheckActive] = useState(false);

  useEffect(() => {
    const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    setCertificateNumber(`CE${rand}`);
  }, []);

  const prevIsThreePhaseRef = useRef(isThreePhase);
  useEffect(() => {
    if (prevIsThreePhaseRef.current !== isThreePhase) {
      prevIsThreePhaseRef.current = isThreePhase;
      setCircuits((prev) => normalizeCircuitRows(prev, isThreePhase));
    }
  }, [isThreePhase]);

  const handleInspCodeChange = (ref: string, desc: string, newCode: InspCode, prevCode: InspCode) => {
    setInspSchedule((prev) => ({ ...prev, codes: { ...prev.codes, [ref]: newCode } }));
    const wasAlert = prevCode === 'C1' || prevCode === 'C2';
    const isAlert = newCode === 'C1' || newCode === 'C2';
    const autoId = `auto-insp-${ref}`;

    if (isAlert && !wasAlert) {
      setOverallAssessment('UNSATISFACTORY');
      setObservations((prev) => [...prev, { id: autoId, description: `Inspection Item ${ref}: ${desc}`, code: newCode as 'C1' | 'C2', fromInspRef: ref }]);
    } else if (!isAlert && wasAlert) {
      setObservations((prev) => prev.filter((o) => o.fromInspRef !== ref));
    } else if (isAlert && wasAlert && newCode !== prevCode) {
      setObservations((prev) => prev.map((o) => (o.fromInspRef === ref ? { ...o, code: newCode as 'C1' | 'C2' } : o)));
    }
  };

  const handleInspCommentChange = (ref: string, comment: string) => {
    setInspSchedule((prev) => ({ ...prev, comments: { ...prev.comments, [ref]: comment } }));
    setObservations((prev) => prev.map((o) => (o.fromInspRef === ref ? { ...o, description: comment || `Inspection Item ${ref}` } : o)));
  };

  const addObservation = () => setObservations((prev) => [...prev, { id: Date.now().toString(), description: '', code: 'C3' }]);
  const updateObservation = (id: string, field: keyof Observation, value: string) => setObservations((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  const removeObservation = (id: string) => setObservations((prev) => prev.filter((o) => o.id !== id));

  const updateCircuitField = (rowIndex: number, key: keyof CircuitRow, value: string) => {
    setCircuits((prev) => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      const nextRow = { ...row, [key]: value };
      if (key === 'bsen' || key === 'deviceType' || key === 'rating') {
        const zsDeviceType = getZsDeviceTypeFromRow(nextRow);
        if (zsDeviceType) {
          const maxZsComputed = calculateMaxZs(zsDeviceType, nextRow.rating).replace(/Ω$/u, '');
          if (maxZsComputed !== 'N/A') nextRow.maxZs = maxZsComputed;
        }
      }
      return nextRow;
    }));
  };

  const addCircuitRow = () => setCircuits((prev) => normalizeCircuitRows([...prev, createEmptyCircuitRow(prev.length)], isThreePhase));
  const removeCircuitRow = (rowIndex: number) => setCircuits((prev) => normalizeCircuitRows(prev.filter((_, idx) => idx !== rowIndex), isThreePhase));
  const nextInspectionPeriodMonths = REINSPECTION_PERIODS.find((period) => period.label === nextInspectionPeriod)?.months;
  const canUseSampleFill = isAdminRole(currentUser?.role);

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
    setVerifyResults(results);
  };

  const handleSpellCheck = () => {
    if (!formRef.current) return;
    const fields = Array.from(formRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input[type="text"], input:not([type])'));
    fields.forEach((f) => {
      f.spellcheck = true;
    });
    setSpellCheckActive(true);
    const firstFilled = fields.find((f) => f.value.trim().length > 0);
    (firstFilled ?? fields[0])?.focus();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('certificateType', 'EICR');
      const scheduleForPdf = Object.fromEntries(Array.from(new Set([...Object.keys(inspSchedule.codes), ...Object.keys(inspSchedule.comments)])).map((ref) => [ref, { outcome: inspSchedule.codes[ref] || '', comment: inspSchedule.comments[ref] || '' }]));
      const obsJson = JSON.stringify(observations.map((o) => ({
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
            <p className="text-sm text-muted-foreground">Requirements For Electrical Installations – BS 7671 IET Wiring Regulations</p>
          </div>
          <div className="flex items-center gap-2">
            {canUseSampleFill && <Button type="button" variant="secondary">Fill Form With Sample Data</Button>}
            <Button variant="outline" asChild>
              <Link href="/certificates/new">← Back to Certificate Types</Link>
            </Button>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className={EDITOR_FORM_SHEET_CLASS}>
          <input type="hidden" name="certificateType" value="EICR" />
          {formError && <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{formError}</p>}

          <Card className={EDITOR_CARD_CLASS}>
            <CardHeader className={EDITOR_HEADER_CLASS}>
              <CardTitle>Report Reference</CardTitle>
              <CardDescription>Certificate reference taken from the CE numbering series</CardDescription>
            </CardHeader>
            <CardContent className={EDITOR_CONTENT_CLASS}>
              <div className={EDITOR_GRID_TWO_CLASS}>
                <div className="space-y-2">
                  <CertificateNumberField value={certificateNumber} onChange={setCertificateNumber} certificateType="EICR" />
                  <input type="hidden" name="certificateNumber" value={certificateNumber} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer *</Label>
                  <input type="hidden" name="customerId" value={selectedCustomer} />
                  <Input id="customerName" name="customerName" required list="customers-list-eicr" placeholder="Type customer name" className={EDITOR_NATIVE_INPUT_CLASS} value={selectedCustomerName} onChange={(e) => setSelectedCustomerName(e.target.value)} />
                  <datalist id="customers-list-eicr">
                    {customers.map((c: any) => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={EDITOR_CARD_CLASS}>
            <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Details of the Person Ordering the Report</CardTitle></CardHeader>
            <CardContent className={EDITOR_CONTENT_CLASS}>
              <div className={EDITOR_GRID_TWO_CLASS}>
                <div className="space-y-2">
                  <Label htmlFor="siteName">Client / Organisation *</Label>
                  <OrganisationAutocompleteField id="siteName" name="siteName" required placeholder="Highfield Hall Community Centre" value={siteName} onChange={setSiteName} onAddressPick={(address) => setClientAddress(address)} className={cn(EDITOR_NATIVE_INPUT_CLASS, isSiteNameAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : '')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientAddress">Client Address *</Label>
                  <AddressAutocompleteField id="clientAddress" name="clientAddress" required placeholder="Marsh Lane, Farnworth, Bolton, BL4 0AW" value={clientAddress} onChange={setClientAddress} className={cn(EDITOR_NATIVE_INPUT_CLASS, isClientAddressAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : '')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={EDITOR_CARD_CLASS}>
            <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Reason for Producing This Report</CardTitle></CardHeader>
            <CardContent className={EDITOR_CONTENT_CLASS}>
              <div className={EDITOR_GRID_TWO_CLASS}>
                <div className="space-y-2">
                  <Label htmlFor="reasonForReport">Reason for Report</Label>
                  <Textarea id="reasonForReport" name="reasonForReport" rows={3} className="min-h-[4.5rem]" />
                </div>
                <div className="space-y-2">
                  <DateDropdownField id="inspectionDate" name="inspectionDate" label="Date(s) of Inspection" value={inspectionDate} onChange={(newDate) => { setInspectionDate(newDate); setIsInspectionDateAuto(false); }} required isAutoPopulated={isInspectionDateAuto} autoTitle="Auto-populated with today's date. Edit if required." autoHelpText="Auto-populated with today's date. Hover the field for details." />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={EDITOR_CARD_CLASS}>
            <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Details of the Installation</CardTitle></CardHeader>
            <CardContent className={EDITOR_CONTENT_CLASS}>
              <div className={EDITOR_GRID_TWO_CLASS}>
                <div className="space-y-2">
                  <Label htmlFor="installationAddress">Installation Address</Label>
                  <AddressAutocompleteField id="installationAddress" name="installationAddress" placeholder="Same as client address" value={installationAddress} onChange={setInstallationAddress} className={EDITOR_NATIVE_INPUT_CLASS} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="premisesType">Description of Premises</Label>
                  <Select name="premisesType" defaultValue="Commercial">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Domestic">Domestic</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Industrial">Industrial</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evidenceOfAdditions">Evidence of Additions/Alterations?</Label>
                  <Select name="evidenceOfAdditions" value={evidenceOfAdditions} onValueChange={setEvidenceOfAdditions}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={EDITOR_CARD_CLASS}>
            <CardHeader className={EDITOR_HEADER_CLASS}><CardTitle>Overall Assessment</CardTitle></CardHeader>
            <CardContent className={EDITOR_CONTENT_CLASS}>
              <div className="grid grid-cols-1 gap-px border-t border-border bg-border md:grid-cols-2 [&>label]:flex [&>label]:items-center [&>label]:justify-between [&>label]:gap-3 [&>label]:bg-white [&>label]:px-3 [&>label]:py-2.5">
                {(['SATISFACTORY', 'UNSATISFACTORY'] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <span className={`font-semibold tracking-[0.05em] ${opt === 'SATISFACTORY' ? 'text-green-700' : 'text-red-700'}`}>{opt}</span>
                    <input type="radio" name="overallAssessment" value={opt} checked={overallAssessment === opt} onChange={() => setOverallAssessment(opt)} className="h-4 w-4" />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

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
              <div className="border-t border-border bg-white px-2 py-2">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(codeLabels).map(([code, label]) => <Badge key={code} variant="outline" className={`text-[11px] ${codeColors[code]}`}>{label}</Badge>)}
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
                            <Textarea rows={2} value={obs.description} onChange={(e) => updateObservation(obs.id, 'description', e.target.value)} className="min-h-[3.5rem] rounded-none border-0 bg-transparent px-2 py-1.5 text-xs shadow-none focus-visible:ring-0" />
                          </td>
                          <td className="border border-border p-0 align-top">
                            <Select value={obs.code} onValueChange={(v) => updateObservation(obs.id, 'code', v)}>
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
                            <Button type="button" variant="ghost" size="sm" className="h-10 w-full rounded-none p-0 text-red-600" onClick={() => removeObservation(obs.id)}>
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
                      <SelectItem value="3-phase (4 wire) ac">3-phase (4 wire) ac</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              </CertificateGroup>
              <CertificateGroup title="Main Protective Bonding" columns={3}>
                <div className="space-y-2">
                  <Label htmlFor="mainBondingCSA">Main Bonding CSA (mm2)</Label>
                  <Input id="mainBondingCSA" name="mainBondingCSA" placeholder="10" />
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
                  <Label htmlFor="supplyConductorCSA">Supply Conductor CSA (mm²)</Label>
                  <Input id="supplyConductorCSA" name="supplyConductorCSA" value={supplyConductorCSA} onChange={(e) => setSupplyConductorCSA(e.target.value)} />
                </div>
              </CertificateGroup>
            </CardContent>
          </Card>

          <Card className={EDITOR_CARD_CLASS}>
            <CardHeader className={EDITOR_HEADER_CLASS}>
              <CardTitle>Inspection Schedule — Domestic and Similar Premises (≤ 100 A)</CardTitle>
              <CardDescription>Selecting C1 or C2 automatically adds an entry in Section 7.</CardDescription>
            </CardHeader>
            <CardContent>
              <InspectionScheduleSection value={inspSchedule} onCodeChange={handleInspCodeChange} onCommentChange={handleInspCommentChange} />
            </CardContent>
          </Card>

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
              <div className="space-y-2">
                {circuits.map((row, rowIndex) => (
                  <div key={rowIndex} className={`grid grid-cols-1 gap-2 border p-2 md:grid-cols-4 ${selectedCircuitRow === rowIndex ? 'bg-blue-50/60' : 'bg-white'}`} onClick={() => setSelectedCircuitRow(rowIndex)}>
                    <Input value={row.circuitNumber} onChange={(e) => updateCircuitField(rowIndex, 'circuitNumber', e.target.value)} />
                    <Input value={row.designation} onChange={(e) => updateCircuitField(rowIndex, 'designation', e.target.value)} placeholder="Designation" />
                    <Input value={row.maxZs} onChange={(e) => updateCircuitField(rowIndex, 'maxZs', e.target.value)} placeholder="Max Zs" />
                    <div className="flex gap-2">
                      <Input value={row.measuredZs} onChange={(e) => updateCircuitField(rowIndex, 'measuredZs', e.target.value)} placeholder="Measured Zs" className={zsExceedsMax(row) ? 'bg-orange-100 text-orange-900 font-semibold' : ''} />
                      <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeCircuitRow(rowIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {getDeratedMaxZsDisplay(row) && <p className="text-xs text-green-700 md:col-span-4">Display Max Zs: {getDeratedMaxZsDisplay(row)}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {spellCheckActive && (
            <div className="flex items-center justify-between rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <SpellCheck className="h-4 w-4 shrink-0" />
                <span>Spell check active — misspellings are underlined in text fields.</span>
              </div>
              <button type="button" onClick={() => setSpellCheckActive(false)} className="ml-3 shrink-0 text-blue-600 hover:text-blue-900">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {verifyResults && (
            <div className="rounded border border-slate-300 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">Verification Results</span>
                <button type="button" onClick={() => setVerifyResults(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="divide-y divide-slate-100">
                {verifyResults.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                    {r.type === 'error' && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                    {r.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    {r.type === 'pass' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />}
                    <span>{r.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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

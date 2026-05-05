'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Flame, Home, ShieldCheck, ClipboardList, Building2, ScanFace } from 'lucide-react';

import { createCertificate } from '../../../actions';
import { AddressAutocompleteField } from '@/components/AddressAutocompleteField';
import { CertificateNumberField } from '@/components/CertificateNumberField';
import GuidedModeModal from '@/components/GuidedModeModal';
import { DateDropdownField } from '@/components/DateDropdownField';
import { NextVisitField } from '@/components/NextVisitField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { GasSafeRegisterLogo } from '@/components/GasSafeRegisterLogo';
import { getSignInRedirectPath, isSessionExpiredError } from '@/lib/auth/errors';
import { isAdminRole } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import {
  CP12_APPLIANCE_COUNT,
  CP12_FLUE_TYPE_OPTIONS,
  CP12_INSPECTION_TYPE_OPTIONS,
  CP12_SAFE_TO_USE_OPTIONS,
  CP12_YES_NO_NA_OPTIONS,
  CP12_YES_NO_OPTIONS,
  createCp12GuidedSteps,
  createDefaultCp12Appliances,
  createDefaultCp12CombustionReadings,
  createEmptyCp12ApplianceRow,
  type Cp12ApplianceRow,
  type Cp12CombustionReading,
  type Cp12SafeToUse,
  type Cp12YesNo,
  type Cp12YesNoNa,
} from '@/lib/certificates/cp12-template';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error('Failed to fetch');
    }

    return res.json();
  });

type CustomerRecord = {
  id: number | string;
  name?: string | null;
  address?: string | null;
  postcode?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
};

const yesNoOptions = CP12_YES_NO_OPTIONS;
const yesNoNaOptions = CP12_YES_NO_NA_OPTIONS;
const safeToUseOptions = CP12_SAFE_TO_USE_OPTIONS;
const inspectionTypeOptions = CP12_INSPECTION_TYPE_OPTIONS;
const flueTypeOptions = CP12_FLUE_TYPE_OPTIONS;

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  return `CP12-${year}-${rand}`;
}

function getNextYearDate(sourceDate: string) {
  const date = sourceDate ? new Date(sourceDate) : new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0];
}

function buildApplianceLabel(index: number, appliance: Cp12ApplianceRow) {
  const name = appliance.applianceType.trim() || 'Appliance';
  const location = appliance.location.trim() || 'Location not set';
  return `${index + 1}. ${name} — ${location}`;
}

function ApplianceRowCard({
  index,
  value,
  onChange,
}: {
  index: number;
  value: Cp12ApplianceRow;
  onChange: <K extends keyof Cp12ApplianceRow>(key: K, next: Cp12ApplianceRow[K]) => void;
}) {
  return (
    <Card className="overflow-hidden border-slate-300">
      <CardHeader className="border-b border-slate-200 bg-slate-50 py-3">
        <CardTitle className="text-base">{buildApplianceLabel(index, value)}</CardTitle>
        <CardDescription className="text-xs">
          Appliance record, flue type, and the gas safety outcomes captured on the certificate form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={value.location}
              onChange={(event) => onChange('location', event.target.value)}
              placeholder="Kitchen"
            />
          </div>
          <div className="space-y-2">
            <Label>Appliance Type</Label>
            <Input
              value={value.applianceType}
              onChange={(event) => onChange('applianceType', event.target.value)}
              placeholder="Boiler / cooker / fire"
            />
          </div>
          <div className="space-y-2">
            <Label>Make / Model</Label>
            <Input
              value={value.makeModel}
              onChange={(event) => onChange('makeModel', event.target.value)}
              placeholder="Manufacturer and model"
            />
          </div>
          <div className="space-y-2">
            <Label>Flue Type</Label>
            <Select value={value.flueType || '__unset'} onValueChange={(next) => onChange('flueType', next === '__unset' ? '' : next)}>
              <SelectTrigger>
                <SelectValue placeholder="Select flue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unset">Not set</SelectItem>
                {flueTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Landlord's Appliance</Label>
            <Select
              value={value.landlordsAppliance}
              onValueChange={(next) => onChange('landlordsAppliance', next as Cp12YesNoNa)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoNaOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Appliance Inspected</Label>
            <Select
              value={value.applianceInspected}
              onValueChange={(next) => onChange('applianceInspected', next as Cp12YesNo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Operating Pressure / Heat Input</Label>
            <Input
              value={value.operatingPressure}
              onChange={(event) => onChange('operatingPressure', event.target.value)}
              placeholder="20 mbar / 24 kW"
            />
          </div>
          <div className="space-y-2">
            <Label>Safety Device(s) Correct</Label>
            <Select
              value={value.safetyDevicesCorrect}
              onValueChange={(next) => onChange('safetyDevicesCorrect', next as Cp12YesNoNa)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoNaOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ventilation Satisfactory</Label>
            <Select
              value={value.ventilationSatisfactory}
              onValueChange={(next) => onChange('ventilationSatisfactory', next as Cp12YesNoNa)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoNaOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Flue / Termination Condition</Label>
            <Select
              value={value.flueConditionSatisfactory}
              onValueChange={(next) => onChange('flueConditionSatisfactory', next as Cp12YesNoNa)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoNaOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Flue Performance Check</Label>
            <Select
              value={value.fluePerformanceResult}
              onValueChange={(next) => onChange('fluePerformanceResult', next as Cp12YesNoNa)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pass">Pass</SelectItem>
                <SelectItem value="Fail">Fail</SelectItem>
                <SelectItem value="N/A">N/A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Appliance Serviced</Label>
            <Select
              value={value.applianceServiced}
              onValueChange={(next) => onChange('applianceServiced', next as Cp12YesNo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Appliance Safe To Use</Label>
            <Select
              value={value.applianceSafeToUse}
              onValueChange={(next) => onChange('applianceSafeToUse', next as Cp12SafeToUse)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {safeToUseOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Warning Notice Issued</Label>
            <Select
              value={value.warningNoticeIssued}
              onValueChange={(next) => onChange('warningNoticeIssued', next as Cp12YesNo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yesNoOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Warning Notice Serial</Label>
            <Input
              value={value.warningNoticeSerial}
              onChange={(event) => onChange('warningNoticeSerial', event.target.value)}
              placeholder="If issued, record serial number"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            rows={3}
            value={value.notes}
            onChange={(event) => onChange('notes', event.target.value)}
            placeholder="Visual condition, combustion readings, fault notes, or remedial action..."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CombustionReadingCard({
  value,
  onChange,
}: {
  value: Cp12CombustionReading;
  onChange: <K extends keyof Cp12CombustionReading>(key: K, next: Cp12CombustionReading[K]) => void;
}) {
  return (
    <Card className="overflow-hidden border-slate-300">
      <CardHeader className="border-b border-slate-200 bg-slate-50 py-3">
        <CardTitle className="text-base">{value.readingLabel}</CardTitle>
        <CardDescription className="text-xs">
          CO / CO2 / ratio values for the combustion analysis readings.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>CO</Label>
          <Input value={value.co} onChange={(event) => onChange('co', event.target.value)} placeholder="ppm" />
        </div>
        <div className="space-y-2">
          <Label>CO2</Label>
          <Input value={value.co2} onChange={(event) => onChange('co2', event.target.value)} placeholder="%" />
        </div>
        <div className="space-y-2">
          <Label>Ratio</Label>
          <Input value={value.ratio} onChange={(event) => onChange('ratio', event.target.value)} placeholder="CO/CO2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function CP12CertificatePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [customerSiteSynced, setCustomerSiteSynced] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [landlordAddress, setLandlordAddress] = useState('');
  const [landlordPostcode, setLandlordPostcode] = useState('');
  const [landlordTelephone, setLandlordTelephone] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [sitePostcode, setSitePostcode] = useState('');
  const [siteTelephone, setSiteTelephone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPostcode, setBusinessPostcode] = useState('');
  const [businessTelephone, setBusinessTelephone] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorPosition, setInspectorPosition] = useState('');
  const [gasSafeNumber, setGasSafeNumber] = useState('');
  const [operativeIdNo, setOperativeIdNo] = useState('');
  const [inspectionDate, setInspectionDate] = useState(getTodayDate());
  const [nextInspectionDate, setNextInspectionDate] = useState(getNextYearDate(getTodayDate()));
  const [inspectionType, setInspectionType] = useState<Cp12InspectionType>('Annual Gas Safety Check');
  const [gasTightnessTestInitialValue, setGasTightnessTestInitialValue] = useState('');
  const [gasTightnessTestFinalValue, setGasTightnessTestFinalValue] = useState('');
  const [gasInstallationPipeworkSatisfactory, setGasInstallationPipeworkSatisfactory] = useState<Cp12YesNo>('Yes');
  const [emergencyControlAccessible, setEmergencyControlAccessible] = useState<Cp12YesNo>('Yes');
  const [gasTightnessTestSatisfactory, setGasTightnessTestSatisfactory] = useState<Cp12YesNoNa>('Yes');
  const [mainBondingSatisfactory, setMainBondingSatisfactory] = useState<Cp12YesNo>('Yes');
  const [coAlarmPresent, setCoAlarmPresent] = useState<Cp12YesNo>('Yes');
  const [coAlarmWorking, setCoAlarmWorking] = useState<Cp12YesNo>('Yes');
  const [coAlarmInDate, setCoAlarmInDate] = useState<Cp12YesNoNa>('Yes');
  const [smokeAlarmPresent, setSmokeAlarmPresent] = useState<Cp12YesNo>('Yes');
  const [smokeAlarmWorking, setSmokeAlarmWorking] = useState<Cp12YesNo>('Yes');
  const [defectsRemedialAction, setDefectsRemedialAction] = useState('');
  const [receivedByName, setReceivedByName] = useState('');
  const [appliances, setAppliances] = useState<Cp12ApplianceRow[]>(createDefaultCp12Appliances());
  const [combustionReadings, setCombustionReadings] = useState<Cp12CombustionReading[]>(
    createDefaultCp12CombustionReadings(),
  );

  const { data: customersData } = useSWR('/api/customers', fetcher);
  const { data: currentUser } = useSWR<{ role?: string }>('/api/user', fetcher);
  const customers = Array.isArray(customersData) ? (customersData as CustomerRecord[]) : [];
  const canUseSampleFill = isAdminRole(currentUser?.role);

  const guidedSteps = useMemo(() => createCp12GuidedSteps(), []);

  useEffect(() => {
    if (certificateNumber) {
      return;
    }

    setCertificateNumber(generateCertificateNumber());
  }, [certificateNumber]);

  useEffect(() => {
    setNextInspectionDate(getNextYearDate(inspectionDate));
  }, [inspectionDate]);

  useEffect(() => {
    const customer = customers.find((item) => String(item.id) === selectedCustomer) ?? null;

    if (!customer || customerSiteSynced) {
      return;
    }

    if (!siteName && (customer.name || customer.address)) {
      setSiteName(customer.name || customer.address || '');
    }

    if (!siteAddress && customer.address) {
      setSiteAddress(customer.address);
    }

    if (!sitePostcode && customer.postcode) {
      setSitePostcode(customer.postcode);
    }

    if (!siteTelephone && customer.phone) {
      setSiteTelephone(customer.phone);
    }

    setCustomerSiteSynced(true);
  }, [customers, customerSiteSynced, selectedCustomer, siteAddress, siteName, sitePostcode, siteTelephone]);

  const updateAppliance = (rowIndex: number, key: keyof Cp12ApplianceRow, nextValue: Cp12ApplianceRow[keyof Cp12ApplianceRow]) => {
    setAppliances((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, [key]: nextValue } : row)));
  };

  const updateReading = (rowIndex: number, key: keyof Cp12CombustionReading, nextValue: Cp12CombustionReading[keyof Cp12CombustionReading]) => {
    setCombustionReadings((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, [key]: nextValue } : row)));
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      formData.set('certificateType', 'CP12');
      formData.set('appliances', JSON.stringify(appliances));
      formData.set('combustionReadings', JSON.stringify(combustionReadings));
      formData.set('landlordName', landlordName);
      formData.set('landlordAddress', landlordAddress);
      formData.set('landlordPostcode', landlordPostcode);
      formData.set('landlordTelephone', landlordTelephone);
      formData.set('siteName', siteName);
      formData.set('siteAddress', siteAddress);
      formData.set('sitePostcode', sitePostcode);
      formData.set('siteTelephone', siteTelephone);
      formData.set('businessName', businessName);
      formData.set('businessAddress', businessAddress);
      formData.set('businessPostcode', businessPostcode);
      formData.set('businessTelephone', businessTelephone);
      formData.set('inspectorName', inspectorName);
      formData.set('gasSafeNumber', gasSafeNumber);
      formData.set('operativeIdNo', operativeIdNo);
      formData.set('inspectionType', inspectionType);
      formData.set('inspectionDate', inspectionDate);
      formData.set('nextInspectionDate', nextInspectionDate);
      formData.set('gasTightnessTestInitialValue', gasTightnessTestInitialValue);
      formData.set('gasTightnessTestFinalValue', gasTightnessTestFinalValue);
      formData.set('gasInstallationPipeworkSatisfactory', gasInstallationPipeworkSatisfactory);
      formData.set('emergencyControlAccessible', emergencyControlAccessible);
      formData.set('gasTightnessTestSatisfactory', gasTightnessTestSatisfactory);
      formData.set('mainBondingSatisfactory', mainBondingSatisfactory);
      formData.set('coAlarmPresent', coAlarmPresent);
      formData.set('coAlarmWorking', coAlarmWorking);
      formData.set('coAlarmInDate', coAlarmInDate);
      formData.set('smokeAlarmPresent', smokeAlarmPresent);
      formData.set('smokeAlarmWorking', smokeAlarmWorking);
      formData.set('defectsRemedialAction', defectsRemedialAction);
      formData.set('receivedByName', receivedByName);

      const result = await createCertificate({}, formData);

      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/cp12'));
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

  const handleGuidedComplete = async (values: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value));
    await handleSubmit(formData);
    setGuidedOpen(false);
  };

  const fillFormWithSampleData = () => {
    const today = new Date();
    const inspectionDateValue = today.toISOString().split('T')[0];
    const nextInspectionDateValue = getNextYearDate(inspectionDateValue);
    const matchedCustomer =
      customers.find(
        (customer) => customer.name?.trim().toLowerCase() === 'highfield hall community centre',
      ) || customers[0] || null;

    setFormError('');
    setCertificateNumber('CP12-2026-001');
    setSelectedCustomer(matchedCustomer ? String(matchedCustomer.id) : '');
    setSelectedCustomerName(matchedCustomer?.name || 'Highfield Hall Community Centre');
    setCustomerSiteSynced(false);
    setLandlordName('Rosebank Property Ltd');
    setLandlordAddress('Rosebank House, 18 Market Street, Bolton');
    setLandlordPostcode('BL1 2AB');
    setLandlordTelephone('01204 555 010');
    setSiteName('Rosebank House, Flat 2');
    setSiteAddress('Rosebank House, 18 Market Street, Bolton');
    setSitePostcode('BL1 2AB');
    setSiteTelephone('01204 555 011');
    setBusinessName('Rosebank Compliance Services Ltd');
    setBusinessAddress('Rosebank Works, 9 Civic Road, Bolton');
    setBusinessPostcode('BL2 1AA');
    setBusinessTelephone('01204 555 012');
    setInspectorName('Daniel Allport');
    setInspectorPosition('Gas Operative');
    setGasSafeNumber('611716');
    setOperativeIdNo('GA-00127');
    setInspectionDate(inspectionDateValue);
    setNextInspectionDate(nextInspectionDateValue);
    setInspectionType('Annual Gas Safety Check');
    setGasTightnessTestInitialValue('21.5');
    setGasTightnessTestFinalValue('21.5');
    setGasInstallationPipeworkSatisfactory('Yes');
    setEmergencyControlAccessible('Yes');
    setGasTightnessTestSatisfactory('Yes');
    setMainBondingSatisfactory('Yes');
    setCoAlarmPresent('Yes');
    setCoAlarmWorking('Yes');
    setCoAlarmInDate('Yes');
    setSmokeAlarmPresent('Yes');
    setSmokeAlarmWorking('Yes');
    setDefectsRemedialAction(
      'No defects identified at the time of inspection. Advisory note issued to continue annual servicing and keep the CO alarm under routine test.',
    );
    setReceivedByName('Amelia Ward');

    setAppliances([
      {
        ...createEmptyCp12ApplianceRow(),
        location: 'Kitchen',
        applianceType: 'Combi boiler',
        makeModel: 'Vaillant ecoTEC Plus 832',
        flueType: 'RS-FF',
        landlordsAppliance: 'Yes',
        applianceInspected: 'Yes',
        operatingPressure: '20 mbar',
        safetyDevicesCorrect: 'Yes',
        ventilationSatisfactory: 'Yes',
        flueConditionSatisfactory: 'Yes',
        fluePerformanceResult: 'Pass',
        applianceServiced: 'Yes',
        applianceSafeToUse: 'Yes',
        warningNoticeIssued: 'No',
        notes: 'Appliance operating correctly with combustion readings within acceptable range.',
      },
      {
        ...createEmptyCp12ApplianceRow(),
        location: 'Lounge',
        applianceType: 'Gas fire',
        makeModel: 'Flavel Emberglow',
        flueType: 'OF',
        landlordsAppliance: 'No',
        applianceInspected: 'Yes',
        operatingPressure: '18 mbar',
        safetyDevicesCorrect: 'Yes',
        ventilationSatisfactory: 'Yes',
        flueConditionSatisfactory: 'Yes',
        fluePerformanceResult: 'Pass',
        applianceServiced: 'Yes',
        applianceSafeToUse: 'Yes',
        warningNoticeIssued: 'No',
      },
      {
        ...createEmptyCp12ApplianceRow(),
        location: 'Utility room',
        applianceType: 'Water heater',
        makeModel: 'Baxi Solo DHW',
        flueType: 'RS-BF',
        landlordsAppliance: 'Yes',
        applianceInspected: 'Yes',
        operatingPressure: '19 mbar',
        safetyDevicesCorrect: 'Yes',
        ventilationSatisfactory: 'Yes',
        flueConditionSatisfactory: 'Yes',
        fluePerformanceResult: 'Pass',
        applianceServiced: 'Yes',
        applianceSafeToUse: 'Yes',
        warningNoticeIssued: 'No',
      },
      {
        ...createEmptyCp12ApplianceRow(),
        location: 'Bedroom 1',
        applianceType: 'Boiler',
        makeModel: 'Ideal Logic Max',
        flueType: 'RS-FF',
        landlordsAppliance: 'N/A',
        applianceInspected: 'Yes',
        operatingPressure: '20 mbar',
        safetyDevicesCorrect: 'Yes',
        ventilationSatisfactory: 'Yes',
        flueConditionSatisfactory: 'Yes',
        fluePerformanceResult: 'Pass',
        applianceServiced: 'Yes',
        applianceSafeToUse: 'Yes',
        warningNoticeIssued: 'No',
      },
      createEmptyCp12ApplianceRow(),
      createEmptyCp12ApplianceRow(),
    ]);

    setCombustionReadings([
      {
        readingLabel: '1st Reading / Min / Low',
        co: '18',
        co2: '8.8',
        ratio: '0.0020',
      },
      {
        readingLabel: '2nd Reading / Max / High',
        co: '22',
        co2: '9.1',
        ratio: '0.0024',
      },
      {
        readingLabel: '3rd Reading / Ign / Other',
        co: '20',
        co2: '8.9',
        ratio: '0.0022',
      },
    ]);
  };

  const applianceCount = useMemo(
    () => appliances.filter((item) => Boolean(item.applianceType.trim() || item.location.trim() || item.makeModel.trim())).length,
    [appliances],
  );

  return (
    <>
      <div className="mb-6">
        <Button onClick={() => setGuidedOpen(true)} size="lg" className="w-full">
          Start Guided Mode
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <GasSafeRegisterLogo
              className="hidden h-16 w-24 border-amber-300 p-2 sm:block"
              sizes="96px"
              priority
            />
            <div>
              <h1 className="text-3xl font-bold">CP12 Gas Safety Record</h1>
              <p className="max-w-4xl text-muted-foreground">
                Domestic Landlord Gas Safety Record with landlord details, site details, appliance
                records, final checks, combustion readings, and sign-off captured in the same
                workflow as the existing CP12.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canUseSampleFill && (
              <Button type="button" variant="secondary" onClick={fillFormWithSampleData}>
                Fill Form With Sample Data
              </Button>
            )}
            <Link href="/certificates/new">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        <form
          ref={formRef}
          action={handleSubmit}
          className="space-y-6"
        >
          {formError && (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
          <input type="hidden" name="certificateType" value="CP12" />
          <input type="hidden" name="appliances" value={JSON.stringify(appliances)} />
          <input type="hidden" name="combustionReadings" value={JSON.stringify(combustionReadings)} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flame className="mr-2 h-5 w-5 text-amber-600" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Certificate number and customer lookup used to keep the CP12 workflow fast.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <CertificateNumberField
                  value={certificateNumber}
                  onChange={setCertificateNumber}
                  certificateType="CP12"
                  customerName={selectedCustomerName}
                  siteName={siteName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer *</Label>
                <input type="hidden" name="customerId" value={selectedCustomer} />
                <Input
                  id="customerName"
                  name="customerName"
                  list="customers-list-cp12"
                  value={selectedCustomerName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedCustomerName(value);
                    const normalizedValue = value.trim().toLowerCase();
                    const exactMatch = customers.find((customer) => customer.name?.trim().toLowerCase() === normalizedValue);
                    const prefixMatches = customers.filter((customer) => customer.name?.trim().toLowerCase().startsWith(normalizedValue));
                    const customer = exactMatch || (normalizedValue && prefixMatches.length === 1 ? prefixMatches[0] : null);
                    setSelectedCustomer(customer ? String(customer.id) : '');
                    setCustomerSiteSynced(false);
                  }}
                  required
                  placeholder="Type customer name"
                />
                <datalist id="customers-list-cp12">
                  {customers.map((customer) => (
                    <option key={String(customer.id)} value={customer.name || ''} />
                  ))}
                </datalist>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="mr-2 h-5 w-5 text-slate-600" />
                Landlord / Agent and Site Details
              </CardTitle>
              <CardDescription>
                The uploaded record separates landlord / agent details from the site details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Landlord / Agent Details</h3>
                    <Badge>Required on form</Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="landlordName">Name</Label>
                      <Input id="landlordName" name="landlordName" value={landlordName} onChange={(event) => setLandlordName(event.target.value)} placeholder="Landlord / agent name" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="landlordAddress">Address</Label>
                      <Textarea id="landlordAddress" name="landlordAddress" value={landlordAddress} onChange={(event) => setLandlordAddress(event.target.value)} placeholder="Landlord / agent address" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="landlordPostcode">Postcode</Label>
                      <Input id="landlordPostcode" name="landlordPostcode" value={landlordPostcode} onChange={(event) => setLandlordPostcode(event.target.value)} placeholder="Postcode" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="landlordTelephone">Telephone</Label>
                      <Input id="landlordTelephone" name="landlordTelephone" value={landlordTelephone} onChange={(event) => setLandlordTelephone(event.target.value)} placeholder="Telephone number" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Site Details</h3>
                    <Badge variant="secondary">Property record</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Name</Label>
                    <AddressAutocompleteField
                      id="siteName"
                      name="siteName"
                      value={siteName}
                      onChange={(value) => {
                        setSiteName(value);
                        setCustomerSiteSynced(true);
                      }}
                      placeholder="Property / site name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteAddress">Address</Label>
                    <AddressAutocompleteField
                      id="siteAddress"
                      name="siteAddress"
                      value={siteAddress}
                      onChange={(value) => setSiteAddress(value)}
                      placeholder="Site address"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sitePostcode">Postcode</Label>
                      <Input id="sitePostcode" name="sitePostcode" value={sitePostcode} onChange={(event) => setSitePostcode(event.target.value)} placeholder="Site postcode" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteTelephone">Telephone</Label>
                      <Input id="siteTelephone" name="siteTelephone" value={siteTelephone} onChange={(event) => setSiteTelephone(event.target.value)} placeholder="Site telephone" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-emerald-600" />
                Registered Business Details and Inspection Details
              </CardTitle>
              <CardDescription>
                Business identity, operative identity, and inspection timing as shown on the source form.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                  <h3 className="font-semibold">Registered Business Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Name</Label>
                    <Input id="businessName" name="businessName" value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Registered business name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">Address</Label>
                    <Textarea id="businessAddress" name="businessAddress" value={businessAddress} onChange={(event) => setBusinessAddress(event.target.value)} placeholder="Registered business address" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="businessPostcode">Postcode</Label>
                      <Input id="businessPostcode" name="businessPostcode" value={businessPostcode} onChange={(event) => setBusinessPostcode(event.target.value)} placeholder="Business postcode" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessTelephone">Telephone</Label>
                      <Input id="businessTelephone" name="businessTelephone" value={businessTelephone} onChange={(event) => setBusinessTelephone(event.target.value)} placeholder="Business telephone" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                  <h3 className="font-semibold">Inspection Details</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="inspectorName">Gas Operative / Engineer Name *</Label>
                      <Input id="inspectorName" name="inspectorName" value={inspectorName} onChange={(event) => setInspectorName(event.target.value)} required placeholder="Gas operative name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gasSafeNumber">Gas Safe Registration No. *</Label>
                      <Input id="gasSafeNumber" name="gasSafeNumber" value={gasSafeNumber} onChange={(event) => setGasSafeNumber(event.target.value)} required placeholder="Registration number" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="operativeIdNo">Operative ID No</Label>
                      <Input id="operativeIdNo" name="operativeIdNo" value={operativeIdNo} onChange={(event) => setOperativeIdNo(event.target.value)} placeholder="Operative ID number" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inspectionType">Inspection Type</Label>
                      <Select name="inspectionType" value={inspectionType} onValueChange={(next) => setInspectionType(next as Cp12InspectionType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectionTypeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DateDropdownField
                      id="inspectionDate"
                      name="inspectionDate"
                      label="Inspection Date"
                      value={inspectionDate}
                      onChange={(next) => setInspectionDate(next)}
                      required
                      isAutoPopulated={false}
                    />
                    <NextVisitField
                      label="Next Safety Check Due"
                      value={nextInspectionDate}
                      onChange={setNextInspectionDate}
                      visitDate={inspectionDate}
                      periodMonths={12}
                      showPeriodSelect={false}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="gasTightnessTestInitialValue">Gas Tightness Test Initial Value</Label>
                      <Input id="gasTightnessTestInitialValue" name="gasTightnessTestInitialValue" value={gasTightnessTestInitialValue} onChange={(event) => setGasTightnessTestInitialValue(event.target.value)} placeholder="Initial value" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gasTightnessTestFinalValue">Gas Tightness Test Final Value</Label>
                      <Input id="gasTightnessTestFinalValue" name="gasTightnessTestFinalValue" value={gasTightnessTestFinalValue} onChange={(event) => setGasTightnessTestFinalValue(event.target.value)} placeholder="Final value" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applianceCount">No. of Appliances Inspected</Label>
                      <Input id="applianceCount" value={String(applianceCount)} readOnly className="bg-slate-50" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-5 w-5 text-slate-600" />
                Appliance Details
              </CardTitle>
              <CardDescription>
                Capture the appliance rows from the record form. Six rows are provided to match the
                source layout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {appliances.map((appliance, index) => (
                <ApplianceRowCard
                  key={`${index}-${appliance.location}-${appliance.applianceType}`}
                  index={index}
                  value={appliance}
                  onChange={(key, next) => updateAppliance(index, key, next)}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldCheck className="mr-2 h-5 w-5 text-emerald-600" />
                Final Checks
              </CardTitle>
              <CardDescription>
                The source form asks for pipework, emergency control, tightness, bonding, and alarm
                checks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="gasInstallationPipeworkSatisfactory">Gas installation pipework satisfactory visual inspection</Label>
                  <Select value={gasInstallationPipeworkSatisfactory} onValueChange={(next) => setGasInstallationPipeworkSatisfactory(next as Cp12YesNo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yesNoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyControlAccessible">Emergency control accessible</Label>
                  <Select value={emergencyControlAccessible} onValueChange={(next) => setEmergencyControlAccessible(next as Cp12YesNo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yesNoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gasTightnessTestSatisfactory">Satisfactory gas tightness test</Label>
                  <Select value={gasTightnessTestSatisfactory} onValueChange={(next) => setGasTightnessTestSatisfactory(next as Cp12YesNoNa)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yesNoNaOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainBondingSatisfactory">Main protective equipotential bonding satisfactory</Label>
                  <Select value={mainBondingSatisfactory} onValueChange={(next) => setMainBondingSatisfactory(next as Cp12YesNo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yesNoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coAlarmPresent">CO alarm present?</Label>
                  <Select value={coAlarmPresent} onValueChange={(next) => setCoAlarmPresent(next as Cp12YesNo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yesNoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coAlarmWorking">CO alarm working?</Label>
                  <Select value={coAlarmWorking} onValueChange={(next) => setCoAlarmWorking(next as Cp12YesNo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yesNoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coAlarmInDate">CO alarm in date?</Label>
                  <Select value={coAlarmInDate} onValueChange={(next) => setCoAlarmInDate(next as Cp12YesNoNa)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yesNoNaOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smokeAlarmPresent">Smoke alarm(s) present?</Label>
                  <Select value={smokeAlarmPresent} onValueChange={(next) => setSmokeAlarmPresent(next as Cp12YesNo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yesNoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smokeAlarmWorking">Smoke alarm(s) working?</Label>
                  <Select value={smokeAlarmWorking} onValueChange={(next) => setSmokeAlarmWorking(next as Cp12YesNo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yesNoOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Combustion Analysis Readings</CardTitle>
              <CardDescription>
                Three readings with CO, CO2, and ratio values as extracted from the source form.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {combustionReadings.map((reading, index) => (
                <CombustionReadingCard
                  key={`${index}-${reading.readingLabel}`}
                  value={reading}
                  onChange={(key, next) => updateReading(index, key, next)}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ScanFace className="mr-2 h-5 w-5 text-slate-600" />
                Defects, Remedial Action, and Sign-off
              </CardTitle>
              <CardDescription>
                The source form concludes with the defects box and the gas operative / received by
                sign-off.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defectsRemedialAction">Defects Identified / Remedial Action Taken</Label>
                <Textarea
                  id="defectsRemedialAction"
                  name="defectsRemedialAction"
                  rows={4}
                  value={defectsRemedialAction}
                  onChange={(event) => setDefectsRemedialAction(event.target.value)}
                  placeholder="Record defects, warning notices, and remedial actions taken."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receivedByName">Received by / tenant / agent</Label>
                  <Input
                    id="receivedByName"
                    name="receivedByName"
                    value={receivedByName}
                    onChange={(event) => setReceivedByName(event.target.value)}
                    placeholder="Name receiving the record"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspectorPosition">Position</Label>
                  <Input
                    id="inspectorPosition"
                    name="inspectorPosition"
                    value={inspectorPosition}
                    onChange={(event) => setInspectorPosition(event.target.value)}
                    placeholder="Gas operative / engineer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Creating CP12...' : 'Create CP12 Certificate'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/certificates/new">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>

      <GuidedModeModal
        open={guidedOpen}
        onClose={() => setGuidedOpen(false)}
        steps={guidedSteps}
        onComplete={handleGuidedComplete}
      />
    </>
  );
}

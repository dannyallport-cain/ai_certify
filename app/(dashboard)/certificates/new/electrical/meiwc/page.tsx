'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';

import { createCertificate, updateCertificate } from '@/app/(dashboard)/actions';
import { AddressAutocompleteField } from '@/components/AddressAutocompleteField';
import { CertificateNumberField } from '@/components/CertificateNumberField';
import { DateDropdownField } from '@/components/DateDropdownField';
import GuidedModeModal, { Step } from '@/components/GuidedModeModal';
import { PreviewModal } from '@/components/PreviewModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getSignInRedirectPath, isSessionExpiredError } from '@/lib/auth/errors';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error('Failed to fetch');
    }

    return res.json();
  });

type ProtectiveDeviceOption = {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type ProtectiveDevicesResponse = {
  mainProtectiveDevices: ProtectiveDeviceOption[];
  circuitProtectiveDevices: ProtectiveDeviceOption[];
};

const WORK_TYPES = [
  'New socket outlet',
  'Lighting alteration',
  'Circuit extension',
  'Equipment replacement',
  'Local amendment',
  'Minor repair',
] as const;

const SUPPLY_TYPES = ['1-phase (2 wire) ac', '1-phase (3 wire) ac', '3-phase (4 wire) ac'] as const;
const EARTHING_TYPES = ['TN-S', 'TN-C-S (PME)', 'TT', 'IT', 'TNC'] as const;

export default function MinorElectricalInstallationWorksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const isEditing = Boolean(editId);
  const formRef = useRef<HTMLFormElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const { data: customersData } = useSWR('/api/customers', fetcher);
  const customers = Array.isArray(customersData) ? customersData : [];
  const { data: protectiveDevicesData } = useSWR<ProtectiveDevicesResponse>(
    '/api/electrical/protective-devices',
    fetcher,
  );
  const mainProtectiveDevices = Array.isArray(protectiveDevicesData?.mainProtectiveDevices)
    ? protectiveDevicesData.mainProtectiveDevices
    : [];
  const circuitProtectiveDevices = Array.isArray(protectiveDevicesData?.circuitProtectiveDevices)
    ? protectiveDevicesData.circuitProtectiveDevices
    : [];
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [isSiteNameAuto, setIsSiteNameAuto] = useState(false);
  const [isSiteAddressAuto, setIsSiteAddressAuto] = useState(false);
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isInspectionDateAuto, setIsInspectionDateAuto] = useState(true);
  const [formError, setFormError] = useState('');
  const [verifyResults, setVerifyResults] = useState<Array<{ type: 'error' | 'warning' | 'pass'; message: string }> | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const buildDraftStorageKey = () => 'meiwc-form-draft:new';

  const collectFormValues = (form: HTMLFormElement | null) => {
    if (!form) return {};
    const values: Record<string, string> = {};
    const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input[name], textarea[name], select[name]',
    );

    fields.forEach((field) => {
      const name = field.name?.trim();
      if (!name) return;

      if (field instanceof HTMLInputElement) {
        const type = field.type?.toLowerCase();
        if (type === 'radio') {
          if (field.checked) values[name] = field.value;
          return;
        }
        if (type === 'checkbox') {
          values[name] = field.checked ? field.value || 'on' : '';
          return;
        }
        if (type === 'file') return;
      }

      values[name] = field.value ?? '';
    });

    return values;
  };

  useEffect(() => {
    if (isEditing) return;
    const rand = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    setCertificateNumber(`MIWC-${new Date().getFullYear()}${rand}`);

    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(buildDraftStorageKey());
    setHasSavedDraft(Boolean(raw));
  }, [isEditing]);

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Site / Building Name', type: 'text' },
    { name: 'siteAddress', label: 'Site Address', type: 'textarea' },
    { name: 'workType', label: 'Work Type', type: 'text' },
    { name: 'inspectionDate', label: 'Inspection Date', type: 'text' },
    { name: 'designerName', label: 'Designer / Contractor', type: 'text' },
    { name: 'inspectorName', label: 'Inspector Name', type: 'text' },
    { name: 'workDescription', label: 'Description of Work', type: 'textarea' },
    { name: 'recommendations', label: 'Recommendations', type: 'textarea' },
  ];

  useEffect(() => {
    const loadForEditing = async () => {
      if (!isEditing || !editId) return;

      try {
        const response = await fetch(`/api/certificates/${editId}`);
        if (!response.ok) return;

        const certificateData = await response.json();
        const formData = certificateData.formData || {};

        setCertificateNumber(certificateData.certificateNumber || '');
        setSelectedCustomer(certificateData.customer?.id ? String(certificateData.customer.id) : String(formData.customerId || ''));
        setSelectedCustomerName(certificateData.customer?.name || String(formData.customerName || ''));
        setSiteName(String(formData.siteName || certificateData.siteName || ''));
        setSiteAddress(String(formData.siteAddress || certificateData.siteAddress || ''));
        setInspectionDate(String(certificateData.inspectionDate || formData.inspectionDate || new Date().toISOString().split('T')[0]));
      } catch (error) {
        console.error('Error loading MEIWC certificate for editing:', error);
      }
    };

    void loadForEditing();
  }, [editId, isEditing]);

  useEffect(() => {
    if (isEditing || typeof window === 'undefined') return;
    const payload = {
      certificateNumber,
      selectedCustomer,
      selectedCustomerName,
      siteName,
      siteAddress,
      inspectionDate,
      formValues: collectFormValues(formRef.current),
    };
    window.localStorage.setItem(buildDraftStorageKey(), JSON.stringify(payload));
  }, [certificateNumber, selectedCustomer, selectedCustomerName, siteName, siteAddress, inspectionDate, isEditing]);

  const handleRestoreSavedDraft = () => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(buildDraftStorageKey());
    if (!raw) {
      setHasSavedDraft(false);
      return;
    }

    try {
      const draft = JSON.parse(raw) as {
        certificateNumber?: string;
        selectedCustomer?: string;
        selectedCustomerName?: string;
        siteName?: string;
        siteAddress?: string;
        inspectionDate?: string;
      };

      setCertificateNumber(draft.certificateNumber ?? certificateNumber);
      setSelectedCustomer(draft.selectedCustomer ?? '');
      setSelectedCustomerName(draft.selectedCustomerName ?? '');
      setSiteName(draft.siteName ?? '');
      setSiteAddress(draft.siteAddress ?? '');
      setInspectionDate(draft.inspectionDate ?? inspectionDate);
      setHasSavedDraft(false);
    } catch (error) {
      console.error('Unable to restore MEIWC draft:', error);
    }
  };

  const handleDiscardSavedDraft = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(buildDraftStorageKey());
    setHasSavedDraft(false);
  };

  const handleVerify = () => {
    const results: Array<{ type: 'error' | 'warning' | 'pass'; message: string }> = [];

    if (!selectedCustomerName.trim()) results.push({ type: 'error', message: 'Customer is required.' });
    else results.push({ type: 'pass', message: 'Customer selected.' });

    if (!certificateNumber.trim()) results.push({ type: 'error', message: 'Certificate number is missing.' });
    else results.push({ type: 'pass', message: 'Certificate number present.' });

    if (!siteName.trim()) results.push({ type: 'warning', message: 'Site / Building Name is blank.' });
    else results.push({ type: 'pass', message: 'Site / Building Name provided.' });

    if (!siteAddress.trim()) results.push({ type: 'error', message: 'Site Address is required.' });
    else results.push({ type: 'pass', message: 'Site Address provided.' });

    const form = formRef.current;
    if (form) {
      const get = (name: string) => String(new FormData(form).get(name) || '').trim();

      if (!get('existingCircuitRef')) results.push({ type: 'error', message: 'Circuit designation / reference is required.' });
      else results.push({ type: 'pass', message: 'Circuit designation / reference provided.' });

      if (!get('protectiveDeviceType')) results.push({ type: 'warning', message: 'Protective device type is not recorded.' });
      else results.push({ type: 'pass', message: 'Protective device type provided.' });

      if (!get('protectiveDeviceRating')) results.push({ type: 'warning', message: 'Protective device rating (A) is not recorded.' });
      else results.push({ type: 'pass', message: 'Protective device rating (A) provided.' });

      if (!get('testZs')) results.push({ type: 'warning', message: 'Earth fault loop impedance (Zs) is not recorded.' });
      else results.push({ type: 'pass', message: 'Earth fault loop impedance (Zs) provided.' });

      if (!get('testInsulationResistance')) results.push({ type: 'warning', message: 'Insulation resistance result is not recorded.' });
      else results.push({ type: 'pass', message: 'Insulation resistance result provided.' });

      if (!get('testPolarity')) results.push({ type: 'warning', message: 'Polarity confirmation is not recorded.' });
      else results.push({ type: 'pass', message: 'Polarity confirmation provided.' });
    }

    setVerifyResults(results);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      formData.set('certificateType', 'MEIWC');

      const result =
        isEditing && editId
          ? await updateCertificate(
              {
                id: Number(editId),
                certificateNumber,
                siteName,
                siteAddress,
                inspectionDate,
              } as any,
              formData,
            )
          : await createCertificate({}, formData);

      if ('error' in result && result.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/electrical/meiwc'));
          return;
        }

        setFormError(result.error);
        return;
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(buildDraftStorageKey());
      }
      setHasSavedDraft(false);

      if (isEditing && editId) {
        router.push(`/certificates/${editId}`);
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
    formData.set('certificateType', 'MEIWC');
    await handleSubmit(formData);
    setGuidedOpen(false);
  };

  const handlePreviewOpen = () => {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const customerId = String(formData.get('customerId') || '');
    const customerName = String(formData.get('customerName') || '');
    const customersArray = Array.isArray(customers) ? customers : [];
    const customer =
      customersArray.find((item: any) => String(item.id) === customerId) ||
      customersArray.find((item: any) => item.name === customerName);

    setPreviewData({
      certificateNumber: String(formData.get('certificateNumber') || ''),
      certificateType: 'MEIWC',
      siteName: String(formData.get('siteName') || ''),
      siteAddress: String(formData.get('siteAddress') || ''),
      inspectionDate: String(formData.get('inspectionDate') || ''),
      nextInspectionDate: '',
      inspectorName: String(formData.get('inspectorName') || ''),
      inspectorQualification: String(formData.get('designerName') || 'Qualified electrical contractor'),
      status: 'draft',
      formData: {
        workType: String(formData.get('workType') || ''),
        supplyType: String(formData.get('supplyType') || ''),
        earthingType: String(formData.get('earthingType') || ''),
        workDescription: String(formData.get('workDescription') || ''),
        workScopeStatement: String(formData.get('workScopeStatement') || ''),
        existingCircuitRef: String(formData.get('existingCircuitRef') || ''),
        protectiveDeviceType: String(formData.get('protectiveDeviceType') || ''),
        protectiveDeviceRating: String(formData.get('protectiveDeviceRating') || ''),
        rcdType: String(formData.get('rcdType') || ''),
        lineConductorSize: String(formData.get('lineConductorSize') || ''),
        cpcSize: String(formData.get('cpcSize') || ''),
        cableType: String(formData.get('cableType') || ''),
        maxDemand: String(formData.get('maxDemand') || ''),
        testContinuityR1R2: String(formData.get('testContinuityR1R2') || ''),
        testInsulationResistance: String(formData.get('testInsulationResistance') || ''),
        testPolarity: String(formData.get('testPolarity') || ''),
        testZs: String(formData.get('testZs') || ''),
        testPfc: String(formData.get('testPfc') || ''),
        testRcd: String(formData.get('testRcd') || ''),
        testNotes: String(formData.get('testNotes') || ''),
        recommendations: String(formData.get('recommendations') || ''),
        overallCondition: String(formData.get('overallCondition') || ''),
        mainCircuitDevice: String(formData.get('mainCircuitDevice') || ''),
        supplyNotes: String(formData.get('supplyNotes') || ''),
      },
      customer: {
        name: customer?.name || customerName || 'Not specified',
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        postcode: customer?.postcode || '',
        contactPerson: customer?.contactPerson || '',
      },
      items: [],
    });
  };

  return (
    <>
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Minor Electrical Installation Works Certificate</h1>
            <p className="max-w-3xl text-muted-foreground">
              Certificate for small electrical additions or alterations to an existing installation.
              Use this for limited works where a full Electrical Installation Certificate is not
              required, but the work still needs a formal record.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => setGuidedOpen(true)}>
              Start Guided Mode
            </Button>
            <Button variant="outline" asChild>
              <Link href="/certificates/new">← Back to Certificate Types</Link>
            </Button>
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit(new FormData(event.currentTarget));
          }}
          className="space-y-6"
        >
          {formError ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          {!isEditing && hasSavedDraft ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-900">Saved draft found</p>
                  <p className="text-xs text-amber-800">Restore a previously saved minor works draft or discard it.</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleDiscardSavedDraft}>
                    Discard saved draft
                  </Button>
                  <Button type="button" onClick={handleRestoreSavedDraft}>
                    Restore saved draft
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <input type="hidden" name="certificateType" value="MEIWC" />

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Certificate number, customer, and location details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <CertificateNumberField
                  value={certificateNumber}
                  onChange={setCertificateNumber}
                  certificateType="MEIWC"
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
                  list="customers-list-meiwc"
                  value={selectedCustomerName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCustomerName(value);

                    const normalizedValue = value.trim().toLowerCase();
                    const exactMatch = customers.find(
                      (item: any) => item.name?.trim().toLowerCase() === normalizedValue,
                    );
                    const prefixMatches = customers.filter((item: any) =>
                      item.name?.trim().toLowerCase().startsWith(normalizedValue),
                    );
                    const customer =
                      exactMatch || (normalizedValue && prefixMatches.length === 1 ? prefixMatches[0] : null);

                    setSelectedCustomer(customer ? String(customer.id) : '');

                    if (customer && !siteName && (customer.name || customer.address)) {
                      setSiteName(customer.name || customer.address || '');
                      setIsSiteNameAuto(true);
                    }

                    if (customer && !siteAddress && customer.address) {
                      setSiteAddress(customer.address);
                      setIsSiteAddressAuto(true);
                    }
                  }}
                  required
                  placeholder="Type customer name"
                />
                <datalist id="customers-list-meiwc">
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project / Work Overview</CardTitle>
              <CardDescription>Summarise the limited electrical works being certified.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site / Building Name</Label>
                  <AddressAutocompleteField
                    id="siteName"
                    name="siteName"
                    placeholder="Building or project name"
                    value={siteName}
                    onChange={(value) => {
                      setSiteName(value);
                      setIsSiteNameAuto(false);
                    }}
                    className={isSiteNameAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''}
                    title={isSiteNameAuto ? 'Auto-populated from selected customer details. Edit if needed.' : undefined}
                    required
                  />
                  {isSiteNameAuto ? (
                    <p className="text-xs text-amber-700">Auto-populated from customer details. Hover the field for details.</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteAddress">Site Address</Label>
                  <AddressAutocompleteField
                    id="siteAddress"
                    name="siteAddress"
                    placeholder="Full site address"
                    value={siteAddress}
                    onChange={(value) => {
                      setSiteAddress(value);
                      setIsSiteAddressAuto(false);
                    }}
                    className={isSiteAddressAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''}
                    title={isSiteAddressAuto ? 'Auto-populated from selected customer address. Edit if needed.' : undefined}
                    required
                  />
                  {isSiteAddressAuto ? (
                    <p className="text-xs text-amber-700">Auto-populated from customer address. Hover the field for details.</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="workType">Type of Work</Label>
                  <Select name="workType">
                    <SelectTrigger id="workType">
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspectionDate">Inspection Date</Label>
                  <DateDropdownField
                    id="inspectionDate"
                    name="inspectionDate"
                    label="Inspection Date"
                    value={inspectionDate}
                    onChange={(value) => {
                      setInspectionDate(value);
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

          <Card>
            <CardHeader>
              <CardTitle>Electrical Supply Details</CardTitle>
              <CardDescription>Record the supply and earthing context relevant to the work.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="supplyType">Supply Type</Label>
                  <Select name="supplyType">
                    <SelectTrigger id="supplyType">
                      <SelectValue placeholder="Select supply type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLY_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="earthingType">Earthing Arrangement</Label>
                  <Select name="earthingType">
                    <SelectTrigger id="earthingType">
                      <SelectValue placeholder="Select earthing arrangement" />
                    </SelectTrigger>
                    <SelectContent>
                      {EARTHING_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mainCircuitDevice">Main Circuit Protective Device</Label>
                  <Select name="mainCircuitDevice">
                    <SelectTrigger id="mainCircuitDevice">
                      <SelectValue placeholder="Select main protective device" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainProtectiveDevices.map((option) => (
                        <SelectItem key={option.id} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplyNotes">Supply / Origin Notes</Label>
                <Textarea
                  id="supplyNotes"
                  name="supplyNotes"
                  rows={4}
                  placeholder="Note the supply characteristics, protection, and any relevant limitations..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Circuit Details (Altered / Added Circuit)</CardTitle>
              <CardDescription>
                Record the specific circuit and protective details for the minor works carried out.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="existingCircuitRef">Circuit Designation / Reference</Label>
                  <Input id="existingCircuitRef" name="existingCircuitRef" placeholder="e.g. Ring Final - GF Sockets" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protectiveDeviceType">Circuit Protective Device Type (EICR)</Label>
                  <Select name="protectiveDeviceType">
                    <SelectTrigger id="protectiveDeviceType">
                      <SelectValue placeholder="Select circuit protective device" />
                    </SelectTrigger>
                    <SelectContent>
                      {circuitProtectiveDevices.map((option) => (
                        <SelectItem key={option.id} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protectiveDeviceRating">Protective Device Rating (A)</Label>
                  <Input id="protectiveDeviceRating" name="protectiveDeviceRating" placeholder="e.g. 32" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="rcdType">RCD / RCBO Type</Label>
                  <Input id="rcdType" name="rcdType" placeholder="e.g. Type A, 30mA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lineConductorSize">Line Conductor Size (mm²)</Label>
                  <Input id="lineConductorSize" name="lineConductorSize" placeholder="e.g. 2.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpcSize">CPC Size (mm²)</Label>
                  <Input id="cpcSize" name="cpcSize" placeholder="e.g. 1.5" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cableType">Cable Type</Label>
                  <Input id="cableType" name="cableType" placeholder="e.g. PVC/PVC twin & earth" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDemand">Maximum Demand / Load (A)</Label>
                  <Input id="maxDemand" name="maxDemand" placeholder="e.g. 18.2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required Test Results (Minor Works)</CardTitle>
              <CardDescription>
                Enter results relevant to the circuit altered or added in this minor works certificate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="testContinuityR1R2">Continuity (R1+R2) (Ω)</Label>
                  <Input id="testContinuityR1R2" name="testContinuityR1R2" placeholder="e.g. 0.72" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testInsulationResistance">Insulation Resistance (MΩ)</Label>
                  <Input id="testInsulationResistance" name="testInsulationResistance" placeholder="e.g. >200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testPolarity">Polarity</Label>
                  <Input id="testPolarity" name="testPolarity" placeholder="e.g. Correct" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="testZs">Earth Fault Loop Impedance (Zs) (Ω)</Label>
                  <Input id="testZs" name="testZs" placeholder="e.g. 0.86" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testPfc">Prospective Fault Current (kA)</Label>
                  <Input id="testPfc" name="testPfc" placeholder="e.g. 1.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testRcd">RCD / RCBO Test Result</Label>
                  <Input id="testRcd" name="testRcd" placeholder="e.g. 25ms @ IΔn" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testNotes">Additional Test Notes</Label>
                <Textarea
                  id="testNotes"
                  name="testNotes"
                  rows={3}
                  placeholder="Any limitations, deviations, instrument notes, or supplementary results..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspection, Testing & Certification Summary</CardTitle>
              <CardDescription>
                Capture a concise record of the limited works, notes, and certification details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="designerName">Designer / Contractor</Label>
                  <Input id="designerName" name="designerName" placeholder="Qualified contractor or designer name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspectorName">Inspector Name</Label>
                  <Input id="inspectorName" name="inspectorName" placeholder="Inspecting electrician name" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workDescription">Description of Work</Label>
                  <Textarea
                    id="workDescription"
                    name="workDescription"
                    rows={3}
                    placeholder="Describe the limited work carried out and what has been certified..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workScopeStatement">Work Scope Statement</Label>
                  <Textarea
                    id="workScopeStatement"
                    name="workScopeStatement"
                    rows={3}
                    placeholder="State the exact scope and extent of minor works certified..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  rows={3}
                  placeholder="Any recommendations for maintenance or improvements..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="overallCondition">Overall Condition</Label>
                <RadioGroup name="overallCondition" className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="satisfactory" id="overallSatisfactory" />
                    <Label htmlFor="overallSatisfactory">Satisfactory</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="requires-attention" id="overallRequiresAttention" />
                    <Label htmlFor="overallRequiresAttention">Requires Attention</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unsatisfactory" id="overallUnsatisfactory" />
                    <Label htmlFor="overallUnsatisfactory">Unsatisfactory</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Explanatory Notes</CardTitle>
              <CardDescription>
                Keep the wording short, clear, and focused on the limited works that were completed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                Use this certificate for minor additions or alterations to an existing installation,
                such as a socket outlet, lighting alteration, or small circuit extension.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Record the exact scope of the work and reference the affected circuit.</li>
                <li>Keep the notes concise so future maintainers can understand the change quickly.</li>
                <li>Use the recommendations area to separate remedial work from advice or optional improvements.</li>
                <li>If the work is larger than a minor alteration, use the full EIC workflow instead.</li>
              </ul>
            </CardContent>
          </Card>

          {verifyResults ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
              <p className="mb-2 font-medium text-slate-800">Verification Results</p>
              <ul className="space-y-1">
                {verifyResults.map((item, index) => (
                  <li
                    key={`${item.type}-${index}`}
                    className={
                      item.type === 'error'
                        ? 'text-red-700'
                        : item.type === 'warning'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                    }
                  >
                    {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            {previewData ? <PreviewModal data={previewData} /> : null}
            <Button type="button" variant="outline" onClick={handleVerify}>
              Verify
            </Button>
            <Button type="button" variant="outline" onClick={handlePreviewOpen}>
              Preview
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? 'Updating Certificate...' : 'Creating Certificate...') : isEditing ? 'Update Certificate' : 'Create Certificate'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={isEditing && editId ? `/certificates/${editId}` : '/certificates/new'}>Cancel</Link>
            </Button>
          </div>
        </form>
      </div>

      <GuidedModeModal
        open={guidedOpen}
        steps={guidedSteps}
        onClose={() => setGuidedOpen(false)}
        onComplete={handleGuidedComplete}
      />
    </>
  );
}

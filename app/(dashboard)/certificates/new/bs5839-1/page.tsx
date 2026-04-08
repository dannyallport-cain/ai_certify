'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

import { createCertificate } from '@/app/(dashboard)/actions';
import { AddressAutocompleteField } from '@/components/AddressAutocompleteField';
import { CertificateNumberField } from '@/components/CertificateNumberField';
import { DateDropdownField } from '@/components/DateDropdownField';
import GuidedModeModal, { Step } from '@/components/GuidedModeModal';
import { NextVisitField } from '@/components/NextVisitField';
import { OrganisationAutocompleteField } from '@/components/OrganisationAutocompleteField';
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

const SERVICE_INTERVALS = [
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '12 Months', months: 12 },
] as const;

const INSPECTION_TYPES = [
  'Routine Service',
  'Commissioning',
  'Annual Test',
  'Quarterly Test',
  'Monthly Test',
  'Weekly Test',
] as const;

const SYSTEM_TYPES = ['L1', 'L2', 'L3', 'L4', 'L5', 'P1', 'P2', 'M'] as const;

export default function BS5839_1CertificatePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const { data: customersData } = useSWR('/api/customers', fetcher);
  const customers = Array.isArray(customersData) ? customersData : [];
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [isSiteNameAuto, setIsSiteNameAuto] = useState(false);
  const [isSiteAddressAuto, setIsSiteAddressAuto] = useState(false);
  const [inspectionDate, setInspectionDate] = useState(getTodayDate());
  const [isInspectionDateAuto, setIsInspectionDateAuto] = useState(true);
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [serviceInterval, setServiceInterval] = useState<
    (typeof SERVICE_INTERVALS)[number]['label'] | ''
  >('');
  const [formError, setFormError] = useState('');

  const serviceIntervalMonths = SERVICE_INTERVALS.find(
    (interval) => interval.label === serviceInterval,
  )?.months;

  const generateCertificateNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    return `BS5839-1-${year}${month}${day}-${random}`;
  };

  useEffect(() => {
    setCertificateNumber(generateCertificateNumber());
  }, []);

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Premises Name', type: 'text' },
    { name: 'siteAddress', label: 'Premises Address', type: 'textarea' },
    { name: 'inspectionDate', label: 'Inspection Date', type: 'text' },
    { name: 'inspectionType', label: 'Inspection Type', type: 'text' },
    { name: 'systemType', label: 'System Category', type: 'text' },
    { name: 'controlPanelMake', label: 'Control Panel Make', type: 'text' },
    { name: 'controlPanelModel', label: 'Control Panel Model', type: 'text' },
    { name: 'inspectorName', label: 'Engineer Name', type: 'text' },
    { name: 'defectsFound', label: 'Defects Found', type: 'textarea' },
  ];

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      formData.append('certificateType', 'BS5839-1');

      const result = await createCertificate({}, formData);

      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/bs5839-1'));
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
    formData.append('certificateType', 'BS5839-1');
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
      customersArray.find((c: any) => String(c.id) === customerId) ||
      customersArray.find((c: any) => c.name === customerName);

    setPreviewData({
      certificateNumber: String(formData.get('certificateNumber') || ''),
      certificateType: 'BS5839_1',
      siteName: String(formData.get('siteName') || ''),
      siteAddress: String(formData.get('siteAddress') || ''),
      inspectionDate: String(formData.get('inspectionDate') || ''),
      nextInspectionDate: String(formData.get('nextVisitDate') || ''),
      inspectorName: String(formData.get('inspectorName') || ''),
      inspectorQualification: String(
        formData.get('inspectorQualification') ||
          formData.get('companyRegistration') ||
          'Fire alarm service engineer',
      ),
      status: 'draft',
      formData: {
        inspectionType: String(formData.get('inspectionType') || ''),
        systemType: String(formData.get('systemType') || ''),
        numberOfZones: String(formData.get('numberOfZones') || ''),
        numberOfDevices: String(formData.get('numberOfDevices') || ''),
        controlPanelMake: String(formData.get('controlPanelMake') || ''),
        controlPanelModel: String(formData.get('controlPanelModel') || ''),
        totalDetectors: String(formData.get('totalDetectors') || ''),
        totalCallPoints: String(formData.get('totalCallPoints') || ''),
        totalSounders: String(formData.get('totalSounders') || ''),
        overallCondition: String(formData.get('overallCondition') || ''),
        defectsFound: String(formData.get('defectsFound') || ''),
        recommendations: String(formData.get('recommendations') || ''),
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
            <h2 className="text-3xl font-bold tracking-tight">
              BS 5839-1 Fire Detection & Alarm Service Certificate
            </h2>
            <p className="max-w-3xl text-muted-foreground">
              Non-domestic fire detection and alarm inspection, test, and maintenance record aligned
              to the current app style and the typical BS 5839-1 service workflow.
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

        <form ref={formRef} action={handleSubmit} className="max-w-6xl space-y-6">
          {formError && (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <input type="hidden" name="certificateType" value="BS5839-1" />

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Certificate number, customer, and certificate owner details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <CertificateNumberField
                  value={certificateNumber}
                  onChange={setCertificateNumber}
                  certificateType="BS5839-1"
                  customerName={selectedCustomerName}
                  siteName={siteName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer</Label>
                <input type="hidden" name="customerId" value={selectedCustomer} />
                <Input
                  id="customerName"
                  name="customerName"
                  list="customers-list-bs5839-1"
                  value={selectedCustomerName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCustomerName(value);

                    const normalizedValue = value.trim().toLowerCase();
                    const exactMatch = customers.find(
                      (customer: any) => customer.name?.trim().toLowerCase() === normalizedValue,
                    );
                    const prefixMatches = customers.filter((customer: any) =>
                      customer.name?.trim().toLowerCase().startsWith(normalizedValue),
                    );
                    const customer =
                      exactMatch ||
                      (normalizedValue && prefixMatches.length === 1 ? prefixMatches[0] : null);

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
                <datalist id="customers-list-bs5839-1">
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Premises & System Overview</CardTitle>
              <CardDescription>
                Record the premises, system category, and core fire alarm equipment being serviced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Premises Name</Label>
                  <OrganisationAutocompleteField
                    id="siteName"
                    name="siteName"
                    placeholder="Building or premises name"
                    required
                    value={siteName}
                    onChange={(value) => {
                      setSiteName(value);
                      setIsSiteNameAuto(false);
                    }}
                    onAddressPick={(address) => {
                      setSiteAddress(address);
                      setIsSiteAddressAuto(true);
                    }}
                    className={
                      isSiteNameAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''
                    }
                    title={
                      isSiteNameAuto ? 'Auto-populated from selected customer details. Edit if needed.' : undefined
                    }
                  />
                  {isSiteNameAuto && (
                    <p className="text-xs text-amber-700" title="This value was auto-filled from the selected customer.">
                      Auto-populated from customer details. Hover the field for details.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsiblePerson">Responsible Person on Site</Label>
                  <Input
                    id="responsiblePerson"
                    name="responsiblePerson"
                    placeholder="Person responsible for the fire alarm system"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteAddress">Premises Address</Label>
                <AddressAutocompleteField
                  id="siteAddress"
                  name="siteAddress"
                  placeholder="Full premises address"
                  value={siteAddress}
                  required
                  onChange={(value) => {
                    setSiteAddress(value);
                    setIsSiteAddressAuto(false);
                  }}
                  className={
                    isSiteAddressAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''
                  }
                  title={
                    isSiteAddressAuto ? 'Auto-populated from selected customer address. Edit if needed.' : undefined
                  }
                />
                {isSiteAddressAuto && (
                  <p
                    className="text-xs text-amber-700"
                    title="This value was auto-filled from the selected customer address."
                  >
                    Auto-populated from customer address. Hover the field for details.
                  </p>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="systemType">System Category</Label>
                  <Select name="systemType">
                    <SelectTrigger id="systemType">
                      <SelectValue placeholder="Select system category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfZones">Number of Zones</Label>
                  <Input id="numberOfZones" name="numberOfZones" type="number" min="0" placeholder="e.g., 8" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfDevices">Total Devices</Label>
                  <Input id="numberOfDevices" name="numberOfDevices" type="number" min="0" placeholder="e.g., 45" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="controlPanelMake">Control Panel Make</Label>
                  <Input
                    id="controlPanelMake"
                    name="controlPanelMake"
                    placeholder="e.g., Kentec, Advanced, Notifier"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="controlPanelModel">Control Panel Model</Label>
                  <Input id="controlPanelModel" name="controlPanelModel" placeholder="Model reference" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="powerSupplyType">Power Supply / Standby Arrangement</Label>
                  <Input
                    id="powerSupplyType"
                    name="powerSupplyType"
                    placeholder="e.g., mains with standby batteries"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Inventory</CardTitle>
              <CardDescription>
                Summarise the main system inventory and detection / notification devices covered by the visit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="totalDetectors">Automatic Detectors</Label>
                  <Input id="totalDetectors" name="totalDetectors" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalCallPoints">Manual Call Points</Label>
                  <Input id="totalCallPoints" name="totalCallPoints" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalSounders">Sounders / VADs</Label>
                  <Input id="totalSounders" name="totalSounders" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interfacesCount">Interfaces / Ancillary Devices</Label>
                  <Input id="interfacesCount" name="interfacesCount" type="number" min="0" placeholder="0" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemNotes">System / Zone Notes</Label>
                <Textarea
                  id="systemNotes"
                  name="systemNotes"
                  placeholder="Summarise the system coverage, zones, cause and effect, remote signalling, interfaces, disabled areas, or notable equipment arrangements..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspection & Test Details</CardTitle>
              <CardDescription>
                Record the visit date, inspection type, service interval, competency details, and service history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <DateDropdownField
                  id="inspectionDate"
                  name="inspectionDate"
                  label="Inspection Date"
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

                <NextVisitField
                  visitDate={inspectionDate}
                  value={nextVisitDate}
                  onChange={setNextVisitDate}
                  periodMonths={serviceIntervalMonths}
                  showPeriodSelect={false}
                  required
                  label="Next Visit Due"
                />

                <div className="space-y-2">
                  <Label htmlFor="inspectionType">Inspection Type</Label>
                  <Select name="inspectionType">
                    <SelectTrigger id="inspectionType">
                      <SelectValue placeholder="Select inspection type" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSPECTION_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="serviceInterval">Service Interval</Label>
                  <Select
                    name="serviceInterval"
                    value={serviceInterval}
                    onValueChange={(value) =>
                      setServiceInterval(value as (typeof SERVICE_INTERVALS)[number]['label'] | '')
                    }
                  >
                    <SelectTrigger id="serviceInterval">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_INTERVALS.map((option) => (
                        <SelectItem key={option.label} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastServiceDate">Last Service Date</Label>
                  <Input id="lastServiceDate" name="lastServiceDate" type="date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installationDate">Original Installation Date</Label>
                  <Input id="installationDate" name="installationDate" type="date" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="inspectorName">Engineer Name</Label>
                  <Input id="inspectorName" name="inspectorName" placeholder="Inspection / maintenance engineer" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspectorQualification">Engineer Qualification</Label>
                  <Input
                    id="inspectorQualification"
                    name="inspectorQualification"
                    placeholder="e.g., FIA qualified, BAFE registered"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyRegistration">Company / Registration</Label>
                  <Input
                    id="companyRegistration"
                    name="companyRegistration"
                    placeholder="e.g., BAFE SP203-1, company registration"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Results & Compliance Checks</CardTitle>
              <CardDescription>
                Record the outcome of the service visit and the key fire alarm compliance checks completed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Overall System Condition</Label>
                <RadioGroup name="overallCondition" className="space-y-3 pt-2">
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="satisfactory" id="overallSatisfactory" className="mt-1" />
                    <Label htmlFor="overallSatisfactory">Satisfactory</Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="requires-attention" id="overallRequiresAttention" className="mt-1" />
                    <Label htmlFor="overallRequiresAttention">Requires Attention</Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="unsatisfactory" id="overallUnsatisfactory" className="mt-1" />
                    <Label htmlFor="overallUnsatisfactory">Unsatisfactory</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="functionalTest">Functional Test</Label>
                  <Select name="functionalTest">
                    <SelectTrigger id="functionalTest">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="not-carried-out">Not Carried Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alarmSoundersTest">Alarm Sounders / VADs</Label>
                  <Select name="alarmSoundersTest">
                    <SelectTrigger id="alarmSoundersTest">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="not-tested">Not Tested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="standbySupplyTest">Standby Supply / Batteries</Label>
                  <Select name="standbySupplyTest">
                    <SelectTrigger id="standbySupplyTest">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="requires-attention">Requires Attention</SelectItem>
                      <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                      <SelectItem value="not-verified">Not Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remoteSignallingTest">Remote Signalling / Interfaces</Label>
                  <Select name="remoteSignallingTest">
                    <SelectTrigger id="remoteSignallingTest">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="not-applicable">Not Applicable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="zonePlanAvailable">Zone Plan / Records Available</Label>
                  <Select name="zonePlanAvailable">
                    <SelectTrigger id="zonePlanAvailable">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="partially">Partially</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="falseAlarmIssues">False Alarm Issues</Label>
                  <Select name="falseAlarmIssues">
                    <SelectTrigger id="falseAlarmIssues">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="significant">Significant</SelectItem>
                      <SelectItem value="under-review">Under Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logbookUpdated">Logbook / Records Updated</Label>
                  <Select name="logbookUpdated">
                    <SelectTrigger id="logbookUpdated">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="partially">Partially</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Defects, Work Carried Out & Recommendations</CardTitle>
              <CardDescription>
                Record faults, remedial work, omissions, and any further action required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defectsFound">Defects / Non-Conformities Found</Label>
                <Textarea
                  id="defectsFound"
                  name="defectsFound"
                  placeholder="Describe any defective detectors, call points, sounders, battery faults, disabled zones, false alarm concerns, overdue maintenance items, or other non-conformities..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workCarriedOut">Work Carried Out</Label>
                <Textarea
                  id="workCarriedOut"
                  name="workCarriedOut"
                  placeholder="Record devices tested, heads cleaned, batteries replaced, faults rectified, cause and effect checks completed, programming changes, or other service work carried out..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendations">Recommendations / Further Action</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  placeholder="List any recommendations for remedial works, device replacement, coverage review, documentation updates, false alarm management, or further investigation..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certifierSignature">Certifier Name</Label>
                <Input
                  id="certifierSignature"
                  name="certifierSignature"
                  placeholder="Name of person issuing certificate"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            {previewData && <PreviewModal data={previewData} />}
            <Button type="button" variant="outline" onClick={handlePreviewOpen}>
              Preview
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Certificate...' : 'Create Certificate'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/certificates/new">Cancel</Link>
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

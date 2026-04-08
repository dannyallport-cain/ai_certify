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

const PREMISES_TYPES = [
  'Office Building',
  'Retail Premises',
  'Industrial Premises',
  'Residential Block',
  'Educational Premises',
  'Healthcare Premises',
  'Hotel / Hospitality',
  'Warehouse',
  'Mixed Use',
  'Other',
] as const;

const SYSTEM_TYPES = [
  'Self-contained Maintained',
  'Self-contained Non-maintained',
  'Self-contained Sustained',
  'Central Battery System',
  'Generator-backed Emergency Lighting',
  'Mixed System',
] as const;

const INSPECTION_TYPES = [
  'Daily / Weekly Visual Check',
  'Monthly Functional Test',
  'Quarterly Inspection',
  'Six-Monthly Inspection',
  'Annual Full Duration Test',
  'Commissioning / Initial Verification',
] as const;

const DURATION_OPTIONS = ['1 hour', '3 hours', 'Other'] as const;

export default function BS5266CertificatePage() {
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
  const [nextInspectionDate, setNextInspectionDate] = useState('');
  const [inspectionType, setInspectionType] = useState<(typeof INSPECTION_TYPES)[number] | ''>('');
  const [formError, setFormError] = useState('');

  const generateCertificateNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    return `EL-${year}${month}${day}-${random}`;
  };

  useEffect(() => {
    setCertificateNumber(generateCertificateNumber());
  }, []);

  const steps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Premises Name', type: 'text' },
    { name: 'siteAddress', label: 'Premises Address', type: 'textarea' },
    { name: 'inspectionDate', label: 'Inspection Date', type: 'text' },
    { name: 'inspectionType', label: 'Inspection Type', type: 'text' },
    { name: 'systemType', label: 'System Type', type: 'text' },
    { name: 'duration', label: 'Rated Duration', type: 'text' },
    { name: 'engineerName', label: 'Engineer Name', type: 'text' },
    { name: 'defectsFound', label: 'Defects Found', type: 'textarea' },
  ];

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      formData.append('certificateType', 'BS5266');

      const result = await createCertificate({}, formData);

      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/bs5266'));
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
    formData.append('certificateType', 'BS5266');
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
      certificateType: 'BS5266',
      siteName: String(formData.get('siteName') || ''),
      siteAddress: String(formData.get('siteAddress') || ''),
      inspectionDate: String(formData.get('inspectionDate') || ''),
      nextInspectionDate: String(formData.get('nextInspectionDate') || ''),
      inspectorName: String(formData.get('engineerName') || ''),
      inspectorQualification: String(
        formData.get('competencyDetails') || formData.get('companyRegistration') || 'Emergency lighting service engineer',
      ),
      status: 'draft',
      formData: {
        inspectionType: String(formData.get('inspectionType') || ''),
        systemType: String(formData.get('systemType') || ''),
        duration: String(formData.get('duration') || ''),
        totalLuminaires: String(formData.get('totalLuminaires') || ''),
        failedUnits: String(formData.get('failedUnits') || ''),
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
              BS 5266 Emergency Lighting Service & Maintenance Certificate
            </h2>
            <p className="max-w-3xl text-muted-foreground">
              Emergency lighting inspection, test, and maintenance record aligned to the current
              app style and the typical BS 5266 service and maintenance workflow.
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

          <input type="hidden" name="certificateType" value="BS5266" />

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
                  certificateType="BS5266"
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
                  list="customers-list-bs5266"
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
                <datalist id="customers-list-bs5266">
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
                Record the premises, occupancy, and emergency lighting arrangement being maintained.
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
                    placeholder="Person responsible for the emergency lighting system"
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
                  onChange={(newValue) => {
                    setSiteAddress(newValue);
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
                  <Label htmlFor="premisesType">Premises Type</Label>
                  <Select name="premisesType">
                    <SelectTrigger id="premisesType">
                      <SelectValue placeholder="Select premises type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREMISES_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floors">Number of Floors</Label>
                  <Input id="floors" name="floors" type="number" min="0" placeholder="e.g., 3" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupancyLoad">Maximum Occupancy</Label>
                  <Input id="occupancyLoad" name="occupancyLoad" type="number" min="0" placeholder="e.g., 150" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="totalFloorArea">Total Floor Area (m²)</Label>
                  <Input id="totalFloorArea" name="totalFloorArea" type="number" min="0" placeholder="e.g., 1200" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemType">System Type</Label>
                  <Select name="systemType">
                    <SelectTrigger id="systemType">
                      <SelectValue placeholder="Select system type" />
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
                  <Label htmlFor="duration">Rated Duration</Label>
                  <Select name="duration">
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((option) => (
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
              <CardTitle>Luminaires & System Inventory</CardTitle>
              <CardDescription>
                Summarise the emergency luminaires, exit signage, and battery equipment covered by the visit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="exitSigns">Exit Signs</Label>
                  <Input id="exitSigns" name="exitSigns" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkheadLights">Bulkhead Luminaires</Label>
                  <Input id="bulkheadLights" name="bulkheadLights" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spotlights">Spotlights / Downlights</Label>
                  <Input id="spotlights" name="spotlights" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="centralBatteryUnits">Central Battery Units</Label>
                  <Input id="centralBatteryUnits" name="centralBatteryUnits" type="number" min="0" placeholder="0" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="slaveLuminaires">Slave Luminaires</Label>
                  <Input id="slaveLuminaires" name="slaveLuminaires" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="highRiskTaskAreaUnits">High Risk Task Area Units</Label>
                  <Input id="highRiskTaskAreaUnits" name="highRiskTaskAreaUnits" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyLightingPanels">Control / Test Panels</Label>
                  <Input id="emergencyLightingPanels" name="emergencyLightingPanels" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalLuminaires">Total Emergency Lighting Points</Label>
                  <Input id="totalLuminaires" name="totalLuminaires" type="number" min="0" placeholder="0" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventorySummary">Inventory / Zone Summary</Label>
                <Textarea
                  id="inventorySummary"
                  name="inventorySummary"
                  placeholder="Summarise luminaires by floor, zone, distribution board, address, test key switch, battery system, or any notable inventory detail..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspection & Test Details</CardTitle>
              <CardDescription>
                Record the inspection type, dates, competency details, and service interval information.
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
                  value={nextInspectionDate}
                  onChange={setNextInspectionDate}
                  required
                  label="Next Inspection Due"
                />

                <div className="space-y-2">
                  <Label htmlFor="inspectionType">Inspection Type</Label>
                  <Select
                    name="inspectionType"
                    value={inspectionType}
                    onValueChange={(value) =>
                      setInspectionType(value as (typeof INSPECTION_TYPES)[number] | '')
                    }
                  >
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
                  <Label htmlFor="lastFullDurationTest">Last Full Duration Test</Label>
                  <Input id="lastFullDurationTest" name="lastFullDurationTest" type="date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="engineerName">Engineer Name</Label>
                  <Input id="engineerName" name="engineerName" placeholder="Inspection / maintenance engineer" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyRegistration">Company / Registration</Label>
                  <Input
                    id="companyRegistration"
                    name="companyRegistration"
                    placeholder="e.g., BAFE SP203-4, NICEIC, company number"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="competencyDetails">Competency / Certification Details</Label>
                  <Input
                    id="competencyDetails"
                    name="competencyDetails"
                    placeholder="Engineer competency or certification details"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testMethod">Test Method</Label>
                  <Input
                    id="testMethod"
                    name="testMethod"
                    placeholder="e.g., simulated mains failure, key switch test, automatic test system"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Results & Compliance Checks</CardTitle>
              <CardDescription>
                Record the outcome of functional, duration, charging, and illumination checks.
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
                      <SelectItem value="not-applicable">Not Applicable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationTest">Duration Test</Label>
                  <Select name="durationTest">
                    <SelectTrigger id="durationTest">
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
                  <Label htmlFor="illuminationTest">Illumination / Coverage Check</Label>
                  <Select name="illuminationTest">
                    <SelectTrigger id="illuminationTest">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="not-verified">Not Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chargingIndicators">Charging Indicators / Battery Status</Label>
                  <Select name="chargingIndicators">
                    <SelectTrigger id="chargingIndicators">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="requires-attention">Requires Attention</SelectItem>
                      <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="failedUnits">Failed Units</Label>
                  <Input id="failedUnits" name="failedUnits" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitsRepaired">Units Repaired</Label>
                  <Input id="unitsRepaired" name="unitsRepaired" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitsReplaced">Units Replaced</Label>
                  <Input id="unitsReplaced" name="unitsReplaced" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="circuitsTested">Circuits / Areas Tested</Label>
                  <Input id="circuitsTested" name="circuitsTested" placeholder="e.g., all escape routes and stair cores" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="signageCondition">Exit Signage Condition</Label>
                  <Select name="signageCondition">
                    <SelectTrigger id="signageCondition">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="requires-attention">Requires Attention</SelectItem>
                      <SelectItem value="missing">Missing / Inadequate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="luminaireCondition">Luminaire Condition</Label>
                  <Select name="luminaireCondition">
                    <SelectTrigger id="luminaireCondition">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="requires-attention">Requires Attention</SelectItem>
                      <SelectItem value="defective">Defective</SelectItem>
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
                  placeholder="Describe any failed luminaires, battery faults, poor coverage, missing signage, charging issues, or wiring faults..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workCarriedOut">Work Carried Out</Label>
                <Textarea
                  id="workCarriedOut"
                  name="workCarriedOut"
                  placeholder="Record lamps, batteries, fittings, drivers, controls, circuit repairs, test switches, or any other service work completed..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendations">Recommendations / Further Action</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  placeholder="List any recommendations for replacement fittings, overdue duration tests, additional coverage, signage improvements, or further remedial work..."
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
        steps={steps}
        onClose={() => setGuidedOpen(false)}
        onComplete={handleGuidedComplete}
      />
    </>
  );
}
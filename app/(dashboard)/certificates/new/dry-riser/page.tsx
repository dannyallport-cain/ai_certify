'use client';

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

const RISER_TYPES = ['Dry Riser', 'Wet Riser', 'Combined System'] as const;
const PIPE_SIZE_OPTIONS = ['100', '150'] as const;
const BUILDING_USE_OPTIONS = [
  'Residential',
  'Office',
  'Retail',
  'Industrial',
  'Hospital',
  'School',
  'Hotel',
  'Mixed Use',
] as const;
const INSPECTION_TYPES = [
  'Weekly Visual Check',
  'Monthly Inspection',
  'Quarterly Test',
  'Annual Full Test',
  'Commissioning',
] as const;
const PUMP_TYPES = ['None - Gravity Fed', 'Booster Pump', 'Fire Pump'] as const;

export default function DryRiserCertificatePage() {
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
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const rand = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    setCertificateNumber(`DR-${new Date().getFullYear()}${rand}`);
  }, []);

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Building Name / Address', type: 'text' },
    { name: 'siteAddress', label: 'Site Address', type: 'textarea' },
    { name: 'buildingHeight', label: 'Building Height', type: 'number' },
    { name: 'buildingUse', label: 'Building Use', type: 'text' },
    { name: 'riserType', label: 'Riser Type', type: 'text' },
    { name: 'pipeSize', label: 'Pipe Size', type: 'text' },
    { name: 'inspectionDate', label: 'Inspection Date', type: 'text' },
    { name: 'pressureTestResult', label: 'Pressure Test Result', type: 'text' },
    { name: 'flowTestResult', label: 'Flow Test Result', type: 'text' },
    { name: 'engineerName', label: 'Inspector Name', type: 'text' },
    { name: 'defectsFound', label: 'Defects Found', type: 'textarea' },
  ];

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      formData.set('certificateType', 'DRY_RISER');

      const result = await createCertificate({}, formData);

      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/dry-riser'));
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
    formData.set('certificateType', 'DRY_RISER');
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
      certificateType: 'DRY_RISER',
      siteName: String(formData.get('siteName') || ''),
      siteAddress: String(formData.get('siteAddress') || ''),
      inspectionDate: String(formData.get('inspectionDate') || ''),
      nextInspectionDate: String(formData.get('nextInspectionDate') || ''),
      inspectorName: String(formData.get('inspectorName') || ''),
      inspectorQualification: String(
        formData.get('companyRegistration') || 'Competent dry riser inspection engineer',
      ),
      status: 'draft',
      formData: {
        buildingHeight: String(formData.get('buildingHeight') || ''),
        floors: String(formData.get('floors') || ''),
        buildingUse: String(formData.get('buildingUse') || ''),
        constructionYear: String(formData.get('constructionYear') || ''),
        riserType: String(formData.get('riserType') || ''),
        pipeSize: String(formData.get('pipeSize') || ''),
        inletConnections: String(formData.get('inletConnections') || ''),
        outletValves: String(formData.get('outletValves') || ''),
        drainValves: String(formData.get('drainValves') || ''),
        pumpType: String(formData.get('pumpType') || ''),
        tankCapacity: String(formData.get('tankCapacity') || ''),
        inspectionType: String(formData.get('inspectionType') || ''),
        staticPressure: String(formData.get('staticPressure') || ''),
        flowingPressure: String(formData.get('flowingPressure') || ''),
        flowRate: String(formData.get('flowRate') || ''),
        pressureTestResult: String(formData.get('pressureTestResult') || ''),
        flowTestResult: String(formData.get('flowTestResult') || ''),
        weatherConditions: String(formData.get('weatherConditions') || ''),
        overallCondition: String(formData.get('overallCondition') || ''),
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
      <div className="mb-6">
        <Button onClick={() => setGuidedOpen(true)} size="lg" className="w-full">
          Start Guided Mode
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Dry Riser Certificate</h1>
            <p className="max-w-3xl text-muted-foreground">
              Dry riser system inspection, testing, and maintenance certificate aligned to BS 9990
              with the same guided workflow and preview behaviour as the stronger certificate pages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/certificates/new">
                <span>← Back to Certificate Types</span>
              </Link>
            </Button>
          </div>
        </div>

        <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void handleSubmit(new FormData(event.currentTarget)); }} className="space-y-6">
          {formError && (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
          <input type="hidden" name="certificateType" value="DRY_RISER" />

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Certificate number, customer, and building details.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <CertificateNumberField
                  value={certificateNumber}
                  onChange={setCertificateNumber}
                  certificateType="DRY_RISER"
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
                  list="customers-list-dry-riser"
                  value={selectedCustomerName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCustomerName(value);
                    const normalizedValue = value.trim().toLowerCase();
                    const exactMatch = customers.find((item: any) => item.name?.trim().toLowerCase() === normalizedValue);
                    const prefixMatches = customers.filter((item: any) => item.name?.trim().toLowerCase().startsWith(normalizedValue));
                    const customer = exactMatch || (normalizedValue && prefixMatches.length === 1 ? prefixMatches[0] : null);
                    setSelectedCustomer(customer ? String(customer.id) : '');

                    if (customer && !siteName && (customer.address || customer.name)) {
                      setSiteName(customer.address || customer.name || '');
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
                <datalist id="customers-list-dry-riser">
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Premises & Building Information</CardTitle>
              <CardDescription>
                Capture the building profile and riser context before test details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Building Name / Address *</Label>
                  <AddressAutocompleteField
                    id="siteName"
                    name="siteName"
                    placeholder="Building name and address"
                    value={siteName}
                    onChange={(newValue) => {
                      setSiteName(newValue);
                      setIsSiteNameAuto(false);
                    }}
                    className={isSiteNameAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''}
                    title={isSiteNameAuto ? 'Auto-populated from selected customer details. Edit if needed.' : undefined}
                    required
                  />
                  {isSiteNameAuto && (
                    <p className="text-xs text-amber-700" title="This value was auto-filled from the selected customer.">
                      Auto-populated from customer details. Hover the field for details.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buildingHeight">Building Height (m)</Label>
                  <Input id="buildingHeight" name="buildingHeight" type="number" step="0.1" placeholder="e.g., 25.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="floors">Number of Floors</Label>
                  <Input id="floors" name="floors" type="number" min="0" placeholder="e.g., 8" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buildingUse">Building Use *</Label>
                  <Select name="buildingUse">
                    <SelectTrigger id="buildingUse">
                      <SelectValue placeholder="Select building use" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUILDING_USE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="constructionYear">Year of Construction</Label>
                  <Input id="constructionYear" name="constructionYear" type="number" min="1900" max="2025" placeholder="e.g., 1995" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dry Riser System Details</CardTitle>
              <CardDescription>System configuration and installed equipment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="riserType">Riser Type *</Label>
                  <Select name="riserType">
                    <SelectTrigger id="riserType">
                      <SelectValue placeholder="Select riser type" />
                    </SelectTrigger>
                    <SelectContent>
                      {RISER_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pipeSize">Main Pipe Size (mm) *</Label>
                  <Select name="pipeSize">
                    <SelectTrigger id="pipeSize">
                      <SelectValue placeholder="Select pipe size" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="inletConnections">Inlet Connections</Label>
                  <Input id="inletConnections" name="inletConnections" type="number" min="0" placeholder="Number of inlets" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outletValves">Outlet Valves</Label>
                  <Input id="outletValves" name="outletValves" type="number" min="0" placeholder="Number of outlets" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drainValves">Drain Valves</Label>
                  <Input id="drainValves" name="drainValves" type="number" min="0" placeholder="Number of drains" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pumpType">Pump Type (if applicable)</Label>
                  <Select name="pumpType">
                    <SelectTrigger id="pumpType">
                      <SelectValue placeholder="Select pump type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PUMP_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tankCapacity">Tank Capacity (L)</Label>
                  <Input id="tankCapacity" name="tankCapacity" type="number" placeholder="e.g., 45000" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Explanatory Notes & Service Guidance</CardTitle>
              <CardDescription>
                Short guidance to keep the workflow aligned with the same annual and commissioning
                model used by the more complete certificate pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                Use this certificate for dry riser inspections, pressure tests, flow tests, and
                commissioning / handover records.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>Record whether the system is dry, wet, or combined and explain any special arrangement.</li>
                <li>Note the building height, number of inlets/outlets, valves, and pump or tank details.</li>
                <li>Capture static pressure, flowing pressure, and flow rate separately so the result is easy to review later.</li>
                <li>Use the defects and recommendations section to separate faults from the work completed on site.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspection Details</CardTitle>
              <CardDescription>Date, test conditions, and engineer details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  <Label htmlFor="inspectionType">Inspection Type *</Label>
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="staticPressure">Static Pressure (bar)</Label>
                  <Input id="staticPressure" name="staticPressure" type="number" step="0.1" placeholder="e.g., 6.5" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flowingPressure">Flowing Pressure (bar)</Label>
                  <Input id="flowingPressure" name="flowingPressure" type="number" step="0.1" placeholder="e.g., 5.8" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flowRate">Flow Rate (L/min)</Label>
                  <Input id="flowRate" name="flowRate" type="number" placeholder="e.g., 1500" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="engineerName">Inspector Name *</Label>
                  <Input id="engineerName" name="engineerName" placeholder="Inspector name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weatherConditions">Weather Conditions</Label>
                  <Input id="weatherConditions" name="weatherConditions" placeholder="e.g., Dry, 15°C" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pressure Test Results</CardTitle>
              <CardDescription>Record the dry riser test outcome and key result notes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Pressure Test Result</Label>
                  <RadioGroup name="pressureTestResult" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pass" id="pressurePass" />
                      <Label htmlFor="pressurePass">Pass</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fail" id="pressureFail" />
                      <Label htmlFor="pressureFail">Fail</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Flow Test Result</Label>
                  <RadioGroup name="flowTestResult" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pass" id="flowPass" />
                      <Label htmlFor="flowPass">Pass</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fail" id="flowFail" />
                      <Label htmlFor="flowFail">Fail</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overall Assessment</CardTitle>
              <CardDescription>Record the final certificate outcome.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Overall System Condition *</Label>
                <RadioGroup name="overallCondition" className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="satisfactory" id="satisfactory" />
                    <Label htmlFor="satisfactory">Satisfactory</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unsatisfactory" id="unsatisfactory" />
                    <Label htmlFor="unsatisfactory">Unsatisfactory</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="requires-attention" id="requiresAttention" />
                    <Label htmlFor="requiresAttention">Requires Attention</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Visual Inspection Result</Label>
                  <RadioGroup name="visualInspection" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pass" id="visualPass" />
                      <Label htmlFor="visualPass">Pass</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fail" id="visualFail" />
                      <Label htmlFor="visualFail">Fail</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Accessibility</Label>
                  <RadioGroup name="accessibility" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="satisfactory" id="accessOk" />
                      <Label htmlFor="accessOk">Satisfactory</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="restricted" id="accessRestricted" />
                      <Label htmlFor="accessRestricted">Restricted</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Defects, Work Carried Out & Recommendations</CardTitle>
              <CardDescription>
                Document defects, service work completed, and any follow-up actions required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defectsFound">Defects / Non-Conformities Found</Label>
                <Textarea
                  id="defectsFound"
                  name="defectsFound"
                  placeholder="Describe any access issues, failed tests, missing signage, damaged valves, pressure losses, or other defects..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workRequired">Work Required</Label>
                <Textarea
                  id="workRequired"
                  name="workRequired"
                  placeholder="Describe any remedial work required..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  placeholder="Any recommendations for maintenance or improvements..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certifierSignature">Certifier Name *</Label>
                <Input
                  id="certifierSignature"
                  name="certifierSignature"
                  placeholder="Name of person issuing certificate"
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

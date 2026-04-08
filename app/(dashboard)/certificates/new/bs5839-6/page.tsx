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

const PROPERTY_TYPES = [
  'House',
  'Flat',
  'Maisonette',
  'Bungalow',
  'HMO',
  'Sheltered Housing',
  'Residential Care',
  'Other',
] as const;

const OCCUPANCY_TYPES = [
  'Owner Occupied',
  'Rental Property',
  'Social Housing',
  'Holiday Let',
  'Supported Living',
  'Other',
] as const;

const SYSTEM_GRADES = ['A', 'B', 'C', 'D1', 'D2', 'F1', 'F2'] as const;

const SYSTEM_CATEGORIES = ['LD1', 'LD2', 'LD3', 'PD1', 'PD2'] as const;

const INTERCONNECTION_TYPES = ['Hardwired', 'Wireless', 'Mixed'] as const;

export default function BS5839_6CertificatePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const generateCertificateNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    return `BS5839-6-${year}${month}${day}-${random}`;
  };

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
  const [visitDate, setVisitDate] = useState(getTodayDate());
  const [isVisitDateAuto, setIsVisitDateAuto] = useState(true);
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setCertificateNumber(generateCertificateNumber());
  }, []);

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Property / Premises Name', type: 'text' },
    { name: 'siteAddress', label: 'Property Address', type: 'textarea' },
    { name: 'propertyType', label: 'Property Type', type: 'text' },
    { name: 'floors', label: 'Number of Floors', type: 'number' },
    { name: 'bedrooms', label: 'Number of Bedrooms', type: 'number' },
    { name: 'systemGrade', label: 'System Grade', type: 'text' },
    { name: 'systemCategory', label: 'System Category', type: 'text' },
    { name: 'inspectorName', label: 'Engineer Name', type: 'text' },
    { name: 'defectsFound', label: 'Defects Found', type: 'textarea' },
  ];

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      formData.append('certificateType', 'BS5839-6');

      const result = await createCertificate({}, formData);
      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/bs5839-6'));
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
    formData.append('certificateType', 'BS5839-6');
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
      certificateType: 'BS5839_6',
      siteName: String(formData.get('siteName') || ''),
      siteAddress: String(formData.get('siteAddress') || ''),
      inspectionDate: String(formData.get('visitDate') || ''),
      nextInspectionDate: String(formData.get('nextVisitDate') || ''),
      inspectorName: String(formData.get('inspectorName') || ''),
      inspectorQualification: String(
        formData.get('inspectorQualification') ||
          formData.get('companyRegistration') ||
          'Domestic fire alarm engineer',
      ),
      status: 'draft',
      formData: {
        propertyType: String(formData.get('propertyType') || ''),
        floors: String(formData.get('floors') || ''),
        bedrooms: String(formData.get('bedrooms') || ''),
        occupancy: String(formData.get('occupancy') || ''),
        systemGrade: String(formData.get('systemGrade') || ''),
        systemCategory: String(formData.get('systemCategory') || ''),
        smokeDetectors: String(formData.get('smokeDetectors') || ''),
        heatDetectors: String(formData.get('heatDetectors') || ''),
        coDetectors: String(formData.get('coDetectors') || ''),
        controlPanel: String(formData.get('controlPanel') || ''),
        interconnection: String(formData.get('interconnection') || ''),
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
              BS 5839-6 Domestic Fire Alarm Service Certificate
            </h2>
            <p className="max-w-3xl text-muted-foreground">
              Domestic fire detection and alarm inspection, test, and maintenance record aligned to
              the current app style and the typical BS 5839-6 service workflow.
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

          <input type="hidden" name="certificateType" value="BS5839-6" />

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
                  certificateType="BS5839-6"
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
                  list="customers-list-bs5839-6"
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
                <datalist id="customers-list-bs5839-6">
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property & Occupancy Overview</CardTitle>
              <CardDescription>
                Record the dwelling details, address, and occupancy profile for the system being serviced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Property / Premises Name</Label>
                  <OrganisationAutocompleteField
                    id="siteName"
                    name="siteName"
                    placeholder="Property, occupier, or premises name"
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
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select name="propertyType" required>
                    <SelectTrigger id="propertyType">
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteAddress">Property Address</Label>
                <AddressAutocompleteField
                  id="siteAddress"
                  name="siteAddress"
                  placeholder="Full property address"
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
                  required
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
                  <Label htmlFor="floors">Number of Floors</Label>
                  <Input id="floors" name="floors" type="number" min="1" placeholder="e.g., 2" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Number of Bedrooms</Label>
                  <Input id="bedrooms" name="bedrooms" type="number" min="0" placeholder="e.g., 3" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupancy">Occupancy Type</Label>
                  <Select name="occupancy">
                    <SelectTrigger id="occupancy">
                      <SelectValue placeholder="Select occupancy" />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCUPANCY_TYPES.map((option) => (
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
                  <Label htmlFor="responsiblePerson">Responsible Person</Label>
                  <Input
                    id="responsiblePerson"
                    name="responsiblePerson"
                    placeholder="Occupier, landlord, or responsible person"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupantsCount">Occupants</Label>
                  <Input id="occupantsCount" name="occupantsCount" type="number" min="0" placeholder="e.g., 4" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialRisks">Special Risks / Vulnerabilities</Label>
                  <Input
                    id="specialRisks"
                    name="specialRisks"
                    placeholder="e.g., mobility issues, open-plan kitchen, loft conversion"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Domestic Fire Alarm System Details</CardTitle>
              <CardDescription>
                Record the system grade, category, detectors, and interconnection arrangement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="systemGrade">System Grade</Label>
                  <Select name="systemGrade">
                    <SelectTrigger id="systemGrade">
                      <SelectValue placeholder="Select system grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_GRADES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemCategory">System Category</Label>
                  <Select name="systemCategory">
                    <SelectTrigger id="systemCategory">
                      <SelectValue placeholder="Select system category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_CATEGORIES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="smokeDetectors">Smoke Detectors</Label>
                  <Input id="smokeDetectors" name="smokeDetectors" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heatDetectors">Heat Detectors</Label>
                  <Input id="heatDetectors" name="heatDetectors" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coDetectors">CO Detectors</Label>
                  <Input id="coDetectors" name="coDetectors" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalAlarms">Additional Alarms</Label>
                  <Input
                    id="additionalAlarms"
                    name="additionalAlarms"
                    type="number"
                    min="0"
                    placeholder="e.g., combined units"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="controlPanel">Control Equipment / Main Unit</Label>
                  <Input id="controlPanel" name="controlPanel" placeholder="e.g., Aico Ei1529RC or panel reference" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interconnection">Interconnection Method</Label>
                  <Select name="interconnection">
                    <SelectTrigger id="interconnection">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERCONNECTION_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemCoverageNotes">Coverage / Device Notes</Label>
                <Textarea
                  id="systemCoverageNotes"
                  name="systemCoverageNotes"
                  placeholder="Summarise coverage by hallways, landings, lounges, kitchens, bedrooms, loft spaces, outbuildings, escape routes, or any limitations noted..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspection & Test Details</CardTitle>
              <CardDescription>Visit date, next visit, engineer details, and service information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <DateDropdownField
                  id="visitDate"
                  name="visitDate"
                  label="Visit Date"
                  value={visitDate}
                  onChange={(newDate) => {
                    setVisitDate(newDate);
                    setIsVisitDateAuto(false);
                  }}
                  required
                  isAutoPopulated={isVisitDateAuto}
                  autoTitle="Auto-populated with today's date. Edit if required."
                  autoHelpText="Auto-populated with today's date. Hover the field for details."
                />

                <NextVisitField
                  visitDate={visitDate}
                  value={nextVisitDate}
                  onChange={setNextVisitDate}
                  required
                  label="Next Visit Due"
                />

                <div className="space-y-2">
                  <Label htmlFor="lastServiceDate">Last Service Date</Label>
                  <Input id="lastServiceDate" name="lastServiceDate" type="date" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="inspectorName">Engineer Name</Label>
                  <Input id="inspectorName" name="inspectorName" placeholder="Inspection / maintenance engineer" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspectorQualification">Engineer Qualification</Label>
                  <Input
                    id="inspectorQualification"
                    name="inspectorQualification"
                    placeholder="e.g., domestic fire alarm engineer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyRegistration">Company / Registration</Label>
                  <Input
                    id="companyRegistration"
                    name="companyRegistration"
                    placeholder="e.g., BAFE, NICEIC, company number"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="testMethod">Test Method</Label>
                  <Input
                    id="testMethod"
                    name="testMethod"
                    placeholder="e.g., detector test aerosol, heat source, test button, mains isolation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batteryType">Battery / Backup Arrangement</Label>
                  <Input
                    id="batteryType"
                    name="batteryType"
                    placeholder="e.g., sealed lithium backup, integral standby battery"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Results & Compliance Checks</CardTitle>
              <CardDescription>
                Record the overall outcome and the core domestic fire alarm checks completed.
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
                      <SelectItem value="not-tested">Not Tested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audibilityTest">Audibility Test</Label>
                  <Select name="audibilityTest">
                    <SelectTrigger id="audibilityTest">
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
                  <Label htmlFor="standbySupplyTest">Standby Supply / Battery Test</Label>
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
                  <Label htmlFor="interlinkTest">Interlink / Link Test</Label>
                  <Select name="interlinkTest">
                    <SelectTrigger id="interlinkTest">
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
                  <Label htmlFor="mainsSupplyTest">Mains Supply Check</Label>
                  <Select name="mainsSupplyTest">
                    <SelectTrigger id="mainsSupplyTest">
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
                  <Label htmlFor="detectorSiting">Detector Siting / Coverage</Label>
                  <Select name="detectorSiting">
                    <SelectTrigger id="detectorSiting">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="requires-review">Requires Review</SelectItem>
                      <SelectItem value="limited">Limited / Incomplete</SelectItem>
                      <SelectItem value="not-verified">Not Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userInstructionGiven">User Instruction / Handover Given</Label>
                  <Select name="userInstructionGiven">
                    <SelectTrigger id="userInstructionGiven">
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
                  placeholder="Describe any missing alarms, failed heads, dead backup batteries, poor audibility, incorrect siting, damaged devices, or other non-conformities..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workCarriedOut">Work Carried Out</Label>
                <Textarea
                  id="workCarriedOut"
                  name="workCarriedOut"
                  placeholder="Record alarms cleaned or replaced, batteries changed, devices tested, heads repositioned, mains supply checked, or any other service work completed..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendations">Recommendations / Further Action</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  placeholder="List any recommendations for additional detection, upgrades to grade/category, battery replacement, improved coverage, or further remedial works..."
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

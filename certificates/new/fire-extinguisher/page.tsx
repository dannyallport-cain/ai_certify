'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';

import { createCertificate } from '../../../actions';
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
import { usePersistentFormDraft } from '@/lib/use-persistent-form-draft';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error('Failed to fetch');
    }

    return res.json();
  });

const SERVICE_LEVELS = [
  'Visual Inspection',
  'Basic Service',
  'Extended Service',
  'Overhaul / Discharge Test',
  'Commissioning / Installation Review',
] as const;

const AREA_RISK_OPTIONS = [
  'Light / Low Risk',
  'Ordinary / Medium Risk',
  'High Risk',
  'Special Hazard Area',
] as const;

export default function FireExtinguisherCertificatePage() {
  const router = useRouter();
  const pathname = usePathname();
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
  const [serviceDate, setServiceDate] = useState(getTodayDate());
  const [isServiceDateAuto, setIsServiceDateAuto] = useState(true);
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [serviceLevel, setServiceLevel] = useState<(typeof SERVICE_LEVELS)[number] | ''>('');
  const [formError, setFormError] = useState('');
  const { clearDraft } = usePersistentFormDraft({
    formRef,
    pathname: pathname || '/certificates/new/fire-extinguisher',
    templateId: 'FIRE_EXTINGUISHER',
  });

  const generateCertificateNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    return `FE-${year}${month}${day}-${random}`;
  };

  useEffect(() => {
    setCertificateNumber(generateCertificateNumber());
  }, []);

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Premises Name', type: 'text' },
    { name: 'siteAddress', label: 'Premises Address', type: 'textarea' },
    { name: 'serviceDate', label: 'Service Date', type: 'text' },
    { name: 'serviceLevel', label: 'Service Level', type: 'text' },
    { name: 'responsiblePerson', label: 'Responsible Person', type: 'text' },
    { name: 'engineerName', label: 'Engineer Name', type: 'text' },
    { name: 'inventorySummary', label: 'Equipment Inventory Summary', type: 'textarea' },
  ];

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      formData.append('certificateType', 'Fire Extinguisher');

      const result = await createCertificate({}, formData);

      if (!result?.error) {
        clearDraft();
      }

      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/fire-extinguisher'));
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
    formData.append('certificateType', 'Fire Extinguisher');
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
      certificateType: 'FIRE_EXTINGUISHER',
      siteName: String(formData.get('siteName') || ''),
      siteAddress: String(formData.get('siteAddress') || ''),
      inspectionDate: String(formData.get('serviceDate') || ''),
      nextInspectionDate: String(formData.get('nextServiceDate') || ''),
      inspectorName: String(formData.get('engineerName') || ''),
      inspectorQualification: String(
        formData.get('competencyDetails') || formData.get('companyRegistration') || 'Competent extinguisher service engineer',
      ),
      status: 'draft',
      formData: {
        serviceLevel: String(formData.get('serviceLevel') || ''),
        siteRiskCategory: String(formData.get('siteRiskCategory') || ''),
        totalUnits: String(formData.get('totalUnits') || ''),
        inventorySummary: String(formData.get('inventorySummary') || ''),
        serviceLabelApplied: String(formData.get('serviceLabelApplied') || ''),
        signageCondition: String(formData.get('signageCondition') || ''),
        mountingCondition: String(formData.get('mountingCondition') || ''),
        accessCondition: String(formData.get('accessCondition') || ''),
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
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Fire Extinguisher Servicing Certificate
            </h2>
            <p className="max-w-3xl text-muted-foreground">
              Portable fire extinguisher and fire blanket servicing certificate aligned to the
              British Standard servicing model approach used for annual maintenance records.
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

          <input type="hidden" name="certificateType" value="Fire Extinguisher" />

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
                  certificateType="Fire Extinguisher"
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
                  list="customers-list-fire-extinguisher"
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
                <datalist id="customers-list-fire-extinguisher">
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Premises & Responsible Person</CardTitle>
              <CardDescription>
                Record the premises details and the person responsible for the fire-fighting equipment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Premises Name</Label>
                  <Input
                    id="siteName"
                    name="siteName"
                    placeholder="Site or building name"
                    value={siteName}
                    onChange={(e) => {
                      setSiteName(e.target.value);
                      setIsSiteNameAuto(false);
                    }}
                    className={
                      isSiteNameAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''
                    }
                    title={
                      isSiteNameAuto ? 'Auto-populated from selected customer details. Edit if needed.' : undefined
                    }
                    required
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
                    placeholder="Person responsible for fire safety equipment"
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
                  <Label htmlFor="siteRiskCategory">Risk Category</Label>
                  <Select name="siteRiskCategory">
                    <SelectTrigger id="siteRiskCategory">
                      <SelectValue placeholder="Select risk category" />
                    </SelectTrigger>
                    <SelectContent>
                      {AREA_RISK_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfFloors">Number of Floors</Label>
                  <Input id="numberOfFloors" name="numberOfFloors" type="number" min="0" placeholder="e.g., 2" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupancyType">Occupancy Type</Label>
                  <Input id="occupancyType" name="occupancyType" placeholder="e.g., Offices, retail, mixed use" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Visit Details</CardTitle>
              <CardDescription>
                Capture the service type, attendance date, and competency details in line with an annual maintenance record.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <DateDropdownField
                  id="serviceDate"
                  name="serviceDate"
                  label="Service Date"
                  value={serviceDate}
                  onChange={(newDate) => {
                    setServiceDate(newDate);
                    setIsServiceDateAuto(false);
                  }}
                  required
                  isAutoPopulated={isServiceDateAuto}
                  autoTitle="Auto-populated with today's date. Edit if the service was carried out on another date."
                  autoHelpText="Auto-populated with today's date. Hover the field for details."
                />

                <NextVisitField
                  visitDate={serviceDate}
                  value={nextServiceDate}
                  onChange={setNextServiceDate}
                  required
                  label="Next Service Due"
                />

                <div className="space-y-2">
                  <Label htmlFor="serviceLevel">Service Level</Label>
                  <Select
                    name="serviceLevel"
                    value={serviceLevel}
                    onValueChange={(value) =>
                      setServiceLevel(value as (typeof SERVICE_LEVELS)[number] | '')
                    }
                  >
                    <SelectTrigger id="serviceLevel">
                      <SelectValue placeholder="Select service level" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_LEVELS.map((option) => (
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
                  <Label htmlFor="engineerName">Engineer Name</Label>
                  <Input id="engineerName" name="engineerName" placeholder="Servicing engineer name" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyRegistration">Company / Registration</Label>
                  <Input
                    id="companyRegistration"
                    name="companyRegistration"
                    placeholder="e.g., BAFE SP101, company number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="competencyDetails">Competency / Certification Details</Label>
                  <Input
                    id="competencyDetails"
                    name="competencyDetails"
                    placeholder="Engineer competency or certification details"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Equipment Inventory Summary</CardTitle>
              <CardDescription>
                Summarise the portable extinguishers and fire blankets maintained during the visit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="waterUnits">Water Units</Label>
                  <Input id="waterUnits" name="waterUnits" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foamUnits">Foam Units</Label>
                  <Input id="foamUnits" name="foamUnits" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="co2Units">CO₂ Units</Label>
                  <Input id="co2Units" name="co2Units" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="powderUnits">Powder Units</Label>
                  <Input id="powderUnits" name="powderUnits" type="number" min="0" placeholder="0" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="wetChemicalUnits">Wet Chemical Units</Label>
                  <Input id="wetChemicalUnits" name="wetChemicalUnits" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cleanAgentUnits">Clean Agent / Specialist Units</Label>
                  <Input id="cleanAgentUnits" name="cleanAgentUnits" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fireBlanketsCount">Fire Blankets</Label>
                  <Input id="fireBlanketsCount" name="fireBlanketsCount" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalUnits">Total Units on Site</Label>
                  <Input id="totalUnits" name="totalUnits" type="number" min="0" placeholder="Total number serviced" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventorySummary">Inventory / Location Summary</Label>
                <Textarea
                  id="inventorySummary"
                  name="inventorySummary"
                  placeholder="Record extinguisher types, sizes, locations, serial numbers, or a summary of the installed inventory..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Results</CardTitle>
              <CardDescription>
                Record servicing outcomes, condemnations, replacements, and label/signage checks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="unitsServiced">Units Serviced</Label>
                  <Input id="unitsServiced" name="unitsServiced" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitsCondemned">Units Condemned</Label>
                  <Input id="unitsCondemned" name="unitsCondemned" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitsReplaced">Units Replaced</Label>
                  <Input id="unitsReplaced" name="unitsReplaced" type="number" min="0" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitsRemoved">Units Removed</Label>
                  <Input id="unitsRemoved" name="unitsRemoved" type="number" min="0" placeholder="0" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="serviceLabelApplied">Service Label / Maintenance Record Updated</Label>
                  <Select name="serviceLabelApplied">
                    <SelectTrigger id="serviceLabelApplied">
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
                  <Label htmlFor="signageCondition">Signage Condition</Label>
                  <Select name="signageCondition">
                    <SelectTrigger id="signageCondition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="requires-attention">Requires Attention</SelectItem>
                      <SelectItem value="missing">Missing / Inadequate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mountingCondition">Mountings / Brackets Condition</Label>
                  <Select name="mountingCondition">
                    <SelectTrigger id="mountingCondition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="requires-attention">Requires Attention</SelectItem>
                      <SelectItem value="defective">Defective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="accessCondition">Access / Visibility</Label>
                  <Select name="accessCondition">
                    <SelectTrigger id="accessCondition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                      <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dischargeTestRequired">Extended Service / Discharge Test Required</Label>
                  <Select name="dischargeTestRequired">
                    <SelectTrigger id="dischargeTestRequired">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overallCondition">Overall Condition</Label>
                  <Select name="overallCondition">
                    <SelectTrigger id="overallCondition">
                      <SelectValue placeholder="Select overall result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="requires-attention">Requires Attention</SelectItem>
                      <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Coverage Assessment</Label>
                <RadioGroup name="coverageAssessment" className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="adequate" id="coverageAdequate" className="mt-1" />
                    <Label htmlFor="coverageAdequate">Equipment provision appears adequate for the risk</Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="review-required" id="coverageReviewRequired" className="mt-1" />
                    <Label htmlFor="coverageReviewRequired">Review required - coverage or siting may need improvement</Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="additional-required" id="coverageAdditionalRequired" className="mt-1" />
                    <Label htmlFor="coverageAdditionalRequired">Additional or replacement equipment required</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Defects, Work Carried Out & Recommendations</CardTitle>
              <CardDescription>
                Document defects, service work completed, and any departures from the expected standard arrangement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defectsFound">Defects / Non-Conformities Found</Label>
                <Textarea
                  id="defectsFound"
                  name="defectsFound"
                  placeholder="Describe any missing units, pressure loss, damaged hoses, failed inspections, out-of-test units, or siting/signage defects..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workCarriedOut">Work Carried Out</Label>
                <Textarea
                  id="workCarriedOut"
                  name="workCarriedOut"
                  placeholder="Record servicing actions completed, parts changed, refills, replacements, condemnations, relocations, and maintenance labels applied..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendations">Recommendations / Further Action</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  placeholder="List any recommendations for additional equipment, signage, testing, replacement, staff instruction, or overdue extended servicing..."
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
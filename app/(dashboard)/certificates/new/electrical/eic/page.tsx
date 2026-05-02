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

const INSTALLATION_TYPES = [
  'New installation',
  'Addition',
  'Alteration',
  'Variation / amendment',
  'Partial re-certification',
] as const;

const SUPPLY_TYPES = [
  '1-phase (2 wire) ac',
  '1-phase (3 wire) ac',
  '3-phase (3 wire) ac',
  '3-phase (4 wire) ac',
] as const;

const EARTHING_TYPES = ['TN-S', 'TN-C-S (PME)', 'TT', 'IT', 'TNC'] as const;
const PROTECTIVE_DEVICE_TYPES = ['Fuse', 'MCB', 'MCCB', 'RCBO', 'RCD', 'Switch-fuse', 'Other'] as const;

export default function ElectricalInstallationCertificatePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

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
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isInspectionDateAuto, setIsInspectionDateAuto] = useState(true);
  const [nextInspectionDate, setNextInspectionDate] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const rand = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    setCertificateNumber(`EIC-${new Date().getFullYear()}${rand}`);
  }, []);

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Site / Building Name', type: 'text' },
    { name: 'siteAddress', label: 'Site Address', type: 'textarea' },
    { name: 'installationType', label: 'Installation Type', type: 'text' },
    { name: 'supplyType', label: 'Supply Type', type: 'text' },
    { name: 'earthingType', label: 'Earthing Arrangement', type: 'text' },
    { name: 'inspectionDate', label: 'Inspection Date', type: 'text' },
    { name: 'designerName', label: 'Designer / Contractor', type: 'text' },
    { name: 'inspectorName', label: 'Inspector Name', type: 'text' },
    { name: 'workDescription', label: 'Description of Work', type: 'textarea' },
  ];

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormError('');

    try {
      formData.set('certificateType', 'EIC');

      const result = await createCertificate({}, formData);

      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/electrical/eic'));
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
    formData.set('certificateType', 'EIC');
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
      certificateType: 'EIC',
      siteName: String(formData.get('siteName') || ''),
      siteAddress: String(formData.get('siteAddress') || ''),
      inspectionDate: String(formData.get('inspectionDate') || ''),
      nextInspectionDate: String(formData.get('nextInspectionDate') || ''),
      inspectorName: String(formData.get('inspectorName') || ''),
      inspectorQualification: String(formData.get('designerName') || 'Qualified electrical contractor'),
      status: 'draft',
      formData: {
        installationType: String(formData.get('installationType') || ''),
        supplyType: String(formData.get('supplyType') || ''),
        earthingType: String(formData.get('earthingType') || ''),
        descriptionOfWork: String(formData.get('descriptionOfWork') || ''),
        designNotes: String(formData.get('designNotes') || ''),
        constructionNotes: String(formData.get('constructionNotes') || ''),
        inspectionNotes: String(formData.get('inspectionNotes') || ''),
        testNotes: String(formData.get('testNotes') || ''),
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
            <h1 className="text-3xl font-bold">Electrical Installation Certificate</h1>
            <p className="max-w-3xl text-muted-foreground">
              Certificate for new electrical installation work, additions, alterations, or other
              certified works. Designed to keep the workflow formal, standard-aligned, and easy to
              understand alongside the existing EICR and CP12 products.
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

          <input type="hidden" name="certificateType" value="EIC" />

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Certificate number, customer, and site details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <CertificateNumberField
                  value={certificateNumber}
                  onChange={setCertificateNumber}
                  certificateType="EIC"
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
                  list="customers-list-eic"
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
                <datalist id="customers-list-eic">
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project / Installation Overview</CardTitle>
              <CardDescription>Describe the scope of the certified electrical work.</CardDescription>
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
                  <Label htmlFor="installationType">Installation Type</Label>
                  <Select name="installationType">
                    <SelectTrigger id="installationType">
                      <SelectValue placeholder="Select installation type" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTALLATION_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descriptionOfWork">Description of Work</Label>
                  <Textarea
                    id="descriptionOfWork"
                    name="descriptionOfWork"
                    rows={3}
                    placeholder="Describe the installation, addition, alteration, or variation being certified..."
                  />
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
              <CardTitle>Electrical Supply & Earthing Details</CardTitle>
              <CardDescription>Record the origin and supply characteristics relevant to the certificate.</CardDescription>
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
                  <Label htmlFor="protectiveDeviceType">Main Protective Device</Label>
                  <Select name="protectiveDeviceType">
                    <SelectTrigger id="protectiveDeviceType">
                      <SelectValue placeholder="Select protective device" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROTECTIVE_DEVICE_TYPES.map((option) => (
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
                  <Label htmlFor="supplyVoltage">Nominal Supply Voltage (V)</Label>
                  <Input id="supplyVoltage" name="supplyVoltage" placeholder="230 / 400" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mainSwitchRating">Main Switch Rating (A)</Label>
                  <Input id="mainSwitchRating" name="mainSwitchRating" placeholder="e.g., 100" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxDemand">Maximum Demand</Label>
                  <Input id="maxDemand" name="maxDemand" placeholder="e.g., 48A" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="originNotes">Origin / Supply Notes</Label>
                <Textarea
                  id="originNotes"
                  name="originNotes"
                  rows={4}
                  placeholder="Record the origin details, supply protection, earthing arrangement, and any relevant limitations..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Design, Construction & Inspection Summary</CardTitle>
              <CardDescription>
                A concise summary block to capture the certificate narrative in a way that mirrors the
                formal BS 7671 model form.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="designerName">Designer / Contractor</Label>
                  <Input
                    id="designerName"
                    name="designerName"
                    placeholder="Qualified contractor or designer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspectorName">Inspector Name</Label>
                  <Input id="inspectorName" name="inspectorName" placeholder="Inspecting electrician name" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="designNotes">Design Notes</Label>
                  <Textarea
                    id="designNotes"
                    name="designNotes"
                    rows={3}
                    placeholder="Design responsibility, intended use, and any important selection notes..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="constructionNotes">Construction Notes</Label>
                  <Textarea
                    id="constructionNotes"
                    name="constructionNotes"
                    rows={3}
                    placeholder="Installation method, routing, containment, or notable construction notes..."
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inspectionNotes">Inspection Notes</Label>
                  <Textarea
                    id="inspectionNotes"
                    name="inspectionNotes"
                    rows={3}
                    placeholder="Inspection observations, scope limits, or items requiring further attention..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testNotes">Test Notes</Label>
                  <Textarea
                    id="testNotes"
                    name="testNotes"
                    rows={3}
                    placeholder="Continuity, insulation, polarity, Zs, RCD, and other test notes..."
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nextInspectionDate">Next Inspection Due</Label>
                  <NextVisitField
                    visitDate={inspectionDate}
                    value={nextInspectionDate}
                    onChange={setNextInspectionDate}
                    required
                    label="Next Inspection Due"
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Explanatory Notes</CardTitle>
              <CardDescription>
                These notes help keep the certificate understandable and aligned to the workflow design
                used elsewhere in the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                Use this certificate for new work, additions, alterations, or partial re-certification
                where an Electrical Installation Certificate is appropriate.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Use the description of work field to state clearly what has been certified.</li>
                <li>Record supply characteristics and earthing details so the report can stand alone.</li>
                <li>Include concise design, construction, inspection, and test notes for a complete record.</li>
                <li>If observations are present, ensure the overall condition reflects the resulting risk.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Defects, Non-Conformities & Recommendations</CardTitle>
              <CardDescription>
                List any defects, limitations, or follow-up work required before handover or final
                acceptance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defectsFound">Defects / Non-Conformities Found</Label>
                <Textarea
                  id="defectsFound"
                  name="defectsFound"
                  placeholder="Describe any issues, deviations, or non-conformities..."
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
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            {previewData ? <PreviewModal data={previewData} /> : null}
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

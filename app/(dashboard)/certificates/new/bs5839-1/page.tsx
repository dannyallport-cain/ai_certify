'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createCertificate } from '../../../actions';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import GuidedModeModal, { Step } from '@/components/GuidedModeModal';
import { CertificateNumberField } from '@/components/CertificateNumberField';
import { NextVisitField } from '@/components/NextVisitField';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BS5839_1CertificatePage() {
  const router = useRouter();
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const { data: customers = [] } = useSWR('/api/customers', fetcher);
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
  const [visitDate, setVisitDate] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');

  const generateCertificateNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BS5839-1-${year}${month}${day}-${random}`;
  };

  useEffect(() => {
    setCertificateNumber(generateCertificateNumber());
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      // Add certificateType based on the form type
      formData.append('certificateType', 'BS5839-1');
      
      const result = await createCertificate({}, formData);
      if (result?.error) {
        console.error('Error creating certificate:', result.error);
      }
      // If no error, the action will redirect automatically
    } catch (error) {
      console.error('Error creating certificate:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Site/Building Name', type: 'text' },
    { name: 'siteAddress', label: 'Site Address', type: 'textarea' },
    { name: 'inspectionDate', label: 'Inspection Date', type: 'text' },
    { name: 'nextInspectionDate', label: 'Next Inspection Due', type: 'text' },
    { name: 'inspectorName', label: 'Inspector Name', type: 'text' },
    { name: 'inspectorQualification', label: 'Inspector Qualification', type: 'text' },
    { name: 'systemType', label: 'System Type (L1, L2, L3)', type: 'text' },
    { name: 'numberOfZones', label: 'Number of Zones', type: 'text' },
    { name: 'numberOfDevices', label: 'Total Devices', type: 'text' },
    { name: 'controlPanelMake', label: 'Control Panel Make', type: 'text' },
    { name: 'controlPanelModel', label: 'Control Panel Model', type: 'text' }
  ];

  const handleGuidedComplete = (values: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, val]) => formData.append(key, val));
    formData.append('certificateType', 'BS5839-1');
    handleSubmit(formData);
    setGuidedOpen(false);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="mb-6">
          <Button onClick={() => setGuidedOpen(true)} size="lg" className="w-full">
            Start Guided Mode
          </Button>
        </div>

        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">BS5839-1 Fire Detection Certificate</h2>
            <p className="text-muted-foreground">
              Fire detection and alarm systems - Code of practice for design, installation, commissioning and maintenance
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/certificates/new">
              ← Back to Certificate Types
            </Link>
          </Button>
        </div>

        <div className="max-w-4xl space-y-6">
          <form action={handleSubmit} className="space-y-6">
            {/* Guided mode fills inputs automatically */}
            <input type="hidden" name="certificateType" value="BS5839-1" />
            
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Certificate and customer details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label htmlFor="customerId">Customer</Label>
                  <select
                    id="customerId"
                    name="customerId"
                    value={selectedCustomer}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedCustomer(value);
                      const customer = customers.find((c: any) => String(c.id) === value);
                      setSelectedCustomerName(customer?.name || '');

                      if (!siteName && (customer?.name || customer?.address)) {
                        setSiteName(customer?.name || customer?.address || '');
                        setIsSiteNameAuto(true);
                      }

                      if (!siteAddress && customer?.address) {
                        setSiteAddress(customer.address);
                        setIsSiteAddressAuto(true);
                      }
                    }}
                    required
                    aria-label="Select a customer"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Site Information */}
            <Card>
              <CardHeader>
                <CardTitle>Site Information</CardTitle>
                <CardDescription>Details about the premises being inspected</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site/Building Name</Label>
                  <Input
                    id="siteName"
                    name="siteName"
                    placeholder="Enter site or building name"
                    value={siteName}
                    onChange={(e) => {
                      setSiteName(e.target.value);
                      setIsSiteNameAuto(false);
                    }}
                    className={isSiteNameAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''}
                    title={isSiteNameAuto ? 'Auto-populated from selected customer details. Edit if needed.' : undefined}
                  />
                  {isSiteNameAuto && (
                    <p className="text-xs text-amber-700" title="This value was auto-filled from the selected customer.">
                      Auto-populated from customer details. Hover the field for details.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteAddress">Site Address</Label>
                  <textarea
                    id="siteAddress"
                    name="siteAddress"
                    placeholder="Enter full site address"
                    rows={3}
                    value={siteAddress}
                    onChange={(e) => {
                      setSiteAddress(e.target.value);
                      setIsSiteAddressAuto(false);
                    }}
                    className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isSiteAddressAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''}`}
                    title={isSiteAddressAuto ? 'Auto-populated from selected customer address. Edit if needed.' : undefined}
                  />
                  {isSiteAddressAuto && (
                    <p className="text-xs text-amber-700" title="This value was auto-filled from the selected customer address.">
                      Auto-populated from customer address. Hover the field for details.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inspection Details */}
            <Card>
              <CardHeader>
                <CardTitle>Inspection Details</CardTitle>
                <CardDescription>Inspection dates and inspector information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="inspectionDate">Inspection Date *</Label>
                    <Input
                      id="inspectionDate"
                      name="inspectionDate"
                      type="date"
                      value={inspectionDate}
                      onChange={(e) => {
                        setInspectionDate(e.target.value);
                        setIsInspectionDateAuto(false);
                      }}
                      required
                      className={isInspectionDateAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''}
                      title={isInspectionDateAuto ? 'Auto-populated with today\'s date. Edit if inspection occurred on a different date.' : undefined}
                    />
                    {isInspectionDateAuto && (
                      <p
                        className="text-xs text-amber-700"
                        title="This assumed date is auto-filled to speed up data entry."
                      >
                        Auto-populated with today&apos;s date. Hover the field for details.
                      </p>
                    )}
                  </div>
                  <NextVisitField
                    visitDate={inspectionDate}
                    value={nextVisitDate}
                    onChange={setNextVisitDate}
                    required
                    label="Next Visit Due"

                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="inspectorName">Inspector Name</Label>
                    <Input
                      id="inspectorName"
                      name="inspectorName"
                      placeholder="Enter inspector name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inspectorQualification">Inspector Qualification</Label>
                    <Input
                      id="inspectorQualification"
                      name="inspectorQualification"
                      placeholder="e.g., FIA Certified, BAFE Registered"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspectionType">Inspection Type</Label>
                  <select
                    id="inspectionType"
                    name="inspectionType"
                    title="Select inspection type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select inspection type</option>
                    <option value="Routine Service">Routine Service</option>
                    <option value="Commissioning">Commissioning</option>
                    <option value="Annual Test">Annual Test</option>
                    <option value="Quarterly Test">Quarterly Test</option>
                    <option value="Monthly Test">Monthly Test</option>
                    <option value="Weekly Test">Weekly Test</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle>Fire Alarm System Information</CardTitle>
                <CardDescription>Details about the fire detection and alarm system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>System Type</Label>
                  <RadioGroup name="systemType" defaultValue="">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="L1" id="L1" />
                      <Label htmlFor="L1">Category L1 - Maximum life protection</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="L2" id="L2" />
                      <Label htmlFor="L2">Category L2 - Additional life protection</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="L3" id="L3" />
                      <Label htmlFor="L3">Category L3 - Partial life protection</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="L4" id="L4" />
                      <Label htmlFor="L4">Category L4 - Life protection - escape routes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="L5" id="L5" />
                      <Label htmlFor="L5">Category L5 - Life protection - specific risks</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="controlPanelMake">Control Panel Make</Label>
                    <Input
                      id="controlPanelMake"
                      name="controlPanelMake"
                      placeholder="e.g., Kentec, Apollo, Notifier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="controlPanelModel">Control Panel Model</Label>
                    <Input
                      id="controlPanelModel"
                      name="controlPanelModel"
                      placeholder="Enter model number"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="numberOfZones">Number of Zones</Label>
                    <Input
                      id="numberOfZones"
                      name="numberOfZones"
                      type="number"
                      placeholder="e.g., 8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numberOfDevices">Total Devices</Label>
                    <Input
                      id="numberOfDevices"
                      name="numberOfDevices"
                      type="number"
                      placeholder="e.g., 45"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalDetectors">Total Detectors</Label>
                    <Input
                      id="totalDetectors"
                      name="totalDetectors"
                      type="number"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="totalCallPoints">Total Call Points</Label>
                    <Input
                      id="totalCallPoints"
                      name="totalCallPoints"
                      type="number"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalSounders">Total Sounders</Label>
                    <Input
                      id="totalSounders"
                      name="totalSounders"
                      type="number"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceInterval">Service Interval</Label>
                    <select
                      id="serviceInterval"
                      name="serviceInterval"
                      title="Select service interval"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select interval</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="12 Months">12 Months</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="installationDate">Installation Date</Label>
                    <Input
                      id="installationDate"
                      name="installationDate"
                      type="date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastServiceDate">Last Service Date</Label>
                    <Input
                      id="lastServiceDate"
                      name="lastServiceDate"
                      type="date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>Overall system test results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Overall System Condition</Label>
                  <RadioGroup name="overallCondition" defaultValue="">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="satisfactory" id="satisfactory" />
                      <Label htmlFor="satisfactory">✅ Satisfactory</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="unsatisfactory" id="unsatisfactory" />
                      <Label htmlFor="unsatisfactory">❌ Unsatisfactory</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="requires-attention" id="requires-attention" />
                      <Label htmlFor="requires-attention">⚠️ Requires Attention</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defectsFound">Defects Found</Label>
                  <textarea
                    id="defectsFound"
                    name="defectsFound"
                    placeholder="List any defects or issues found during inspection..."
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recommendations">Recommendations</Label>
                  <textarea
                    id="recommendations"
                    name="recommendations"
                    placeholder="Enter any recommendations for system improvements or maintenance..."
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating Certificate..." : "Create Certificate"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/certificates/new">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
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

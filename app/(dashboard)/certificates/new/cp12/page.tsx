'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Flame, ShieldCheck, Home } from 'lucide-react';
import { createCertificate } from '../../../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import GuidedModeModal, { Step } from '@/components/GuidedModeModal';
import { CertificateNumberField } from '@/components/CertificateNumberField';
import { DateDropdownField } from '@/components/DateDropdownField';
import { NextVisitField } from '@/components/NextVisitField';
import { AddressAutocompleteField } from '@/components/AddressAutocompleteField';
import { GasSafeRegisterLogo } from '@/components/GasSafeRegisterLogo';
import { getSignInRedirectPath, isSessionExpiredError } from '@/lib/auth/errors';
import { isAdminRole } from '@/lib/auth/roles';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
});

export default function CP12CertificatePage() {
  const router = useRouter();
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const { data: customersData } = useSWR('/api/customers', fetcher);
  const { data: currentUser } = useSWR<{ role?: string }>('/api/user', fetcher);
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
  const [inspectionType, setInspectionType] = useState('Annual Gas Safety Check');
  const [boilerServiceCompleted, setBoilerServiceCompleted] = useState('No');
  const [warningNoticeIssued, setWarningNoticeIssued] = useState('No');
  const [safetyDevicesCorrect, setSafetyDevicesCorrect] = useState('Yes');
  const [ventilationSatisfactory, setVentilationSatisfactory] = useState('Yes');
  const [fluePerformanceSatisfactory, setFluePerformanceSatisfactory] = useState('Yes');
  const [terminationSatisfactory, setTerminationSatisfactory] = useState('Yes');
  const [gasTightnessTest, setGasTightnessTest] = useState('Yes');
  const [applianceSafeToUse, setApplianceSafeToUse] = useState('Yes');
  const [coAlarmPresent, setCoAlarmPresent] = useState('Yes');
  const [coAlarmTested, setCoAlarmTested] = useState('Yes');
  const [formError, setFormError] = useState('');
  const canUseSampleFill = isAdminRole(currentUser?.role);

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Property Name', type: 'text' },
    { name: 'siteAddress', label: 'Property Address', type: 'textarea' },
    { name: 'inspectionDate', label: 'Inspection Date', type: 'text' },
    { name: 'nextInspectionDate', label: 'Next Inspection Due', type: 'text' },
    { name: 'inspectorName', label: 'Engineer Name', type: 'text' },
    { name: 'gasSafeNumber', label: 'Gas Safe Number', type: 'text' },
    { name: 'applianceType', label: 'Appliance Type', type: 'text' },
    { name: 'applianceLocation', label: 'Appliance Location', type: 'text' },
  ];

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormError('');
    try {
      formData.append('certificateType', 'CP12');

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
    formData.append('certificateType', 'CP12');
    await handleSubmit(formData);
    setGuidedOpen(false);
  };

  const setFieldValue = (name: string, value: string) => {
    const form = formRef.current;
    if (!form) return;

    const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`);
    fields.forEach((field) => {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  const fillFormWithSampleData = () => {
    const today = new Date();
    const inspectionDateValue = today.toISOString().split('T')[0];
    const nextDate = new Date(today);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    const nextInspectionDateValue = nextDate.toISOString().split('T')[0];
    const matchedCustomer = customers.find(
      (customer: any) => customer.name?.trim().toLowerCase() === 'highfield hall community centre',
    ) || customers[0] || null;

    setFormError('');
    setCertificateNumber('CP12-2026-001');
    setSelectedCustomer(matchedCustomer ? String(matchedCustomer.id) : '');
    setSelectedCustomerName(matchedCustomer?.name || 'Highfield Hall Community Centre');
    setSiteName('Rosebank House, Flat 2');
    setSiteAddress('Rosebank House, 18 Market Street, Bolton, BL1 2AB');
    setIsSiteNameAuto(false);
    setIsSiteAddressAuto(false);
    setInspectionDate(inspectionDateValue);
    setIsInspectionDateAuto(false);
    setNextInspectionDate(nextInspectionDateValue);
    setInspectionType('Annual Gas Safety Check');
    setBoilerServiceCompleted('Yes');
    setWarningNoticeIssued('No');
    setSafetyDevicesCorrect('Yes');
    setVentilationSatisfactory('Yes');
    setFluePerformanceSatisfactory('Yes');
    setTerminationSatisfactory('Yes');
    setGasTightnessTest('Yes');
    setApplianceSafeToUse('Yes');
    setCoAlarmPresent('Yes');
    setCoAlarmTested('Yes');

    setFieldValue('customerId', matchedCustomer ? String(matchedCustomer.id) : '');
    setFieldValue('customerName', matchedCustomer?.name || 'Highfield Hall Community Centre');
    setFieldValue('siteName', 'Rosebank House, Flat 2');
    setFieldValue('siteAddress', 'Rosebank House, 18 Market Street, Bolton, BL1 2AB');
    setFieldValue('landlordName', 'Rosebank Property Ltd');
    setFieldValue('tenantName', 'Amelia Ward');
    setFieldValue('emergencyControlLocation', 'Kitchen meter cupboard');
    setFieldValue('inspectorName', 'Daniel Allport');
    setFieldValue('gasSafeNumber', '611716');
    setFieldValue('inspectionDate', inspectionDateValue);
    setFieldValue('nextInspectionDate', nextInspectionDateValue);
    setFieldValue('applianceType', 'Combi boiler');
    setFieldValue('applianceLocation', 'Kitchen');
    setFieldValue('applianceMakeModel', 'Vaillant ecoTEC Plus 832');
    setFieldValue('serialNumber', 'VEC832-2024-1187');
    setFieldValue('flueType', 'Room sealed');
    setFieldValue('operatingPressure', '20 mbar');
    setFieldValue('heatInput', '24 kW');
    setFieldValue('inspectionNotes', 'Appliance operating correctly with combustion readings within acceptable range.');
    setFieldValue(
      'defectsRemedialAction',
      'No defects identified at the time of inspection. Advisory given to maintain annual servicing and continue routine testing of the carbon monoxide alarm.',
    );
  };

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
            <div className="flex items-center gap-4">
              <GasSafeRegisterLogo
                className="hidden h-16 w-24 border-amber-300 p-2 sm:block"
                sizes="96px"
                priority
              />
              <div>
                <h1 className="text-3xl font-bold">CP12 Gas Safety Certificate</h1>
                <p className="text-muted-foreground">
                  Landlord gas safety record for appliances, flues, and property safety checks
                </p>
              </div>
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

        <form ref={formRef} action={handleSubmit} className="space-y-6">
          {formError && (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
          <input type="hidden" name="certificateType" value="CP12" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flame className="mr-2 h-5 w-5 text-amber-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CertificateNumberField
                value={certificateNumber}
                onChange={setCertificateNumber}
                certificateType="CP12"
                customerName={selectedCustomerName}
                siteName={siteName}
              />
              <div>
                <Label htmlFor="customerName">Customer *</Label>
                <input type="hidden" name="customerId" value={selectedCustomer} />
                <Input
                  id="customerName"
                  name="customerName"
                  list="customers-list-cp12"
                  value={selectedCustomerName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCustomerName(value);
                    const normalizedValue = value.trim().toLowerCase();
                    const exactMatch = customers.find((c: any) => c.name?.trim().toLowerCase() === normalizedValue);
                    const prefixMatches = customers.filter((c: any) => c.name?.trim().toLowerCase().startsWith(normalizedValue));
                    const customer = exactMatch || (normalizedValue && prefixMatches.length === 1 ? prefixMatches[0] : null);
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
                <datalist id="customers-list-cp12">
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="mr-2 h-5 w-5 text-slate-600" />
                Property Details
              </CardTitle>
              <CardDescription>
                Record the address and tenancy-related details for the property being checked
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="siteName">Property / Site Name *</Label>
                  <AddressAutocompleteField
                    id="siteName"
                    name="siteName"
                    placeholder="Property name"
                    required
                    value={siteName}
                    onChange={(newValue) => {
                      setSiteName(newValue);
                      setIsSiteNameAuto(false);
                    }}
                    className={isSiteNameAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''}
                    title={isSiteNameAuto ? 'Auto-populated from selected customer details. Edit if needed.' : undefined}
                  />
                </div>
                <div>
                  <Label htmlFor="siteAddress">Property Address *</Label>
                  <Textarea
                    id="siteAddress"
                    name="siteAddress"
                    value={siteAddress}
                    onChange={(e) => {
                      setSiteAddress(e.target.value);
                      setIsSiteAddressAuto(false);
                    }}
                    required
                    placeholder="Full property address"
                    className={isSiteAddressAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="landlordName">Landlord / Managing Agent</Label>
                  <Input id="landlordName" name="landlordName" placeholder="Name or company" />
                </div>
                <div>
                  <Label htmlFor="tenantName">Tenant Name</Label>
                  <Input id="tenantName" name="tenantName" placeholder="Current tenant" />
                </div>
                <div>
                  <Label htmlFor="emergencyControlLocation">Emergency Control Location</Label>
                  <Input id="emergencyControlLocation" name="emergencyControlLocation" placeholder="Meter cupboard / hallway" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <ShieldCheck className="mr-2 h-5 w-5 text-emerald-600" />
                  Engineer and Inspection Details
                </CardTitle>
                <CardDescription>
                  Record the Gas Safe registration and inspection details for the attending engineer
                </CardDescription>
              </div>
              <GasSafeRegisterLogo className="h-14 w-20 border-amber-300 p-1.5 shadow-none" sizes="80px" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="inspectorName">Engineer Name *</Label>
                  <Input id="inspectorName" name="inspectorName" required placeholder="Gas engineer name" />
                </div>
                <div>
                  <Label htmlFor="gasSafeNumber">Gas Safe Registration No. *</Label>
                  <Input id="gasSafeNumber" name="gasSafeNumber" required placeholder="e.g. 123456" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DateDropdownField
                  id="inspectionDate"
                  name="inspectionDate"
                  label="Inspection Date"
                  value={inspectionDate}
                  onChange={(newValue) => {
                    setInspectionDate(newValue);
                    setIsInspectionDateAuto(false);
                  }}
                  required
                  isAutoPopulated={isInspectionDateAuto}
                  autoTitle="Auto-populated to today's date. Edit if the inspection happened on a different day."
                  autoHelpText="Auto-populated to today's date. You can still choose a different inspection date."
                />
                <NextVisitField
                  label="Next Inspection Due"
                  value={nextInspectionDate}
                  onChange={setNextInspectionDate}
                  visitDate={inspectionDate}
                  periodMonths={12}
                  showPeriodSelect={false}
                />
                <input type="hidden" name="nextInspectionDate" value={nextInspectionDate} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="inspectionType">Inspection Type *</Label>
                  <Select name="inspectionType" required value={inspectionType} onValueChange={setInspectionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspection type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Annual Gas Safety Check">Annual Gas Safety Check</SelectItem>
                      <SelectItem value="New Tenancy Check">New Tenancy Check</SelectItem>
                      <SelectItem value="Follow-up Safety Check">Follow-up Safety Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="boilerServiceCompleted">Boiler Service Completed</Label>
                  <Select name="boilerServiceCompleted" value={boilerServiceCompleted} onValueChange={setBoilerServiceCompleted}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="warningNoticeIssued">Warning Notice Issued</Label>
                  <Select name="warningNoticeIssued" value={warningNoticeIssued} onValueChange={setWarningNoticeIssued}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appliance Details</CardTitle>
              <CardDescription>
                Capture the core CP12 appliance and flue checks for the primary appliance inspected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="applianceType">Appliance Type *</Label>
                  <Input id="applianceType" name="applianceType" required placeholder="Boiler / cooker / fire" />
                </div>
                <div>
                  <Label htmlFor="applianceLocation">Appliance Location *</Label>
                  <Input id="applianceLocation" name="applianceLocation" required placeholder="Kitchen / airing cupboard" />
                </div>
                <div>
                  <Label htmlFor="applianceMakeModel">Make / Model</Label>
                  <Input id="applianceMakeModel" name="applianceMakeModel" placeholder="Manufacturer and model" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input id="serialNumber" name="serialNumber" placeholder="Serial number" />
                </div>
                <div>
                  <Label htmlFor="flueType">Flue Type</Label>
                  <Input id="flueType" name="flueType" placeholder="Open flue / room sealed" />
                </div>
                <div>
                  <Label htmlFor="operatingPressure">Operating Pressure</Label>
                  <Input id="operatingPressure" name="operatingPressure" placeholder="e.g. 20 mbar" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="heatInput">Heat Input / Rate</Label>
                  <Input id="heatInput" name="heatInput" placeholder="e.g. 24 kW" />
                </div>
                <div>
                  <Label htmlFor="inspectionNotes">Appliance Notes</Label>
                  <Input id="inspectionNotes" name="inspectionNotes" placeholder="Additional appliance notes" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safety Checks and Outcome</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="safetyDevicesCorrect">Safety Devices Operate Correctly</Label>
                  <Select name="safetyDevicesCorrect" value={safetyDevicesCorrect} onValueChange={setSafetyDevicesCorrect}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ventilationSatisfactory">Ventilation Satisfactory</Label>
                  <Select name="ventilationSatisfactory" value={ventilationSatisfactory} onValueChange={setVentilationSatisfactory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fluePerformanceSatisfactory">Flue Performance Satisfactory</Label>
                  <Select name="fluePerformanceSatisfactory" value={fluePerformanceSatisfactory} onValueChange={setFluePerformanceSatisfactory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="terminationSatisfactory">Termination Satisfactory</Label>
                  <Select name="terminationSatisfactory" value={terminationSatisfactory} onValueChange={setTerminationSatisfactory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gasTightnessTest">Gas Tightness Test Satisfactory</Label>
                  <Select name="gasTightnessTest" value={gasTightnessTest} onValueChange={setGasTightnessTest}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="applianceSafeToUse">Appliance Safe To Use</Label>
                  <Select name="applianceSafeToUse" value={applianceSafeToUse} onValueChange={setApplianceSafeToUse}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="At Risk">At Risk</SelectItem>
                      <SelectItem value="Immediately Dangerous">Immediately Dangerous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="coAlarmPresent">Carbon Monoxide Alarm Present</Label>
                  <Select name="coAlarmPresent" value={coAlarmPresent} onValueChange={setCoAlarmPresent}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="coAlarmTested">Carbon Monoxide Alarm Tested</Label>
                  <Select name="coAlarmTested" value={coAlarmTested} onValueChange={setCoAlarmTested}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="defectsRemedialAction">Defects / Remedial Action</Label>
                <Textarea
                  id="defectsRemedialAction"
                  name="defectsRemedialAction"
                  placeholder="Record any defects found, warning notices issued, and remedial action required"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating CP12...' : 'Create CP12 Certificate'}
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

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCertificate } from '../../../actions';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { CertificateNumberField } from '@/components/CertificateNumberField';
import { NextVisitField } from '@/components/NextVisitField';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Observation {
  id: string;
  description: string;
  code: 'C1' | 'C2' | 'C3' | 'FI';
}

const codeColors: Record<string, string> = {
  C1: 'bg-red-100 text-red-800 border-red-200',
  C2: 'bg-orange-100 text-orange-800 border-orange-200',
  C3: 'bg-blue-100 text-blue-800 border-blue-200',
  FI: 'bg-purple-100 text-purple-800 border-purple-200',
};

const codeLabels: Record<string, string> = {
  C1: 'C1 – Danger Present',
  C2: 'C2 – Potentially Dangerous',
  C3: 'C3 – Improvement Recommended',
  FI: 'FI – Further Investigation Required',
};

export default function EICRCertificatePage() {
  const router = useRouter();
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const { data: customers = [] } = useSWR('/api/customers', fetcher);
  const [siteName, setSiteName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [isSiteNameAuto, setIsSiteNameAuto] = useState(false);
  const [isClientAddressAuto, setIsClientAddressAuto] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [inspectionDate, setInspectionDate] = useState(getTodayDate());
  const [isInspectionDateAuto, setIsInspectionDateAuto] = useState(true);
  const [nextInspectionDate, setNextInspectionDate] = useState('');
  const [overallAssessment, setOverallAssessment] = useState('SATISFACTORY');
  const [earthingArrangement, setEarthingArrangement] = useState('TN-C-S');
  const [meansOfEarthing, setMeansOfEarthing] = useState("Distributor's facility");
  const [observations, setObservations] = useState<Observation[]>([]);
  const [evidenceOfAdditions, setEvidenceOfAdditions] = useState('No');

  const generateCertificateNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `CE${rand}`;
  };

  useEffect(() => {
    setCertificateNumber(generateCertificateNumber());
  }, []);

  const addObservation = () => {
    setObservations(prev => [...prev, { id: Date.now().toString(), description: '', code: 'C3' }]);
  };

  const updateObservation = (id: string, field: keyof Observation, value: string) => {
    setObservations(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const removeObservation = (id: string) => {
    setObservations(prev => prev.filter(o => o.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.set('certificateType', 'EICR');

      // Serialize observations as certificate items JSON
      const obsJson = JSON.stringify(observations.map(o => ({
        itemType: 'observation',
        description: o.description,
        status: o.code === 'C1' || o.code === 'C2' ? 'unsatisfactory' : o.code === 'FI' ? 'not_tested' : 'satisfactory',
        defects: o.code,
        recommendations: codeLabels[o.code],
      })));
      formData.set('items', obsJson);

      const result = await createCertificate({}, formData);
      if (result?.error) {
        console.error('Error creating certificate:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating certificate:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">EICR – Electrical Installation Condition Report</h2>
          <p className="text-muted-foreground">
            Requirements For Electrical Installations – BS 7671 IET Wiring Regulations
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/certificates/new">← Back to Certificate Types</Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <input type="hidden" name="certificateType" value="EICR" />

        {/* ── Basic / Certificate Number ── */}
        <Card>
          <CardHeader>
            <CardTitle>Report Reference</CardTitle>
            <CardDescription>Auto-generated from the CE numbering series</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <CertificateNumberField
                  value={certificateNumber}
                  onChange={setCertificateNumber}
                  certificateType="EICR"
                />
                <input type="hidden" name="certificateNumber" value={certificateNumber} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer *</Label>
                <select
                  name="customerId"
                  id="customerId"
                  required
                  title="Select customer"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedCustomer}
                  onChange={e => {
                    const value = e.target.value;
                    setSelectedCustomer(value);
                    const customer = customers.find((c: any) => String(c.id) === value);

                    if (!siteName && (customer?.name || customer?.address)) {
                      setSiteName(customer?.name || customer?.address || '');
                      setIsSiteNameAuto(true);
                    }

                    if (!clientAddress && customer?.address) {
                      setClientAddress(customer.address);
                      setIsClientAddressAuto(true);
                    }
                  }}
                >
                  <option value="">Select customer...</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 1: Client ── */}
        <Card>
          <CardHeader><CardTitle>1 · Details of the Person Ordering the Report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Client / Organisation *</Label>
                <Input
                  id="siteName"
                  name="siteName"
                  required
                  placeholder="Highfield Hall Community Centre"
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
                <Label htmlFor="clientAddress">Client Address *</Label>
                <Input
                  id="clientAddress"
                  name="clientAddress"
                  required
                  placeholder="Marsh Lane, Farnworth, Bolton, BL4 0AW"
                  value={clientAddress}
                  onChange={(e) => {
                    setClientAddress(e.target.value);
                    setIsClientAddressAuto(false);
                  }}
                  className={isClientAddressAuto ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-200' : ''}
                  title={isClientAddressAuto ? 'Auto-populated from selected customer address. Edit if needed.' : undefined}
                />
                {isClientAddressAuto && (
                  <p className="text-xs text-amber-700" title="This value was auto-filled from the selected customer address.">
                    Auto-populated from customer address. Hover the field for details.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: Reason ── */}
        <Card>
          <CardHeader><CardTitle>2 · Reason for Producing This Report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reasonForReport">Reason for Report</Label>
                <Textarea
                  id="reasonForReport"
                  name="reasonForReport"
                  rows={3}
                  placeholder="Safety assessment requested by client. To assess compliance with BS 7671."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspectionDate">Date(s) of Inspection *</Label>
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
                  title={isInspectionDateAuto ? 'Auto-populated with today\'s date. Edit if required.' : undefined}
                />
                {isInspectionDateAuto && (
                  <p
                    className="text-xs text-amber-700"
                    title="This assumed date is auto-filled to reduce repeated entry."
                  >
                    Auto-populated with today&apos;s date. Hover the field for details.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Installation ── */}
        <Card>
          <CardHeader><CardTitle>3 · Details of the Installation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installationAddress">Installation Address</Label>
                <Input id="installationAddress" name="installationAddress" placeholder="Same as client address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="premisesType">Description of Premises</Label>
                <Select name="premisesType" defaultValue="Commercial">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Domestic">Domestic</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedAgeOfWiring">Estimated Age of Wiring System (years)</Label>
                <Input id="estimatedAgeOfWiring" name="estimatedAgeOfWiring" type="number" placeholder="15" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidenceOfAdditions">Evidence of Additions/Alterations?</Label>
                <Select
                  name="evidenceOfAdditions"
                  value={evidenceOfAdditions}
                  onValueChange={setEvidenceOfAdditions}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {evidenceOfAdditions === 'Yes' && (
                <div className="space-y-2">
                  <Label htmlFor="estimatedAgeOfAdditions">Estimated Age of Additions (years)</Label>
                  <Input id="estimatedAgeOfAdditions" name="estimatedAgeOfAdditions" type="number" placeholder="5" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="installationRecordsAvailable">Installation Records Available? (Reg 651.1)</Label>
                <Select name="installationRecordsAvailable" defaultValue="No">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfLastInspection">Date of Last Inspection</Label>
                <Input id="dateOfLastInspection" name="dateOfLastInspection" type="date" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 4: Extent & Limitations ── */}
        <Card>
          <CardHeader><CardTitle>4 · Extent and Limitations of Inspection and Testing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="extentOfInspection">Extent of Electrical Installation Covered</Label>
              <Textarea
                id="extentOfInspection"
                name="extentOfInspection"
                rows={2}
                placeholder="50% of the installation in accordance with item 3.8.4 of Guidance Note 3."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agreedLimitations">Agreed Limitations (including reasons)</Label>
              <Textarea
                id="agreedLimitations"
                name="agreedLimitations"
                rows={3}
                placeholder="No testing of HVAC control cables. No lifting of floor boards or inspection of loft space..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agreedLimitationsWith">Agreed With</Label>
                <Input id="agreedLimitationsWith" name="agreedLimitationsWith" placeholder="Client name / representative" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operationalLimitations">Operational Limitations</Label>
                <Input id="operationalLimitations" name="operationalLimitations" placeholder="N/A" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 5: Overall Assessment ── */}
        <Card>
          <CardHeader><CardTitle>5 · Overall Assessment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              {(['SATISFACTORY', 'UNSATISFACTORY'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="overallAssessment"
                    value={opt}
                    checked={overallAssessment === opt}
                    onChange={() => setOverallAssessment(opt)}
                    className="h-4 w-4"
                  />
                  <span className={`font-semibold ${opt === 'SATISFACTORY' ? 'text-green-700' : 'text-red-700'}`}>
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Section 6: Recommendations ── */}
        <Card>
          <CardHeader><CardTitle>6 · Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nextInspectionPeriod">Recommended Reinspection Period</Label>
                <Select name="nextInspectionPeriod" defaultValue="3 Years">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 Year">1 Year</SelectItem>
                    <SelectItem value="2 Years">2 Years</SelectItem>
                    <SelectItem value="3 Years">3 Years</SelectItem>
                    <SelectItem value="5 Years">5 Years</SelectItem>
                    <SelectItem value="10 Years">10 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next Inspection Date</Label>
                <NextVisitField
                  visitDate={inspectionDate}
                  value={nextInspectionDate}
                  onChange={setNextInspectionDate}
                />
                <input type="hidden" name="nextInspectionDate" value={nextInspectionDate} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 7: Observations ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>7 · Observations and Recommendations</CardTitle>
                <CardDescription>Add each defect or recommendation with its classification code</CardDescription>
              </div>
              <Button type="button" size="sm" onClick={addObservation}>
                <Plus className="h-4 w-4 mr-2" />Add Observation
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {observations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No observations — the installation has no items adversely affecting electrical safety.
              </p>
            )}
            {/* Classification key */}
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(codeLabels).map(([code, label]) => (
                <Badge key={code} variant="outline" className={`text-xs ${codeColors[code]}`}>{label}</Badge>
              ))}
            </div>
            {observations.map((obs, idx) => (
              <div key={obs.id} className="border rounded-md p-3 space-y-2 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Observation {idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => removeObservation(obs.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3 space-y-1">
                    <Label>Description</Label>
                    <Textarea
                      rows={2}
                      value={obs.description}
                      onChange={e => updateObservation(obs.id, 'description', e.target.value)}
                      placeholder="Inspection Schedule Item X: ..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Classification Code</Label>
                    <Select
                      value={obs.code}
                      onValueChange={v => updateObservation(obs.id, 'code', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="C1">C1 – Danger Present</SelectItem>
                        <SelectItem value="C2">C2 – Potentially Dangerous</SelectItem>
                        <SelectItem value="C3">C3 – Improvement Recommended</SelectItem>
                        <SelectItem value="FI">FI – Further Investigation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Section 8: General Condition ── */}
        <Card>
          <CardHeader><CardTitle>8 · General Condition of the Installation</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="generalCondition">General Condition</Label>
              <Textarea
                id="generalCondition"
                name="generalCondition"
                rows={2}
                placeholder="Adequate as per BS 7671 (2018)"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section 9: Declaration ── */}
        <Card>
          <CardHeader><CardTitle>9 · Declaration – Inspector Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tradingTitle">Trading Title</Label>
                <Input id="tradingTitle" name="tradingTitle" placeholder="Cain Enabled Engineering Ltd" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input id="registrationNumber" name="registrationNumber" placeholder="611716000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address</Label>
                <Input id="companyAddress" name="companyAddress" placeholder="Piccadilly Business Centre, Manchester, M12 6AE" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyTelephone">Telephone Number</Label>
                <Input id="companyTelephone" name="companyTelephone" placeholder="01246 387 450" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspectorName">Inspector Name *</Label>
                <Input id="inspectorName" name="inspectorName" required placeholder="Daniel Allport" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspectorPosition">Position / Role</Label>
                <Input id="inspectorPosition" name="inspectorPosition" placeholder="Qualified Supervisor" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 10: Supply Characteristics ── */}
        <Card>
          <CardHeader><CardTitle>10 · Supply Characteristics and Earthing Arrangements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="earthingArrangements">Earthing Arrangement</Label>
                <Select
                  name="earthingArrangements"
                  value={earthingArrangement}
                  onValueChange={setEarthingArrangement}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TN-S">TN-S</SelectItem>
                    <SelectItem value="TN-C-S">TN-C-S (PME)</SelectItem>
                    <SelectItem value="TNC">TNC</SelectItem>
                    <SelectItem value="TT">TT</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="natureOfSupply">Nature of Supply</Label>
                <Select name="natureOfSupply" defaultValue="1-phase (2 wire) ac">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-phase (2 wire) ac">1-phase (2 wire) ac</SelectItem>
                    <SelectItem value="1-phase (3 wire) ac">1-phase (3 wire) ac</SelectItem>
                    <SelectItem value="2-phase (3 wire) ac">2-phase (3 wire) ac</SelectItem>
                    <SelectItem value="3-phase (3 wire) ac">3-phase (3 wire) ac</SelectItem>
                    <SelectItem value="3-phase (4 wire) ac">3-phase (4 wire) ac</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nominalVoltageU">Nominal Voltage U (V)</Label>
                <Input id="nominalVoltageU" name="nominalVoltageU" placeholder="400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nominalVoltageUo">Nominal Voltage Uo (V)</Label>
                <Input id="nominalVoltageUo" name="nominalVoltageUo" placeholder="230" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nominalFrequency">Nominal Frequency (Hz)</Label>
                <Input id="nominalFrequency" name="nominalFrequency" placeholder="50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prospectiveFaultCurrent">Prospective Fault Current, Ipf (kA)</Label>
                <Input id="prospectiveFaultCurrent" name="prospectiveFaultCurrent" placeholder="1.8" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalEarthFaultLoopImpedance">External Earth Fault Loop Impedance, Ze (Ω)</Label>
                <Input id="externalEarthFaultLoopImpedance" name="externalEarthFaultLoopImpedance" placeholder="0.13" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfSupplies">Number of Supplies</Label>
                <Input id="numberOfSupplies" name="numberOfSupplies" placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplyProtectiveDeviceType">Supply Protective Device Type (BS EN)</Label>
                <Input id="supplyProtectiveDeviceType" name="supplyProtectiveDeviceType" placeholder="1361 Fuse HBC" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplyProtectiveDeviceRating">Supply Protective Device Rating (A)</Label>
                <Input id="supplyProtectiveDeviceRating" name="supplyProtectiveDeviceRating" placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortCircuitCapacity">Short-Circuit Capacity (kA)</Label>
                <Input id="shortCircuitCapacity" name="shortCircuitCapacity" placeholder="33" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 11: Means of Earthing ── */}
        <Card>
          <CardHeader><CardTitle>11 · Means of Earthing / Particulars of Installation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meansOfEarthing">Means of Earthing</Label>
                <Select
                  name="meansOfEarthing"
                  value={meansOfEarthing}
                  onValueChange={setMeansOfEarthing}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Distributor's facility">Distributor's facility</SelectItem>
                    <SelectItem value="Installation earth electrode">Installation earth electrode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximumDemand">Maximum Demand (Load)</Label>
                <Input id="maximumDemand" name="maximumDemand" placeholder="100 Amps" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protectiveMeasures">Protective Measure(s) Against Electric Shock</Label>
                <Input id="protectiveMeasures" name="protectiveMeasures" placeholder="ADS" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Submit ── */}
        <div className="flex gap-4 pb-8">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Creating EICR...' : 'Create EICR Certificate'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/certificates">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

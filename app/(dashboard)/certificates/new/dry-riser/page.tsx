"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createCertificate } from "../../../actions"
import { ArrowLeft, Droplets, Building, CheckCircle } from "lucide-react"
import Link from "next/link"
import GuidedModeModal, { Step } from "@/components/GuidedModeModal"
import { CertificateNumberField } from '@/components/CertificateNumberField'
import { NextVisitField } from '@/components/NextVisitField'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
});

export default function DryRiserCertificatePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const { data: customers = [], error } = useSWR('/api/customers', fetcher)
  const [guidedOpen, setGuidedOpen] = useState(false)
  const [certificateNumber, setCertificateNumber] = useState('')
  const [selectedCustomerName, setSelectedCustomerName] = useState('')
  const [siteName, setSiteName] = useState('')
  const [inspectionDate, setInspectionDate] = useState('')
  const [nextInspectionDate, setNextInspectionDate] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [nextVisitDate, setNextVisitDate] = useState('')

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Site Name', type: 'text' },
    { name: 'siteAddress', label: 'Site Address', type: 'text' },
    // Add relevant riser-specific fields here
  ]

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    try {
      // Add certificateType based on the form type
      formData.append('certificateType', 'Dry Riser')
      
      const result = await createCertificate({}, formData)
      if (result?.error) {
        console.error('Error creating certificate:', result.error)
      }
      // If no error, the action will redirect automatically
    } catch (error) {
      console.error('Error creating certificate:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuidedComplete = async (values: Record<string,string>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([k,v]) => formData.append(k,v));
    formData.append('certificateType', 'Dry Riser');
    // ...existing submit
    setGuidedOpen(false);
  };

  return (
    <>
      <div className="mb-6">
        <Button onClick={() => setGuidedOpen(true)} size="lg" className="w-full">Start Guided Mode</Button>
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/certificates/new">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Dry Riser Certificate</h1>
              <p className="text-muted-foreground">
                Dry riser system inspection and testing (BS9990)
              </p>
            </div>
          </div>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <input type="hidden" name="certificateType" value="Dry Riser" />
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Droplets className="h-5 w-5 mr-2 text-blue-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input type="hidden" name="certificateNumber" value={certificateNumber} />
                <CertificateNumberField
                  value={certificateNumber}
                  onChange={setCertificateNumber}
                  certificateType="Dry Riser"
                  customerName={selectedCustomerName}
                  siteName={siteName}
                />
              </div>
              <div>
                <Label htmlFor="customerId">Customer *</Label>
                <input type="hidden" name="customerId" value={selectedCustomer} />
                <Select 
                  value={selectedCustomer}
                  onValueChange={(value) => {
                    setSelectedCustomer(value);
                    const customer = customers.find((c: any) => c.id.toString() === value);
                    setSelectedCustomerName(customer?.name || '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(customers) ? customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    )) : (
                      <SelectItem value="" disabled>
                        {error ? 'Error loading customers' : 'Loading customers...'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Building Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2 text-gray-600" />
                Building Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Building Name/Address *</Label>
                  <Input
                    id="siteName"
                    name="siteName"
                    placeholder="Building name and address"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="buildingHeight">Building Height (m)</Label>
                  <Input
                    id="buildingHeight"
                    name="buildingHeight"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 25.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="floors">Number of Floors</Label>
                  <Input
                    id="floors"
                    name="floors"
                    type="number"
                    min="1"
                    placeholder="e.g., 8"
                  />
                </div>
                <div>
                  <Label htmlFor="buildingUse">Building Use *</Label>
                  <select 
                    id="buildingUse"
                    name="buildingUse" 
                    title="Select building use"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select building use</option>
                    <option value="residential">Residential</option>
                    <option value="office">Office</option>
                    <option value="retail">Retail</option>
                    <option value="industrial">Industrial</option>
                    <option value="hospital">Hospital</option>
                    <option value="school">School</option>
                    <option value="hotel">Hotel</option>
                    <option value="mixed">Mixed Use</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="constructionYear">Year of Construction</Label>
                  <Input
                    id="constructionYear"
                    name="constructionYear"
                    type="number"
                    min="1900"
                    max="2025"
                    placeholder="e.g., 1995"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dry Riser System Details */}
          <Card>
            <CardHeader>
              <CardTitle>Dry Riser System Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="riserType">Riser Type *</Label>
                  <Select name="riserType">
                    <SelectTrigger>
                      <SelectValue placeholder="Select riser type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wet">Wet Riser</SelectItem>
                      <SelectItem value="dry">Dry Riser</SelectItem>
                      <SelectItem value="combined">Combined System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pipeSize">Main Pipe Size (mm) *</Label>
                  <Select name="pipeSize">
                    <SelectTrigger>
                      <SelectValue placeholder="Select pipe size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100mm</SelectItem>
                      <SelectItem value="150">150mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="inletConnections">Inlet Connections</Label>
                  <Input
                    id="inletConnections"
                    name="inletConnections"
                    type="number"
                    min="0"
                    placeholder="Number of inlets"
                  />
                </div>
                <div>
                  <Label htmlFor="outletValves">Outlet Valves</Label>
                  <Input
                    id="outletValves"
                    name="outletValves"
                    type="number"
                    min="0"
                    placeholder="Number of outlets"
                  />
                </div>
                <div>
                  <Label htmlFor="drainValves">Drain Valves</Label>
                  <Input
                    id="drainValves"
                    name="drainValves"
                    type="number"
                    min="0"
                    placeholder="Number of drains"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pumpType">Pump Type (if applicable)</Label>
                  <Select name="pumpType">
                    <SelectTrigger>
                      <SelectValue placeholder="Select pump type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None - Gravity Fed</SelectItem>
                      <SelectItem value="booster">Booster Pump</SelectItem>
                      <SelectItem value="fire-pump">Fire Pump</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tankCapacity">Tank Capacity (L)</Label>
                  <Input
                    id="tankCapacity"
                    name="tankCapacity"
                    type="number"
                    placeholder="e.g., 45000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inspection Details */}
          <Card>
            <CardHeader>
              <CardTitle>Inspection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="inspectionDate">Inspection Date *</Label>
                  <Input
                    id="inspectionDate"
                    name="inspectionDate"
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="inspectionType">Inspection Type *</Label>
                  <Select name="inspectionType">
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspection type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly Visual Check</SelectItem>
                      <SelectItem value="monthly">Monthly Inspection</SelectItem>
                      <SelectItem value="quarterly">Quarterly Test</SelectItem>
                      <SelectItem value="annual">Annual Full Test</SelectItem>
                      <SelectItem value="commissioning">Commissioning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nextInspectionDate">Next Inspection Due</Label>
                  <NextVisitField
                    visitDate={inspectionDate}
                    value={nextInspectionDate}
                    onChange={setNextInspectionDate}
                    required
                    label="Next Inspection Due"
  
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inspectorName">Inspector Name *</Label>
                  <Input
                    id="inspectorName"
                    name="inspectorName"
                    placeholder="Inspector name"
                  />
                </div>
                <div>
                  <Label htmlFor="weatherConditions">Weather Conditions</Label>
                  <Input
                    id="weatherConditions"
                    name="weatherConditions"
                    placeholder="e.g., Dry, 15°C"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pressure Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Pressure Test Results</CardTitle>
              <CardDescription>
                Record pressure test readings and flow rates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="staticPressure">Static Pressure (bar)</Label>
                  <Input
                    id="staticPressure"
                    name="staticPressure"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 6.5"
                  />
                </div>
                <div>
                  <Label htmlFor="flowingPressure">Flowing Pressure (bar)</Label>
                  <Input
                    id="flowingPressure"
                    name="flowingPressure"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 5.8"
                  />
                </div>
                <div>
                  <Label htmlFor="flowRate">Flow Rate (L/min)</Label>
                  <Input
                    id="flowRate"
                    name="flowRate"
                    type="number"
                    placeholder="e.g., 1500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Overall Assessment
              </CardTitle>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="defectsFound">Defects Found</Label>
                <Textarea
                  id="defectsFound"
                  name="defectsFound"
                  placeholder="Describe any defects found during inspection..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="workRequired">Work Required</Label>
                <Textarea
                  id="workRequired"
                  name="workRequired"
                  placeholder="Describe any remedial work required..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  placeholder="Any recommendations for maintenance or improvements..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="certifierSignature">Certifier Name *</Label>
                <Input
                  id="certifierSignature"
                  name="certifierSignature"
                  placeholder="Name of person issuing certificate"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Link href="/certificates/new">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating Certificate..." : "Create Certificate"}
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
  )
}

"use client"
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createCertificate } from "@/app/(dashboard)/actions"
import { ArrowLeft, Lightbulb, Battery, CheckCircle } from "lucide-react"
import Link from "next/link"
import GuidedModeModal, { Step } from '@/components/GuidedModeModal';

export default function BS5266CertificatePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customers, setCustomers] = useState<Array<{id: number, name: string}>>([])
  const [guidedOpen, setGuidedOpen] = useState(false);

  // Load customers on component mount
  useEffect(() => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(console.error)
  }, [])

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    try {
      // Add certificateType based on the form type
      formData.append('certificateType', 'BS5266')
      
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

  const steps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer ID', type: 'text' },
    { name: 'siteName', label: 'Site Name', type: 'text' },
    { name: 'siteAddress', label: 'Site Address', type: 'text' },
    { name: 'buildingType', label: 'Building Type', type: 'text' },
    { name: 'floors', label: 'Number of Floors', type: 'number' },
    { name: 'totalFloorArea', label: 'Total Floor Area', type: 'number' },
    { name: 'occupancyLoad', label: 'Maximum Occupancy', type: 'number' },
    { name: 'systemType', label: 'System Type', type: 'text' },
    { name: 'exitSigns', label: 'Exit Signs', type: 'number' },
    { name: 'bulkheadLights', label: 'Bulkhead Lights', type: 'number' },
    { name: 'spotlights', label: 'Spotlights', type: 'number' },
    { name: 'centralBattery', label: 'Central Battery Units', type: 'number' },
    { name: 'duration', label: 'Minimum Duration', type: 'text' },
    { name: 'illuminationLevel', label: 'Illumination Level', type: 'text' },
    { name: 'inspectionDate', label: 'Inspection Date', type: 'text' },
    { name: 'lastFullDurationTest', label: 'Last Full Duration Test', type: 'text' },
    { name: 'nextInspectionDate', label: 'Next Inspection Due', type: 'text' },
    { name: 'inspectorName', label: 'Inspector Name', type: 'text' },
    { name: 'inspectionType', label: 'Inspection Type', type: 'text' },
    { name: 'overallCondition', label: 'Overall System Performance', type: 'text' }
  ];

  const handleGuidedComplete = async (values: Record<string, string>) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, val]) => formData.append(key, val));
      formData.append('certificateType', 'BS5266');
      const result = await createCertificate({}, formData);
      if (result?.error) console.error('Guided error:', result.error);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
              <h1 className="text-3xl font-bold">BS5266 Emergency Lighting Certificate</h1>
              <p className="text-muted-foreground">
                Emergency lighting systems inspection and testing
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setGuidedOpen(true)}>
            Guided Mode
          </Button>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <input type="hidden" name="certificateType" value="BS5266" />
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-yellow-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="certificateNumber">Certificate Number *</Label>
                <Input
                  id="certificateNumber"
                  name="certificateNumber"
                  placeholder="e.g., EL-2025-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerId">Customer *</Label>
                <Select name="customerId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Site Information */}
          <Card>
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Site Name *</Label>
                  <Input
                    id="siteName"
                    name="siteName"
                    placeholder="Building or site name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="siteAddress">Site Address</Label>
                  <Input
                    id="siteAddress"
                    name="siteAddress"
                    placeholder="Full address"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buildingType">Building Type *</Label>
                  <Select name="buildingType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select building type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office Building</SelectItem>
                      <SelectItem value="retail">Retail Premises</SelectItem>
                      <SelectItem value="industrial">Industrial Building</SelectItem>
                      <SelectItem value="residential">Residential Building</SelectItem>
                      <SelectItem value="educational">Educational Facility</SelectItem>
                      <SelectItem value="healthcare">Healthcare Facility</SelectItem>
                      <SelectItem value="hotel">Hotel/Hospitality</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                    placeholder="e.g., 3"
                  />
                </div>
                <div>
                  <Label htmlFor="totalFloorArea">Total Floor Area (m²)</Label>
                  <Input
                    id="totalFloorArea"
                    name="totalFloorArea"
                    type="number"
                    placeholder="e.g., 1500"
                  />
                </div>
                <div>
                  <Label htmlFor="occupancyLoad">Maximum Occupancy</Label>
                  <Input
                    id="occupancyLoad"
                    name="occupancyLoad"
                    type="number"
                    placeholder="e.g., 200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Battery className="h-5 w-5 mr-2 text-blue-600" />
                Emergency Lighting System Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>System Type *</Label>
                <RadioGroup name="systemType" required className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="maintained" id="maintained" />
                    <Label htmlFor="maintained">Maintained (operates continuously)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non-maintained" id="nonMaintained" />
                    <Label htmlFor="nonMaintained">Non-maintained (operates on mains failure)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sustained" id="sustained" />
                    <Label htmlFor="sustained">Sustained (combination of above)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="exitSigns">Exit Signs</Label>
                  <Input
                    id="exitSigns"
                    name="exitSigns"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="bulkheadLights">Bulkhead Lights</Label>
                  <Input
                    id="bulkheadLights"
                    name="bulkheadLights"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="spotlights">Spotlights</Label>
                  <Input
                    id="spotlights"
                    name="spotlights"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="centralBattery">Central Battery Units</Label>
                  <Input
                    id="centralBattery"
                    name="centralBattery"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Minimum Duration (hours) *</Label>
                  <Select name="duration" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="illuminationLevel">Illumination Level (lux)</Label>
                  <Select name="illuminationLevel">
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.2">0.2 lux (escape routes)</SelectItem>
                      <SelectItem value="1">1 lux (open areas)</SelectItem>
                      <SelectItem value="5">5 lux (high risk areas)</SelectItem>
                      <SelectItem value="15">15 lux (high risk task areas)</SelectItem>
                    </SelectContent>
                  </Select>
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastFullDurationTest">Last Full Duration Test</Label>
                  <Input
                    id="lastFullDurationTest"
                    name="lastFullDurationTest"
                    type="date"
                  />
                </div>
                <div>
                  <Label htmlFor="nextInspectionDate">Next Inspection Due</Label>
                  <Input
                    id="nextInspectionDate"
                    name="nextInspectionDate"
                    type="date"
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="inspectionType">Inspection Type *</Label>
                  <Select name="inspectionType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspection type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Functional Test</SelectItem>
                      <SelectItem value="monthly">Monthly Functional Test</SelectItem>
                      <SelectItem value="annual">Annual Full Duration Test</SelectItem>
                      <SelectItem value="commissioning">Commissioning Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Test Results & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Overall System Performance *</Label>
                <RadioGroup name="overallCondition" required className="mt-2">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Functional Test Result</Label>
                  <RadioGroup name="functionalTest" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pass" id="functionalPass" />
                      <Label htmlFor="functionalPass">Pass</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fail" id="functionalFail" />
                      <Label htmlFor="functionalFail">Fail</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Duration Test Result</Label>
                  <RadioGroup name="durationTest" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pass" id="durationPass" />
                      <Label htmlFor="durationPass">Pass</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fail" id="durationFail" />
                      <Label htmlFor="durationFail">Fail</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Illumination Test Result</Label>
                  <RadioGroup name="illuminationTest" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pass" id="illuminationPass" />
                      <Label htmlFor="illuminationPass">Pass</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fail" id="illuminationFail" />
                      <Label htmlFor="illuminationFail">Fail</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div>
                <Label htmlFor="failedUnits">Number of Failed Units</Label>
                <Input
                  id="failedUnits"
                  name="failedUnits"
                  type="number"
                  min="0"
                  placeholder="0"
                />
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
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  placeholder="Any recommendations for improvement or maintenance..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="certifierSignature">Certifier Name *</Label>
                <Input
                  id="certifierSignature"
                  name="certifierSignature"
                  placeholder="Name of person issuing certificate"
                  required
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

        <GuidedModeModal
          open={guidedOpen}
          steps={steps}
          onClose={() => setGuidedOpen(false)}
          onComplete={handleGuidedComplete}
        />
      </div>
      <div className="mb-6">
        <Button onClick={() => setGuidedOpen(true)} size="lg" className="w-full">Start Guided Mode</Button>
      </div>
    </>
  )
}

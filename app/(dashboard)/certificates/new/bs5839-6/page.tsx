"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createCertificate } from "../../../actions"
import { ArrowLeft, Home, Shield, CheckCircle } from "lucide-react"
import Link from "next/link"
import GuidedModeModal, { Step } from '@/components/GuidedModeModal';
import { CertificateNumberField } from '@/components/CertificateNumberField';
import { NextVisitField } from '@/components/NextVisitField';
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function BS5839_6CertificatePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const { data: customers = [] } = useSWR('/api/customers', fetcher)
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    try {
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

  // Define guided steps
  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Property Address', type: 'text' },
    { name: 'propertyType', label: 'Property Type', type: 'text' },
    { name: 'floors', label: 'Number of Floors', type: 'number' },
    { name: 'bedrooms', label: 'Number of Bedrooms', type: 'number' },
    { name: 'occupancy', label: 'Occupancy Type', type: 'text' },
    { name: 'systemGrade', label: 'System Grade', type: 'text' }
  ];

  // Handle guided completion
  const handleGuidedComplete = (values: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([k,v]) => formData.append(k, v));
    formData.append('certificateType', 'BS5839-6');
    handleSubmit(formData);
    setGuidedOpen(false);
  };

  return (
    <>
      <div className="mb-6">
        <Button onClick={() => setGuidedOpen(true)} size="lg" className="w-full">
          Start Guided Mode
        </Button>
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
              <h1 className="text-3xl font-bold">BS5839-6 Fire Alarm Certificate</h1>
              <p className="text-muted-foreground">
                Fire detection and alarm systems for dwellings
              </p>
            </div>
          </div>
        </div>

        <form action={handleSubmit} className="space-y-6">
          <input type="hidden" name="certificateType" value="BS5839-6" />
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CertificateNumberField
                value={certificateNumber}
                onChange={setCertificateNumber}
                certificateType="BS5839-6"
                customerName={selectedCustomerName}
                siteName={siteName}
              />
              <div>
                <Label htmlFor="customerId">Customer *</Label>
                <Select 
                  name="customerId" 
                  required
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
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2 text-green-600" />
                Dwelling Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Property Address *</Label>
                  <Input
                    id="siteName"
                    name="siteName"
                    placeholder="Property address"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="propertyType">Property Type *</Label>
                  <Select name="propertyType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="maisonette">Maisonette</SelectItem>
                      <SelectItem value="bungalow">Bungalow</SelectItem>
                      <SelectItem value="hmo">HMO (House in Multiple Occupation)</SelectItem>
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
                    placeholder="e.g., 2"
                  />
                </div>
                <div>
                  <Label htmlFor="bedrooms">Number of Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    name="bedrooms"
                    type="number"
                    min="1"
                    placeholder="e.g., 3"
                  />
                </div>
                <div>
                  <Label htmlFor="occupancy">Occupancy Type</Label>
                  <Select name="occupancy">
                    <SelectTrigger>
                      <SelectValue placeholder="Select occupancy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner-occupied">Owner Occupied</SelectItem>
                      <SelectItem value="rental">Rental Property</SelectItem>
                      <SelectItem value="social-housing">Social Housing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>Fire Alarm System Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>System Grade *</Label>
                <RadioGroup name="systemGrade" required className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="A" id="gradeA" />
                    <Label htmlFor="gradeA">Grade A - Mains powered with battery backup</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="B" id="gradeB" />
                    <Label htmlFor="gradeB">Grade B - Mains powered</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="C" id="gradeC" />
                    <Label htmlFor="gradeC">Grade C - Battery powered</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="D" id="gradeD" />
                    <Label htmlFor="gradeD">Grade D - Mains powered with integral battery</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="F" id="gradeF" />
                    <Label htmlFor="gradeF">Grade F - Wireless system</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="smokeDetectors">Number of Smoke Detectors</Label>
                  <Input
                    id="smokeDetectors"
                    name="smokeDetectors"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="heatDetectors">Number of Heat Detectors</Label>
                  <Input
                    id="heatDetectors"
                    name="heatDetectors"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="coDetectors">Number of CO Detectors</Label>
                  <Input
                    id="coDetectors"
                    name="coDetectors"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="controlPanel">Control Panel Make/Model</Label>
                  <Input
                    id="controlPanel"
                    name="controlPanel"
                    placeholder="e.g., Aico Ei1529RC"
                  />
                </div>
                <div>
                  <Label htmlFor="interconnection">Interconnection Method</Label>
                  <Select name="interconnection">
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hardwired">Hardwired</SelectItem>
                      <SelectItem value="wireless">Wireless</SelectItem>
                      <SelectItem value="mixed">Mixed (Hardwired & Wireless)</SelectItem>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="visitDate">Visit Date *</Label>
                  <Input
                    id="visitDate"
                    name="visitDate"
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    required
                  />
                </div>
                <NextVisitField
                  visitDate={inspectionDate}
                  value={nextVisitDate}
                  onChange={setNextVisitDate}
                  required
                  label="Next Visit Due"
                  months={[6, 12]}
                />
                <div>
                  <Label htmlFor="inspectorName">Inspector Name *</Label>
                  <Input
                    id="inspectorName"
                    name="inspectorName"
                    placeholder="Inspector name"
                    required
                  />
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
                <Label>Overall System Condition *</Label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="partial" id="functionalPartial" />
                      <Label htmlFor="functionalPartial">Partial Pass</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Audibility Test Result</Label>
                  <RadioGroup name="audibilityTest" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pass" id="audibilityPass" />
                      <Label htmlFor="audibilityPass">Pass</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fail" id="audibilityFail" />
                      <Label htmlFor="audibilityFail">Fail</Label>
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

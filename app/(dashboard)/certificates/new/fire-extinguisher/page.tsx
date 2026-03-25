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
import { ArrowLeft, Flame, Shield, CheckCircle } from "lucide-react"
import Link from "next/link"
import GuidedModeModal, { Step } from "@/components/GuidedModeModal"
import { CertificateNumberField } from '@/components/CertificateNumberField'
import { DateDropdownField } from '@/components/DateDropdownField'
import { NextVisitField } from '@/components/NextVisitField'
import { AddressAutocompleteField } from '@/components/AddressAutocompleteField'
import { getSignInRedirectPath, isSessionExpiredError } from '@/lib/auth/errors'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
});

export default function FireExtinguisherCertificatePage() {
  const router = useRouter()
  const getTodayDate = () => new Date().toISOString().split('T')[0]
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const { data: customersData } = useSWR('/api/customers', fetcher)
  const customers = Array.isArray(customersData) ? customersData : []
  const [guidedOpen, setGuidedOpen] = useState(false)
  const [certificateNumber, setCertificateNumber] = useState('')
  const [selectedCustomerName, setSelectedCustomerName] = useState('')
  const [siteName, setSiteName] = useState('')
  const [isSiteNameAuto, setIsSiteNameAuto] = useState(false)
  const [inspectionDate, setInspectionDate] = useState(getTodayDate())
  const [isInspectionDateAuto, setIsInspectionDateAuto] = useState(true)
  const [nextInspectionDate, setNextInspectionDate] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [nextVisitDate, setNextVisitDate] = useState('')
  const [formError, setFormError] = useState('')

  const guidedSteps: Step[] = [
    { name: 'certificateNumber', label: 'Certificate Number', type: 'text' },
    { name: 'customerId', label: 'Customer', type: 'text' },
    { name: 'siteName', label: 'Site Name', type: 'text' },
    { name: 'siteAddress', label: 'Site Address', type: 'text' },
    { name: 'inventory', label: 'Extinguisher Inventory Details', type: 'textarea' }
  ];

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setFormError('')
    try {
      // Add certificateType based on the form type
      formData.append('certificateType', 'Fire Extinguisher')
      
      const result = await createCertificate({}, formData)
      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath('/certificates/new/fire-extinguisher'))
          return
        }
        setFormError(result.error)
      }
      // If no error, the action will redirect automatically
    } catch (error) {
      console.error('Error creating certificate:', error)
      setFormError('Unable to create certificate. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuidedComplete = async (values: Record<string,string>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([k,v]) => formData.append(k,v));
    formData.append('certificateType', 'Fire Extinguisher');
    await handleSubmit(formData);
    setGuidedOpen(false);
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
              <h1 className="text-3xl font-bold">Fire Extinguisher Certificate</h1>
              <p className="text-muted-foreground">
                Portable fire fighting equipment inspection and maintenance
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <Button onClick={() => setGuidedOpen(true)} size="lg" className="w-full">Start Guided Mode</Button>
        </div>

        <form action={handleSubmit} className="space-y-6">
          {formError && (
            <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
          <input type="hidden" name="certificateType" value="Fire Extinguisher" />
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flame className="h-5 w-5 mr-2 text-red-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CertificateNumberField
                value={certificateNumber}
                onChange={setCertificateNumber}
                certificateType="Fire Extinguisher"
                customerName={selectedCustomerName}
                siteName={siteName}
              />
              <div>
                <Label htmlFor="customerName">Customer *</Label>
                <input type="hidden" name="customerId" value={selectedCustomer} />
                <Input
                  id="customerName"
                  name="customerName"
                  list="customers-list-fire-ext"
                  value={selectedCustomerName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCustomerName(value);
                    const normalizedValue = value.trim().toLowerCase();
                    const exactMatch = customers.find((c: any) => c.name?.trim().toLowerCase() === normalizedValue);
                    const prefixMatches = customers.filter((c: any) => c.name?.trim().toLowerCase().startsWith(normalizedValue));
                    const customer = exactMatch || (normalizedValue && prefixMatches.length === 1 ? prefixMatches[0] : null);
                    setSelectedCustomer(customer ? String(customer.id) : '');
                    if (customer && !siteName && (customer.address || customer.name)) {
                      setSiteName(customer.address || customer.name || '');
                      setIsSiteNameAuto(true);
                    }
                  }}
                  required
                  placeholder="Type customer name"
                />
                <datalist id="customers-list-fire-ext">
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
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
                  <Label htmlFor="siteName">Site Name/Address *</Label>
                  <AddressAutocompleteField
                    id="siteName"
                    name="siteName"
                    placeholder="Building name and address"
                    required
                    value={siteName}
                    onChange={(newValue) => {
                      setSiteName(newValue)
                      setIsSiteNameAuto(false)
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
                <div>
                  <Label htmlFor="riskCategory">Risk Category *</Label>
                  <Select name="riskCategory" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Risk (offices, schools)</SelectItem>
                      <SelectItem value="ordinary">Ordinary Risk (shops, hotels)</SelectItem>
                      <SelectItem value="high">High Risk (workshops, factories)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extinguisher Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Extinguisher Inventory
              </CardTitle>
              <CardDescription>
                Record the types and quantities of fire extinguishers on site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="waterExtinguishers">Water (Class A)</Label>
                  <Input
                    id="waterExtinguishers"
                    name="waterExtinguishers"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="foamExtinguishers">Foam (Class A/B)</Label>
                  <Input
                    id="foamExtinguishers"
                    name="foamExtinguishers"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="co2Extinguishers">CO₂ (Class B/E)</Label>
                  <Input
                    id="co2Extinguishers"
                    name="co2Extinguishers"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="powderExtinguishers">Powder (Multi-class)</Label>
                  <Input
                    id="powderExtinguishers"
                    name="powderExtinguishers"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="wetChemicalExtinguishers">Wet Chemical (Class F)</Label>
                  <Input
                    id="wetChemicalExtinguishers"
                    name="wetChemicalExtinguishers"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fireBlanketsCount">Fire Blankets</Label>
                  <Input
                    id="fireBlanketsCount"
                    name="fireBlanketsCount"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="totalExtinguishers">Total Extinguishers</Label>
                  <Input
                    id="totalExtinguishers"
                    name="totalExtinguishers"
                    type="number"
                    min="0"
                    placeholder="Calculated automatically"
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="coverageAdequate">Coverage Adequate?</Label>
                  <Select name="coverageAdequate">
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="additional-required">Additional Required</SelectItem>
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
                <div className="space-y-2">
                  <DateDropdownField
                    id="inspectionDate"
                    name="inspectionDate"
                    label="Inspection Date"
                    value={inspectionDate}
                    onChange={(newDate) => {
                      setInspectionDate(newDate)
                      setIsInspectionDateAuto(false)
                    }}
                    required
                    isAutoPopulated={isInspectionDateAuto}
                    autoTitle="Auto-populated with today's date. Edit if required."
                    autoHelpText="Auto-populated with today's date. Hover the field for details."
                  />
                </div>
                <NextVisitField
                  visitDate={inspectionDate}
                  value={nextVisitDate}
                  onChange={setNextVisitDate}
                  required
                  label="Next Visit Due"

                />
                <div>
                  <Label htmlFor="inspectionType">Inspection Type *</Label>
                  <Select name="inspectionType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspection type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine Inspection</SelectItem>
                      <SelectItem value="basic-service">Basic Service</SelectItem>
                      <SelectItem value="extended-service">Extended Service</SelectItem>
                      <SelectItem value="overhaul">Overhaul</SelectItem>
                      <SelectItem value="commissioning">Commissioning</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="companyRegistration">Company Registration</Label>
                  <Input
                    id="companyRegistration"
                    name="companyRegistration"
                    placeholder="e.g., BAFE registered"
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
                Inspection Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Overall Condition *</Label>
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="extinguishersServiced">Extinguishers Serviced</Label>
                  <Input
                    id="extinguishersServiced"
                    name="extinguishersServiced"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="extinguishersReplaced">Extinguishers Replaced</Label>
                  <Input
                    id="extinguishersReplaced"
                    name="extinguishersReplaced"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="extinguishersRemoved">Extinguishers Removed</Label>
                  <Input
                    id="extinguishersRemoved"
                    name="extinguishersRemoved"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="extinguishersAdded">Extinguishers Added</Label>
                  <Input
                    id="extinguishersAdded"
                    name="extinguishersAdded"
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Signs and Fixings</Label>
                  <RadioGroup name="signsFixings" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="satisfactory" id="signsOk" />
                      <Label htmlFor="signsOk">Satisfactory</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="requires-attention" id="signsAttention" />
                      <Label htmlFor="signsAttention">Requires Attention</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Access and Positioning</Label>
                  <RadioGroup name="accessPositioning" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="satisfactory" id="accessOk" />
                      <Label htmlFor="accessOk">Satisfactory</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="requires-attention" id="accessAttention" />
                      <Label htmlFor="accessAttention">Requires Attention</Label>
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
                <Label htmlFor="workCarriedOut">Work Carried Out</Label>
                <Textarea
                  id="workCarriedOut"
                  name="workCarriedOut"
                  placeholder="Describe work performed (servicing, replacements, etc.)..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  name="recommendations"
                  placeholder="Any recommendations for improvement or additional equipment..."
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

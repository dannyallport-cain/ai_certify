'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

import { createCertificate } from '@/app/(dashboard)/actions';
import { HousingFieldInput, housingFieldWrapperClass } from '@/components/housing/HousingFieldInput';
import { HousingReportPreview } from '@/components/housing/HousingReportPreview';
import { RepeatableRowsEditor } from '@/components/housing/RepeatableRowsEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSignInRedirectPath, isSessionExpiredError } from '@/lib/auth/errors';
import type { HousingReportTemplate } from '@/lib/housing/types';
import {
  buildHousingReportPayload,
  createInitialRows,
  isRowEmpty,
  serialiseRows,
  type HousingRow,
  type HousingRowMap,
  type HousingValueMap,
} from '@/lib/housing/values';

type CustomerOption = {
  id: number;
  name: string | null;
  email: string | null;
  address: string | null;
};

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }
    return response.json();
  });

function todayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

function generateReportNumber(prefix: string) {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${prefix}-${year}${random}`;
}

export function HousingReportForm({ template }: { template: HousingReportTemplate }) {
  const router = useRouter();
  const { data: customersData } = useSWR<CustomerOption[]>('/api/customers', fetcher);
  const customers = useMemo(
    () => (Array.isArray(customersData) ? customersData : []),
    [customersData],
  );

  const [certificateNumber, setCertificateNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [inspectionDate, setInspectionDate] = useState(todayIsoDate());
  const [nextInspectionDate, setNextInspectionDate] = useState('');
  const [inspectorName, setInspectorName] = useState('');

  const [values, setValues] = useState<HousingValueMap>({});
  const [rows, setRows] = useState<HousingRowMap>(() => {
    const initial: HousingRowMap = {};
    template.sections.forEach((section) => {
      if (section.repeatable) {
        initial[section.repeatable.id] = createInitialRows(section.repeatable);
      }
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setCertificateNumber(generateReportNumber(template.numberPrefix));
  }, [template.numberPrefix]);

  const setValue = (fieldId: string, value: string) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
  };

  const setRowsFor = (groupId: string, nextRows: HousingRow[]) => {
    setRows((current) => ({ ...current, [groupId]: nextRows }));
  };

  const buildPayload = () =>
    buildHousingReportPayload(template, {
      certificateNumber,
      customerName,
      siteName,
      siteAddress,
      inspectionDate,
      nextInspectionDate,
      inspectorName,
      values,
      rows,
    });

  const handleSubmit = async () => {
    if (!certificateNumber.trim()) {
      setFormError('Report reference is required.');
      return;
    }

    if (!customerName.trim()) {
      setFormError('Customer is required.');
      return;
    }

    if (!siteName.trim()) {
      setFormError('Site or property name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const formData = new FormData();
      formData.set('certificateType', template.certificateType);
      formData.set('certificateNumber', certificateNumber.trim());
      formData.set('customerName', customerName.trim());
      if (selectedCustomerId) {
        formData.set('customerId', selectedCustomerId);
      }
      formData.set('siteName', siteName.trim());
      formData.set('siteAddress', siteAddress.trim());
      formData.set('inspectionDate', inspectionDate);
      formData.set('nextInspectionDate', nextInspectionDate);
      formData.set('inspectorName', inspectorName.trim());
      formData.set('reportTemplate', template.key);

      Object.entries(values).forEach(([key, value]) => {
        if (value && value.trim().length > 0) {
          formData.set(key, value.trim());
        }
      });

      Object.entries(rows).forEach(([groupId, groupRows]) => {
        const populated = groupRows.filter((row) => !isRowEmpty(row));
        formData.set(groupId, serialiseRows(populated));
      });

      const result = await createCertificate({}, formData);

      if (result?.error) {
        if (isSessionExpiredError(result.error)) {
          router.push(getSignInRedirectPath(`/certificates/new/housing/${template.key}`));
          return;
        }

        setFormError(result.error);
      }
    } catch (error) {
      console.error('Error creating housing report:', error);
      setFormError('Unable to save this report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerChange = (value: string) => {
    setCustomerName(value);

    const normalised = value.trim().toLowerCase();
    const exactMatch = customers.find(
      (customer) => (customer.name ?? '').trim().toLowerCase() === normalised,
    );

    if (!exactMatch) {
      setSelectedCustomerId('');
      return;
    }

    setSelectedCustomerId(String(exactMatch.id));

    if (!siteName && (exactMatch.address || exactMatch.name)) {
      setSiteName(exactMatch.address || exactMatch.name || '');
    }

    if (!siteAddress && exactMatch.address) {
      setSiteAddress(exactMatch.address);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{template.title}</h1>
          <p className="max-w-3xl text-muted-foreground">{template.summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/certificates/new">
              <span>Back to certificate types</span>
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About this template</CardTitle>
          <CardDescription>
            Housing template pack · reports save to your certificate list and download as a PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Typical use</p>
            <p className="mt-1 text-slate-700">{template.typicalUse}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Standards</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
              {template.standards.map((standard) => (
                <li key={standard}>{standard}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How to complete</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">
              {template.explanatoryNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {formError ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Report details</CardTitle>
          <CardDescription>
            Reference, customer, site and inspection date for this report.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="reportReference" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Report reference *
            </Label>
            <Input
              id="reportReference"
              value={certificateNumber}
              onChange={(event) => setCertificateNumber(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reportCustomer" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Customer *
            </Label>
            <Input
              id="reportCustomer"
              list="housing-report-customers"
              value={customerName}
              onChange={(event) => handleCustomerChange(event.target.value)}
              placeholder="Type customer name"
              required
            />
            <datalist id="housing-report-customers">
              {customers.map((customer) => (
                <option key={customer.id} value={customer.name ?? ''} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reportInspector" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Inspector
            </Label>
            <Input
              id="reportInspector"
              value={inspectorName}
              onChange={(event) => setInspectorName(event.target.value)}
              placeholder="Who carried out the inspection"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reportSiteName" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Site / property name *
            </Label>
            <Input
              id="reportSiteName"
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              placeholder="Building, block or property"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reportInspectionDate" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Inspection date
            </Label>
            <Input
              id="reportInspectionDate"
              type="date"
              value={inspectionDate}
              onChange={(event) => setInspectionDate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reportNextDate" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Next inspection due
            </Label>
            <Input
              id="reportNextDate"
              type="date"
              value={nextInspectionDate}
              onChange={(event) => setNextInspectionDate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 xl:col-span-3">
            <Label htmlFor="reportSiteAddress" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Site address
            </Label>
            <Textarea
              id="reportSiteAddress"
              value={siteAddress}
              onChange={(event) => setSiteAddress(event.target.value)}
              rows={2}
              placeholder="Full address including postcode"
            />
          </div>
        </CardContent>
      </Card>
{template.sections.map((section, index) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>
              {index + 1}. {section.title}
            </CardTitle>
            {section.description ? <CardDescription>{section.description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="space-y-5">
            {section.fields && section.fields.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {section.fields.map((field) => (
                  <div key={field.id} className={housingFieldWrapperClass(field)}>
                    <HousingFieldInput
                      field={field}
                      value={values[field.id] ?? ''}
                      onChange={(value) => setValue(field.id, value)}
                      idPrefix={section.id}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {section.repeatable ? (
              <RepeatableRowsEditor
                group={section.repeatable}
                rows={rows[section.repeatable.id] ?? []}
                onChange={(nextRows) => setRowsFor(section.repeatable!.id, nextRows)}
              />
            ) : null}

            {section.guidance && section.guidance.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                {section.guidance.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
          Preview report
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? 'Saving report...' : 'Save report'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/certificates/new">Cancel</Link>
        </Button>
      </div>

      <HousingReportPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        template={template}
        payload={buildPayload()}
      />
    </div>
  );
}

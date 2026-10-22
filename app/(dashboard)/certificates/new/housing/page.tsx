import Link from 'next/link';
import { FileText, House } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HOUSING_REPORT_TEMPLATES, getHousingReportRoute } from '@/lib/housing';

export const metadata = {
  title: 'Housing report templates',
};

export default function HousingReportIndexPage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Housing report templates</h2>
          <p className="max-w-3xl text-muted-foreground">
            The housing template pack covers the operational reporting work around voids, stock
            condition, communal areas, plant, water hygiene and contractor access. Pick a template to
            start a report.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/certificates/new">← Back to certificate types</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HOUSING_REPORT_TEMPLATES.map((template) => (
          <Card key={template.key} className="flex h-full flex-col border-teal-200 bg-teal-50/40">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-teal-100 p-2 text-teal-700">
                  <House className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {template.certificateType.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <p className="text-sm text-slate-700">{template.summary}</p>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Standards
                </p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
                  {template.standards.slice(0, 3).map((standard) => (
                    <li key={standard}>{standard}</li>
                  ))}
                </ul>
                <Button asChild className="mt-2 w-full gap-2">
                  <Link href={getHousingReportRoute(template.key)}>
                    <FileText className="h-4 w-4" />
                    Start report
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

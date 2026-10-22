import { notFound } from 'next/navigation';

import { HousingReportForm } from '@/components/housing/HousingReportForm';
import { getHousingReportTemplateByKey } from '@/lib/housing';

type HousingReportPageProps = {
  params: Promise<{ reportKey: string }>;
};

export default async function HousingReportPage({ params }: HousingReportPageProps) {
  const { reportKey } = await params;
  const template = getHousingReportTemplateByKey(reportKey);

  if (!template) {
    notFound();
  }

  return (
    <div className="flex-1 p-4 pt-6 md:p-8">
      <HousingReportForm template={template} />
    </div>
  );
}

import { eq } from 'drizzle-orm';
import { db, client } from '../lib/db/drizzle';
import { reportDisseminatorReports, reportDisseminatorTemplates } from '../lib/db/schema';
import { enrichFieldsWithAcroFormPlacements } from '../lib/report-disseminator/pdf-acroform';
import { sanitizeStoredPdfBase64 } from '../lib/report-disseminator/pdf-sanitize';

type WizardData = Record<string, unknown> | null | undefined;

function stripPreviewValues(wizardData: WizardData) {
  if (!wizardData || typeof wizardData !== 'object' || !('previewValues' in wizardData)) {
    return {
      wizardData,
      changed: false,
    };
  }

  const nextWizardData = { ...wizardData };
  delete nextWizardData.previewValues;

  return {
    wizardData: nextWizardData,
    changed: true,
  };
}

async function main() {
  const templates = await db
    .select({
      id: reportDisseminatorTemplates.id,
      teamId: reportDisseminatorTemplates.teamId,
      name: reportDisseminatorTemplates.name,
      fields: reportDisseminatorTemplates.fields,
      sourcePdfBase64: reportDisseminatorTemplates.sourcePdfBase64,
      wizardData: reportDisseminatorTemplates.wizardData,
    })
    .from(reportDisseminatorTemplates);

  const reports = await db
    .select({
      id: reportDisseminatorReports.id,
      teamId: reportDisseminatorReports.teamId,
      name: reportDisseminatorReports.name,
      fields: reportDisseminatorReports.fields,
      sourcePdfBase64: reportDisseminatorReports.sourcePdfBase64,
    })
    .from(reportDisseminatorReports);

  let cleanedTemplateCount = 0;
  let cleanedReportCount = 0;

  for (const template of templates) {
    const sanitized = stripPreviewValues(template.wizardData as WizardData);
    const sanitizedPdf = await sanitizeStoredPdfBase64(template.sourcePdfBase64);
    const enrichedFields = await enrichFieldsWithAcroFormPlacements(template.fields as any, sanitizedPdf.base64);
    if (!sanitized.changed && !sanitizedPdf.changed && !enrichedFields.changed) continue;

    await db
      .update(reportDisseminatorTemplates)
      .set({
        fields: enrichedFields.fields,
        wizardData: sanitized.wizardData as typeof reportDisseminatorTemplates.$inferInsert.wizardData,
        sourcePdfBase64: sanitizedPdf.base64,
        updatedAt: new Date(),
      })
      .where(eq(reportDisseminatorTemplates.id, template.id));

    cleanedTemplateCount += 1;
    console.log(`Cleaned template ${template.id} (${template.name}) for team ${template.teamId}`);
  }

  for (const report of reports) {
    const sanitizedPdf = await sanitizeStoredPdfBase64(report.sourcePdfBase64);
    const enrichedFields = await enrichFieldsWithAcroFormPlacements(report.fields as any, sanitizedPdf.base64);
    if (!sanitizedPdf.changed && !enrichedFields.changed) continue;

    await db
      .update(reportDisseminatorReports)
      .set({
        fields: enrichedFields.fields,
        sourcePdfBase64: sanitizedPdf.base64,
        updatedAt: new Date(),
      })
      .where(eq(reportDisseminatorReports.id, report.id));

    cleanedReportCount += 1;
    console.log(`Cleaned report ${report.id} (${report.name}) for team ${report.teamId}`);
  }

  console.log(`Processed ${templates.length} templates.`);
  console.log(`Processed ${reports.length} reports.`);
  console.log(`Updated ${cleanedTemplateCount} template${cleanedTemplateCount === 1 ? '' : 's'}.`);
  console.log(`Updated ${cleanedReportCount} report${cleanedReportCount === 1 ? '' : 's'}.`);
}

main()
  .then(async () => {
    await client.end({ timeout: 5 });
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Failed to clean disseminator preview values:', error);
    await client.end({ timeout: 5 });
    process.exit(1);
  });
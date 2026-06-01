'use client';

import { configurePdfJsWorker } from '@/lib/pdf/pdfjs-worker';

export type EicrObservationCode = 'C1' | 'C2' | 'C3' | 'FI';

export interface EicrImportedObservation {
  id: string;
  description: string;
  code: EicrObservationCode;
}

export interface EicrPdfImportData {
  certificateNumber?: string;
  customerName?: string;
  siteName?: string;
  clientAddress?: string;
  installationAddress?: string;
  reasonForReport?: string;
  inspectionDate?: string;
  nextInspectionDate?: string;
  inspectorName?: string;
  overallAssessment?: 'SATISFACTORY' | 'UNSATISFACTORY';
  earthingArrangement?: string;
  meansOfEarthing?: string;
  supplyConductorCSA?: string;
  mainBondingCSA?: string;
  natureOfSupply?: string;
  observations: EicrImportedObservation[];
  warnings: string[];
  rawText: string;
}

type PdfPageTextItem = { str?: string; [key: string]: unknown };
type PdfPageProxy = {
  getTextContent: () => Promise<{ items?: PdfPageTextItem[] }>;
};
type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
};

const FIELD_LABELS = {
  certificateNumber: ['CERTIFICATE NUMBER', 'Report Reference'],
  customerName: ['Client/Customer', 'Client / Customer', 'Client', 'Landlord / Agent'],
  siteName: ['Site Name', 'Property / Site', 'Client / Organisation'],
  clientAddress: ['Client Address', 'Address', 'Property / Site Address'],
  installationAddress: ['Installation Address'],
  reasonForReport: ['Reason for producing this report', 'Reason for Report'],
  inspectionDate: ['Date(s) on which inspection and testing was carried out', 'Date(s) of Inspection', 'Inspection Date'],
  nextInspectionDate: ['Next Inspection Due', 'Recommended that the installation is further inspected and tested by'],
  inspectorName: ['Inspector Name', 'Name', 'Engineer'],
  earthingArrangement: ['Earthing Arrangement'],
  meansOfEarthing: ['Means of Earthing'],
  supplyConductorCSA: ['Supply conductors csa', 'Supply Conductor CSA'],
  natureOfSupply: ['Number and Type of Live Conductors', 'Nature of Supply'],
} as const;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function cleanLabel(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter((line) => line.length > 0);
}

function joinPageText(items: PdfPageTextItem[] | undefined): string {
  return (items ?? [])
    .map((item) => `${item.str ?? ''}${item.hasEOL ? '\n' : ' '}`)
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function loadPdfJsModule(): Promise<{
  getDocument: (options: { data: Uint8Array; disableWorker?: boolean }) => { promise: Promise<PdfDocumentProxy> };
}> {
  return configurePdfJsWorker() as unknown as {
    getDocument: (options: { data: Uint8Array; disableWorker?: boolean }) => { promise: Promise<PdfDocumentProxy> };
  };
}

async function extractPdfText(file: File): Promise<string> {
  const pdfJs = await loadPdfJsModule();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const documentTask = pdfJs.getDocument({ data: bytes });
  const document = (await documentTask.promise) as PdfDocumentProxy;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    pages.push(joinPageText(textContent.items));
  }

  return normalizeText(pages.join('\n'));
}

function findLineValue(lines: string[], labels: readonly string[]): string | undefined {
  const normalizedLabels = labels.map(cleanLabel);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lower = line.toLowerCase();

    for (let labelIndex = 0; labelIndex < labels.length; labelIndex++) {
      const label = labels[labelIndex];
      const cleaned = cleanLabel(label);

      const labelMatch = lower.match(new RegExp(`(?:^|\\b)${cleaned}\\b\\s*[:\\-]?(.*)$`, 'i'));
      if (labelMatch) {
        const tail = normalizeText(labelMatch[1] || '');
        if (tail) {
          return tail;
        }

        const next = lines[index + 1];
        if (next && !normalizedLabels.some((otherLabel) => next.toLowerCase().includes(otherLabel))) {
          return next;
        }
      }
    }
  }

  return undefined;
}

function findTextValue(text: string, labels: readonly string[]): string | undefined {
  const lines = splitLines(text);
  return findLineValue(lines, labels);
}

function pickFirstMatch(text: string, regexes: RegExp[]): string | undefined {
  for (const regex of regexes) {
    const match = text.match(regex);
    const value = match?.[1] ?? match?.[0];
    if (value) {
      const cleaned = normalizeText(value);
      if (cleaned) return cleaned;
    }
  }

  return undefined;
}

function parseObservationCode(rawValue: string): EicrObservationCode | null {
  const normalized = rawValue.toUpperCase();
  if (normalized === 'C1' || normalized === 'C2' || normalized === 'C3' || normalized === 'FI') {
    return normalized;
  }

  if (normalized.includes('DANGER PRESENT')) return 'C1';
  if (normalized.includes('POTENTIALLY DANGEROUS')) return 'C2';
  if (normalized.includes('IMPROVEMENT RECOMMENDED')) return 'C3';
  if (normalized.includes('FURTHER INVESTIGATION')) return 'FI';

  return null;
}

function extractObservations(lines: string[]): EicrImportedObservation[] {
  const observations: EicrImportedObservation[] = [];
  const rowRegexes = [
    /^(\d+(?:\.\d+)*)\s+(.+?)\s+(C1|C2|C3|FI)\b/i,
    /^(\d+(?:\.\d+)*)\s+(.+?)\s+(C1|C2|C3|FI)\s*[-–—]\s*(.+)$/i,
  ];

  for (const line of lines) {
    for (const regex of rowRegexes) {
      const match = line.match(regex);
      if (!match) continue;

      const ref = match[1];
      const description = normalizeText(match[2] || '');
      const code = parseObservationCode(match[3] || '') || null;

      if (!description || !code) continue;

      observations.push({
        id: `obs-${ref}-${observations.length + 1}`,
        description: `${ref} ${description}`.trim(),
        code,
      });
      break;
    }
  }

  return observations;
}

function extractInspectionDate(text: string): string | undefined {
  const regexes = [
    /Date\(s\) on which inspection and testing was carried out:\s*([^\n]+)/i,
    /Inspection Date:\s*([^\n]+)/i,
    /Date of Inspection:\s*([^\n]+)/i,
  ];

  return pickFirstMatch(text, regexes);
}

function extractNextInspectionPeriod(text: string): string | undefined {
  const regexes = [
    /Subject to the necessary remedial action being taken, I\/we recommend that the installation is further inspected and tested by:\s*([^\n]+)/i,
    /further inspected and tested by:\s*([^\n]+)/i,
    /Next Inspection Due:\s*([^\n]+)/i,
  ];

  return pickFirstMatch(text, regexes);
}

function deriveNextInspectionDateFromPeriod(
  inspectionDate: string | undefined,
  nextInspectionPeriod: string | undefined,
): string | undefined {
  if (!inspectionDate || !nextInspectionPeriod) return undefined;

  const base = new Date(inspectionDate);
  if (Number.isNaN(base.getTime())) return undefined;

  const yearMatch = nextInspectionPeriod.match(/(\d+)\s*[Yy]ear/);
  const monthMatch = nextInspectionPeriod.match(/(\d+)\s*[Mm]onth/);

  const years = yearMatch ? Number.parseInt(yearMatch[1], 10) : 0;
  const months = monthMatch ? Number.parseInt(monthMatch[1], 10) : 0;

  if (years === 0 && months === 0) return undefined;

  const nextDate = new Date(base);
  nextDate.setFullYear(nextDate.getFullYear() + years);
  nextDate.setMonth(nextDate.getMonth() + months);

  return nextDate.toISOString().split('T')[0];
}

export async function extractEicrCertificateDataFromPdf(file: File): Promise<EicrPdfImportData> {
  const rawText = await extractPdfText(file);
  const lines = splitLines(rawText);
  const warnings: string[] = [];

  if (!rawText) {
    warnings.push('No extractable text was found in the PDF.');
  }

  const certificateNumber = findTextValue(rawText, FIELD_LABELS.certificateNumber);
  const customerName = findTextValue(rawText, FIELD_LABELS.customerName);
  const siteName = findTextValue(rawText, FIELD_LABELS.siteName);
  const clientAddress = findTextValue(rawText, FIELD_LABELS.clientAddress);
  const installationAddress = findTextValue(rawText, FIELD_LABELS.installationAddress);
  const reasonForReport = findTextValue(rawText, FIELD_LABELS.reasonForReport);
  const inspectorName = findTextValue(rawText, FIELD_LABELS.inspectorName);
  const earthingArrangement = findTextValue(rawText, FIELD_LABELS.earthingArrangement);
  const meansOfEarthing = findTextValue(rawText, FIELD_LABELS.meansOfEarthing);
  const supplyConductorCSA = findTextValue(rawText, FIELD_LABELS.supplyConductorCSA);
  const mainBondingCSA = findTextValue(rawText, ['Main Bonding CSA', 'Main Bonding Conductor CSA']);
  const natureOfSupply = findTextValue(rawText, FIELD_LABELS.natureOfSupply);
  const inspectionDate = extractInspectionDate(rawText);
  const nextInspectionPeriod = extractNextInspectionPeriod(rawText);
  const nextInspectionDate =
    findTextValue(rawText, FIELD_LABELS.nextInspectionDate) ||
    deriveNextInspectionDateFromPeriod(inspectionDate, nextInspectionPeriod);

  const overallAssessment =
    /\bUNSATISFACTORY\b/i.test(rawText) ? 'UNSATISFACTORY' : /\bSATISFACTORY\b/i.test(rawText) ? 'SATISFACTORY' : undefined;

  const observations = extractObservations(lines);

  if (observations.length === 0) {
    warnings.push('No observations were identified in the imported PDF.');
  }

  return {
    certificateNumber,
    customerName,
    siteName,
    clientAddress,
    installationAddress,
    reasonForReport,
    inspectionDate,
    nextInspectionDate,
    inspectorName,
    overallAssessment,
    earthingArrangement,
    meansOfEarthing,
    supplyConductorCSA,
    mainBondingCSA,
    natureOfSupply,
    observations,
    warnings,
    rawText,
  };
}

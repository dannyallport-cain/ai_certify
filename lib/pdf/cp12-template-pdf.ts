import { jsPDF } from 'jspdf';

import type { CertificateData } from './generator';

type FormDataRecord = Record<string, unknown>;

type ApplianceRow = {
  location: string;
  applianceType: string;
  makeModel: string;
  flueType: string;
  landlordsAppliance: string;
  applianceInspected: string;
  operatingPressure: string;
  safetyDevicesCorrect: string;
  ventilationSatisfactory: string;
  flueConditionSatisfactory: string;
  fluePerformanceResult: string;
  applianceServiced: string;
  applianceSafeToUse: string;
  warningNoticeIssued: string;
  warningNoticeSerial: string;
  notes: string;
};

type CombustionReading = {
  readingLabel: string;
  co: string;
  co2: string;
  ratio: string;
};

const PAGE_M = 10;
const GRID = 4;
const BRAND = [28, 63, 99] as const;
const BRAND_LIGHT = [236, 243, 250] as const;
const HEADER_YELLOW = [246, 198, 0] as const;
const SOFT = [246, 248, 251] as const;
const SOFT_GREEN = [240, 255, 240] as const;
const BORDER = [164, 174, 188] as const;
const RED = [185, 28, 28] as const;
const GREEN = [46, 125, 50] as const;
const AMBER = [245, 158, 11] as const;
const GREY = [107, 114, 128] as const;

function ss(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not specified';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('en-GB');
}

function getJsPdfImageFormat(imageData: string): 'PNG' | 'JPEG' | 'WEBP' {
  const match = imageData.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/i);
  const subtype = match?.[1]?.toLowerCase();

  switch (subtype) {
    case 'png':
      return 'PNG';
    case 'webp':
      return 'WEBP';
    case 'jpg':
    case 'jpeg':
    default:
      return 'JPEG';
  }
}

function parseJsonLike<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
}

function normaliseYesNoValue(value: unknown): string {
  const text = ss(value).trim();
  if (!text) return 'Not specified';

  const lower = text.toLowerCase();
  if (['yes', 'true', 'pass', 'ok', 'present'].includes(lower)) return 'Yes';
  if (['no', 'false', 'fail', 'absent'].includes(lower)) return 'No';
  if (['n/a', 'na', 'not applicable'].includes(lower)) return 'N/A';

  return text;
}

function normaliseSafeToUseValue(value: unknown): string {
  const text = ss(value).trim();
  if (!text) return 'Not specified';

  const lower = text.toLowerCase();
  if (lower === 'yes' || lower === 'no' || lower === 'at risk' || lower === 'immediately dangerous') {
    return text;
  }

  if (lower === 'pass') return 'Yes';
  if (lower === 'fail') return 'No';

  return text;
}

function splitLines(pdf: jsPDF, value: string, width: number, fontSize = 6): string[] {
  pdf.setFontSize(fontSize);
  return pdf.splitTextToSize(ss(value).replace(/\s+/g, ' ').trim() || ' ', width) as string[];
}

function createEmptyApplianceRow(): ApplianceRow {
  return {
    location: '',
    applianceType: '',
    makeModel: '',
    flueType: '',
    landlordsAppliance: 'N/A',
    applianceInspected: 'Yes',
    operatingPressure: '',
    safetyDevicesCorrect: 'Yes',
    ventilationSatisfactory: 'Yes',
    flueConditionSatisfactory: 'Yes',
    fluePerformanceResult: 'N/A',
    applianceServiced: 'Yes',
    applianceSafeToUse: 'Yes',
    warningNoticeIssued: 'No',
    warningNoticeSerial: '',
    notes: '',
  };
}

function getAppliances(fd: FormDataRecord): ApplianceRow[] {
  const parsed = parseJsonLike<unknown>(fd.appliances, []);
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map((item) => ({
      ...createEmptyApplianceRow(),
      location: ss((item as Record<string, unknown>).location),
      applianceType: ss((item as Record<string, unknown>).applianceType),
      makeModel: ss((item as Record<string, unknown>).makeModel),
      flueType: ss((item as Record<string, unknown>).flueType),
      landlordsAppliance: normaliseYesNoValue((item as Record<string, unknown>).landlordsAppliance),
      applianceInspected: normaliseYesNoValue((item as Record<string, unknown>).applianceInspected) as string,
      operatingPressure: ss((item as Record<string, unknown>).operatingPressure),
      safetyDevicesCorrect: normaliseYesNoValue((item as Record<string, unknown>).safetyDevicesCorrect),
      ventilationSatisfactory: normaliseYesNoValue((item as Record<string, unknown>).ventilationSatisfactory),
      flueConditionSatisfactory: normaliseYesNoValue((item as Record<string, unknown>).flueConditionSatisfactory),
      fluePerformanceResult: normaliseYesNoValue((item as Record<string, unknown>).fluePerformanceResult),
      applianceServiced: normaliseYesNoValue((item as Record<string, unknown>).applianceServiced) as string,
      applianceSafeToUse: normaliseSafeToUseValue((item as Record<string, unknown>).applianceSafeToUse),
      warningNoticeIssued: normaliseYesNoValue((item as Record<string, unknown>).warningNoticeIssued) as string,
      warningNoticeSerial: ss((item as Record<string, unknown>).warningNoticeSerial),
      notes: ss((item as Record<string, unknown>).notes),
    }));
  }

  const legacyType = ss(fd.applianceType);
  const legacyLocation = ss(fd.applianceLocation);
  const legacyMakeModel = ss(fd.applianceMakeModel);
  const legacyOperatingPressure = ss(fd.operatingPressure);
  const legacyNotes = ss(fd.inspectionNotes);

  if (legacyType || legacyLocation || legacyMakeModel || legacyOperatingPressure || legacyNotes) {
    return [
      {
        ...createEmptyApplianceRow(),
        location: legacyLocation,
        applianceType: legacyType,
        makeModel: legacyMakeModel,
        flueType: ss(fd.flueType),
        landlordsAppliance: normaliseYesNoValue(fd.landlordsAppliance || 'N/A'),
        applianceInspected: normaliseYesNoValue(fd.applianceInspected || 'Yes') as string,
        operatingPressure: legacyOperatingPressure,
        safetyDevicesCorrect: normaliseYesNoValue(fd.safetyDevicesCorrect || 'Yes'),
        ventilationSatisfactory: normaliseYesNoValue(fd.ventilationSatisfactory || 'Yes'),
        flueConditionSatisfactory: normaliseYesNoValue(fd.terminationSatisfactory || 'Yes'),
        fluePerformanceResult: normaliseYesNoValue(fd.fluePerformanceResult || 'N/A'),
        applianceServiced: normaliseYesNoValue(fd.boilerServiceCompleted || 'Yes') as string,
        applianceSafeToUse: normaliseSafeToUseValue(fd.applianceSafeToUse || 'Yes'),
        warningNoticeIssued: normaliseYesNoValue(fd.warningNoticeIssued || 'No') as string,
        notes: legacyNotes,
      },
    ];
  }

  return Array.from({ length: 6 }, () => createEmptyApplianceRow());
}

function getCombustionReadings(fd: FormDataRecord): CombustionReading[] {
  const parsed = parseJsonLike<unknown>(fd.combustionReadings, []);
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.slice(0, 3).map((item, index) => ({
      readingLabel: ss((item as Record<string, unknown>).readingLabel) || `Reading ${index + 1}`,
      co: ss((item as Record<string, unknown>).co),
      co2: ss((item as Record<string, unknown>).co2),
      ratio: ss((item as Record<string, unknown>).ratio),
    }));
  }

  return [
    {
      readingLabel: '1st Reading / Min / Low',
      co: ss(fd.combustion1Co),
      co2: ss(fd.combustion1Co2),
      ratio: ss(fd.combustion1Ratio),
    },
    {
      readingLabel: '2nd Reading / Max / High',
      co: ss(fd.combustion2Co),
      co2: ss(fd.combustion2Co2),
      ratio: ss(fd.combustion2Ratio),
    },
    {
      readingLabel: '3rd Reading / Ign / Other',
      co: ss(fd.combustion3Co),
      co2: ss(fd.combustion3Co2),
      ratio: ss(fd.combustion3Ratio),
    },
  ];
}

function drawPanel(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  fill: readonly [number, number, number] = SOFT,
) {
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setFillColor(fill[0], fill[1], fill[2]);
  pdf.rect(x, y, w, h, 'FD');

  pdf.setFillColor(HEADER_YELLOW[0], HEADER_YELLOW[1], HEADER_YELLOW[2]);
  pdf.rect(x, y, w, 6, 'F');

  pdf.setTextColor(22, 22, 22);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(title, x + 2, y + 4.3);

  pdf.setTextColor(0, 0, 0);
}

function drawField(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  valueWidth: number,
  fontSize = 6,
) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(fontSize);
  pdf.text(label, x, y);

  pdf.setFont('helvetica', 'normal');
  const lines = splitLines(pdf, value, valueWidth, fontSize);
  const lineHeight = fontSize * 0.42;
  pdf.text(lines, x, y + 4.2);
  return 4.2 + Math.max(lines.length, 1) * lineHeight;
}

function drawKeyValueGrid(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  entries: Array<[string, string]>,
  columns = 2,
) {
  const columnWidth = (width - GRID * (columns - 1)) / columns;
  const rows = Math.ceil(entries.length / columns);
  let maxBottom = y;

  for (let row = 0; row < rows; row++) {
    let rowHeight = 0;

    for (let column = 0; column < columns; column++) {
      const entry = entries[row * columns + column];
      if (!entry) continue;

      const cellX = x + column * (columnWidth + GRID);
      const cellY = y;
      const labelWidth = Math.min(36, columnWidth * 0.38);
      const valueWidth = columnWidth - labelWidth - 4;

      pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(cellX, cellY, columnWidth, 11, 'FD');
      pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      pdf.rect(cellX + 0.2, cellY + 0.2, labelWidth - 0.2, 10.6, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.8);
      pdf.text(entry[0], cellX + 1.5, cellY + 6.6);

      pdf.setFont('helvetica', 'normal');
      const lines = splitLines(pdf, entry[1], valueWidth, 5.8);
      pdf.text(lines, cellX + labelWidth + 2, cellY + 6.2);

      const currentHeight = Math.max(11, 4.8 + lines.length * 2.6);
      rowHeight = Math.max(rowHeight, currentHeight);
    }

    y += rowHeight + 2;
    maxBottom = y;
  }

  return maxBottom;
}

function drawStatusChip(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  fill: readonly [number, number, number],
) {
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setFillColor(fill[0], fill[1], fill[2]);
  pdf.rect(x, y, w, h, 'FD');
  pdf.setTextColor(fill[0] === GREEN[0] ? 255 : 25, fill[1] === GREEN[1] ? 255 : 25, fill[2] === GREEN[2] ? 255 : 25);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.5);
  pdf.text(value || '-', x + w / 2, y + 3.8, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
}

function valueFill(value: string) {
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'pass') return GREEN;
  if (lower === 'no' || lower === 'fail' || lower === 'immediately dangerous') return RED;
  if (lower === 'at risk') return AMBER;
  if (lower === 'n/a') return GREY;
  return BRAND;
}

function createTitleBand(
  pdf: jsPDF,
  pageWidth: number,
  certificateNumber: string,
  pageNumber: number,
  totalPages: number,
) {
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(PAGE_M, PAGE_M, pageWidth - PAGE_M * 2, 18, 'FD');
  pdf.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  pdf.rect(PAGE_M, PAGE_M, pageWidth - PAGE_M * 2, 4, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
  pdf.setFontSize(14);
  pdf.text('DOMESTIC LANDLORD GAS SAFETY RECORD', pageWidth / 2, PAGE_M + 10, { align: 'center' });

  pdf.setFontSize(8.5);
  pdf.setTextColor(70, 70, 70);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Gas Safety (Installation and Use) Regulations 1998', PAGE_M + 4, PAGE_M + 15);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(8.5);
  pdf.text(`Ref: ${certificateNumber || 'Not specified'}`, pageWidth - PAGE_M - 4, PAGE_M + 15, { align: 'right' });
  pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - PAGE_M - 4, PAGE_M + 10, { align: 'right' });

  pdf.setTextColor(0, 0, 0);
}

function drawContinuationHeader(pdf: jsPDF, pageWidth: number, certificateNumber: string, pageNumber: number, totalPages: number) {
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(PAGE_M, PAGE_M, pageWidth - PAGE_M * 2, 14, 'FD');
  pdf.setFillColor(HEADER_YELLOW[0], HEADER_YELLOW[1], HEADER_YELLOW[2]);
  pdf.rect(PAGE_M, PAGE_M, pageWidth - PAGE_M * 2, 4, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(30, 30, 30);
  pdf.text('CP12 Gas Safety Record (continued)', PAGE_M + 4, PAGE_M + 9);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Ref: ${certificateNumber || 'Not specified'}`, PAGE_M + 4, PAGE_M + 12.8);
  pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - PAGE_M - 4, PAGE_M + 12.8, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
}

function drawApplianceTable(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  rows: ApplianceRow[],
  startIndex: number,
  endIndex: number,
) {
  const columns = [
    { key: 'index', label: 'No.', width: 8 },
    { key: 'location', label: 'Location', width: 23 },
    { key: 'applianceType', label: 'Appliance Type', width: 25 },
    { key: 'makeModel', label: 'Make / Model', width: 27 },
    { key: 'flueType', label: 'Flue Type', width: 13 },
    { key: 'landlordsAppliance', label: "Landlord's", width: 12 },
    { key: 'applianceInspected', label: 'Inspected', width: 12 },
    { key: 'operatingPressure', label: 'Operating pressure / heat input', width: 24 },
    { key: 'safetyDevicesCorrect', label: 'Safety device(s)', width: 12 },
    { key: 'ventilationSatisfactory', label: 'Ventilation', width: 12 },
    { key: 'flueConditionSatisfactory', label: 'Flue condition', width: 12 },
    { key: 'fluePerformanceResult', label: 'Flue perf.', width: 12 },
    { key: 'applianceServiced', label: 'Serviced', width: 10 },
    { key: 'applianceSafeToUse', label: 'Safe to use', width: 15 },
    { key: 'warningNoticeIssued', label: 'Warning notice', width: 14 },
  ] as const;

  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const scale = width / totalWidth;
  const scaledWidths = columns.map((column) => column.width * scale);
  const heights: number[] = [];

  const headerHeight = 12;
  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setFillColor(HEADER_YELLOW[0], HEADER_YELLOW[1], HEADER_YELLOW[2]);
  pdf.rect(x, y, width, headerHeight, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.5);

  let cursorX = x;
  columns.forEach((column, index) => {
    const colW = scaledWidths[index];
    if (index > 0) {
      pdf.line(cursorX, y, cursorX, y + headerHeight);
    }

    const labelLines = splitLines(pdf, column.label, colW - 2, 5);
    pdf.text(labelLines, cursorX + colW / 2, y + 4.3, { align: 'center' });
    cursorX += colW;
  });
  pdf.rect(x, y, width, headerHeight);
  y += headerHeight;

  rows.slice(startIndex, endIndex).forEach((row, rowIndex) => {
    const rowData: string[] = [
      String(startIndex + rowIndex + 1),
      ss(row.location),
      ss(row.applianceType),
      ss(row.makeModel),
      ss(row.flueType),
      normaliseYesNoValue(row.landlordsAppliance),
      normaliseYesNoValue(row.applianceInspected),
      ss(row.operatingPressure),
      normaliseYesNoValue(row.safetyDevicesCorrect),
      normaliseYesNoValue(row.ventilationSatisfactory),
      normaliseYesNoValue(row.flueConditionSatisfactory),
      normaliseYesNoValue(row.fluePerformanceResult),
      normaliseYesNoValue(row.applianceServiced),
      normaliseSafeToUseValue(row.applianceSafeToUse),
      normaliseYesNoValue(row.warningNoticeIssued),
    ];

    const lineCounts = rowData.map((value, index) => {
      const widthForCell = scaledWidths[index] - 1.8;
      const count = splitLines(pdf, value, widthForCell, 4.9).length;
      return Math.max(1, count);
    });
    const rowHeight = Math.max(8.5, Math.max(...lineCounts) * 2.85 + 1.2);

    pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250, rowIndex % 2 === 0 ? 255 : 250);
    pdf.rect(x, y, width, rowHeight, 'FD');

    let cellX = x;
    rowData.forEach((value, index) => {
      const colW = scaledWidths[index];
      if (index > 0) {
        pdf.line(cellX, y, cellX, y + rowHeight);
      }

      const isStatusColumn = [4, 5, 6, 8, 9, 10, 11, 12, 13, 14].includes(index);
      if (isStatusColumn) {
        const fill = valueFill(value);
        if (value) {
          pdf.setFillColor(fill[0], fill[1], fill[2]);
          pdf.rect(cellX + 0.2, y + 0.2, colW - 0.4, rowHeight - 0.4, 'F');
        }
      }

      pdf.setFont('helvetica', index === 0 ? 'bold' : 'normal');
      pdf.setFontSize(4.7);
      const lines = splitLines(pdf, value, colW - 2, 4.7);
      const textHeight = lines.length * 2.6;
      const textY = y + (rowHeight - textHeight) / 2 + 2.1;
      pdf.text(lines, cellX + colW / 2, textY, { align: 'center' });

      cellX += colW;
    });

    pdf.rect(x, y, width, rowHeight);
    y += rowHeight;
    heights.push(rowHeight);
  });

  return { endY: y, rowHeights: heights };
}

function drawTwoColumnChecks(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  rows: Array<[string, string]>,
) {
  const columnWidth = (width - GRID) / 2;
  let currentY = y;
  for (let i = 0; i < rows.length; i += 2) {
    const left = rows[i];
    const right = rows[i + 1];

    const leftLines = splitLines(pdf, `${left[0]}: ${left[1]}`, columnWidth - 4, 5.4);
    const rightLines = right ? splitLines(pdf, `${right[0]}: ${right[1]}`, columnWidth - 4, 5.4) : [''];
    const rowHeight = Math.max(leftLines.length, rightLines.length) * 2.8 + 3.5;

    pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, currentY, width, rowHeight, 'FD');
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.rect(x + 0.2, currentY + 0.2, columnWidth - 0.2, rowHeight - 0.4, 'F');
    pdf.rect(x + columnWidth + GRID, currentY + 0.2, columnWidth - 0.2, rowHeight - 0.4, 'F');
    pdf.line(x + columnWidth, currentY, x + columnWidth, currentY + rowHeight);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.6);
    pdf.text(leftLines, x + 1.8, currentY + 4.1);
    if (right) {
      pdf.text(rightLines, x + columnWidth + GRID + 1.8, currentY + 4.1);
    }

    currentY += rowHeight + 1.5;
  }

  return currentY;
}

function drawCombustionReadings(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  readings: CombustionReading[],
) {
  const rowHeight = 11;
  const labelWidth = 78;
  const colWidth = (width - labelWidth) / 3;

  pdf.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  pdf.setFillColor(HEADER_YELLOW[0], HEADER_YELLOW[1], HEADER_YELLOW[2]);
  pdf.rect(x, y, width, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.7);
  pdf.text('Combustion Analysis Readings', x + 2, y + 5.2);

  y += 8;

  const headers = ['Reading', 'CO', 'CO2', 'Ratio'];
  const widths = [labelWidth, colWidth, colWidth, colWidth];
  let cursorX = x;
  headers.forEach((header, index) => {
    const w = widths[index];
    pdf.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
    pdf.rect(cursorX, y, w, 6, 'F');
    pdf.line(cursorX, y, cursorX, y + 6);
    pdf.setFont('helvetica', 'bold');
    pdf.text(header, cursorX + w / 2, y + 4, { align: 'center' });
    cursorX += w;
  });
  pdf.rect(x, y, width, 6, 'D');
  y += 6;

  readings.forEach((reading) => {
    const cells = [reading.readingLabel, reading.co, reading.co2, reading.ratio];
    let cellX = x;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, width, rowHeight, 'FD');
    cells.forEach((cell, index) => {
      const w = widths[index];
      if (index > 0) {
        pdf.line(cellX, y, cellX, y + rowHeight);
      }
      pdf.setFont('helvetica', index === 0 ? 'bold' : 'normal');
      pdf.setFontSize(5.2);
      pdf.text(splitLines(pdf, cell, w - 2, 5.2), cellX + w / 2, y + 6.8, { align: 'center' });
      cellX += w;
    });
    pdf.rect(x, y, width, rowHeight, 'D');
    y += rowHeight;
  });

  return y;
}

function drawSignatureBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  nameValue: string,
  dateValue: string,
) {
  const fieldWidth = width - 26;
  drawPanel(pdf, x, y, width, 18, title, BRAND_LIGHT);
  pdf.setFontSize(5.4);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Name:', x + 2, y + 10.2);
  pdf.text('Date:', x + 2, y + 14.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(splitLines(pdf, nameValue || 'Not specified', fieldWidth, 5.4), x + 18, y + 10.2);
  pdf.text(splitLines(pdf, dateValue || 'Not specified', fieldWidth, 5.4), x + 18, y + 14.5);
}

export function generateCp12TemplatePdf(certificate: CertificateData): Uint8Array {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const fd = (certificate.formData || {}) as FormDataRecord;
  const certificateNumber = ss(certificate.certificateNumber) || ss(fd.certificateNumber) || 'Not specified';
  const customerName = ss(certificate.customer?.name) || ss(fd.customerName) || 'Not specified';
  const customerAddress = ss(certificate.customer?.address) || '';
  const customerPhone = ss(certificate.customer?.phone) || '';
  const customerPostcode = ss(certificate.customer?.postcode) || '';

  const landlordName = ss(fd.landlordName);
  const landlordAddress = ss(fd.landlordAddress);
  const landlordPostcode = ss(fd.landlordPostcode);
  const landlordTelephone = ss(fd.landlordTelephone);

  const siteName = ss(certificate.siteName) || ss(fd.siteName) || 'Not specified';
  const siteAddress = ss(certificate.siteAddress) || ss(fd.siteAddress) || 'Not specified';
  const sitePostcode = ss(fd.sitePostcode);
  const siteTelephone = ss(fd.siteTelephone);

  const businessName = ss(fd.businessName);
  const businessAddress = ss(fd.businessAddress);
  const businessPostcode = ss(fd.businessPostcode);
  const businessTelephone = ss(fd.businessTelephone);

  const inspectorName = ss(certificate.inspectorName) || ss(fd.inspectorName) || 'Not specified';
  const inspectorPosition = ss(fd.inspectorPosition) || 'Gas Operative';
  const gasSafeNumber = ss(fd.gasSafeNumber) || 'Not specified';
  const operativeIdNo = ss(fd.operativeIdNo);
  const inspectionDate = formatDate(certificate.inspectionDate || ss(fd.inspectionDate));
  const nextInspectionDate = formatDate(certificate.nextInspectionDate || ss(fd.nextInspectionDate));
  const inspectionType = ss(fd.inspectionType) || 'Annual Gas Safety Check';

  const gasTightnessInitial = ss(fd.gasTightnessTestInitialValue);
  const gasTightnessFinal = ss(fd.gasTightnessTestFinalValue);

  const appliances = getAppliances(fd);
  const combustionReadings = getCombustionReadings(fd);

  const totalPages = Math.max(2, Math.ceil(appliances.length / 3));
  const footerText = 'This record should be retained by the landlord and provided to tenants in accordance with current UK gas safety requirements.';

  const drawFooter = (pageNumber: number) => {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(6);
    pdf.setTextColor(90, 90, 90);
    pdf.text(footerText, PAGE_M, pageHeight - 5);
    pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - PAGE_M, pageHeight - 5, { align: 'right' });
    pdf.setTextColor(0, 0, 0);
  };

  const drawPageOne = () => {
    createTitleBand(pdf, pageWidth, certificateNumber, 1, totalPages);

    const topY = 24;
    const cardW = (pageWidth - PAGE_M * 2 - GRID * 2) / 3;
    const cardH = 35;

    drawPanel(pdf, PAGE_M, topY, cardW, cardH, 'Landlord / Agent Details');
    drawField(pdf, PAGE_M + 2, topY + 9.2, 'Name', landlordName || customerName, cardW - 8, 5.5);
    drawField(pdf, PAGE_M + 2, topY + 15.2, 'Address', landlordAddress || customerAddress || 'Not specified', cardW - 8, 5.5);
    drawField(pdf, PAGE_M + 2, topY + 22.6, 'Postcode', landlordPostcode || customerPostcode || 'Not specified', cardW - 8, 5.5);
    drawField(pdf, PAGE_M + 2, topY + 28.0, 'Telephone', landlordTelephone || customerPhone || 'Not specified', cardW - 8, 5.5);

    drawPanel(pdf, PAGE_M + cardW + GRID, topY, cardW, cardH, 'Site Details');
    drawField(pdf, PAGE_M + cardW + GRID + 2, topY + 9.2, 'Name', siteName, cardW - 8, 5.5);
    drawField(pdf, PAGE_M + cardW + GRID + 2, topY + 15.2, 'Address', siteAddress, cardW - 8, 5.5);
    drawField(pdf, PAGE_M + cardW + GRID + 2, topY + 22.6, 'Postcode', sitePostcode || 'Not specified', cardW - 8, 5.5);
    drawField(pdf, PAGE_M + cardW + GRID + 2, topY + 28.0, 'Telephone', siteTelephone || 'Not specified', cardW - 8, 5.5);

    drawPanel(pdf, PAGE_M + (cardW + GRID) * 2, topY, cardW, cardH, 'Registered Business Details');
    drawField(pdf, PAGE_M + (cardW + GRID) * 2 + 2, topY + 9.2, 'Name', businessName || 'Not specified', cardW - 8, 5.5);
    drawField(pdf, PAGE_M + (cardW + GRID) * 2 + 2, topY + 15.2, 'Address', businessAddress || 'Not specified', cardW - 8, 5.5);
    drawField(pdf, PAGE_M + (cardW + GRID) * 2 + 2, topY + 22.6, 'Postcode', businessPostcode || 'Not specified', cardW - 8, 5.5);
    drawField(pdf, PAGE_M + (cardW + GRID) * 2 + 2, topY + 28.0, 'Telephone', businessTelephone || 'Not specified', cardW - 8, 5.5);

    const inspectionY = topY + cardH + 4;
    drawPanel(pdf, PAGE_M, inspectionY, pageWidth - PAGE_M * 2, 28, 'Inspection Details');
    const inspectionEntries: Array<[string, string]> = [
      ['Gas Operative / Engineer', inspectorName],
      ['Position', inspectorPosition],
      ['Gas Safe No.', gasSafeNumber],
      ['Operative ID No', operativeIdNo || 'Not specified'],
      ['Inspection Date', inspectionDate],
      ['Next Safety Check Due', nextInspectionDate],
      ['Inspection Type', inspectionType],
      ['No. of Appliances Inspected', String(appliances.length)],
    ];
    drawKeyValueGrid(pdf, PAGE_M + 2, inspectionY + 8, pageWidth - PAGE_M * 2 - 4, inspectionEntries, 2);

    const applianceSectionY = inspectionY + 30;
    drawPanel(pdf, PAGE_M, applianceSectionY, pageWidth - PAGE_M * 2, 58, 'Appliance Details (1 of 2)');

    const tableResult = drawApplianceTable(pdf, PAGE_M + 1, applianceSectionY + 8, pageWidth - PAGE_M * 2 - 2, appliances, 0, Math.min(3, appliances.length));
    if (tableResult.endY < applianceSectionY + 54) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(5.4);
      pdf.setTextColor(90, 90, 90);
      pdf.text('Remaining appliance rows continue on page 2.', PAGE_M + 2, applianceSectionY + 55);
      pdf.setTextColor(0, 0, 0);
    }

    const keyY = applianceSectionY + 60;
    drawPanel(pdf, PAGE_M, keyY, pageWidth - PAGE_M * 2, 12, 'Flue Types Key');
    const flueKeys = [
      'FL - Flueless',
      'OF - Open Flue',
      'RS-BF - Room sealed balanced flue',
      'RS-FF - Room sealed fan flue',
    ];
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.6);
    pdf.text(flueKeys[0], PAGE_M + 3, keyY + 9);
    pdf.text(flueKeys[1], PAGE_M + 3, keyY + 13.2);
    pdf.text(flueKeys[2], PAGE_M + 73, keyY + 9);
    pdf.text(flueKeys[3], PAGE_M + 73, keyY + 13.2);

    drawFooter(1);
  };

  const drawPageTwo = () => {
    drawContinuationHeader(pdf, pageWidth, certificateNumber, 2, totalPages);

    const sectionY = 20;
    drawPanel(pdf, PAGE_M, sectionY, pageWidth - PAGE_M * 2, 58, 'Appliance Details (2 of 2)');
    drawApplianceTable(pdf, PAGE_M + 1, sectionY + 8, pageWidth - PAGE_M * 2 - 2, appliances, 3, Math.min(6, appliances.length));

    const checksY = sectionY + 60;
    drawPanel(pdf, PAGE_M, checksY, pageWidth - PAGE_M * 2, 26, 'Final Checks');
    const finalChecks: Array<[string, string]> = [
      ['Gas installation pipework satisfactory visual inspection', normaliseYesNoValue(fd.gasInstallationPipeworkSatisfactory || 'Yes')],
      ['Emergency control accessible', normaliseYesNoValue(fd.emergencyControlAccessible || 'Yes')],
      ['Satisfactory gas tightness test', normaliseYesNoValue(fd.gasTightnessTestSatisfactory || 'Yes')],
      ['Main protective equipotential bonding satisfactory', normaliseYesNoValue(fd.mainBondingSatisfactory || 'Yes')],
      ['CO alarm present?', normaliseYesNoValue(fd.coAlarmPresent || 'Yes')],
      ['CO alarm working?', normaliseYesNoValue(fd.coAlarmWorking || 'Yes')],
      ['CO alarm in date?', normaliseYesNoValue(fd.coAlarmInDate || 'Yes')],
      ['Smoke alarm(s) present?', normaliseYesNoValue(fd.smokeAlarmPresent || 'Yes')],
      ['Smoke alarm(s) working?', normaliseYesNoValue(fd.smokeAlarmWorking || 'Yes')],
    ];
    drawTwoColumnChecks(pdf, PAGE_M + 2, checksY + 8, pageWidth - PAGE_M * 2 - 4, finalChecks);

    const combustionY = checksY + 28;
    drawPanel(pdf, PAGE_M, combustionY, pageWidth - PAGE_M * 2, 46, 'Combustion / Final Reading Summary');
    drawCombustionReadings(pdf, PAGE_M + 2, combustionY + 8, pageWidth - PAGE_M * 2 - 4, combustionReadings);

    const defectsY = combustionY + 48;
    drawPanel(pdf, PAGE_M, defectsY, pageWidth - PAGE_M * 2, 20, 'Defects Identified / Remedial Action Taken');
    const defectsLines = splitLines(pdf, ss(fd.defectsRemedialAction) || 'No defects or remedial actions recorded.', pageWidth - PAGE_M * 2 - 6, 5.8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.8);
    pdf.text(defectsLines, PAGE_M + 2, defectsY + 10);

    const signY = defectsY + 22;
    const leftSignWidth = (pageWidth - PAGE_M * 2 - GRID) / 2;
    drawSignatureBlock(
      pdf,
      PAGE_M,
      signY,
      leftSignWidth,
      'Gas Operative / Engineer Sign-Off',
      `${inspectorName}${inspectorPosition ? ` (${inspectorPosition})` : ''}`,
      inspectionDate,
    );
    drawSignatureBlock(
      pdf,
      PAGE_M + leftSignWidth + GRID,
      signY,
      leftSignWidth,
      'Received By / Tenant / Agent',
      receivedByName || landlordName || customerName,
      inspectionDate,
    );

    const summaryY = signY + 20;
    drawPanel(pdf, PAGE_M, summaryY, pageWidth - PAGE_M * 2, 14, 'Summary');
    const summaryLines = [
      `Unique Serial No: ${certificateNumber}`,
      `Gas Safe Reg No: ${gasSafeNumber}`,
      `Inspection Date: ${inspectionDate}`,
      `Next Safety Check Due: ${nextInspectionDate}`,
    ];
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.7);
    pdf.text(summaryLines[0], PAGE_M + 2, summaryY + 9);
    pdf.text(summaryLines[1], PAGE_M + 68, summaryY + 9);
    pdf.text(summaryLines[2], PAGE_M + 2, summaryY + 12.8);
    pdf.text(summaryLines[3], PAGE_M + 68, summaryY + 12.8);

    drawFooter(2);
  };

  drawPageOne();
  pdf.addPage('a4', 'l');
  drawPageTwo();

  return new Uint8Array(pdf.output('arraybuffer'));
}

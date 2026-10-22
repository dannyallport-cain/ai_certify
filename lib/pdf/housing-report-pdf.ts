import { jsPDF } from 'jspdf';

import { getHousingReportTemplateByType } from '@/lib/housing';
import type { HousingField, HousingRepeatableGroup, HousingReportTemplate } from '@/lib/housing/types';
import { formatUkDate, readRows, readValues, type HousingRow } from '@/lib/housing/values';

import { finalizeCertificatePdf, type CertificateData } from './generator';
import { resolvePdfImage, type ResolvedPdfImage } from './image-data';
import { drawContainedImage } from './pdf-image-draw';

/**
 * Dedicated PDF writer for the housing template pack.
 *
 * Housing reports are section-and-field based rather than certificate based, so
 * they get their own layout: a running header on every page, numbered sections,
 * a field grid with wrapped notes, tables for the repeatable groups (rooms,
 * components, outlets, assets) and a signature block.
 */

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const PAGE_MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const HEADER_HEIGHT = 24;
const FOOTER_HEIGHT = 12;
const BODY_TOP = HEADER_HEIGHT + 8;
const BODY_BOTTOM = PAGE_HEIGHT - FOOTER_HEIGHT - 8;

const NAVY: [number, number, number] = [33, 48, 84];
const NAVY_LIGHT: [number, number, number] = [238, 242, 249];
const RULE: [number, number, number] = [198, 206, 219];
const MUTED: [number, number, number] = [110, 121, 138];
const BODY_TEXT: [number, number, number] = [30, 38, 51];

const LABEL_SIZE = 7;
const VALUE_SIZE = 8.5;
const LINE_HEIGHT = 4;
const INDEX_COLUMN_WIDTH = 7;
const MAX_CELL_LINES = 3;

type Cursor = { y: number };

type ReportContext = {
  reportTitle: string;
  certificateNumber: string;
  logo: ResolvedPdfImage | null;
};

function safeText(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function setFill(pdf: jsPDF, colour: [number, number, number]) {
  pdf.setFillColor(colour[0], colour[1], colour[2]);
}

function setDraw(pdf: jsPDF, colour: [number, number, number]) {
  pdf.setDrawColor(colour[0], colour[1], colour[2]);
}

function setText(pdf: jsPDF, colour: [number, number, number]) {
  pdf.setTextColor(colour[0], colour[1], colour[2]);
}

function measureLines(pdf: jsPDF, text: string, width: number): string[] {
  const content = safeText(text).trim();
  if (!content) {
    return [];
  }

  return pdf.splitTextToSize(content, width) as string[];
}

function drawHeader(pdf: jsPDF, context: ReportContext) {
  setFill(pdf, NAVY);
  pdf.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');

  const logoBoxWidth = 30;
  const textX = PAGE_MARGIN;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  setText(pdf, [255, 255, 255]);
  pdf.text('HOUSING REPORT', textX, 10);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(context.reportTitle, textX, 15.5, {
    maxWidth: CONTENT_WIDTH - logoBoxWidth - 6,
  });

  pdf.setFontSize(7);
  setText(pdf, [186, 199, 224]);
  pdf.text(`Reference ${context.certificateNumber}`, textX, 20.5);

  if (context.logo) {
    drawContainedImage(
      pdf,
      context.logo,
      { x: PAGE_WIDTH - PAGE_MARGIN - logoBoxWidth, y: 4, width: logoBoxWidth, height: 15 },
      1,
    );
  }

  setText(pdf, BODY_TEXT);
}

function drawFooter(pdf: jsPDF, certificateNumber: string) {
  const ruleY = PAGE_HEIGHT - FOOTER_HEIGHT + 2;

  setDraw(pdf, RULE);
  pdf.setLineWidth(0.3);
  pdf.line(PAGE_MARGIN, ruleY, PAGE_WIDTH - PAGE_MARGIN, ruleY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  setText(pdf, MUTED);
  pdf.text(`Housing report · ${certificateNumber}`, PAGE_MARGIN, ruleY + 4.5);
  pdf.text(`Page ${pdf.getNumberOfPages()}`, PAGE_WIDTH - PAGE_MARGIN, ruleY + 4.5, {
    align: 'right',
  });

  setText(pdf, BODY_TEXT);
}

function ensureSpace(pdf: jsPDF, cursor: Cursor, requiredHeight: number, context: ReportContext) {
  if (cursor.y + requiredHeight <= BODY_BOTTOM) {
    return;
  }

  drawFooter(pdf, context.certificateNumber);
  pdf.addPage();
  drawHeader(pdf, context);
  cursor.y = BODY_TOP;
}

function drawSectionHeading(
  pdf: jsPDF,
  cursor: Cursor,
  index: number,
  title: string,
  description?: string,
) {
  setFill(pdf, NAVY);
  pdf.rect(PAGE_MARGIN, cursor.y, CONTENT_WIDTH, 7, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  setText(pdf, [255, 255, 255]);
  pdf.text(`${index}. ${title.toUpperCase()}`, PAGE_MARGIN + 3, cursor.y + 4.8);

  setText(pdf, BODY_TEXT);
  cursor.y += 7;

  if (description) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    setText(pdf, MUTED);
    const lines = measureLines(pdf, description, CONTENT_WIDTH - 6);
    pdf.text(lines, PAGE_MARGIN + 3, cursor.y + 3.4);
    cursor.y += Math.max(5, lines.length * 3.2) + 1.6;
    setText(pdf, BODY_TEXT);
  } else {
    cursor.y += 2.5;
  }
}

type FieldLayout = {
  labelLines: string[];
  valueLines: string[];
  hasValue: boolean;
  labelHeight: number;
  blockHeight: number;
};

/** Works out a field's height without drawing, so rows can be kept together. */
function measureField(pdf: jsPDF, field: HousingField, value: string, width: number): FieldLayout {
  const innerWidth = width - 4;
  const hasValue = value.trim().length > 0;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(LABEL_SIZE);
  const labelLines = measureLines(pdf, field.label.toUpperCase(), innerWidth);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(VALUE_SIZE);
  const valueLines = hasValue ? measureLines(pdf, value, innerWidth) : [];

  const labelHeight = Math.max(3, labelLines.length * 2.9);
  const valueHeight = hasValue ? Math.max(4, valueLines.length * LINE_HEIGHT) : 4;

  return {
    labelLines,
    valueLines,
    hasValue,
    labelHeight,
    blockHeight: labelHeight + valueHeight + 3.5,
  };
}

/**
 * Draws one labelled field at an absolute position. Empty values keep a ruled
 * line so a printed blank report still works as a paper template.
 */
function renderField(
  pdf: jsPDF,
  field: HousingField,
  layout: FieldLayout,
  x: number,
  y: number,
  width: number,
) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(LABEL_SIZE);
  setText(pdf, MUTED);
  pdf.text(layout.labelLines, x + 2, y + 3);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(VALUE_SIZE);
  setText(pdf, layout.hasValue ? BODY_TEXT : MUTED);

  if (layout.hasValue) {
    pdf.text(layout.valueLines, x + 2, y + layout.labelHeight + 3);
  } else {
    setDraw(pdf, RULE);
    pdf.setLineWidth(0.2);
    const ruleY = y + layout.labelHeight + 3;
    pdf.line(x + 2, ruleY, x + width - 2, ruleY);
  }

  setText(pdf, BODY_TEXT);
}

type FieldRow = {
  layouts: Array<{ field: HousingField; layout: FieldLayout; width: number; offsetX: number }>;
  height: number;
};

/** Packs fields into rows so a pair is never split across a page break. */
function buildFieldRows(pdf: jsPDF, fields: HousingField[], values: Record<string, string>): FieldRow[] {
  const columnWidth = CONTENT_WIDTH / 2;
  const rows: FieldRow[] = [];
  let pending: FieldRow | null = null;

  fields.forEach((field) => {
    const span = field.span ?? 1;
    const isFullWidth = span >= 2 || field.type === 'textarea';
    const rawValue = safeText(values[field.id]);
    const value = field.type === 'date' ? formatUkDate(rawValue) : rawValue;

    if (isFullWidth) {
      if (pending) {
        rows.push(pending);
        pending = null;
      }

      const layout = measureField(pdf, field, value, CONTENT_WIDTH);
      rows.push({
        layouts: [{ field, layout, width: CONTENT_WIDTH, offsetX: 0 }],
        height: layout.blockHeight,
      });
      return;
    }

    const layout = measureField(pdf, field, value, columnWidth);

    if (!pending) {
      pending = {
        layouts: [{ field, layout, width: columnWidth, offsetX: 0 }],
        height: layout.blockHeight,
      };
      return;
    }

    pending.layouts.push({ field, layout, width: columnWidth, offsetX: columnWidth });
    pending.height = Math.max(pending.height, layout.blockHeight);
    rows.push(pending);
    pending = null;
  });

  if (pending) {
    rows.push(pending);
  }

  return rows;
}

function drawFields(
  pdf: jsPDF,
  cursor: Cursor,
  fields: HousingField[],
  values: Record<string, string>,
  context: ReportContext,
) {
  const rows = buildFieldRows(pdf, fields, values);

  rows.forEach((row) => {
    ensureSpace(pdf, cursor, row.height + 2, context);

    row.layouts.forEach(({ field, layout, width, offsetX }) => {
      renderField(pdf, field, layout, PAGE_MARGIN + offsetX, cursor.y, width);
    });

    cursor.y += row.height;
  });

  cursor.y += 3;
}

function columnWeight(group: HousingRepeatableGroup, index: number): number {
  const column = group.columns[index];
  switch (column.type) {
    case 'number':
      return 0.55;
    case 'select':
      return 0.95;
    case 'textarea':
      return 1.35;
    default:
      return 1;
  }
}

function drawTableHeader(
  pdf: jsPDF,
  y: number,
  group: HousingRepeatableGroup,
  widths: number[],
) {
  const headerHeight = 6.5;
  setFill(pdf, NAVY);
  pdf.rect(PAGE_MARGIN, y, CONTENT_WIDTH, headerHeight, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.4);
  setText(pdf, [255, 255, 255]);

  let x = PAGE_MARGIN + 1.6;
  group.columns.forEach((column, index) => {
    pdf.text(measureLines(pdf, column.label, widths[index] - 2.4).slice(0, 2), x, y + 2.8);
    x += widths[index];
  });

  setText(pdf, BODY_TEXT);
  return headerHeight;
}

function drawTable(
  pdf: jsPDF,
  cursor: Cursor,
  group: HousingRepeatableGroup,
  rows: HousingRow[],
  context: ReportContext,
) {
  const weights = group.columns.map((_, index) => columnWeight(group, index));
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  const usableWidth = CONTENT_WIDTH - INDEX_COLUMN_WIDTH;
  const widths = weights.map((weight) => (weight / totalWeight) * usableWidth);

  ensureSpace(pdf, cursor, 20, context);
  cursor.y += drawTableHeader(pdf, cursor.y, group, widths);

  const printableRows = rows.filter((row) =>
    group.columns.some((column) => safeText(row[column.id]).trim().length > 0),
  );

  if (printableRows.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    setText(pdf, MUTED);
    pdf.text(group.emptyLabel, PAGE_MARGIN + 2, cursor.y + 4.5);
    setText(pdf, BODY_TEXT);
    cursor.y += 8;
    return;
  }

  printableRows.forEach((row, rowIndex) => {
    const cellLines = group.columns.map((column, index) =>
      measureLines(pdf, row[column.id], widths[index] - 2.4).slice(0, MAX_CELL_LINES),
    );

    const lineCount = Math.max(1, ...cellLines.map((lines) => lines.length || 1));
    const rowHeight = Math.max(7, lineCount * 3.2 + 3);

    if (cursor.y + rowHeight > BODY_BOTTOM) {
      drawFooter(pdf, context.certificateNumber);
      pdf.addPage();
      drawHeader(pdf, context);
      cursor.y = BODY_TOP;
      cursor.y += drawTableHeader(pdf, cursor.y, group, widths);
    }

    if (rowIndex % 2 === 1) {
      setFill(pdf, NAVY_LIGHT);
      pdf.rect(PAGE_MARGIN, cursor.y, CONTENT_WIDTH, rowHeight, 'F');
    }

    setDraw(pdf, RULE);
    pdf.setLineWidth(0.15);
    pdf.line(PAGE_MARGIN, cursor.y + rowHeight, PAGE_WIDTH - PAGE_MARGIN, cursor.y + rowHeight);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.4);
    setText(pdf, MUTED);
    pdf.text(String(rowIndex + 1), PAGE_MARGIN + 1.6, cursor.y + 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.8);
    setText(pdf, BODY_TEXT);

    let x = PAGE_MARGIN + INDEX_COLUMN_WIDTH;
    cellLines.forEach((lines, index) => {
      pdf.text(lines.length > 0 ? lines : ['—'], x, cursor.y + 4);
      x += widths[index];
    });

    cursor.y += rowHeight;
  });

  cursor.y += 4;
}

function drawSummaryTable(
  pdf: jsPDF,
  cursor: Cursor,
  entries: Array<[string, string]>,
  context: ReportContext,
) {
  const labelWidth = 46;

  entries.forEach(([label, value]) => {
    ensureSpace(pdf, cursor, 8, context);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    setText(pdf, MUTED);
    pdf.text(label.toUpperCase(), PAGE_MARGIN + 2, cursor.y + 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(VALUE_SIZE);
    setText(pdf, value ? BODY_TEXT : MUTED);
    const lines = value ? measureLines(pdf, value, CONTENT_WIDTH - labelWidth - 4) : [];
    pdf.text(lines.length > 0 ? lines : ['—'], PAGE_MARGIN + labelWidth, cursor.y + 4);

    const rowHeight = Math.max(7, lines.length * LINE_HEIGHT + 3);
    setDraw(pdf, RULE);
    pdf.setLineWidth(0.15);
    pdf.line(PAGE_MARGIN, cursor.y + rowHeight, PAGE_WIDTH - PAGE_MARGIN, cursor.y + rowHeight);
    cursor.y += rowHeight;
  });

  setText(pdf, BODY_TEXT);
  cursor.y += 4;
}

function drawSignatureBlock(pdf: jsPDF, cursor: Cursor, entries: Array<[string, string]>, context: ReportContext) {
  const boxHeight = 22;
  ensureSpace(pdf, cursor, boxHeight + 6, context);

  const boxWidth = (CONTENT_WIDTH - 8) / 3;

  entries.forEach(([label, value], index) => {
    const x = PAGE_MARGIN + index * (boxWidth + 4);

    setDraw(pdf, RULE);
    pdf.setLineWidth(0.3);
    pdf.rect(x, cursor.y, boxWidth, boxHeight);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.4);
    setText(pdf, MUTED);
    pdf.text(label.toUpperCase(), x + 2, cursor.y + 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(VALUE_SIZE);
    setText(pdf, BODY_TEXT);
    const lines = measureLines(pdf, value, boxWidth - 4).slice(0, 3);
    pdf.text(lines.length > 0 ? lines : [''], x + 2, cursor.y + 9);

    setDraw(pdf, RULE);
    pdf.setLineWidth(0.2);
    pdf.line(x + 2, cursor.y + boxHeight - 4, x + boxWidth - 2, cursor.y + boxHeight - 4);
  });

  cursor.y += boxHeight + 6;
  setText(pdf, BODY_TEXT);
}

function buildSummaryEntries(
  template: HousingReportTemplate | null,
  certificate: CertificateData,
): Array<[string, string]> {
  return [
    ['Report reference', safeText(certificate.certificateNumber)],
    ['Report type', template?.title ?? certificate.certificateType],
    ['Customer', safeText(certificate.customer?.name)],
    ['Site name', safeText(certificate.siteName)],
    ['Site address', safeText(certificate.siteAddress)],
    ['Inspection date', formatUkDate(certificate.inspectionDate)],
    ['Next inspection due', formatUkDate(certificate.nextInspectionDate)],
    ['Inspector', safeText(certificate.inspectorName)],
    ['Report status', safeText(certificate.status).toUpperCase()],
  ];
}

export async function generateHousingReportPDF(certificate: CertificateData): Promise<Uint8Array> {
  const template = getHousingReportTemplateByType(certificate.certificateType);
  const logo = await resolvePdfImage(certificate.teamLogo);

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const context: ReportContext = {
    reportTitle: template?.reportTitle ?? certificate.certificateType.replace(/_/g, ' ').toUpperCase(),
    certificateNumber: safeText(certificate.certificateNumber) || `REPORT-${certificate.id}`,
    logo,
  };

  drawHeader(pdf, context);

  const cursor: Cursor = { y: BODY_TOP };
  const formData = (certificate.formData ?? {}) as Record<string, unknown>;
  const values = readValues(formData);
  const rows = readRows(
    template ?? ({ sections: [] } as unknown as HousingReportTemplate),
    formData,
  );

  drawSummaryTable(pdf, cursor, buildSummaryEntries(template, certificate), context);

  if (template) {
    template.sections.forEach((section, index) => {
      ensureSpace(pdf, cursor, 24, context);
      drawSectionHeading(pdf, cursor, index + 1, section.title, section.description);

      if (section.fields && section.fields.length > 0) {
        drawFields(pdf, cursor, section.fields, values, context);
      }

      if (section.repeatable) {
        drawTable(pdf, cursor, section.repeatable, rows[section.repeatable.id] ?? [], context);
      }

      if (section.guidance && section.guidance.length > 0) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        setText(pdf, MUTED);
        section.guidance.forEach((note) => {
          const lines = measureLines(pdf, note, CONTENT_WIDTH - 6);
          ensureSpace(pdf, cursor, lines.length * 3.4 + 3, context);
          pdf.text(lines, PAGE_MARGIN + 3, cursor.y + 3);
          cursor.y += lines.length * 3.4 + 1.4;
        });
        setText(pdf, BODY_TEXT);
        cursor.y += 2;
      }
    });
  }

  drawSectionHeading(pdf, cursor, (template?.sections.length ?? 0) + 1, 'Signature and declaration');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  setText(pdf, MUTED);
  const declaration = `I confirm that the information recorded in this ${template?.title ?? 'report'} is an accurate record of the inspection carried out at the site named above.`;
  pdf.text(measureLines(pdf, declaration, CONTENT_WIDTH - 4), PAGE_MARGIN + 2, cursor.y + 3);
  setText(pdf, BODY_TEXT);
  cursor.y += 9;

  drawSignatureBlock(
    pdf,
    cursor,
    [
      ['Inspector', safeText(certificate.inspectorName)],
      ['Date of inspection', formatUkDate(certificate.inspectionDate)],
      ['Reviewed by', safeText(values.managerReview) || safeText(values.completedBy)],
    ],
    context,
  );

  drawFooter(pdf, context.certificateNumber);
  finalizeCertificatePdf(pdf, certificate);

  return new Uint8Array(pdf.output('arraybuffer'));
}

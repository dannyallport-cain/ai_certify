import type { jsPDF } from 'jspdf';

import {
  getApprovalSchemeIds,
  getApprovalSchemeInfo,
  type ApprovalSchemeInfo,
} from '@/lib/approval-schemes';

import { resolvePdfImage, type ResolvedPdfImage } from './image-data';
import { drawContainedImage, type ImageBox } from './pdf-image-draw';

export type Rgb = readonly [number, number, number];

export type ApprovalSchemeLogo = ResolvedPdfImage | null;

export type ApprovalSchemeRibbonOptions = {
  x: number;
  y: number;
  width: number;
  title?: string;
  columns?: number;
  badgeWidth?: number;
  badgeHeight?: number;
  gap?: number;
  headerHeight?: number;
  titleFontSize?: number;
  accentColor?: Rgb;
  borderColor?: Rgb;
  emptyFill?: Rgb;
};

type RibbonLayout = {
  columns: number;
  rows: number;
  badgeWidth: number;
  badgeHeight: number;
  gap: number;
  headerHeight: number;
  titleFontSize: number;
  totalHeight: number;
};

const DEFAULTS = {
  title: 'Selected trade association logos',
  columns: 5,
  badgeWidth: 48,
  badgeHeight: 9,
  gap: 2,
  headerHeight: 6,
  titleFontSize: 6.5,
  accentColor: [200, 16, 46] as Rgb,
  borderColor: [165, 165, 165] as Rgb,
  emptyFill: [255, 255, 255] as Rgb,
} as const;

const FALLBACK_ACCENT: Rgb = [29, 78, 216];

function parseJsonLike(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function normalizeSchemeDetail(detail: unknown): ApprovalSchemeInfo | null {
  if (!detail || typeof detail !== 'object') return null;

  const candidate = detail as Partial<ApprovalSchemeInfo> & { label?: string };
  if (!candidate.label || typeof candidate.label !== 'string') return null;

  return {
    id: typeof candidate.id === 'string' ? candidate.id : candidate.label,
    ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
    label: candidate.label,
    shortLabel:
      typeof candidate.shortLabel === 'string' ? candidate.shortLabel : candidate.label,
    description: typeof candidate.description === 'string' ? candidate.description : '',
    accentColor: typeof candidate.accentColor === 'string' ? candidate.accentColor : '#1d4ed8',
    textColor: typeof candidate.textColor === 'string' ? candidate.textColor : '#ffffff',
    symbol:
      typeof candidate.symbol === 'string' && candidate.symbol.trim()
        ? candidate.symbol
        : candidate.label.slice(0, 2).toUpperCase(),
    ...(typeof candidate.logoSrc === 'string' ? { logoSrc: candidate.logoSrc } : {}),
    ...(typeof candidate.logoAlt === 'string' ? { logoAlt: candidate.logoAlt } : {}),
  };
}

/**
 * Reads the trade associations selected for a certificate, preferring the
 * fully-resolved `approvalSchemeDetails` snapshot and falling back to plain
 * scheme identifiers.
 */
export function getSelectedApprovalSchemes(
  formData: Record<string, unknown>
): ApprovalSchemeInfo[] {
  const rawDetails = formData.approvalSchemeDetails;
  const details = Array.isArray(rawDetails) ? rawDetails : parseJsonLike(rawDetails);

  if (Array.isArray(details)) {
    const normalized = details
      .map(normalizeSchemeDetail)
      .filter((scheme): scheme is ApprovalSchemeInfo => scheme !== null);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  const rawSchemes = formData.approvalSchemes;
  const parsedSchemes = Array.isArray(rawSchemes) ? rawSchemes : parseJsonLike(rawSchemes);

  return getApprovalSchemeIds(parsedSchemes)
    .map((schemeId) => getApprovalSchemeInfo(schemeId))
    .filter((scheme): scheme is ApprovalSchemeInfo => Boolean(scheme));
}

function hexToRgb(hex: string, fallback: Rgb): Rgb {
  const normalized = hex.replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return fallback;

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

/**
 * Works out the badge grid so the caller can reserve space before drawing.
 * Both `measureApprovalSchemeRibbon` and the draw helpers use this, which keeps
 * pagination maths and rendering in agreement.
 */
function resolveRibbonLayout(
  schemeCount: number,
  options: ApprovalSchemeRibbonOptions
): RibbonLayout {
  const badgeWidth = options.badgeWidth ?? DEFAULTS.badgeWidth;
  const badgeHeight = options.badgeHeight ?? DEFAULTS.badgeHeight;
  const gap = options.gap ?? DEFAULTS.gap;
  const headerHeight = options.headerHeight ?? DEFAULTS.headerHeight;
  const titleFontSize = options.titleFontSize ?? DEFAULTS.titleFontSize;

  const maxColumns = Math.max(1, Math.floor((options.width + gap) / (badgeWidth + gap)));
  const requestedColumns = options.columns ?? DEFAULTS.columns;
  const columns = Math.max(1, Math.min(requestedColumns, maxColumns, Math.max(1, schemeCount)));
  const rows = Math.max(1, Math.ceil(schemeCount / columns));
  const bodyHeight = rows * badgeHeight + Math.max(0, rows - 1) * gap;

  return {
    columns,
    rows,
    badgeWidth,
    badgeHeight,
    gap,
    headerHeight,
    titleFontSize,
    totalHeight: headerHeight + bodyHeight + 4,
  };
}

/** Height the ribbon will occupy, or 0 when there is nothing to draw. */
export function measureApprovalSchemeRibbon(
  schemeCount: number,
  options: ApprovalSchemeRibbonOptions
): number {
  if (schemeCount <= 0) return 0;
  return resolveRibbonLayout(schemeCount, options).totalHeight;
}

/** Resolves every scheme logo so drawing can happen synchronously. */
export async function resolveApprovalSchemeLogos(
  schemes: ApprovalSchemeInfo[]
): Promise<ApprovalSchemeLogo[]> {
  return Promise.all(
    schemes.map(async (scheme) => (scheme.logoSrc ? resolvePdfImage(scheme.logoSrc) : null))
  );
}

/**
 * Draws the accreditation ribbon using already-resolved logos and returns the
 * vertical space it consumed. Never paginates — callers reserve the space.
 */
export function drawApprovalSchemeRibbonWithLogos(
  pdf: jsPDF,
  schemes: ApprovalSchemeInfo[],
  logos: ApprovalSchemeLogo[],
  options: ApprovalSchemeRibbonOptions
): number {
  if (schemes.length === 0) return 0;

  const layout = resolveRibbonLayout(schemes.length, options);
  const { x, y, width } = options;
  const title = options.title ?? DEFAULTS.title;
  const accentColor = options.accentColor ?? DEFAULTS.accentColor;
  const borderColor = options.borderColor ?? DEFAULTS.borderColor;
  const emptyFill = options.emptyFill ?? DEFAULTS.emptyFill;

  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.setFillColor(emptyFill[0], emptyFill[1], emptyFill[2]);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, width, layout.totalHeight, 'FD');

  pdf.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  pdf.rect(x, y, width, layout.headerHeight, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(layout.titleFontSize);
  pdf.text(title, x + 3, y + layout.headerHeight - 1.7);
  pdf.setTextColor(0, 0, 0);

  schemes.forEach((scheme, index) => {
    const rowIndex = Math.floor(index / layout.columns);
    const columnIndex = index % layout.columns;
    const badgeX = x + 2 + columnIndex * (layout.badgeWidth + layout.gap);
    const badgeY =
      y + layout.headerHeight + 2 + rowIndex * (layout.badgeHeight + layout.gap);
    const box: ImageBox = {
      x: badgeX,
      y: badgeY,
      width: layout.badgeWidth,
      height: layout.badgeHeight,
    };

    const accent = hexToRgb(scheme.accentColor, FALLBACK_ACCENT);

    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(accent[0], accent[1], accent[2]);
    pdf.rect(badgeX, badgeY, layout.badgeWidth, layout.badgeHeight, 'FD');

    const image = logos[index] ?? null;
    if (image && drawContainedImage(pdf, image, box, 1.2)) {
      return;
    }

    const isLightText = scheme.textColor.toLowerCase() === '#ffffff';
    const textChannel = isLightText ? 255 : 17;
    pdf.setTextColor(textChannel, textChannel, textChannel);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.7);
    const baseline = badgeY + layout.badgeHeight / 2 + 1.9;
    pdf.text(scheme.symbol, badgeX + 3, baseline);
    pdf.text(scheme.shortLabel, badgeX + 12, baseline);
    pdf.setTextColor(0, 0, 0);
  });

  return layout.totalHeight;
}

/** Convenience wrapper: resolves the logos then draws the ribbon. */
export async function drawApprovalSchemeRibbon(
  pdf: jsPDF,
  schemes: ApprovalSchemeInfo[],
  options: ApprovalSchemeRibbonOptions
): Promise<number> {
  if (schemes.length === 0) return 0;

  const logos = await resolveApprovalSchemeLogos(schemes);
  return drawApprovalSchemeRibbonWithLogos(pdf, schemes, logos, options);
}

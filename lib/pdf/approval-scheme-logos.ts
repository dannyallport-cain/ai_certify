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
  /** Left edge of the logo line, in millimetres. */
  x: number;
  /** Top edge of the logo line, in millimetres. */
  y: number;
  /** Total width available for the row of logos, in millimetres. */
  width: number;
  /** Height each logo is fitted into (default 9mm). */
  height?: number;
  /** Horizontal gap kept between logos (default 6mm). */
  gap?: number;
};

type RibbonLayout = {
  height: number;
  gap: number;
  cellWidth: number;
  totalHeight: number;
};

const DEFAULTS = {
  height: 9,
  gap: 6,
} as const;

const FALLBACK_TEXT_COLOR: Rgb = [30, 41, 59];

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

/**
 * Works out the single-row layout so the caller can reserve space before
 * drawing. Both `measureApprovalSchemeRibbon` and the draw helpers use this,
 * which keeps pagination maths and rendering in agreement.
 */
function resolveRibbonLayout(
  schemeCount: number,
  options: ApprovalSchemeRibbonOptions
): RibbonLayout {
  const height = options.height ?? DEFAULTS.height;
  const gap = options.gap ?? DEFAULTS.gap;
  const cellWidth = options.width / Math.max(1, schemeCount);

  return {
    height,
    gap,
    cellWidth,
    totalHeight: height,
  };
}

/** Height the logo line will occupy, or 0 when there is nothing to draw. */
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
 * Draws the selected accreditation logos in a single line across the header.
 * Logos are rendered bare — no border, panel, or coloured badge behind them —
 * and returned to the caller so it can advance the cursor. Never paginates.
 */
export function drawApprovalSchemeRibbonWithLogos(
  pdf: jsPDF,
  schemes: ApprovalSchemeInfo[],
  logos: ApprovalSchemeLogo[],
  options: ApprovalSchemeRibbonOptions
): number {
  if (schemes.length === 0) return 0;

  const layout = resolveRibbonLayout(schemes.length, options);
  const { x, y } = options;
  const horizontalInset = layout.gap / 2;

  schemes.forEach((scheme, index) => {
    const cellX = x + index * layout.cellWidth;
    const image = logos[index] ?? null;

    if (image) {
      const box: ImageBox = {
        x: cellX + horizontalInset,
        y,
        width: Math.max(1, layout.cellWidth - layout.gap),
        height: layout.height,
      };

      if (drawContainedImage(pdf, image, box, 0)) {
        return;
      }
    }

    // Text fallback for schemes without a logo image: plain label, no fill.
    pdf.setTextColor(
      FALLBACK_TEXT_COLOR[0],
      FALLBACK_TEXT_COLOR[1],
      FALLBACK_TEXT_COLOR[2]
    );
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);

    const label = scheme.shortLabel || scheme.label;

    pdf.text(label, cellX + layout.cellWidth / 2, y + layout.height / 2 + 2.3, {
      align: 'center',
    });
  });

  pdf.setTextColor(0, 0, 0);

  return layout.totalHeight;
}

/** Convenience wrapper: resolves the logos then draws the line. */
export async function drawApprovalSchemeRibbon(
  pdf: jsPDF,
  schemes: ApprovalSchemeInfo[],
  options: ApprovalSchemeRibbonOptions
): Promise<number> {
  if (schemes.length === 0) return 0;

  const logos = await resolveApprovalSchemeLogos(schemes);
  return drawApprovalSchemeRibbonWithLogos(pdf, schemes, logos, options);
}

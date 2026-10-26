import type { FireAlarmPlan3D, Plan3DLegendEntry, Plan3DPoint } from './plan3d-types';
import { getPlan3DPalette } from './palette';

export interface FireAlarmPlan3DSvgOptions {
  title?: string;
  includeLegend?: boolean;
  includeFooter?: boolean;
  /** Output resolution multiplier. The geometry itself is resolution independent. */
  scale?: number;
}

const DEFAULT_SVG_SCALE = 2;
const FOOTER_HEIGHT = 54;
const MARKER_FONT_SIZE = 8;
const TEXT_FONT_FAMILY = 'Menlo, Consolas, monospace';

const LEGEND_SIDE_PADDING = 16;
const LEGEND_HEADING_HEIGHT = 18;
const LEGEND_CHIP_HEIGHT = 16;
const LEGEND_CHIP_GAP = 8;
const LEGEND_CHIP_CHARACTER_WIDTH = 6.2;
const LEGEND_CHIP_MIN_WIDTH = 48;
const LEGEND_DOT_RADIUS = 4.5;

/**
 * Replaces characters that would break the SVG document. This is sanitisation for an
 * XML text node, not HTML entity encoding.
 */
function sanitiseSvgText(value: string): string {
  return value
    .replace(/&/g, '+')
    .replace(/</g, '[')
    .replace(/>/g, ']')
    .replace(/"/g, "'")
    .replace(/\r?\n/g, ' ');
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return (Math.round(value * 100) / 100).toString();
}

function pointList(points: Plan3DPoint[]): string {
  return points.map((point) => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(' ');
}

function renderPolygons(plan: FireAlarmPlan3D): string[] {
  const layers = ['base', 'structure'] as const;
  const output: string[] = [];

  layers.forEach((layer) => {
    plan.polygons
      .filter((polygon) => polygon.layer === layer)
      .forEach((polygon) => {
        output.push(
          `<polygon points="${pointList(polygon.points)}" fill="${polygon.fill}" fill-opacity="${formatNumber(
            polygon.fillOpacity,
          )}" stroke="${polygon.stroke}" stroke-width="${formatNumber(
            polygon.strokeWidth,
          )}" stroke-linejoin="round" />`,
        );
      });

    plan.segments
      .filter((segment) => segment.layer === layer)
      .forEach((segment) => {
        const dash = segment.dashed ? ' stroke-dasharray="4 3"' : '';

        output.push(
          `<line x1="${formatNumber(segment.from.x)}" y1="${formatNumber(
            segment.from.y,
          )}" x2="${formatNumber(segment.to.x)}" y2="${formatNumber(segment.to.y)}" stroke="${
            segment.colour
          }" stroke-width="${formatNumber(segment.width)}" stroke-opacity="${formatNumber(
            segment.opacity,
          )}"${dash} />`,
        );
      });
  });

  return output;
}

function renderMarkers(plan: FireAlarmPlan3D): string[] {
  const output: string[] = [];
  const VOID_RING_INSET = 3.5;

  plan.markers.forEach((marker) => {
    output.push(
      `<circle cx="${formatNumber(marker.position.x)}" cy="${formatNumber(
        marker.position.y,
      )}" r="${formatNumber(marker.radius)}" fill="${marker.colour}" fill-opacity="0.92" stroke="${
        marker.selected ? '#FFFFFF' : '#0B1727'
      }" stroke-width="${marker.selected ? 3 : 1.5}" />`,
    );

    // A device in the ceiling void carries the same dashed ring as the in-app marker, so an
    // exported plan cannot be read as if it were mounted in the room.
    if (marker.mounting === 'ceiling_void') {
      output.push(
        `<circle cx="${formatNumber(marker.position.x)}" cy="${formatNumber(
          marker.position.y,
        )}" r="${formatNumber(Math.max(marker.radius - VOID_RING_INSET, 2))}" fill="none" stroke="#FFFFFF" stroke-opacity="0.92" stroke-width="1" stroke-dasharray="2 2" />`,
      );
    }

    output.push(
      `<text x="${formatNumber(marker.position.x)}" y="${formatNumber(
        marker.position.y + MARKER_FONT_SIZE / 3,
      )}" fill="#0B1727" font-family="${TEXT_FONT_FAMILY}" font-size="${MARKER_FONT_SIZE}" font-weight="700" text-anchor="middle">${sanitiseSvgText(
        marker.glyph,
      )}</text>`,
    );
  });

  return output;
}

function renderTexts(plan: FireAlarmPlan3D): string[] {
  const anchors = { left: 'start', center: 'middle', right: 'end' } as const;

  return plan.texts.map((text) => {
    const weight = text.emphasis === 'strong' ? 700 : 500;

    return `<text x="${formatNumber(text.position.x)}" y="${formatNumber(
      text.position.y,
    )}" fill="${text.colour}" font-family="${TEXT_FONT_FAMILY}" font-size="${formatNumber(
      text.size,
    )}" font-weight="${weight}" text-anchor="${anchors[text.align]}">${sanitiseSvgText(
      text.text,
    )}</text>`;
  });
}

function legendChipWidth(entry: Plan3DLegendEntry, maxWidth: number): number {
  const label = `${entry.label} × ${entry.count}`;

  return Math.min(
    Math.max(label.length * LEGEND_CHIP_CHARACTER_WIDTH + LEGEND_DOT_RADIUS * 2 + 14, LEGEND_CHIP_MIN_WIDTH),
    maxWidth,
  );
}

function groupLegendRows(plan: FireAlarmPlan3D): Plan3DLegendEntry[][] {
  const maxWidth = Math.max(plan.viewport.width - LEGEND_SIDE_PADDING * 2, LEGEND_CHIP_MIN_WIDTH);
  const rows: Plan3DLegendEntry[][] = [];
  let currentRow: Plan3DLegendEntry[] = [];
  let currentWidth = 0;

  plan.legend.forEach((entry) => {
    const chipWidth = legendChipWidth(entry, maxWidth);

    if (currentRow.length > 0 && currentWidth + chipWidth > maxWidth) {
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }

    currentRow.push(entry);
    currentWidth += chipWidth + LEGEND_CHIP_GAP;
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Draws the legend as a wrapped strip underneath the drawing so it never covers the plan
 * itself, which matters on the narrow viewports a phone screen gives us.
 */
function renderLegendStrip(
  plan: FireAlarmPlan3D,
  top: number,
  caption: string,
): { elements: string[]; height: number } {
  const rows = groupLegendRows(plan);
  const maxWidth = Math.max(plan.viewport.width - LEGEND_SIDE_PADDING * 2, LEGEND_CHIP_MIN_WIDTH);
  const elements: string[] = [
    `<text x="${formatNumber(LEGEND_SIDE_PADDING)}" y="${formatNumber(
      top + 11,
    )}" fill="${caption}" font-family="${TEXT_FONT_FAMILY}" font-size="10" font-weight="700">DEVICE LEGEND</text>`,
  ];

  rows.forEach((row, rowIndex) => {
    const rowTop = top + LEGEND_HEADING_HEIGHT + rowIndex * (LEGEND_CHIP_HEIGHT + 6);
    let cursorX = LEGEND_SIDE_PADDING;

    row.forEach((entry) => {
      const chipWidth = legendChipWidth(entry, maxWidth);
      const label = sanitiseSvgText(`${entry.label} × ${entry.count}`);
      const baselineY = rowTop + LEGEND_CHIP_HEIGHT / 2 + 3;

      elements.push(
        `<circle cx="${formatNumber(cursorX + LEGEND_DOT_RADIUS)}" cy="${formatNumber(
          rowTop + LEGEND_CHIP_HEIGHT / 2,
        )}" r="${formatNumber(LEGEND_DOT_RADIUS)}" fill="${entry.colour}" />`,
        `<text x="${formatNumber(cursorX + LEGEND_DOT_RADIUS * 2 + 4)}" y="${formatNumber(
          baselineY,
        )}" fill="${caption}" font-family="${TEXT_FONT_FAMILY}" font-size="9">${label}</text>`,
      );

      cursorX += chipWidth + LEGEND_CHIP_GAP;
    });
  });

  return {
    elements,
    height: LEGEND_HEADING_HEIGHT + rows.length * (LEGEND_CHIP_HEIGHT + 6),
  };
}

/**
 * The footer is split across two lines so the summary never runs past the canvas edge on the
 * narrow viewports a phone gives us.
 */
function renderFooter(plan: FireAlarmPlan3D, y: number, caption: string): string[] {
  const counts = `${plan.stats.roomCount} room(s) · ${plan.stats.wallCount} wall(s) · ${plan.stats.deviceCount} device(s)`;
  const openingSummary =
    plan.stats.openingCount > 0 ? ` · ${plan.stats.openingCount} opening(s)` : '';
  const dimensions = `${plan.stats.floorAreaSquareMeters.toFixed(1)} m² · ceiling ${plan.stats.wallHeightMeters.toFixed(
    1,
  )} m${openingSummary}`;

  return [
    `<line x1="${LEGEND_SIDE_PADDING}" y1="${formatNumber(y)}" x2="${formatNumber(
      plan.viewport.width - LEGEND_SIDE_PADDING,
    )}" y2="${formatNumber(y)}" stroke="${caption}" stroke-opacity="0.3" />`,
    `<text x="${LEGEND_SIDE_PADDING}" y="${formatNumber(
      y + 18,
    )}" fill="${caption}" font-family="${TEXT_FONT_FAMILY}" font-size="10">${sanitiseSvgText(counts)}</text>`,
    `<text x="${LEGEND_SIDE_PADDING}" y="${formatNumber(
      y + 33,
    )}" fill="${caption}" font-family="${TEXT_FONT_FAMILY}" font-size="10">${sanitiseSvgText(dimensions)}</text>`,
  ];
}

/**
 * Renders a generated plan to a standalone SVG document. The output is renderer independent and
 * can be stored, attached to a report or handed to any SVG viewer.
 */
export function renderFireAlarmPlan3DSvg(
  plan: FireAlarmPlan3D,
  options: FireAlarmPlan3DSvgOptions = {},
): string {
  const palette = getPlan3DPalette(plan.colourScheme);
  const scale = Math.max(1, Math.min(options.scale ?? DEFAULT_SVG_SCALE, 4));
  const includeLegend = options.includeLegend ?? true;
  const includeFooter = options.includeFooter ?? true;
  const hasLegend = includeLegend && plan.legend.length > 0;

  const legendTop = plan.viewport.height + 10;
  const legend = hasLegend ? renderLegendStrip(plan, legendTop, palette.caption) : { elements: [], height: 0 };
  const footerTop = legendTop + legend.height + (hasLegend ? 4 : 6);
  const contentHeight = plan.viewport.height + (hasLegend ? legend.height + 18 : 0) + (includeFooter ? FOOTER_HEIGHT : 0);
  const width = Math.round(plan.viewport.width * scale);
  const height = Math.round(contentHeight * scale);
  const title = sanitiseSvgText(options.title ?? `Fire alarm 3D plan · session ${plan.sessionId}`);

  const body: string[] = [
    `<rect x="0" y="0" width="${formatNumber(plan.viewport.width)}" height="${formatNumber(
      contentHeight,
    )}" fill="${palette.surfaceBackground}" />`,
    `<rect x="0.5" y="0.5" width="${formatNumber(plan.viewport.width - 1)}" height="${formatNumber(
      plan.viewport.height - 1,
    )}" fill="none" stroke="${palette.caption}" stroke-opacity="0.25" />`,
    `<text x="${LEGEND_SIDE_PADDING}" y="22" fill="${palette.caption}" font-family="${TEXT_FONT_FAMILY}" font-size="11" font-weight="700">${title}</text>`,
  ];

  body.push(...renderPolygons(plan));
  body.push(...renderMarkers(plan));
  body.push(...renderTexts(plan));
  body.push(...legend.elements);

  if (includeFooter) {
    body.push(...renderFooter(plan, footerTop, palette.caption));
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${formatNumber(
      plan.viewport.width,
    )} ${formatNumber(contentHeight)}" role="img" aria-label="${title}">`,
    ...body,
    '</svg>',
  ].join('\n');
}

/** Wraps the SVG document as a data URI so it can be opened or shared directly. */
export function renderFireAlarmPlan3DSvgDataUri(
  plan: FireAlarmPlan3D,
  options?: FireAlarmPlan3DSvgOptions,
): string {
  const svg = renderFireAlarmPlan3DSvg(plan, options);

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

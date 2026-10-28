import type {
  FireAlarmPlan3D,
  Plan3DLegendConfig,
  Plan3DLegendEntry,
} from './plan3d-types';

export const LEGEND_SIDE_PADDING = 16;
export const TEXT_FONT_FAMILY = 'Menlo, Consolas, monospace';

const BLOCK_HEADING_HEIGHT = 18;
const CHIP_HEIGHT = 16;
const CHIP_GAP = 8;
const CHIP_CHARACTER_WIDTH = 6.2;
const CHIP_MIN_WIDTH = 48;
const DOT_RADIUS = 4.5;
const ZONE_ROW_HEIGHT = 15;
const ZONE_SWATCH_SIZE = 9;
const COMPANY_LINE_HEIGHT = 12;
const FOOTER_HEIGHT = 54;

export interface SvgBlock {
  elements: string[];
  height: number;
}

/**
 * Replaces characters that would break the SVG document. This is XML text sanitisation, not
 * HTML entity encoding.
 */
export function sanitiseSvgText(value: string): string {
  return value
    .replace(/&/g, '+')
    .replace(/</g, '[')
    .replace(/>/g, ']')
    .replace(/"/g, "'")
    .replace(/\r?\n/g, ' ');
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return (Math.round(value * 100) / 100).toString();
}

function text(
  x: number,
  y: number,
  value: string,
  colour: string,
  size: number,
  weight: 400 | 500 | 700 = 400,
): string {
  return `<text x="${formatNumber(x)}" y="${formatNumber(y)}" fill="${colour}" font-family="${TEXT_FONT_FAMILY}" font-size="${formatNumber(
    size,
  )}" font-weight="${weight}">${sanitiseSvgText(value)}</text>`;
}

function deviceChipWidth(entry: Plan3DLegendEntry, maxWidth: number): number {
  const label = `${entry.label} × ${entry.count}`;

  return Math.min(
    Math.max(label.length * CHIP_CHARACTER_WIDTH + DOT_RADIUS * 2 + 14, CHIP_MIN_WIDTH),
    maxWidth,
  );
}

/** Wrapped strip of device swatches, titled so it is obvious it is a key, not a caption. */
export function renderDeviceLegendBlock(
  plan: FireAlarmPlan3D,
  top: number,
  caption: string,
): SvgBlock {
  if (plan.legend.length === 0) {
    return { elements: [], height: 0 };
  }

  const maxWidth = Math.max(plan.viewport.width - LEGEND_SIDE_PADDING * 2, CHIP_MIN_WIDTH);
  const rows: Plan3DLegendEntry[][] = [];
  let currentRow: Plan3DLegendEntry[] = [];
  let currentWidth = 0;

  plan.legend.forEach((entry) => {
    const chipWidth = deviceChipWidth(entry, maxWidth);

    if (currentRow.length > 0 && currentWidth + chipWidth > maxWidth) {
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }

    currentRow.push(entry);
    currentWidth += chipWidth + CHIP_GAP;
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  const elements: string[] = [
    text(LEGEND_SIDE_PADDING, top + 11, 'DEVICE KEY', caption, 10, 700),
  ];

  rows.forEach((row, rowIndex) => {
    const rowTop = top + BLOCK_HEADING_HEIGHT + rowIndex * (CHIP_HEIGHT + 6);
    let cursorX = LEGEND_SIDE_PADDING;

    row.forEach((entry) => {
      const chipWidth = deviceChipWidth(entry, maxWidth);
      const centreY = rowTop + CHIP_HEIGHT / 2;

      elements.push(
        `<circle cx="${formatNumber(cursorX + DOT_RADIUS)}" cy="${formatNumber(
          centreY,
        )}" r="${formatNumber(DOT_RADIUS)}" fill="${entry.colour}" />`,
        text(
          cursorX + DOT_RADIUS * 2 + 4,
          centreY + 3,
          `${entry.label} × ${entry.count}`,
          caption,
          9,
        ),
      );

      cursorX += chipWidth + CHIP_GAP;
    });
  });

  return { elements, height: BLOCK_HEADING_HEIGHT + rows.length * (CHIP_HEIGHT + 6) };
}

/**
 * Zone key. One row per zone rather than a wrapped chip strip: a zone carries an area and a
 * device total, and those have to stay attached to the colour they belong to.
 */
export function renderZoneLegendBlock(
  plan: FireAlarmPlan3D,
  top: number,
  caption: string,
): SvgBlock {
  if (plan.zoneSummary.length === 0) {
    return { elements: [], height: 0 };
  }

  const elements: string[] = [text(LEGEND_SIDE_PADDING, top + 11, 'ZONE KEY', caption, 10, 700)];

  plan.zoneSummary.forEach((zone, index) => {
    const rowTop = top + BLOCK_HEADING_HEIGHT + index * ZONE_ROW_HEIGHT;
    const summary = `${zone.reference}  ${zone.name}  ·  ${zone.areaSquareMeters.toFixed(
      1,
    )} m²  ·  ${zone.deviceCount} device(s)`;

    elements.push(
      `<rect x="${formatNumber(LEGEND_SIDE_PADDING)}" y="${formatNumber(
        rowTop + 2,
      )}" width="${formatNumber(ZONE_SWATCH_SIZE)}" height="${formatNumber(
        ZONE_SWATCH_SIZE,
      )}" rx="2" fill="${zone.colour}" fill-opacity="0.35" stroke="${zone.colour}" />`,
      text(LEGEND_SIDE_PADDING + ZONE_SWATCH_SIZE + 6, rowTop + 11, summary, caption, 9),
    );
  });

  if (plan.unassignedDeviceCount > 0) {
    const noteTop = top + BLOCK_HEADING_HEIGHT + plan.zoneSummary.length * ZONE_ROW_HEIGHT;
    elements.push(
      text(
        LEGEND_SIDE_PADDING,
        noteTop + 11,
        `${plan.unassignedDeviceCount} device(s) outside every zone`,
        caption,
        9,
      ),
    );

    return {
      elements,
      height: BLOCK_HEADING_HEIGHT + (plan.zoneSummary.length + 1) * ZONE_ROW_HEIGHT,
    };
  }

  return {
    elements,
    height: BLOCK_HEADING_HEIGHT + plan.zoneSummary.length * ZONE_ROW_HEIGHT,
  };
}

function companyLines(config: Plan3DLegendConfig): string[] {
  const lines: string[] = [];
  const company = config.company;

  if (company.name) {
    lines.push(company.name);
  }

  company.addressLines.forEach((line) => lines.push(line));

  const contact = [company.phone, company.email, company.website].filter(Boolean).join('  ·  ');

  if (contact) {
    lines.push(contact);
  }

  if (company.accreditation) {
    lines.push(company.accreditation);
  }

  const job = [
    config.jobReference ? `Job ${config.jobReference}` : '',
    config.siteName ? `Site: ${config.siteName}` : '',
    config.revision ? `Rev ${config.revision}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  if (job) {
    lines.push(job);
  }

  if (config.siteAddress) {
    lines.push(config.siteAddress);
  }

  const prepared = [
    config.preparedBy ? `Prepared by ${config.preparedBy}` : '',
    config.preparedOn ? `on ${config.preparedOn}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (prepared) {
    lines.push(prepared);
  }

  if (config.notes) {
    lines.push(config.notes);
  }

  return lines;
}

/** Company and job block printed under the drawing title. */
export function renderCompanyBlock(config: Plan3DLegendConfig, top: number, caption: string): SvgBlock {
  const lines = companyLines(config);

  if (lines.length === 0) {
    return { elements: [], height: 0 };
  }

  const elements = lines.map((line, index) =>
    text(
      LEGEND_SIDE_PADDING,
      top + index * COMPANY_LINE_HEIGHT + 9,
      line,
      caption,
      index === 0 ? 10 : 9,
      index === 0 ? 700 : 400,
    ),
  );

  return { elements, height: lines.length * COMPANY_LINE_HEIGHT };
}

/** Footer summary: geometry counts, area and ceiling height. */
export function renderFooterBlock(plan: FireAlarmPlan3D, y: number, caption: string): SvgBlock {
  const counts = `${plan.stats.roomCount} room(s) · ${plan.stats.wallCount} wall(s) · ${plan.stats.deviceCount} device(s)`;
  const openingSummary = plan.stats.openingCount > 0 ? ` · ${plan.stats.openingCount} opening(s)` : '';
  const dimensions = `${plan.stats.floorAreaSquareMeters.toFixed(1)} m² · ceiling ${plan.stats.wallHeightMeters.toFixed(
    1,
  )} m${openingSummary}`;

  return {
    elements: [
      `<line x1="${LEGEND_SIDE_PADDING}" y1="${formatNumber(y)}" x2="${formatNumber(
        plan.viewport.width - LEGEND_SIDE_PADDING,
      )}" y2="${formatNumber(y)}" stroke="${caption}" stroke-opacity="0.3" />`,
      text(LEGEND_SIDE_PADDING, y + 18, counts, caption, 10),
      text(LEGEND_SIDE_PADDING, y + 33, dimensions, caption, 10),
    ],
    height: FOOTER_HEIGHT,
  };
}

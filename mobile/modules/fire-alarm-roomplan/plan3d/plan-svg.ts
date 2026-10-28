import type { FireAlarmPlan3D, Plan3DLegendConfig, Plan3DPoint } from './plan3d-types';
import { getPlan3DPalette } from './palette';
import {
  LEGEND_SIDE_PADDING,
  TEXT_FONT_FAMILY,
  formatNumber,
  renderCompanyBlock,
  renderDeviceLegendBlock,
  renderFooterBlock,
  renderZoneLegendBlock,
  sanitiseSvgText,
} from './svg-legend';

export interface FireAlarmPlan3DSvgOptions {
  title?: string;
  includeLegend?: boolean;
  includeFooter?: boolean;
  /** Output resolution multiplier. The geometry itself is resolution independent. */
  scale?: number;
  /** Company and job details printed with the drawing. */
  legend?: Plan3DLegendConfig | null;
}

const DEFAULT_SVG_SCALE = 2;
const MARKER_FONT_SIZE = 8;
const HEADER_HEIGHT = 30;
const BLOCK_GAP = 10;
const DRAWING_BORDER = 1;
const VOID_RING_INSET = 3.5;

/** Polygon layers painted in draw order. Zone fills sit between the floor and the walls. */
const POLYGON_LAYERS = ['base', 'zone', 'structure'] as const;

function pointList(points: Plan3DPoint[]): string {
  return points.map((point) => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(' ');
}

function renderPolygons(plan: FireAlarmPlan3D): string[] {
  const output: string[] = [];

  POLYGON_LAYERS.forEach((layer) => {
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
  });

  // Zone fills lie on the floor, so they are painted under every wall panel.
  plan.zones.forEach((zone) => {
    output.push(
      `<polygon points="${pointList(zone.points)}" fill="${zone.fill}" fill-opacity="${formatNumber(
        zone.fillOpacity,
      )}" stroke="${zone.stroke}" stroke-width="${formatNumber(
        zone.strokeWidth,
      )}" stroke-linejoin="round" />`,
    );
  });

  return output;
}

function renderSegment(
  fromPoint: Plan3DPoint,
  toPoint: Plan3DPoint,
  colour: string,
  width: number,
  opacity: number,
  dashed: boolean,
): string {
  const dash = dashed ? ' stroke-dasharray="4 3"' : '';

  return `<line x1="${formatNumber(fromPoint.x)}" y1="${formatNumber(
    fromPoint.y,
  )}" x2="${formatNumber(toPoint.x)}" y2="${formatNumber(
    toPoint.y,
  )}" stroke="${colour}" stroke-width="${formatNumber(width)}" stroke-opacity="${formatNumber(
    opacity,
  )}"${dash} />`;
}

function renderSegments(plan: FireAlarmPlan3D, layer: 'base' | 'structure' | 'overlay'): string[] {
  return plan.segments
    .filter((segment) => segment.layer === layer)
    .map((segment) =>
      renderSegment(
        segment.from,
        segment.to,
        segment.colour,
        segment.width,
        segment.opacity,
        segment.dashed,
      ),
    );
}

function renderMarkers(plan: FireAlarmPlan3D): string[] {
  const output: string[] = [];

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
        )}" r="${formatNumber(
          Math.max(marker.radius - VOID_RING_INSET, 2),
        )}" fill="none" stroke="#FFFFFF" stroke-opacity="0.92" stroke-width="1" stroke-dasharray="2 2" />`,
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

  return plan.texts.map((entry) => {
    const weight = entry.emphasis === 'strong' ? 700 : 500;

    return `<text x="${formatNumber(entry.position.x)}" y="${formatNumber(
      entry.position.y,
    )}" fill="${entry.colour}" font-family="${TEXT_FONT_FAMILY}" font-size="${formatNumber(
      entry.size,
    )}" font-weight="${weight}" text-anchor="${anchors[entry.align]}">${sanitiseSvgText(
      entry.text,
    )}</text>`;
  });
}
interface PlacedBlock {
  elements: string[];
  height: number;
}

const EMPTY_BLOCK: PlacedBlock = { elements: [], height: 0 };

function resolveTitle(plan: FireAlarmPlan3D, options: FireAlarmPlan3DSvgOptions): string {
  return (
    options.title ?? options.legend?.planTitle ?? `Fire alarm zone plan · session ${plan.sessionId}`
  );
}

/**
 * Renders a generated plan to a standalone SVG document. The output is renderer independent and
 * can be stored, emailed as an attachment or handed to any SVG viewer. Zones, the zone key, the
 * device key and the company block are all included, so a shared plan is self-describing.
 */
export function renderFireAlarmPlan3DSvg(
  plan: FireAlarmPlan3D,
  options: FireAlarmPlan3DSvgOptions = {},
): string {
  const palette = getPlan3DPalette(plan.colourScheme);
  const scale = Math.max(1, Math.min(options.scale ?? DEFAULT_SVG_SCALE, 4));
  const caption = palette.caption;
  const includeLegend = options.includeLegend !== false;

  const company: PlacedBlock = options.legend
    ? renderCompanyBlock(options.legend, HEADER_HEIGHT, caption)
    : EMPTY_BLOCK;
  const drawingTop = HEADER_HEIGHT + company.height + (company.height > 0 ? BLOCK_GAP : 0);
  const drawingBottom = drawingTop + plan.viewport.height;

  const zoneLegend: PlacedBlock =
    includeLegend && plan.zoneSummary.length > 0
      ? renderZoneLegendBlock(plan, drawingBottom + BLOCK_GAP, caption)
      : EMPTY_BLOCK;
  const afterZonesTop = drawingBottom + BLOCK_GAP + zoneLegend.height;
  const deviceLegend: PlacedBlock = includeLegend
    ? renderDeviceLegendBlock(plan, afterZonesTop + (zoneLegend.height > 0 ? BLOCK_GAP : 0), caption)
    : EMPTY_BLOCK;
  const footerTop =
    afterZonesTop + deviceLegend.height + (deviceLegend.height > 0 ? BLOCK_GAP + 4 : BLOCK_GAP);
  const footer: PlacedBlock =
    options.includeFooter === false ? EMPTY_BLOCK : renderFooterBlock(plan, footerTop, caption);

  const contentHeight = Math.max(footerTop + footer.height, drawingBottom + 8);
  const width = Math.round(plan.viewport.width * scale);
  const height = Math.round(contentHeight * scale);
  const title = sanitiseSvgText(resolveTitle(plan, options));

  const body: string[] = [
    `<rect x="0" y="0" width="${formatNumber(plan.viewport.width)}" height="${formatNumber(
      contentHeight,
    )}" fill="${palette.surfaceBackground}" />`,
    `<text x="${LEGEND_SIDE_PADDING}" y="20" fill="${caption}" font-family="${TEXT_FONT_FAMILY}" font-size="12" font-weight="700">${title}</text>`,
    ...company.elements,
    `<g transform="translate(0, ${formatNumber(drawingTop)})">`,
    `<rect x="0.5" y="0.5" width="${formatNumber(
      plan.viewport.width - DRAWING_BORDER,
    )}" height="${formatNumber(
      plan.viewport.height - DRAWING_BORDER,
    )}" fill="none" stroke="${caption}" stroke-opacity="0.25" />`,
    ...renderPolygons(plan),
    ...renderSegments(plan, 'base'),
    ...renderSegments(plan, 'structure'),
    ...renderSegments(plan, 'overlay'),
    ...renderMarkers(plan),
    ...renderTexts(plan),
    '</g>',
    ...zoneLegend.elements,
    ...deviceLegend.elements,
    ...footer.elements,
  ];

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

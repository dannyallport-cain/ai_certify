'use client';

import type { ComponentProps } from 'react';

import type {
  FireAlarmPlan3D,
  Plan3DPoint,
  Plan3DZonePolygon,
} from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';
import { getPlan3DPalette } from '@/mobile/modules/fire-alarm-roomplan/plan3d/palette';

export interface DraftZone {
  start: Plan3DPoint;
  end: Plan3DPoint;
}

interface PlanDrawingProps {
  plan: FireAlarmPlan3D;
  zones: Plan3DZonePolygon[];
  selectedZoneId: string | null;
  draft: DraftZone | null;
  interactive: boolean;
  /** Pointer callbacks receive the point in drawing coordinates, not page coordinates. */
  onPointerDown: (point: Plan3DPoint) => void;
  onPointerMove: (point: Plan3DPoint) => void;
  onPointerUp: (point: Plan3DPoint) => void;
}

type SvgPointerEvent = Parameters<
  NonNullable<ComponentProps<'svg'>['onPointerDown']>
>[0];

const TEXT_ANCHORS = { left: 'start', center: 'middle', right: 'end' } as const;

const MARKER_GLYPH_SIZE = 8;
const MARKER_GLYPH_BASELINE_RATIO = 1 / 3;
const ZONE_VERTEX_RADIUS = 4;
const DRAFT_DASH = '6 4';

function toPointsAttribute(points: Plan3DPoint[]): string {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

function draftCorners(draft: DraftZone): Plan3DPoint[] {
  const minX = Math.min(draft.start.x, draft.end.x);
  const maxX = Math.max(draft.start.x, draft.end.x);
  const minY = Math.min(draft.start.y, draft.end.y);
  const maxY = Math.max(draft.start.y, draft.end.y);

  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

/**
 * The drawing itself, rendered as SVG elements rather than an SVG string so zone editing can hang
 * off real DOM nodes. Rendering mirrors the mobile canvas layer order: floor, zones, structure,
 * markers, labels.
 */
export default function PlanDrawing({
  plan,
  zones,
  selectedZoneId,
  draft,
  interactive,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: PlanDrawingProps) {
  const palette = getPlan3DPalette(plan.colourScheme);
  const glyphColour = plan.colourScheme === 'schematic' ? '#FFFFFF' : '#0B1727';

  // The SVG is scaled to the container, so every pointer position is converted back into the
  // viewBox the generator laid the plan out in.
  const toDrawingPoint = (event: SvgPointerEvent): Plan3DPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const scaleX = bounds.width > 0 ? plan.viewport.width / bounds.width : 1;
    const scaleY = bounds.height > 0 ? plan.viewport.height / bounds.height : 1;

    return {
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY,
    };
  };

  return (
    <svg
      viewBox={`0 0 ${plan.viewport.width} ${plan.viewport.height}`}
      className={`h-auto w-full ${interactive ? 'cursor-crosshair touch-none' : ''}`}
      role="img"
      aria-label="Fire alarm zone plan"
      onPointerDown={interactive ? (event) => onPointerDown(toDrawingPoint(event)) : undefined}
      onPointerMove={interactive ? (event) => onPointerMove(toDrawingPoint(event)) : undefined}
      onPointerUp={interactive ? (event) => onPointerUp(toDrawingPoint(event)) : undefined}
    >
      <rect
        x={0}
        y={0}
        width={plan.viewport.width}
        height={plan.viewport.height}
        fill={palette.surfaceBackground}
      />

      {(['base', 'structure'] as const).map((layer) =>
        plan.polygons
          .filter((polygon) => polygon.layer === layer)
          .map((polygon) => (
            <polygon
              key={polygon.id}
              points={toPointsAttribute(polygon.points)}
              fill={polygon.fill}
              fillOpacity={polygon.fillOpacity}
              stroke={polygon.stroke}
              strokeWidth={polygon.strokeWidth}
              strokeLinejoin="round"
            />
          )),
      )}

      {plan.segments.map((segment) => (
        <line
          key={segment.id}
          x1={segment.from.x}
          y1={segment.from.y}
          x2={segment.to.x}
          y2={segment.to.y}
          stroke={segment.colour}
          strokeWidth={segment.width}
          strokeOpacity={segment.opacity}
          strokeDasharray={segment.dashed ? '4 3' : undefined}
        />
      ))}

      {zones.map((zone) => {
        const selected = zone.zoneId === selectedZoneId;

        return (
          <g key={zone.zoneId}>
            <polygon
              points={toPointsAttribute(zone.points)}
              fill={zone.fill}
              fillOpacity={zone.fillOpacity}
              stroke={zone.stroke}
              strokeWidth={selected ? 3 : zone.strokeWidth}
              strokeLinejoin="round"
            />
            {selected
              ? zone.points.map((point, index) => (
                  <circle
                    key={`${zone.zoneId}-vertex-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={ZONE_VERTEX_RADIUS}
                    fill={palette.surfaceBackground}
                    stroke={zone.stroke}
                    strokeWidth={2}
                  />
                ))
              : null}
          </g>
        );
      })}

      {draft ? (
        <polygon
          points={toPointsAttribute(draftCorners(draft))}
          fill={palette.floorStroke}
          fillOpacity={0.12}
          stroke={palette.floorStroke}
          strokeWidth={2}
          strokeDasharray={DRAFT_DASH}
        />
      ) : null}

      {plan.markers.map((marker) => (
        <g key={marker.deviceId}>
          <circle
            cx={marker.position.x}
            cy={marker.position.y}
            r={marker.radius}
            fill={marker.colour}
            fillOpacity={0.92}
            stroke={marker.selected ? '#FFFFFF' : '#0B1727'}
            strokeWidth={marker.selected ? 3 : 1.5}
          />
          <text
            x={marker.position.x}
            y={marker.position.y + MARKER_GLYPH_SIZE * MARKER_GLYPH_BASELINE_RATIO}
            fill={glyphColour}
            fontSize={MARKER_GLYPH_SIZE}
            fontWeight={700}
            textAnchor="middle"
          >
            {marker.glyph}
          </text>
        </g>
      ))}

      {plan.texts.map((entry) => (
        <text
          key={entry.id}
          x={entry.position.x}
          y={entry.position.y}
          fill={entry.colour}
          fontSize={entry.size}
          fontWeight={entry.emphasis === 'strong' ? 700 : 500}
          textAnchor={TEXT_ANCHORS[entry.align]}
        >
          {entry.text}
        </text>
      ))}
    </svg>
  );
}

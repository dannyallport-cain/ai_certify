'use client';

/* eslint-disable no-undef -- DOM globals (SVGSVGElement, DragEvent) are provided by the TS DOM lib */

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  DESIGN_PALETTE,
  buildFloorScene,
  screenToWorld,
  type BuildingDesign,
  type DesignAreaKind,
  type DesignPoint,
  type DesignRect,
  type DesignTool,
  type ScenePolygon,
} from '@/lib/design';
import { clamp, rectFromPoints } from '@/lib/design/geometry';

import DeviceSymbol from './DeviceSymbol';

/**
 * The plan view the surveyor draws on.
 *
 * Everything is drawn on the floor plane: this is deliberately a plan-only editor, because a
 * multi-floor building has to be readable storey by storey before it is readable in 3D, and a
 * device dropped at a screen position has to mean an unambiguous point in metres.
 *
 * Devices are drag-and-dropped from the palette (native HTML5 drag, so the drag image is the
 * symbol itself) and can be nudged afterwards by dragging them on the canvas.
 */

export type CanvasTool = DesignTool;

interface DesignCanvasProps {
  design: BuildingDesign;
  floorId: string | null;
  tool: CanvasTool;
  /** Device kind armed in the palette; a click on the canvas places one of these. */
  pendingKind: string | null;
  areaKind: DesignAreaKind;
  selectedDeviceId: string | null;
  selectedZoneId: string | null;
  onPlaceDevice: (kind: string, point: DesignPoint) => void;
  onMoveDevice: (deviceId: string, point: DesignPoint) => void;
  onDrawZone: (rect: DesignRect) => void;
  onDrawArea: (rect: DesignRect, kind: DesignAreaKind) => void;
  onSelectDevice: (deviceId: string | null) => void;
  onSelectZone: (zoneId: string | null) => void;
  showGrid: boolean;
}

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 680;
const VIEW_PADDING = 44;
/**
 * Tallest the drawing may render. The SVG keeps the viewport's aspect ratio, so a deep narrow
 * site would otherwise stretch to full width and push everything below it off the screen.
 */
const MAX_RENDER_HEIGHT = 700;
/** A drag shorter than this in metres is a click, not a drawn zone or area. */
const MIN_DRAW_METERS = 0.4;
const GRID_MIN_PIXELS = 14;

interface DragState {
  kind: 'device' | 'draw-zone' | 'draw-area' | 'pan';
  deviceId?: string;
  start: DesignPoint;
  current: DesignPoint;
  /** True once the pointer has moved far enough to count as a drag rather than a click. */
  moved: boolean;
}

function pointerToWorld(
  event: { clientX: number; clientY: number },
  svg: SVGSVGElement,
  viewport: ReturnType<typeof buildFloorScene>['viewport'],
): DesignPoint {
  const bounds = svg.getBoundingClientRect();
  const scaleX = bounds.width > 0 ? viewport.width / bounds.width : 1;
  const scaleY = bounds.height > 0 ? viewport.height / bounds.height : 1;

  return screenToWorld(
    {
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY,
    },
    viewport,
  );
}

function polygonPoints(polygon: ScenePolygon): string {
  return polygon.points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

/**
 * A zone fill as a single path, with any nested compartment as an inner ring.
 *
 * Drawn `evenodd`, so a shaft cut out of a floor plate leaves a real hole: the two compartments
 * never read as one filled area and the shaft's own fill shows through.
 */
function polygonPath(polygon: ScenePolygon): string {
  const ring = (points: { x: number; y: number }[]): string =>
    `${points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
      .join(' ')} Z`;

  return [ring(polygon.points), ...(polygon.holes ?? []).map(ring)].join(' ');
}

export function DesignCanvas({
  design,
  floorId,
  tool,
  pendingKind,
  areaKind,
  selectedDeviceId,
  selectedZoneId,
  onPlaceDevice,
  onMoveDevice,
  onDrawZone,
  onDrawArea,
  onSelectDevice,
  onSelectZone,
  showGrid,
}: DesignCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverPoint, setHoverPoint] = useState<DesignPoint | null>(null);

  const scene = useMemo(
    () =>
      buildFloorScene(design, floorId, {
        width: VIEW_WIDTH,
        height: VIEW_HEIGHT,
        padding: VIEW_PADDING,
        selectedDeviceId,
      }),
    [design, floorId, selectedDeviceId],
  );

  const viewport = scene.viewport;

  const toWorld = useCallback(
    (event: { clientX: number; clientY: number }): DesignPoint | null => {
      const svg = svgRef.current;

      if (!svg) {
        return null;
      }

      return pointerToWorld(event, svg, viewport);
    },
    [viewport],
  );

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }

    const world = toWorld(event);

    if (!world) {
      return;
    }

    if (pendingKind) {
      onPlaceDevice(pendingKind, world);
      return;
    }

    if (tool === 'zone' || tool === 'area') {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({
        kind: tool === 'zone' ? 'draw-zone' : 'draw-area',
        start: world,
        current: world,
        moved: false,
      });

      return;
    }

    // A device under the pointer wins over the polygon beneath it, so a detector dropped on a
    // zone can always be picked up again.
    const hit = scene.devices.find((device) => {
      const dx = world.x - (device.centre.x - viewport.offsetX) / viewport.scale;
      const dy = world.y - (device.centre.y - viewport.offsetY) / viewport.scale;
      const tolerance = (device.symbol.size / viewport.scale) * 0.8;

      return Math.hypot(dx, dy) <= tolerance;
    });

    if (hit) {
      event.currentTarget.setPointerCapture(event.pointerId);
      onSelectDevice(hit.deviceId);
      setDrag({
        kind: 'device',
        deviceId: hit.deviceId,
        start: world,
        current: world,
        moved: false,
      });

      return;
    }

    onSelectDevice(null);
    onSelectZone(null);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const world = toWorld(event);

    if (!world) {
      return;
    }

    setHoverPoint(world);

    setDrag((current) => {
      if (!current) {
        return current;
      }

      const moved =
        current.moved ||
        Math.hypot(world.x - current.start.x, world.y - current.start.y) > 0.05;

      if (current.kind === 'device' && current.deviceId && moved) {
        onMoveDevice(current.deviceId, world);
      }

      return { ...current, current: world, moved };
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const world = toWorld(event);

    setDrag((current) => {
      if (!current || !world) {
        return null;
      }

      if (current.kind === 'draw-zone' || current.kind === 'draw-area') {
        const rect = rectFromPoints(current.start, world);
        const wide = rect.maxX - rect.minX >= MIN_DRAW_METERS;
        const tall = rect.maxY - rect.minY >= MIN_DRAW_METERS;

        if (wide && tall) {
          if (current.kind === 'draw-zone') {
            onDrawZone(rect);
          } else {
            onDrawArea(rect, areaKind);
          }
        }
      }

      return null;
    });
  };

  const handleDragOver = (event: ReactDragEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: ReactDragEvent<SVGSVGElement>) => {
    event.preventDefault();

    const kind = event.dataTransfer.getData('application/x-design-device');
    const world = toWorld(event);

    if (!kind || !world) {
      return;
    }

    onPlaceDevice(kind, world);
  };

  const draftRect = drag && (drag.kind === 'draw-zone' || drag.kind === 'draw-area')
    ? rectFromPoints(drag.start, drag.current)
    : null;

  const draftScreen = draftRect
    ? {
        x: draftRect.minX * viewport.scale + viewport.offsetX,
        y: draftRect.minY * viewport.scale + viewport.offsetY,
        width: (draftRect.maxX - draftRect.minX) * viewport.scale,
        height: (draftRect.maxY - draftRect.minY) * viewport.scale,
      }
    : null;

  const gridStepPixels = viewport.scale * 1;
  const gridSpacing = gridStepPixels >= GRID_MIN_PIXELS ? 1 : gridStepPixels > 0 ? 5 : 10;
  const gridSpacingPixels = gridSpacing * viewport.scale;

  const gridLines = showGrid && gridSpacingPixels >= GRID_MIN_PIXELS
    ? buildGridLines(viewport, gridSpacing, viewport.width, viewport.height)
    : [];

  const cursor = pendingKind
    ? 'cursor-copy'
    : tool === 'zone' || tool === 'area'
      ? 'cursor-crosshair'
      : 'cursor-default';

  const renderWidth = Math.round(
    Math.min(VIEW_WIDTH, MAX_RENDER_HEIGHT * (viewport.width / viewport.height)),
  );

  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: `${renderWidth}px` }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        className={`h-auto w-full touch-none rounded-xl border border-border bg-white ${cursor}`}
        role="application"
        aria-label="Building plan view"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setHoverPoint(null)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <rect width={viewport.width} height={viewport.height} fill={DESIGN_PALETTE.surface} />

        {gridLines.map((line) => (
          <line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={DESIGN_PALETTE.grid}
            strokeWidth={1}
          />
        ))}

        {scene.rooms.map((room) => (
          <g key={room.id}>
            <polygon
              points={polygonPoints(room)}
              fill={room.fill}
              fillOpacity={room.fillOpacity}
              stroke={room.stroke}
              strokeWidth={room.strokeWidth}
              strokeDasharray={room.dash}
              strokeLinejoin="round"
            />
          </g>
        ))}

        {scene.areas.map((area) => (
          <polygon
            key={area.id}
            points={polygonPoints(area)}
            fill={area.fill}
            fillOpacity={area.fillOpacity}
            stroke={area.stroke}
            strokeWidth={area.strokeWidth}
            strokeDasharray={area.dash}
            strokeLinejoin="round"
          />
        ))}

        {scene.zones.map((zone) => {
          // One shape per region, so selection matches on the zone rather than the shape.
          const isSelected = (zone.zoneId ?? zone.id) === selectedZoneId;
          const handleZonePointerDown = (event: ReactPointerEvent<SVGElement>) => {
            // An armed device or a drawing tool must win over the zone fill. Zones cover the
            // whole building, so swallowing the event here would make it impossible to place
            // a device anywhere a zone had been drawn.
            if (pendingKind || tool !== 'select') {
              return;
            }

            event.stopPropagation();
            onSelectZone(zone.zoneId ?? zone.id);
            onSelectDevice(null);
          };
          const shared = {
            fill: zone.fill,
            fillOpacity: zone.fillOpacity,
            stroke: zone.stroke,
            strokeWidth: isSelected ? 3.4 : zone.strokeWidth,
            strokeDasharray: isSelected ? '8 4' : undefined,
            strokeLinejoin: 'round' as const,
            className: pendingKind ? undefined : 'cursor-pointer',
            onPointerDown: handleZonePointerDown,
          };

          // A zone containing another compartment has holes, so it has to be a path.
          return zone.holes && zone.holes.length > 0 ? (
            <path key={zone.id} d={polygonPath(zone)} fillRule="evenodd" {...shared} />
          ) : (
            <polygon key={zone.id} points={polygonPoints(zone)} {...shared} />
          );
        })}

        {scene.labels
          .filter((label) => !label.text.startsWith('undefined'))
          .map((label) => (
            <text
              key={`${label.id}-${label.position.x.toFixed(1)}-${label.position.y.toFixed(1)}`}
              x={label.position.x}
              y={label.position.y}
              fill={label.colour}
              fontSize={label.size}
              fontWeight={label.weight}
              textAnchor={label.anchor}
              dominantBaseline="middle"
              paintOrder={label.halo ? 'stroke' : undefined}
              stroke={label.halo ? DESIGN_PALETTE.halo : undefined}
              strokeWidth={label.halo ? 3 : undefined}
              strokeLinejoin="round"
              className="pointer-events-none select-none"
            >
              {label.text}
            </text>
          ))}

        {scene.devices.map((device) => (
          <g key={device.deviceId}>
            {device.selected ? (
              <circle
                cx={device.centre.x}
                cy={device.centre.y}
                r={device.symbol.size / 2 + 4}
                fill="none"
                stroke={DESIGN_PALETTE.selection}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            ) : null}
            <DeviceSymbol
              kind={device.kind}
              size={device.symbol.size}
              x={device.symbol.x}
              y={device.symbol.y}
              colour={device.colour}
            />
            {device.mounting === 'ceiling_void' ? (
              <circle
                cx={device.centre.x}
                cy={device.centre.y}
                r={device.symbol.size / 2 + 1}
                fill="none"
                stroke={device.colour}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            ) : null}
          </g>
        ))}

        {draftScreen ? (
          <rect
            x={draftScreen.x}
            y={draftScreen.y}
            width={draftScreen.width}
            height={draftScreen.height}
            fill={tool === 'zone' ? DESIGN_PALETTE.drafting : DESIGN_PALETTE.gridMajor}
            fillOpacity={0.16}
            stroke={DESIGN_PALETTE.drafting}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        ) : null}

        {hoverPoint && (tool === 'zone' || tool === 'area' || pendingKind) ? (
          <text
            x={12}
            y={viewport.height - 12}
            fill={DESIGN_PALETTE.mutedText}
            fontSize={11}
            className="pointer-events-none select-none"
          >
            {hoverPoint.x.toFixed(2)} m, {hoverPoint.y.toFixed(2)} m
          </text>
        ) : null}
      </svg>

      {scene.stats.deviceCount === 0 && !pendingKind ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <p className="rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            Drag a device from the palette onto the plan to begin
          </p>
        </div>
      ) : null}
    </div>
  );
}

interface GridLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Grid lines in screen space, clipped to the viewport and spaced at a whole number of metres. */
function buildGridLines(
  viewport: ReturnType<typeof buildFloorScene>['viewport'],
  spacingMeters: number,
  width: number,
  height: number,
): GridLine[] {
  const lines: GridLine[] = [];
  const step = Math.max(spacingMeters, 0.5);

  const minX = (0 - viewport.offsetX) / viewport.scale;
  const maxX = (width - viewport.offsetX) / viewport.scale;
  const minY = (0 - viewport.offsetY) / viewport.scale;
  const maxY = (height - viewport.offsetY) / viewport.scale;

  const startX = Math.floor(minX / step) * step;
  const startY = Math.floor(minY / step) * step;

  for (let x = startX; x <= maxX; x += step) {
    const screenX = clamp(x * viewport.scale + viewport.offsetX, 0, width);
    lines.push({ id: `gv-${x.toFixed(2)}`, x1: screenX, y1: 0, x2: screenX, y2: height });
  }

  for (let y = startY; y <= maxY; y += step) {
    const screenY = clamp(y * viewport.scale + viewport.offsetY, 0, height);
    lines.push({ id: `gh-${y.toFixed(2)}`, x1: 0, y1: screenY, x2: width, y2: screenY });
  }

  return lines;
}

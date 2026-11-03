import type { JSX } from 'react';

import {
  getDeviceColour,
  getSymbolPrimitives,
  resolveSymbolPaint,
  type DesignSymbolPrimitive,
} from '@/lib/design';

interface DeviceSymbolProps {
  kind: string;
  /** Outer box size in pixels. The symbol is drawn inside a 100 unit box and scaled to fit. */
  size: number;
  x: number;
  y: number;
  colour?: string;
  /** Rotation in degrees around the symbol centre. */
  rotation?: number;
  opacity?: number;
}

/**
 * Draws one catalogue symbol.
 *
 * The primitives come from `lib/design/symbols.ts`, which knows nothing about React, so the same
 * geometry is used by the printed SVG export. Everything is scaled from the 100 unit symbol box,
 * which is what lets a detector stay legible at 20 px on screen and at 200 px on paper.
 */
export default function DeviceSymbol({
  kind,
  size,
  x,
  y,
  colour,
  rotation = 0,
  opacity = 1,
}: DeviceSymbolProps): JSX.Element {
  const accent = colour ?? getDeviceColour(kind);
  const scale = size / 100;
  const centreX = x + size / 2;
  const centreY = y + size / 2;

  const primitives = getSymbolPrimitives(kind);
  const transform =
    rotation === 0
      ? `translate(${x} ${y}) scale(${scale})`
      : `translate(${centreX} ${centreY}) rotate(${rotation}) translate(${-size / 2} ${-size / 2}) scale(${scale})`;

  return (
    <g transform={transform} opacity={opacity}>
      {primitives.map((primitive, index) => renderPrimitive(primitive, accent, `${kind}-${index}`))}
    </g>
  );
}

/**
 * An unknown kind already resolves to the generic marker inside the symbol library, so this can
 * never fall through without something to draw.
 */
function renderPrimitive(
  primitive: DesignSymbolPrimitive,
  accent: string,
  key: string,
): JSX.Element | null {
  const fill = 'fill' in primitive ? resolveSymbolPaint(primitive.fill, accent) : 'none';
  const stroke = 'stroke' in primitive ? resolveSymbolPaint(primitive.stroke, accent) : 'none';
  const strokeWidth = 'strokeWidth' in primitive ? primitive.strokeWidth : 0;
  const dash = 'dash' in primitive && primitive.dash ? primitive.dash : undefined;

  switch (primitive.type) {
    case 'circle':
      return (
        <circle
          key={key}
          cx={primitive.cx}
          cy={primitive.cy}
          r={primitive.r}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          vectorEffect="non-scaling-stroke"
        />
      );
    case 'rect':
      return (
        <rect
          key={key}
          x={primitive.x}
          y={primitive.y}
          width={primitive.width}
          height={primitive.height}
          rx={primitive.rx}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
        />
      );
    case 'polygon':
      return (
        <polygon
          key={key}
          points={primitive.points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    case 'line':
      return (
        <line
          key={key}
          x1={primitive.x1}
          y1={primitive.y1}
          x2={primitive.x2}
          y2={primitive.y2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      );
    case 'path':
      return (
        <path
          key={key}
          d={primitive.d}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    case 'text':
      return (
        <text
          key={key}
          x={primitive.x}
          y={primitive.y}
          fill={resolveSymbolPaint(primitive.fill, accent)}
          fontSize={primitive.size}
          fontWeight={primitive.weight}
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {primitive.text}
        </text>
      );
    default:
      return null;
  }
}

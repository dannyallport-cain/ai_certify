/**
 * Device symbols for the plan drawing.
 *
 * Every symbol is drawn inside a 100 x 100 box centred on (50, 50), so one definition serves the
 * palette chip, the canvas and the printed sheet at any size. The conventions follow ISO 6790
 * (fire protection plan symbols) and the BS 5839-1 zone plan practice used across the UK fire
 * industry: detectors are circles carrying their type letter, manual call points are squares with
 * a broken glass, alarm devices are circles carrying the sound or light pictogram, and control
 * equipment is a rectangle with a lamp field.
 *
 * Nothing here knows about React or SVG strings: the primitives are resolved into elements by
 * whichever renderer is drawing, which keeps the browser and the print export pixel-identical.
 */

export type SymbolPaintRole = 'device' | 'surface' | 'ink' | 'none';

export interface SymbolCircle {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
  fill: SymbolPaintRole;
  stroke: SymbolPaintRole;
  strokeWidth: number;
  dash?: string;
}

export interface SymbolRect {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  fill: SymbolPaintRole;
  stroke: SymbolPaintRole;
  strokeWidth: number;
  dash?: string;
}

export interface SymbolPolygon {
  type: 'polygon';
  points: string;
  fill: SymbolPaintRole;
  stroke: SymbolPaintRole;
  strokeWidth: number;
}

export interface SymbolLine {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: SymbolPaintRole;
  strokeWidth: number;
  dash?: string;
}

export interface SymbolPath {
  type: 'path';
  d: string;
  fill: SymbolPaintRole;
  stroke: SymbolPaintRole;
  strokeWidth: number;
  dash?: string;
}

export interface SymbolText {
  type: 'text';
  x: number;
  y: number;
  text: string;
  size: number;
  fill: SymbolPaintRole;
  weight: number;
}

export type DesignSymbolPrimitive =
  | SymbolCircle
  | SymbolRect
  | SymbolPolygon
  | SymbolLine
  | SymbolPath
  | SymbolText;

export interface DesignSymbol {
  /** Bounding box the primitives are drawn in, so callers can scale without guessing. */
  viewBox: string;
  primitives: DesignSymbolPrimitive[];
}

export const SYMBOL_VIEW_BOX = '0 0 100 100';
export const SYMBOL_BOX_SIZE = 100;

const RING_RADIUS = 30;
const RING_STROKE = 5.5;
const OUTER_STROKE = 4.5;

export const SYMBOL_INK = '#0F172A';
export const SYMBOL_SURFACE = '#FFFFFF';

/** Resolves a paint role against the device colour and the surface it is drawn on. */
export function resolveSymbolPaint(role: SymbolPaintRole, deviceColour: string): string {
  switch (role) {
    case 'device':
      return deviceColour;
    case 'surface':
      return SYMBOL_SURFACE;
    case 'ink':
      return SYMBOL_INK;
    default:
      return 'none';
  }
}

function ring(fill: SymbolPaintRole = 'surface'): SymbolCircle {
  return {
    type: 'circle',
    cx: 50,
    cy: 50,
    r: RING_RADIUS,
    fill,
    stroke: 'device',
    strokeWidth: RING_STROKE,
  };
}

function box(
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 6,
  fill: SymbolPaintRole = 'surface',
): SymbolRect {
  return { type: 'rect', x, y, width, height, rx, fill, stroke: 'device', strokeWidth: OUTER_STROKE };
}

function centreText(text: string, size = 34): SymbolText {
  return { type: 'text', x: 50, y: 50 + size * 0.35, text, size, fill: 'device', weight: 700 };
}

/** Size that keeps a two or three character code inside the ring. */
function codeText(text: string): SymbolText {
  const size = text.length >= 4 ? 19 : text.length === 3 ? 23 : text.length === 2 ? 27 : 34;

  return centreText(text, size);
}

function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: SymbolPaintRole = 'device',
  strokeWidth = 4,
  dash?: string,
): SymbolLine {
  return { type: 'line', x1, y1, x2, y2, stroke, strokeWidth, dash };
}

function path(
  d: string,
  fill: SymbolPaintRole = 'none',
  stroke: SymbolPaintRole = 'device',
  strokeWidth = 4,
): SymbolPath {
  return { type: 'path', d, fill, stroke, strokeWidth };
}

function polygon(
  points: string,
  fill: SymbolPaintRole = 'device',
  stroke: SymbolPaintRole = 'none',
  strokeWidth = 0,
): SymbolPolygon {
  return { type: 'polygon', points, fill, stroke, strokeWidth };
}

/** A four point "flash" used for every visual alarm device. */
const FLASH_POINTS = '50,22 58,42 78,50 58,58 50,78 42,58 22,50 42,42';

/** Two concentric sound arcs pointing right, used by sounders and loudspeakers. */
function soundArcs(): DesignSymbolPrimitive[] {
  return [
    path('M 66 38 A 16 16 0 0 1 66 62'),
    path('M 76 30 A 26 26 0 0 1 76 70'),
  ];
}

const DETECTOR_SYMBOLS: Record<string, () => DesignSymbolPrimitive[]> = {
  smoke_optical: () => [ring(), centreText('S')],
  smoke_ionisation: () => [
    ring(),
    { type: 'circle', cx: 50, cy: 50, r: 18, fill: 'none', stroke: 'device', strokeWidth: 2.5, dash: '4 3' },
    centreText('S', 20),
  ],
  detector_multi: () => [ring(), centreText('M')],
  heat_detector: () => [ring(), centreText('H')],
  heat_ror: () => [
    ring(),
    centreText('H', 26),
    path('M 40 66 L 46 60 L 52 66', 'none', 'device', 3),
  ],
  co_detector: () => [ring(), codeText('CO')],
  beam_detector: () => [
    ring(),
    codeText('B'),
    line(24, 78, 76, 78, 'device', 3),
  ],
  aspirating_detector: () => [
    ring(),
    centreText('A', 30),
    path('M 34 66 L 42 74 M 50 66 L 50 76 M 66 66 L 58 74', 'none', 'device', 2.5),
  ],
  duct_detector: () => [
    ring(),
    codeText('D'),
    line(22, 72, 78, 72, 'device', 2.5),
    line(22, 78, 78, 78, 'device', 2.5),
  ],
  flame_detector: () => [
    ring(),
    polygon('50,28 60,48 56,52 64,66 50,74 36,66 44,52 40,48'),
  ],
  linear_heat: () => [
    ring(),
    codeText('L'),
    path('M 30 74 L 40 64 L 50 74 L 60 64 L 70 74', 'none', 'device', 2.5),
  ],
  video_detection: () => [
    ring(),
    codeText('V'),
    path('M 34 66 L 66 66 L 60 74 L 40 74 Z', 'none', 'device', 2.5),
  ],
};

const MANUAL_SYMBOLS: Record<string, () => DesignSymbolPrimitive[]> = {
  mcp: () => [
    box(20, 20, 60, 60),
    polygon('50,32 66,62 34,62'),
    line(50, 66, 50, 74, 'device', 3),
  ],
  mcp_outdoor: () => [
    box(16, 16, 68, 68, 8, 'none'),
    box(22, 22, 56, 56),
    polygon('50,34 64,60 36,60'),
    path('M 24 24 L 34 34 M 76 24 L 66 34', 'none', 'device', 2.5),
  ],
};

const ALARM_SYMBOLS: Record<string, () => DesignSymbolPrimitive[]> = {
  sounder: () => [ring(), polygon('36,34 56,34 56,66 36,66'), ...soundArcs().slice(0, 1)],
  sounder_beacon: () => [
    ring(),
    polygon('32,40 50,40 50,60 32,60'),
    polygon('62,28 68,42 82,48 68,54 62,68 56,54 42,48 56,42'),
  ],
  beacon: () => [ring(), polygon(FLASH_POINTS)],
  vad: () => [
    ring(),
    polygon(FLASH_POINTS),
    path('M 30 74 A 28 28 0 0 1 70 74', 'none', 'device', 2.5),
  ],
  loudspeaker: () => [
    ring(),
    polygon('32,42 44,42 56,30 56,70 44,58 32,58'),
    path('M 62 40 A 14 14 0 0 1 62 60', 'none', 'device', 3),
  ],
  sounder_base: () => [
    ring(),
    { type: 'circle', cx: 50, cy: 50, r: 19, fill: 'none', stroke: 'device', strokeWidth: 2.5 },
    codeText('S'),
  ],
};

const CONTROL_SYMBOLS: Record<string, () => DesignSymbolPrimitive[]> = {
  panel: () => [
    box(10, 26, 80, 48, 5),
    line(16, 40, 84, 40, 'device', 2.5),
    { type: 'circle', cx: 26, cy: 33, r: 5, fill: 'device', stroke: 'none', strokeWidth: 0 },
    { type: 'circle', cx: 42, cy: 33, r: 5, fill: 'device', stroke: 'none', strokeWidth: 0 },
    { type: 'circle', cx: 58, cy: 33, r: 5, fill: 'device', stroke: 'none', strokeWidth: 0 },
    line(20, 52, 80, 52, 'device', 2),
    line(20, 62, 62, 62, 'device', 2),
  ],
  repeater_panel: () => [
    box(12, 28, 76, 44, 5, 'surface'),
    line(18, 40, 82, 40, 'device', 2.5),
    line(22, 52, 78, 52, 'device', 2, '4 3'),
    line(22, 62, 60, 62, 'device', 2, '4 3'),
  ],
  pse: () => [
    box(14, 30, 72, 40, 5),
    { type: 'rect', x: 22, y: 44, width: 26, height: 12, rx: 2, fill: 'device', stroke: 'none', strokeWidth: 0 },
    { type: 'rect', x: 52, y: 44, width: 26, height: 12, rx: 2, fill: 'none', stroke: 'device', strokeWidth: 3 },
    line(28, 36, 28, 44, 'device', 2.5),
    line(72, 56, 72, 64, 'device', 2.5),
  ],
  network_node: () => [
    { type: 'polygon', points: '50,20 76,35 76,65 50,80 24,65 24,35', fill: 'surface', stroke: 'device', strokeWidth: OUTER_STROKE },
    { type: 'circle', cx: 50, cy: 38, r: 5, fill: 'device', stroke: 'none', strokeWidth: 0 },
    { type: 'circle', cx: 36, cy: 52, r: 5, fill: 'device', stroke: 'none', strokeWidth: 0 },
    { type: 'circle', cx: 64, cy: 52, r: 5, fill: 'device', stroke: 'none', strokeWidth: 0 },
    line(36, 52, 64, 52, 'device', 2.5),
    line(50, 43, 42, 48, 'device', 2.5),
    line(50, 43, 58, 48, 'device', 2.5),
  ],
  printer: () => [
    box(20, 24, 60, 52, 5),
    line(30, 38, 70, 38, 'device', 3),
    line(30, 48, 70, 48, 'device', 3),
    line(30, 58, 54, 58, 'device', 3),
  ],
};

const INTERFACE_SYMBOLS: Record<string, () => DesignSymbolPrimitive[]> = {
  interface: () => [
    box(22, 22, 56, 56),
    // Filled rather than outlined: a hairline diamond disappears once the symbol is drawn at the
    // 30 px used on the plan, and the symbol then reads as an empty box.
    polygon('50,31 69,50 50,69 31,50', 'device', 'none'),
  ],
  io_unit: () => [
    box(22, 22, 56, 56),
    { type: 'rect', x: 32, y: 32, width: 14, height: 14, rx: 2, fill: 'device', stroke: 'none', strokeWidth: 0 },
    { type: 'rect', x: 54, y: 32, width: 14, height: 14, rx: 2, fill: 'none', stroke: 'device', strokeWidth: 2.5 },
    { type: 'rect', x: 32, y: 54, width: 14, height: 14, rx: 2, fill: 'none', stroke: 'device', strokeWidth: 2.5 },
    { type: 'rect', x: 54, y: 54, width: 14, height: 14, rx: 2, fill: 'device', stroke: 'none', strokeWidth: 0 },
  ],
  relay: () => [
    box(22, 22, 56, 56),
    line(32, 42, 68, 42, 'device', 3),
    path('M 38 58 A 10 10 0 0 1 62 58', 'none', 'device', 3),
    line(32, 66, 68, 66, 'device', 3),
  ],
  zone_monitor: () => [
    box(22, 22, 56, 56),
    line(32, 38, 68, 38, 'device', 3),
    line(32, 50, 68, 50, 'device', 3),
    line(32, 62, 68, 62, 'device', 3),
  ],
};

const ANCILLARY_SYMBOLS: Record<string, () => DesignSymbolPrimitive[]> = {
  door_holder: () => [
    box(22, 22, 56, 56),
    path('M 36 34 L 36 60 A 8 8 0 0 0 52 60 L 52 34', 'none', 'device', 4),
    line(64, 34, 64, 66, 'device', 3),
  ],
  damper: () => [
    box(20, 20, 60, 60),
    polygon('24,32 24,68 44,50'),
    polygon('76,32 76,68 56,50'),
    line(50, 26, 50, 74, 'device', 3),
  ],
  flow_switch: () => [
    box(22, 22, 56, 56),
    line(50, 26, 50, 54, 'device', 3.5),
    polygon('28,54 72,54 70,66 30,66'),
    path('M 62 34 L 72 26', 'none', 'device', 2.5),
  ],
  pressure_switch: () => [
    box(22, 22, 56, 56),
    { type: 'circle', cx: 50, cy: 50, r: 17, fill: 'none', stroke: 'device', strokeWidth: 3 },
    line(50, 50, 60, 38, 'device', 3),
    line(50, 26, 50, 30, 'device', 2.5),
  ],
  valve_monitor: () => [
    box(22, 22, 56, 56),
    polygon('28,36 44,50 28,64'),
    polygon('72,36 56,50 72,64'),
    line(44, 50, 56, 50, 'device', 3),
  ],
  suppression_panel: () => [
    box(14, 24, 72, 52, 5),
    polygon('50,30 58,46 54,48 60,60 50,68 40,60 46,48 42,46'),
    line(20, 74, 80, 74, 'device', 3),
  ],
  smoke_vent: () => [
    box(20, 34, 60, 34),
    path('M 34 62 L 34 42 M 28 48 L 34 40 L 40 48', 'none', 'device', 3),
    path('M 50 62 L 50 42 M 44 48 L 50 40 L 56 48', 'none', 'device', 3),
    path('M 66 62 L 66 42 M 60 48 L 66 40 L 72 48', 'none', 'device', 3),
  ],
};

const SITE_SYMBOLS: Record<string, () => DesignSymbolPrimitive[]> = {
  fire_exit: () => [
    box(20, 20, 60, 60),
    line(26, 50, 66, 50, 'device', 4),
    path('M 56 40 L 68 50 L 56 60', 'none', 'device', 4),
  ],
  assembly_point: () => [
    { type: 'polygon', points: '50,18 78,62 22,62', fill: 'surface', stroke: 'device', strokeWidth: OUTER_STROKE },
    { type: 'circle', cx: 50, cy: 38, r: 6, fill: 'device', stroke: 'none', strokeWidth: 0 },
    line(50, 44, 50, 54, 'device', 3),
    line(42, 50, 58, 50, 'device', 3),
  ],
  extinguisher: () => [
    { type: 'rect', x: 36, y: 34, width: 28, height: 44, rx: 8, fill: 'surface', stroke: 'device', strokeWidth: OUTER_STROKE },
    line(50, 34, 50, 24, 'device', 3.5),
    line(50, 26, 64, 26, 'device', 3),
    path('M 36 26 L 28 18', 'none', 'device', 3),
  ],
  fire_door: () => [
    line(30, 76, 70, 76, 'device', 4),
    line(30, 76, 30, 30, 'device', 4),
    path('M 30 30 A 46 46 0 0 1 70 76', 'none', 'device', 3),
  ],
  riser: () => [
    box(24, 24, 52, 52),
    line(50, 24, 50, 76, 'device', 3),
    line(24, 50, 76, 50, 'device', 3),
  ],
  dry_riser: () => [
    ring(),
    codeText('DR'),
    line(50, 80, 50, 88, 'device', 3),
  ],
};

export const SYMBOL_BUILDERS: Record<string, () => DesignSymbolPrimitive[]> = {
  ...DETECTOR_SYMBOLS,
  ...MANUAL_SYMBOLS,
  ...ALARM_SYMBOLS,
  ...CONTROL_SYMBOLS,
  ...INTERFACE_SYMBOLS,
  ...ANCILLARY_SYMBOLS,
  ...SITE_SYMBOLS,
};

/** Primitives for a device kind, falling back to a generic interrogative marker. */
export function getSymbolPrimitives(kind: string | null | undefined): DesignSymbolPrimitive[] {
  const builder = kind ? SYMBOL_BUILDERS[kind] : undefined;

  if (builder) {
    return builder();
  }

  return [ring(), centreText('?')];
}

export function getSymbol(kind: string | null | undefined): DesignSymbol {
  return { viewBox: SYMBOL_VIEW_BOX, primitives: getSymbolPrimitives(kind) };
}

/** Every kind that has a hand drawn symbol, used by tests and by the legend. */
export function listSymbolKinds(): string[] {
  return Object.keys(SYMBOL_BUILDERS).sort();
}

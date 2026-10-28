import type { FireAlarmDeviceType, FireAlarmScanSession } from '../types';

/** A point in projected (screen) space, in device-independent pixels. */
export interface Plan3DPoint {
  x: number;
  y: number;
}

/** A point in captured world space. Units are metres, `z` is height above the floor. */
export interface Plan3DVertex {
  x: number;
  y: number;
  z: number;
}

export type Plan3DSurfaceKind = 'floor' | 'ceiling' | 'wall' | 'opening';

/**
 * Render order group. `base` is drawn first (floor and grid), `structure` is depth sorted
 * (walls, openings, ceiling) and `overlay` is drawn last (device markers, leaders, labels).
 */
export type Plan3DLayer = 'base' | 'zone' | 'structure' | 'overlay';

/**
 * Describes a projected surface as an affine image of the unit square.
 * `origin` is the top-left world corner, `u` the width edge and `v` the height edge,
 * so `origin + u + v` is the fourth corner. Present only when the projection of the
 * surface is a true parallelogram, which is the case for every rectangular surface
 * under an orthographic camera.
 */
export interface Plan3DQuad {
  origin: Plan3DPoint;
  u: Plan3DPoint;
  v: Plan3DPoint;
}

export interface Plan3DPolygon {
  id: string;
  kind: Plan3DSurfaceKind;
  layer: Plan3DLayer;
  roomId: string | null;
  /** Projected outline in draw order, already depth sorted by the generator. */
  points: Plan3DPoint[];
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  /** Larger values are further from the camera. */
  depth: number;
  quad: Plan3DQuad | null;
}

export type Plan3DSegmentKind =
  | 'floor-outline'
  | 'wall-outline'
  | 'wall-corner'
  | 'ceiling-outline'
  | 'opening'
  | 'floor-grid'
  | 'leader';

export interface Plan3DSegment {
  id: string;
  kind: Plan3DSegmentKind;
  layer: Plan3DLayer;
  from: Plan3DPoint;
  to: Plan3DPoint;
  colour: string;
  width: number;
  opacity: number;
  depth: number;
  dashed: boolean;
}

/**
 * Where a device is fixed. `ceiling_void` is above the finished ceiling — a detector dropped into
 * the void above the tiles rather than into the room — and is drawn with its own marker treatment.
 */
export type Plan3DMounting = 'floor' | 'wall' | 'ceiling' | 'ceiling_void' | 'unknown';

/** Surface families a placement tap can resolve to. */
export type Plan3DPickSurfaceKind = 'floor' | 'wall' | 'ceiling' | 'ceiling_void';

export interface Plan3DMarker {
  deviceId: string;
  deviceType: FireAlarmDeviceType;
  label: string;
  /** Short abbreviation drawn inside the marker. */
  glyph: string;
  colour: string;
  position: Plan3DPoint;
  worldPosition: Plan3DVertex;
  radius: number;
  depth: number;
  selected: boolean;
  confidence: number | null;
  manufacturer: string | null;
  roomId: string | null;
  mounting: Plan3DMounting;
}

export interface Plan3DText {
  id: string;
  text: string;
  position: Plan3DPoint;
  colour: string;
  size: number;
  align: 'left' | 'center' | 'right';
  depth: number;
  emphasis: 'normal' | 'strong';
}

export interface Plan3DLegendEntry {
  deviceType: FireAlarmDeviceType;
  label: string;
  glyph: string;
  colour: string;
  count: number;
  /** Ceiling-void entries are listed separately, because they read differently on the plan. */
  inCeilingVoid: boolean;
}

export type Plan3DProjection = 'isometric' | 'dimetric' | 'top-down';

export interface Plan3DCamera {
  projection: Plan3DProjection;
  /** Rotation of the room around the vertical axis, in degrees. */
  yawDegrees: number;
  /** Downward tilt of the camera, in degrees. 90 is a straight plan view. */
  pitchDegrees: number;
  /** Multiplier applied on top of the fit-to-viewport scale. */
  zoom: number;
  wallHeightMeters: number;
  showCeiling: boolean;
  showFloorGrid: boolean;
  showDevices: boolean;
  showLabels: boolean;
}

export interface Plan3DViewport {
  width: number;
  height: number;
  padding: number;
  /** Metres-to-pixels scale chosen to fit the geometry into the viewport. */
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Plan3DBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface Plan3DStats {
  roomCount: number;
  wallCount: number;
  openingCount: number;
  deviceCount: number;
  floorAreaSquareMeters: number;
  wallHeightMeters: number;
}

export type Plan3DColourScheme = 'blueprint' | 'schematic';

/**
 * A user-defined fire alarm zone. Zones are closed polygons on the floor plane in captured
 * world metres, so the same definition renders identically in the plan view, the 3D view and
 * the hosted viewer.
 */
export interface Plan3DZone {
  id: string;
  name: string;
  /** Short code printed on the plan and read out in the legend, e.g. `Z1`. */
  reference: string;
  /** Hex colour used for the zone fill, its outline, its label and its legend entry. */
  colour: string;
  /** Closed outline in world metres on the x/y plane. */
  polygon: Plan3DPoint[];
  notes?: string | null;
}

/** A zone polygon projected into the viewport, ready to draw. */
export interface Plan3DZonePolygon {
  zoneId: string;
  points: Plan3DPoint[];
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  depth: number;
}

export interface Plan3DZoneDeviceCount {
  deviceType: FireAlarmDeviceType;
  label: string;
  glyph: string;
  colour: string;
  count: number;
}

/**
 * Per-zone roll-up used by the legend. `deviceCount` is the number of devices whose floor
 * position falls inside the zone polygon, so overlapping zones are not double counted.
 */
export interface Plan3DZoneSummary {
  zoneId: string;
  name: string;
  reference: string;
  colour: string;
  areaSquareMeters: number;
  deviceCount: number;
  devices: Plan3DZoneDeviceCount[];
}

/** Company and job details printed with a zone plan. */
export interface Plan3DLegendCompany {
  name: string;
  addressLines: string[];
  phone: string;
  email: string;
  website: string;
  accreditation: string;
}

/** Everything a zone plan prints outside the drawing itself. */
export interface Plan3DLegendConfig {
  planTitle: string;
  jobReference: string;
  siteName: string;
  siteAddress: string;
  preparedBy: string;
  preparedOn: string;
  revision: string;
  notes: string;
  company: Plan3DLegendCompany;
  showZoneLegend: boolean;
  showDeviceLegend: boolean;
}

export interface FireAlarmPlan3D {
  id: string;
  sessionId: string;
  generatedAt: string;
  units: 'meters';
  colourScheme: Plan3DColourScheme;
  camera: Plan3DCamera;
  viewport: Plan3DViewport;
  bounds: Plan3DBounds;
  polygons: Plan3DPolygon[];
  segments: Plan3DSegment[];
  markers: Plan3DMarker[];
  texts: Plan3DText[];
  legend: Plan3DLegendEntry[];
  /** Projected zone fills, drawn above the floor and below the walls. */
  zones: Plan3DZonePolygon[];
  /** One roll-up per zone, in the order the zones were defined. */
  zoneSummary: Plan3DZoneSummary[];
  /** Devices that fall outside every zone; the legend calls these out rather than hiding them. */
  unassignedDeviceCount: number;
  stats: Plan3DStats;
  warnings: string[];
}

export interface FireAlarmPlan3DOptions {
  camera?: Partial<Plan3DCamera>;
  viewport?: Partial<Plan3DViewport>;
  colourScheme?: Plan3DColourScheme;
  selectedDeviceId?: string | null;
  /** Fallback ceiling height used when the capture does not report one. */
  wallHeightMeters?: number;
  /** Colour coded zones to draw and summarise. Omit or pass an empty array for no zoning. */
  zones?: Plan3DZone[];
}

export interface FireAlarmPlan3DInput {
  session: FireAlarmScanSession;
  options?: FireAlarmPlan3DOptions;
}

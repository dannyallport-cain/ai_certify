import {
  DESIGN_DEVICE_CATEGORIES,
  getDeviceCategory,
  getDeviceColour,
  getDeviceDefinition,
  DESIGN_DEVICE_CATALOGUE,
  type DesignDeviceDefinition,
} from './device-catalogue';
import {
  boundsOfPolygons,
  pointInPolygon,
  polygonArea,
  polygonCentre,
  polygonFromRect,
  type PolygonBounds,
} from './geometry';
import { darkenColour } from './palette';
import {
  childRegionsOnFloor,
  zoneNetAreaSquareMeters,
  zoneRegions,
  zonesInDrawOrder,
  zonesOnFloor,
} from './zones';
import { getSymbolPrimitives, type DesignSymbolPrimitive } from './symbols';
import type {
  BuildingDesign,
  DesignArea,
  DesignDevice,
  DesignFloor,
  DesignPolygon,
  DesignPoint,
  DesignZone,
} from './types';
import {
  DEVICE_SYMBOL_PIXELS,
  MAX_DEVICE_SYMBOL_PIXELS,
  MIN_DEVICE_SYMBOL_PIXELS,
  createViewport,
  worldToScreen,
  type DesignViewport,
  type CreateViewportOptions,
  type ScreenPoint,
} from './viewport';

/**
 * Turns one floor of a design into a flat list of things to draw.
 *
 * The scene is deliberately renderer agnostic: the editor draws it with React elements and the
 * print export serialises the same scene to SVG, so a plan cannot look different on paper to how
 * it looked on screen.
 */

export type ScenePolygonKind = 'room' | 'area' | 'zone';

export interface SceneLabel {
  id: string;
  text: string;
  position: ScreenPoint;
  colour: string;
  size: number;
  weight: number;
  anchor: 'start' | 'middle' | 'end';
  /** Optional backdrop, used for zone references printed over a filled polygon. */
  halo: boolean;
}

export interface ScenePolygon {
  id: string;
  /** Set on zone fills so every region of one zone can be matched back to it. */
  zoneId?: string;
  kind: ScenePolygonKind;
  points: ScreenPoint[];
  /**
   * Inner rings cut out of the fill. A floor plate has a hole where the shaft inside it sits, so
   * the plan shows the shaft as its own compartment rather than double filling the same area.
   */
  holes?: ScreenPoint[][];
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  dash?: string;
  label: SceneLabel | null;
}

export interface SceneDevice {
  deviceId: string;
  kind: string;
  definition: DesignDeviceDefinition;
  /** Top-left of the symbol box in screen pixels. */
  symbol: { x: number; y: number; size: number };
  centre: ScreenPoint;
  colour: string;
  glyph: string;
  primitives: DesignSymbolPrimitive[];
  label: SceneLabel;
  zoneId: string | null;
  mounting: string;
  selected: boolean;
}

export interface SceneLegendDevice {
  kind: string;
  label: string;
  glyph: string;
  colour: string;
  count: number;
  standardReference: string;
}

export interface SceneLegendZone {
  zoneId: string;
  reference: string;
  name: string;
  colour: string;
  deviceCount: number;
  /** Net area: a plate excludes the shaft nested inside it. */
  areaSquareMeters: number;
  /** Storeys this zone appears on, so a vertical compartment reads as one zone, not several. */
  floorCount: number;
  /** Reference of the compartment this one is nested inside, when it is. */
  nestedInReference: string | null;
}

export interface SceneLegendArea {
  areaId: string;
  name: string;
  kind: string;
  colour: string;
}

export interface FloorScene {
  floorId: string | null;
  floorName: string;
  viewport: DesignViewport;
  rooms: ScenePolygon[];
  areas: ScenePolygon[];
  zones: ScenePolygon[];
  devices: SceneDevice[];
  labels: SceneLabel[];
  deviceLegend: SceneLegendDevice[];
  zoneLegend: SceneLegendZone[];
  areaLegend: SceneLegendArea[];
  stats: {
    roomCount: number;
    deviceCount: number;
    zoneCount: number;
    floorAreaSquareMeters: number;
  };
  /** Devices that sit on this floor but outside every zone. */
  unassignedDeviceCount: number;
}

export interface BuildSceneOptions extends CreateViewportOptions {
  selectedDeviceId?: string | null;
  /** Fit the viewport to all floors rather than only the one being drawn. */
  fitAllFloors?: boolean;
}

const ROOM_FILL = '#F8FAFC';
const ROOM_STROKE = '#334155';
const ROOM_LABEL_COLOUR = '#475569';
const UPDATE_AREA_FILL: Record<string, string> = {
  car_park: '#94A3B8',
  compound: '#A8A29E',
  yard: '#A8A29E',
  bin_store: '#78716C',
  plant: '#78716C',
  canopy: '#CBD5E1',
  loading_bay: '#94A3B8',
  garden: '#86EFAC',
  other: '#CBD5E1',
};

const LABEL_FONT_SIZE = 11;
const ROOM_LABEL_FONT_SIZE = 10;
const ZONE_LABEL_FONT_SIZE = 12;
const ROOM_LABEL_INSET_PX = 14;
const LABEL_GAP_PX = 5;

export function getDeviceLabel(device: DesignDevice): string {
  const trimmed = device.label.trim();

  return trimmed || getDeviceDefinition(device.kind).label;
}

function toScreenPolygon(polygon: DesignPolygon, viewport: DesignViewport): ScreenPoint[] {
  return polygon.map((point) => worldToScreen(point, viewport));
}

function polygonPointsAttribute(points: ScreenPoint[]): string {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

/** Serialised `points` attribute, shared by the React and string renderers. */
export function scenePolygonPoints(polygon: ScenePolygon): string {
  return polygonPointsAttribute(polygon.points);
}

/**
 * Places a label beside a device symbol, flipping to the other side when the text would run off
 * the canvas. Returns the anchor so the renderer can align the text without measuring it.
 */
function placeDeviceLabel(
  centre: ScreenPoint,
  symbolSize: number,
  text: string,
  viewport: DesignViewport,
): SceneLabel {
  const estimatedWidth = Math.min(text.length * LABEL_FONT_SIZE * 0.58, 220);
  const rightX = centre.x + symbolSize / 2 + LABEL_GAP_PX;
  const fitsRight = rightX + estimatedWidth <= viewport.width - 4;

  return {
    id: 'device-label',
    text,
    position: {
      x: fitsRight ? rightX : centre.x - symbolSize / 2 - LABEL_GAP_PX,
      y: centre.y + LABEL_FONT_SIZE * 0.35,
    },
    colour: '#0F172A',
    size: LABEL_FONT_SIZE,
    weight: 600,
    anchor: fitsRight ? 'start' : 'end',
    halo: true,
  };
}

function buildRoomPolygons(floor: DesignFloor, viewport: DesignViewport): ScenePolygon[] {
  return floor.rooms.map((room) => {
    const points = toScreenPolygon(room.polygon, viewport);
    const centre = worldToScreen(polygonCentre(room.polygon), viewport);
    // Room names sit near the bottom of the room: the middle is where devices get dropped and
    // where the zone reference is printed, so a centroid label collides with both.
    const nameY = Math.min(
      Math.max(...points.map((point) => point.y)) - ROOM_LABEL_INSET_PX,
      centre.y + ROOM_LABEL_FONT_SIZE * 2,
    );

    return {
      id: room.id,
      kind: 'room' as const,
      points,
      fill: ROOM_FILL,
      fillOpacity: 1,
      stroke: ROOM_STROKE,
      strokeWidth: room.open ? 1.2 : 2,
      dash: room.open ? '6 4' : undefined,
      label: {
        id: `${room.id}-label`,
        text: room.name,
        position: { x: centre.x, y: nameY },
        colour: ROOM_LABEL_COLOUR,
        size: ROOM_LABEL_FONT_SIZE,
        weight: 600,
        anchor: 'middle' as const,
        halo: true,
      },
    };
  });
}

function buildAreaPolygons(
  areas: DesignArea[],
  viewport: DesignViewport,
): ScenePolygon[] {
  return areas.map((area) => {
    const points = toScreenPolygon(area.polygon, viewport);
    const centre = worldToScreen(polygonCentre(area.polygon), viewport);
    const fill = area.colour || UPDATE_AREA_FILL[area.kind] || UPDATE_AREA_FILL.other;

    return {
      id: area.id,
      kind: 'area' as const,
      points,
      fill,
      fillOpacity: 0.35,
      stroke: fill,
      strokeWidth: 2,
      dash: '8 5',
      label: {
        id: `${area.id}-label`,
        text: area.name,
        position: { x: centre.x, y: centre.y },
        colour: '#334155',
        size: 10,
        weight: 600,
        anchor: 'middle' as const,
        halo: true,
      },
    };
  });
}

/**
 * Places a zone reference at the zone's top-left corner rather than its centre.
 *
 * Rooms put their name in the middle and devices are usually dropped near the middle too, so a
 * centroid label lands on top of both. The corner is the one part of a fire compartment that is
 * reliably empty, and anchoring there keeps the reference readable next to the fill it belongs to.
 */
function placeZoneLabel(
  points: ScreenPoint[],
  text: string,
  colour: string,
  viewport: DesignViewport,
): SceneLabel {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const inset = 7;

  return {
    id: 'zone-label',
    text,
    position: {
      x: Math.min(Math.max(Math.min(...xs) + inset, inset), viewport.width - inset),
      y: Math.min(Math.max(Math.min(...ys) + inset + ZONE_LABEL_FONT_SIZE, inset + ZONE_LABEL_FONT_SIZE), viewport.height - inset),
    },
    colour,
    size: ZONE_LABEL_FONT_SIZE,
    weight: 700,
    anchor: 'start',
    halo: true,
  };
}

function buildZonePolygons(
  zones: DesignZone[],
  viewport: DesignViewport,
  floorId: string,
): ScenePolygon[] {
  // Plates are drawn before the compartments nested inside them, so a shaft paints on top rather
  // than being hidden by the floor it passes through.
  return zonesInDrawOrder(zones, floorId).flatMap((zone) => {
    const regions = zoneRegions(zone);
    // Nested compartments are holes in this one's fill, so the two never read as one area.
    const holes = childRegionsOnFloor(zones, zone, floorId).map((region) =>
      toScreenPolygon(region, viewport),
    );
    let largest = 0;

    regions.forEach((region, index) => {
      if (polygonArea(region) > polygonArea(regions[largest] ?? [])) {
        largest = index;
      }
    });

    return regions.map((region, index) => {
      const points = toScreenPolygon(region, viewport);

      return {
        id: `${zone.id}::${index}`,
        zoneId: zone.id,
        kind: 'zone' as const,
        points,
        holes: holes.length > 0 ? holes : undefined,
        fill: zone.colour,
        fillOpacity: zone.opacity,
        stroke: zone.colour,
        strokeWidth: 2.4,
        label:
          index === largest
            ? placeZoneLabel(
                points,
                `${zone.reference} · ${zone.name}`,
                darkenColour(zone.colour, 0.42),
                viewport,
              )
            : null,
      };
    });
  });
}

function buildSceneDevices(
  devices: DesignDevice[],
  viewport: DesignViewport,
  selectedDeviceId: string | null,
): SceneDevice[] {
  return devices
    .map((device) => {
      const size = Math.max(
        MIN_DEVICE_SYMBOL_PIXELS,
        Math.min(MAX_DEVICE_SYMBOL_PIXELS, DEVICE_SYMBOL_PIXELS),
      );
      const centre = worldToScreen(device.position, viewport);
      const definition = getDeviceDefinition(device.kind);
      const colour = getDeviceColour(device.kind);

      return {
        deviceId: device.id,
        kind: device.kind,
        definition,
        symbol: { x: centre.x - size / 2, y: centre.y - size / 2, size },
        centre,
        colour,
        glyph: definition.glyph,
        primitives: getSymbolPrimitives(device.kind),
        label: placeDeviceLabel(centre, size, getDeviceLabel(device), viewport),
        zoneId: device.zoneId,
        mounting: device.mounting,
        selected: device.id === selectedDeviceId,
      } satisfies SceneDevice;
    })
    .sort((left, right) => left.centre.y - right.centre.y);
}

/** Counts how many devices on this floor sit inside each zone. */
export function countDevicesPerZone(devices: DesignDevice[], zones: DesignZone[]): Map<string, number> {
  const counts = new Map<string, number>();
  zones.forEach((zone) => counts.set(zone.id, 0));

  devices.forEach((device) => {
    const owner =
      (device.zoneId && zones.find((zone) => zone.id === device.zoneId)) ||
      zones.find((zone) =>
        zoneRegions(zone).some((region) => pointInPolygon(device.position, region)),
      );

    if (!owner) {
      return;
    }

    counts.set(owner.id, (counts.get(owner.id) ?? 0) + 1);
  });

  return counts;
}

function buildDeviceLegend(devices: DesignDevice[]): SceneLegendDevice[] {
  const counts = new Map<string, number>();
  devices.forEach((device) => counts.set(device.kind, (counts.get(device.kind) ?? 0) + 1));

  const ordered: SceneLegendDevice[] = [];

  DESIGN_DEVICE_CATALOGUE.forEach((definition) => {
    const count = counts.get(definition.kind) ?? 0;

    if (count === 0) {
      return;
    }

    ordered.push({
      kind: definition.kind,
      label: definition.label,
      glyph: definition.glyph,
      colour: getDeviceCategory(definition.category).colour,
      count,
      standardReference: definition.standardReference,
    });
  });

  counts.forEach((count, kind) => {
    if (DESIGN_DEVICE_CATALOGUE.some((definition) => definition.kind === kind)) {
      return;
    }

    const definition = getDeviceDefinition(kind);

    ordered.push({
      kind,
      label: definition.label,
      glyph: definition.glyph,
      colour: getDeviceColour(kind),
      count,
      standardReference: definition.standardReference,
    });
  });

  return ordered;
}

function buildZoneLegend(
  allZones: DesignZone[],
  floorZones: DesignZone[],
  counts: Map<string, number>,
): SceneLegendZone[] {
  return floorZones.map((zone) => {
    const parent = zone.parentZoneId
      ? allZones.find((candidate) => candidate.id === zone.parentZoneId) ?? null
      : null;

    return {
      zoneId: zone.id,
      reference: zone.reference,
      name: zone.name,
      colour: zone.colour,
      deviceCount: counts.get(zone.id) ?? 0,
      // Net of any shaft nested inside, so the legend never double counts the same square metre.
      areaSquareMeters: zoneNetAreaSquareMeters(allZones, zone),
      floorCount: 1 + (Array.isArray(zone.spansFloorIds) ? zone.spansFloorIds.length : 0),
      nestedInReference: parent?.reference ?? null,
    };
  });
}

/**
 * Bounds of the whole building, across every floor, plus a margin so labels beside a corner
 * device are not clipped. Fitting every floor to the same box is what keeps storeys aligned.
 */
export function computeDesignBounds(design: BuildingDesign, marginMeters = 0.75): PolygonBounds {
  const polygons: DesignPolygon[] = [];

  design.floors.forEach((floor) => {
    floor.rooms.forEach((room) => polygons.push(room.polygon));
  });
  design.areas.forEach((area) => polygons.push(area.polygon));
  design.zones.forEach((zone) => zoneRegions(zone).forEach((region) => polygons.push(region)));

  const bounds = boundsOfPolygons(polygons);

  design.devices.forEach((device) => {
    bounds.minX = Math.min(bounds.minX, device.position.x);
    bounds.maxX = Math.max(bounds.maxX, device.position.x);
    bounds.minY = Math.min(bounds.minY, device.position.y);
    bounds.maxY = Math.max(bounds.maxY, device.position.y);
  });

  if (!Number.isFinite(bounds.minX) || bounds.maxX - bounds.minX <= 0 || bounds.maxY - bounds.minY <= 0) {
    return polygonBoundsForEmptyDesign();
  }

  return {
    minX: bounds.minX - marginMeters,
    maxX: bounds.maxX + marginMeters,
    minY: bounds.minY - marginMeters,
    maxY: bounds.maxY + marginMeters,
  };
}

function polygonBoundsForEmptyDesign(): PolygonBounds {
  const outline = polygonFromRect({ minX: 0, minY: 0, maxX: 12, maxY: 9 });

  return boundsOfPolygons([outline]);
}

/** Floor bounds only, used when the editor is showing a single storey in isolation. */
export function computeFloorBounds(floor: DesignFloor | null, devices: DesignDevice[]): PolygonBounds {
  const polygons = floor ? floor.rooms.map((room) => room.polygon) : [];
  const bounds = boundsOfPolygons(polygons);

  devices.forEach((device) => {
    bounds.minX = Math.min(bounds.minX, device.position.x);
    bounds.maxX = Math.max(bounds.maxX, device.position.x);
    bounds.minY = Math.min(bounds.minY, device.position.y);
    bounds.maxY = Math.max(bounds.maxY, device.position.y);
  });

  if (!Number.isFinite(bounds.minX) || bounds.maxX - bounds.minX <= 0 || bounds.maxY - bounds.minY <= 0) {
    return polygonBoundsForEmptyDesign();
  }

  return bounds;
}

/**
 * Builds everything needed to draw one floor. `floorId` of null produces an empty scene on the
 * building's own transform, which is what the editor shows before the first floor exists.
 */
export function buildFloorScene(
  design: BuildingDesign,
  floorId: string | null,
  options: BuildSceneOptions = {},
): FloorScene {
  const bounds = options.fitAllFloors === false
    ? computeFloorBounds(
        design.floors.find((floor) => floor.id === floorId) ?? null,
        design.devices.filter((device) => device.floorId === floorId),
      )
    : computeDesignBounds(design);

  const viewport = createViewport(bounds, options);
  const floor = design.floors.find((entry) => entry.id === floorId) ?? null;

  const floorDevices = design.devices.filter((device) => device.floorId === floorId);
  // Vertical compartments reach here from the storey they were drawn on, so this is the only
  // correct way to ask what is zoned on a floor.
  const floorZones = floorId ? zonesOnFloor(design.zones, floorId) : [];
  const floorAreas = design.areas.filter((area) => area.floorId === floorId);

  const zoneDeviceCounts = countDevicesPerZone(floorDevices, floorZones);
  const zonePolygons = buildZonePolygons(design.zones, viewport, floorId ?? '');
  const roomPolygons = floor ? buildRoomPolygons(floor, viewport) : [];
  const areaPolygons = buildAreaPolygons(floorAreas, viewport);
  const devices = buildSceneDevices(floorDevices, viewport, options.selectedDeviceId ?? null);

  const roomLabels = roomPolygons
    .map((polygon) => polygon.label)
    .filter((label): label is SceneLabel => label !== null);
  const areaLabels = areaPolygons
    .map((polygon) => polygon.label)
    .filter((label): label is SceneLabel => label !== null);
  // Zone references are drawn above rooms so a zone fill never hides its own key.
  const zoneLabels = zonePolygons
    .map((polygon) => polygon.label)
    .filter((label): label is SceneLabel => label !== null);

  const assigned = new Set<string>();
  zoneDeviceCounts.forEach((count, zoneId) => {
    if (count > 0) {
      assigned.add(zoneId);
    }
  });

  const unassignedDeviceCount = floorDevices.filter((device) => {
    const owner =
      (device.zoneId && floorZones.find((zone) => zone.id === device.zoneId)) ||
      floorZones.find((zone) =>
        zoneRegions(zone).some((region) => pointInPolygon(device.position, region)),
      );

    return !owner;
  }).length;

  return {
    floorId,
    floorName: floor?.name ?? 'No floor selected',
    viewport,
    rooms: roomPolygons,
    areas: areaPolygons,
    zones: zonePolygons,
    devices,
    labels: [...roomLabels, ...areaLabels, ...zoneLabels, ...devices.map((device) => device.label)],
    deviceLegend: buildDeviceLegend(floorDevices),
    zoneLegend: buildZoneLegend(design.zones, floorZones, zoneDeviceCounts),
    areaLegend: floorAreas.map((area) => ({
      areaId: area.id,
      name: area.name,
      kind: area.kind,
      colour: area.colour || UPDATE_AREA_FILL[area.kind] || UPDATE_AREA_FILL.other,
    })),
    stats: {
      roomCount: floor?.rooms.length ?? 0,
      deviceCount: floorDevices.length,
      zoneCount: floorZones.length,
      floorAreaSquareMeters: floor
        ? floor.rooms.reduce((total, room) => total + polygonArea(room.polygon), 0)
        : 0,
    },
    unassignedDeviceCount,
  };
}

/** Category order used by the legend so detection always prints before site features. */
export function orderedCategories(): typeof DESIGN_DEVICE_CATEGORIES {
  return DESIGN_DEVICE_CATEGORIES;
}

/** Total device count across every floor, used by the designs list. */
export function countDesignDevices(design: BuildingDesign): number {
  return design.devices.length;
}

/** Every device kind actually placed anywhere in the design. */
export function designDeviceKinds(design: BuildingDesign): string[] {
  return Array.from(new Set(design.devices.map((device) => device.kind))).sort();
}

/** Nearest device to a world point, within a tolerance in metres. */
export function findDeviceAtPoint(
  devices: DesignDevice[],
  point: DesignPoint,
  toleranceMeters: number,
): DesignDevice | null {
  let best: DesignDevice | null = null;
  let bestDistance = toleranceMeters;

  devices.forEach((device) => {
    const distance = Math.hypot(device.position.x - point.x, device.position.y - point.y);

    if (distance <= bestDistance) {
      bestDistance = distance;
      best = device;
    }
  });

  return best;
}

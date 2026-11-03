import { DEFAULT_SHEET, createZone } from './defaults';
import { normalisePolygon, polygonArea } from './geometry';
import { zoneFloorIds } from './zones';
import { clampOpacity } from './palette';
import { DESIGN_SCHEMA_VERSION } from './types';
import type {
  BuildingDesign,
  DesignArea,
  DesignAreaKind,
  DesignDevice,
  DesignFloor,
  DesignFloorKind,
  DesignMounting,
  DesignPoint,
  DesignPolygon,
  DesignRoom,
  DesignSheet,
  DesignZone,
} from './types';

/**
 * Validates a design that arrived from the network or came back out of a JSON column.
 *
 * Nothing here is trusted: the mobile app publishes designs, the hosted editor saves them, and a
 * stored record can predate a schema change. Anything structurally unusable is dropped rather
 * than rejected, so a corrupt device cannot stop the rest of a building from opening.
 */

export const MAX_DESIGN_BYTES = 6_000_000;
export const MAX_FLOORS = 40;
export const MAX_ROOMS = 400;
export const MAX_ZONES = 400;
export const MAX_DEVICES = 4000;
export const MAX_AREAS = 200;
export const MAX_POLYGON_POINTS = 400;
export const MAX_LABEL_LENGTH = 160;
export const MAX_NOTES_LENGTH = 2000;

const FLOOR_KINDS: DesignFloorKind[] = ['ground', 'upper', 'basement', 'mezzanine', 'external'];
const MOUNTINGS: DesignMounting[] = ['ceiling', 'ceiling_void', 'wall', 'floor', 'external'];
const AREA_KINDS: DesignAreaKind[] = [
  'car_park',
  'compound',
  'yard',
  'bin_store',
  'plant',
  'canopy',
  'loading_bay',
  'garden',
  'other',
];

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, limit = MAX_LABEL_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readId(value: unknown, prefix: string, index: number): string {
  const raw = typeof value === 'string' ? value.trim() : '';

  return raw ? raw.slice(0, 120) : `${prefix}-${index}`;
}

function readPolygon(value: unknown): DesignPolygon {
  if (!Array.isArray(value) || value.length > MAX_POLYGON_POINTS) {
    return [];
  }

  const points = value.filter(
    (point): point is DesignPoint =>
      isRecord(point) &&
      typeof point.x === 'number' &&
      Number.isFinite(point.x) &&
      typeof point.y === 'number' &&
      Number.isFinite(point.y),
  );

  return normalisePolygon(points.map((point) => ({ x: point.x, y: point.y })));
}

function readColour(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOUR.test(value) ? value : fallback;
}

function readSheet(value: unknown): DesignSheet {
  const record = isRecord(value) ? value : {};

  return {
    title: readString(record.title) || DEFAULT_SHEET.title,
    siteName: readString(record.siteName),
    siteAddress: readString(record.siteAddress, 400),
    jobReference: readString(record.jobReference),
    revision: readString(record.revision) || DEFAULT_SHEET.revision,
    preparedBy: readString(record.preparedBy),
    preparedOn: readString(record.preparedOn),
    companyName: readString(record.companyName),
    companyPhone: readString(record.companyPhone),
    companyEmail: readString(record.companyEmail, 320),
    accreditation: readString(record.accreditation),
    notes: readString(record.notes, MAX_NOTES_LENGTH),
    scaleNote: readString(record.scaleNote),
    showZoneLegend: readBoolean(record.showZoneLegend, true),
    showDeviceLegend: readBoolean(record.showDeviceLegend, true),
    showGrid: readBoolean(record.showGrid, true),
  };
}

function readRooms(value: unknown): DesignRoom[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_ROOMS).reduce<DesignRoom[]>((rooms, entry, index) => {
    if (!isRecord(entry)) {
      return rooms;
    }

    const polygon = readPolygon(entry.polygon);

    if (polygonArea(polygon) <= 0) {
      return rooms;
    }

    rooms.push({
      id: readId(entry.id, 'room', index),
      name: readString(entry.name) || `Room ${index + 1}`,
      polygon,
      open: readBoolean(entry.open, false),
      notes: readString(entry.notes, MAX_NOTES_LENGTH) || null,
    });

    return rooms;
  }, []);
}

function readFloorKind(value: unknown, level: number): DesignFloorKind {
  return FLOOR_KINDS.includes(value as DesignFloorKind)
    ? (value as DesignFloorKind)
    : level === 0
      ? 'ground'
      : level > 0
        ? 'upper'
        : 'basement';
}

function readFloors(value: unknown): DesignFloor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_FLOORS).reduce<DesignFloor[]>((floors, entry, index) => {
    if (!isRecord(entry)) {
      return floors;
    }

    const level = Math.round(readNumber(entry.level, index));

    floors.push({
      id: readId(entry.id, 'floor', index),
      name: readString(entry.name) || (level === 0 ? 'Ground floor' : `Floor ${level}`),
      kind: readFloorKind(entry.kind, level),
      level,
      elevationMeters: readNumber(entry.elevationMeters, level * 2.7),
      heightMeters: Math.min(Math.max(readNumber(entry.heightMeters, 2.7), 1.8), 12),
      rooms: readRooms(entry.rooms),
      sourceSessionId: readString(entry.sourceSessionId) || null,
      manual: readBoolean(entry.manual, true),
      notes: readString(entry.notes, MAX_NOTES_LENGTH) || null,
    });

    return floors;
  }, []);
}

function readZones(value: unknown, floorIds: Set<string>): DesignZone[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_ZONES).reduce<DesignZone[]>((zones, entry, index) => {
    if (!isRecord(entry)) {
      return zones;
    }

    const floorId = readString(entry.floorId);

    if (!floorIds.has(floorId)) {
      return zones;
    }

    // Designs saved before zones became multi-region carry a single `polygon`; reading it as a
    // one-region zone keeps every stored plan openable.
    const legacy = (entry as { polygon?: unknown }).polygon;
    const rawRegions = Array.isArray(entry.regions) ? entry.regions : [legacy];
    const regions = rawRegions
      .map((region) => readPolygon(region))
      .filter((region) => polygonArea(region) > 0);

    if (regions.length === 0) {
      return zones;
    }

    // Only storeys that exist, never the zone's own, and never the same storey twice.
    const spansFloorIds = Array.isArray(entry.spansFloorIds)
      ? Array.from(
          new Set(
            entry.spansFloorIds
              .filter((id): id is string => typeof id === 'string')
              .map((id) => id.trim())
              .filter((id) => id && id !== floorId && floorIds.has(id)),
          ),
        ).slice(0, MAX_FLOORS)
      : [];

    zones.push({
      id: readId(entry.id, 'zone', index),
      floorId,
      name: readString(entry.name) || `Zone ${index + 1}`,
      reference: readString(entry.reference) || `Z${index + 1}`,
      colour: readColour(entry.colour, '#F97316'),
      opacity: clampOpacity(readNumber(entry.opacity, 0.22)),
      regions,
      spansFloorIds,
      parentZoneId: readString(entry.parentZoneId) || null,
      notes: readString(entry.notes, MAX_NOTES_LENGTH) || null,
    });

    return zones;
  }, []);
}

/**
 * Clears any nesting that does not make sense: a missing parent, a parent on another storey, or a
 * chain that loops back on itself. A design sent by a client is untrusted, and a cycle would make
 * depth, area and draw order non-terminating.
 */
function linkZoneParents(zones: DesignZone[]): DesignZone[] {
  const byId = new Map(zones.map((zone) => [zone.id, zone]));

  const resolves = (zone: DesignZone): string | null => {
    let parentId = zone.parentZoneId;

    if (!parentId || parentId === zone.id) {
      return null;
    }

    const parent = byId.get(parentId);

    if (!parent) {
      return null;
    }

    const sharesFloor = zoneFloorIds(zone).some((floorId) => zoneFloorIds(parent).includes(floorId));

    if (!sharesFloor) {
      return null;
    }

    const seen = new Set<string>([zone.id]);
    let cursor: DesignZone | undefined = parent;
    let guard = 0;

    while (cursor && guard < 32) {
      if (seen.has(cursor.id)) {
        return null;
      }

      seen.add(cursor.id);
      cursor = cursor.parentZoneId ? byId.get(cursor.parentZoneId) : undefined;
      guard += 1;
    }

    return parentId;
  };

  return zones.map((zone) => {
    const parentZoneId = resolves(zone);

    return parentZoneId === zone.parentZoneId ? zone : { ...zone, parentZoneId };
  });
}

function readAreas(value: unknown, floorIds: Set<string>): DesignArea[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_AREAS).reduce<DesignArea[]>((areas, entry, index) => {
    if (!isRecord(entry)) {
      return areas;
    }

    const floorId = readString(entry.floorId);

    if (!floorIds.has(floorId)) {
      return areas;
    }

    const polygon = readPolygon(entry.polygon);

    if (polygonArea(polygon) <= 0) {
      return areas;
    }

    const kind = AREA_KINDS.includes(entry.kind as DesignAreaKind)
      ? (entry.kind as DesignAreaKind)
      : 'other';

    areas.push({
      id: readId(entry.id, 'area', index),
      floorId,
      kind,
      name: readString(entry.name) || 'Area',
      colour: readColour(entry.colour, '#CBD5E1'),
      polygon,
      notes: readString(entry.notes, MAX_NOTES_LENGTH) || null,
    });

    return areas;
  }, []);
}

function readDevices(
  value: unknown,
  floorIds: Set<string>,
  zoneIds: Set<string>,
): DesignDevice[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_DEVICES).reduce<DesignDevice[]>((devices, entry, index) => {
    if (!isRecord(entry)) {
      return devices;
    }

    const floorId = readString(entry.floorId);

    if (!floorIds.has(floorId)) {
      return devices;
    }

    const position = isRecord(entry.position) ? entry.position : null;

    if (
      !position ||
      typeof position.x !== 'number' ||
      !Number.isFinite(position.x) ||
      typeof position.y !== 'number' ||
      !Number.isFinite(position.y)
    ) {
      return devices;
    }

    const zoneId = readString(entry.zoneId);

    devices.push({
      id: readId(entry.id, 'dev', index),
      floorId,
      kind: readString(entry.kind) || 'interface',
      label: readString(entry.label),
      position: { x: position.x, y: position.y },
      mounting: MOUNTINGS.includes(entry.mounting as DesignMounting)
        ? (entry.mounting as DesignMounting)
        : 'wall',
      zoneId: zoneIds.has(zoneId) ? zoneId : null,
      rotation: readNumber(entry.rotation, 0) % 360,
      address: readString(entry.address) || null,
      notes: readString(entry.notes, MAX_NOTES_LENGTH) || null,
      fromCapture: readBoolean(entry.fromCapture, false),
    });

    return devices;
  }, []);
}

/** Builds a valid design from arbitrary JSON, or null when nothing usable is present. */
export function sanitiseDesign(value: unknown): BuildingDesign | null {
  if (!isRecord(value)) {
    return null;
  }

  const floors = readFloors(value.floors);

  if (floors.length === 0) {
    return null;
  }

  const floorIds = new Set(floors.map((floor) => floor.id));
  const zones = linkZoneParents(readZones(value.zones, floorIds));
  const zoneIds = new Set(zones.map((zone) => zone.id));

  return {
    id: readString(value.id) || 'design',
    name: readString(value.name) || 'Untitled design',
    sourceSessionId: readString(value.sourceSessionId) || null,
    floors,
    zones,
    devices: readDevices(value.devices, floorIds, zoneIds),
    areas: readAreas(value.areas, floorIds),
    sheet: readSheet(value.sheet),
    version: DESIGN_SCHEMA_VERSION,
  };
}

/** Single floor, used by the mobile publish route when a scan only covered one storey. */
export function sanitiseFloor(value: unknown): DesignFloor | null {
  const floors = readFloors([value]);

  return floors[0] ?? null;
}

/** Re-exports the zone factory so callers validating a design do not import two modules. */
export { createZone };

import type {
  FireAlarmDeviceDetection,
  FireAlarmDevicePoint,
  FireAlarmFloorplanRoom,
  FireAlarmScanSession,
} from '@/mobile/modules/fire-alarm-roomplan/types';
import type { Plan3DZone } from '@/mobile/modules/fire-alarm-roomplan/plan3d/plan3d-types';

import { createDevice, createEmptyDesign, createFloor, createRoomId, createZone } from './defaults';
import { zoneRegions } from './zones';
import {
  boundsOfPoints,
  normalisePolygon,
  pointInPolygon,
  polygonArea,
  polygonFromRect,
} from './geometry';
import type {
  BuildingDesign,
  DesignDevice,
  DesignFloorKind,
  DesignMounting,
  DesignPoint,
  DesignPolygon,
  DesignRoom,
  DesignZone,
} from './types';

/**
 * Turns a captured RoomPlan session into a multi-floor design.
 *
 * `level` on every captured room is what makes multi-floor work: a session that covered several
 * storeys already contains the storey of each room, it was simply never read. Rooms are grouped
 * by level, each group becomes a floor, and a captured device is placed on the floor owning its
 * room.
 *
 * Re-importing a session replaces the geometry of the floors that came from it and keeps anything
 * drawn by hand — zones, external areas and edited device labels survive a re-scan.
 */

const FEET_TO_METERS = 0.3048;
const DEFAULT_STOREY_HEIGHT_METERS = 2.7;
const FALLBACK_ROOM_AREA_SQUARE_METERS = 12;

/** Devices with no captured position are spread on a lattice inside their room. */
const FALLBACK_INSET_RATIO = 0.2;

export interface CaptureFloorGroup {
  level: number;
  floorHeightMeters: number;
  rooms: FireAlarmFloorplanRoom[];
}

function resolveCoordinateScale(session: FireAlarmScanSession): number {
  return session.floorplan?.units === 'feet' ? FEET_TO_METERS : 1;
}

function toMeters(point: FireAlarmDevicePoint, scale: number): DesignPoint {
  return { x: point.x * scale, y: point.y * scale };
}

function floorKindForLevel(level: number): DesignFloorKind {
  if (level === 0) {
    return 'ground';
  }

  return level > 0 ? 'upper' : 'basement';
}

function roomPolygon(room: FireAlarmFloorplanRoom, scale: number): DesignPolygon {
  const outline = room.outline ?? [];
  const polygon = normalisePolygon(outline.map((point) => toMeters(point, scale)));

  if (polygon.length >= 3) {
    return polygon;
  }

  // A room can arrive with an area but no outline. A rectangle of the same area keeps the floor
  // readable instead of dropping the room, and the surveyor can redraw it.
  const area = room.areaSquareMeters;
  const usableArea =
    typeof area === 'number' && area > 1 ? area : FALLBACK_ROOM_AREA_SQUARE_METERS;
  const width = Math.sqrt(usableArea);

  return polygonFromRect({ minX: 0, minY: 0, maxX: width, maxY: usableArea / width });
}

/** Highest wall height reported for a room, which becomes the floor's storey height. */
function roomHeightMeters(room: FireAlarmFloorplanRoom, scale: number): number | null {
  const heights = (room.wallSegments ?? [])
    .map((segment) => segment.height)
    .filter(
      (height): height is number =>
        typeof height === 'number' && Number.isFinite(height) && height > 1,
    )
    .map((height) => height * scale);

  if (heights.length === 0) {
    return null;
  }

  return Math.max(...heights);
}

/** Groups a session's rooms by the storey they were captured on. */
export function groupCaptureFloors(session: FireAlarmScanSession): CaptureFloorGroup[] {
  const scale = resolveCoordinateScale(session);
  const rooms = session.floorplan?.rooms ?? [];
  const groups = new Map<number, CaptureFloorGroup>();

  rooms.forEach((room) => {
    const level =
      typeof room.level === 'number' && Number.isFinite(room.level) ? Math.round(room.level) : 0;
    const existing = groups.get(level);

    if (existing) {
      existing.rooms.push(room);
      existing.floorHeightMeters = Math.max(
        existing.floorHeightMeters,
        roomHeightMeters(room, scale) ?? existing.floorHeightMeters,
      );

      return;
    }

    groups.set(level, {
      level,
      floorHeightMeters: roomHeightMeters(room, scale) ?? DEFAULT_STOREY_HEIGHT_METERS,
      rooms: [room],
    });
  });

  if (groups.size === 0) {
    groups.set(0, { level: 0, floorHeightMeters: DEFAULT_STOREY_HEIGHT_METERS, rooms: [] });
  }

  return Array.from(groups.values()).sort((left, right) => left.level - right.level);
}

/**
 * Maps a captured detection onto the design catalogue.
 *
 * RoomPlan only distinguishes a handful of object classes, so the mapping is deliberately coarse:
 * anything it calls a detector becomes the generic optical smoke detector and the surveyor picks
 * the real type in the inspector.
 */
export function mapCapturedDeviceKind(device: FireAlarmDeviceDetection): string {
  const declared = device.metadata?.deviceKind ?? device.metadata?.designKind;

  if (typeof declared === 'string' && declared.trim()) {
    return declared.trim();
  }

  switch (device.type) {
    case 'detector':
      return 'smoke_optical';
    case 'sounder':
      return 'sounder';
    case 'vad':
      return 'vad';
    case 'panel':
      return 'panel';
    case 'interface':
      return 'interface';
    case 'io_unit':
      return 'io_unit';
    default:
      return 'interface';
  }
}

function mapCapturedMounting(device: FireAlarmDeviceDetection): DesignMounting | undefined {
  const declared = device.metadata?.mounting;

  if (
    declared === 'ceiling' ||
    declared === 'ceiling_void' ||
    declared === 'wall' ||
    declared === 'floor'
  ) {
    return declared;
  }

  return undefined;
}

/** Lattice position for a device the capture could not locate, inside its room outline. */
function latticePosition(polygon: DesignPolygon, index: number, count: number): DesignPoint {
  const bounds =
    polygon.length >= 3
      ? boundsOfPoints(polygon)
      : boundsOfPoints(polygonFromRect({ minX: 0, minY: 0, maxX: 4, maxY: 4 }));

  const insetX = (bounds.maxX - bounds.minX) * FALLBACK_INSET_RATIO;
  const insetY = (bounds.maxY - bounds.minY) * FALLBACK_INSET_RATIO;
  const spanX = Math.max(bounds.maxX - bounds.minX - insetX * 2, 0.1);
  const spanY = Math.max(bounds.maxY - bounds.minY - insetY * 2, 0.1);
  const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(count, 1))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: bounds.minX + insetX + (spanX * (column + 1)) / (columns + 1),
    y: bounds.minY + insetY + (spanY * (row + 1)) / (rows + 1),
  };
}

function buildRooms(
  group: CaptureFloorGroup,
  scale: number,
): { rooms: DesignRoom[]; roomIdByCaptureId: Map<string, string> } {
  const roomIdByCaptureId = new Map<string, string>();

  const rooms = group.rooms.map((room, index) => {
    const id = createRoomId();

    if (room.id) {
      roomIdByCaptureId.set(room.id, id);
    }

    return {
      id,
      name: room.name?.trim() || `Room ${index + 1}`,
      polygon: roomPolygon(room, scale),
      open: false,
      notes: null,
    } satisfies DesignRoom;
  });

  return { rooms, roomIdByCaptureId };
}

function buildCapturedDevices(
  session: FireAlarmScanSession,
  group: CaptureFloorGroup,
  floorId: string,
  rooms: DesignRoom[],
  roomIdByCaptureId: Map<string, string>,
  previousDevices: DesignDevice[],
): DesignDevice[] {
  const scale = resolveCoordinateScale(session);
  const capturedRoomIds = new Set(group.rooms.map((room) => room.id));

  const devicesOnFloor = (session.devices ?? []).filter((device) => {
    if (!device.roomId) {
      // A device with no room belongs to whichever storey has the capture's origin.
      return group.level === Math.min(...groupCaptureLevels(session));
    }

    return capturedRoomIds.has(device.roomId);
  });

  return devicesOnFloor.map((device, index) => {
    const designRoomId = device.roomId ? roomIdByCaptureId.get(device.roomId) ?? null : null;
    const room = rooms.find((candidate) => candidate.id === designRoomId) ?? rooms[0] ?? null;
    const previous = previousDevices.find((candidate) => candidate.id === device.id);
    const location = device.location;

    const position =
      location && Number.isFinite(location.x) && Number.isFinite(location.y)
        ? toMeters(location, scale)
        : latticePosition(room?.polygon ?? [], index, devicesOnFloor.length);

    return createDevice({
      floorId,
      kind: mapCapturedDeviceKind(device),
      // A re-import keeps whatever label the surveyor already typed for this device.
      label: previous?.label ?? device.label?.trim() ?? '',
      position,
      mounting: mapCapturedMounting(device),
      zoneId: previous?.zoneId ?? null,
      fromCapture: true,
    });
  });
}

function groupCaptureLevels(session: FireAlarmScanSession): number[] {
  const levels = (session.floorplan?.rooms ?? [])
    .map((room) => (typeof room.level === 'number' ? Math.round(room.level) : 0))
    .filter((level) => Number.isFinite(level));

  return levels.length > 0 ? levels : [0];
}

/** One zone per captured room, so a fresh design arrives already colour coded. */
function buildRoomZones(
  floorId: string,
  rooms: DesignRoom[],
  existingZones: DesignZone[],
): DesignZone[] {
  return rooms.reduce<DesignZone[]>((zones, room) => {
    if (polygonArea(room.polygon) <= 0) {
      return zones;
    }

    zones.push(
      createZone({
        floorId,
        regions: [room.polygon],
        existing: [...existingZones, ...zones],
        name: room.name,
      }),
    );

    return zones;
  }, []);
}

/** Seals each device into the first zone that contains it. */
function assignDevicesToZones(devices: DesignDevice[], zones: DesignZone[]): DesignDevice[] {
  return devices.map((device) => {
    if (device.zoneId && zones.some((zone) => zone.id === device.zoneId)) {
      return device;
    }

    const owner = zones.find((zone) =>
      zoneRegions(zone).some((region) => pointInPolygon(device.position, region)),
    );

    return owner ? { ...device, zoneId: owner.id } : device;
  });
}

/**
 * Adopts zones the surveyor drew on the phone.
 *
 * The phone's 3D plan editor produces the same polygon a design zone holds, minus the storey
 * binding, so publishing a design with zones replaces the auto-generated room zones on those
 * storeys with what was actually drawn. Devices are re-sealed afterwards, so a detector that was
 * inside a room zone ends up inside the drawn compartment that contains it.
 */
export function adoptCaptureZones(
  design: BuildingDesign,
  captureZones: Plan3DZone[] | null | undefined,
): BuildingDesign {
  if (!Array.isArray(captureZones) || captureZones.length === 0) {
    return design;
  }

  const adopted: DesignZone[] = [];
  const replacedFloorIds = new Set<string>();

  captureZones.forEach((zone) => {
    if (!zone || !Array.isArray(zone.polygon) || zone.polygon.length < 3) {
      return;
    }

    const level = typeof zone.level === 'number' ? Math.round(zone.level) : 0;
    const floor = design.floors.find((candidate) => candidate.level === level);

    if (!floor) {
      return;
    }

    const created = createZone({
      floorId: floor.id,
      regions: [zone.polygon.map((point) => ({ x: point.x, y: point.y }))],
      existing: [...design.zones, ...adopted],
      name: typeof zone.name === 'string' ? zone.name : undefined,
      reference: typeof zone.reference === 'string' ? zone.reference : undefined,
      colour: typeof zone.colour === 'string' ? zone.colour : undefined,
    });

    adopted.push({
      ...created,
      notes: typeof zone.notes === 'string' && zone.notes.trim() ? zone.notes.trim() : null,
    });
    replacedFloorIds.add(floor.id);
  });

  if (adopted.length === 0) {
    return design;
  }

  const zones = [
    ...design.zones.filter((zone) => !replacedFloorIds.has(zone.floorId)),
    ...adopted,
  ];
  const devices = assignDevicesToZones(
    design.devices.map((device) =>
      replacedFloorIds.has(device.floorId) ? { ...device, zoneId: null } : device,
    ),
    zones,
  );

  return { ...design, zones, devices };
}

/**
 * Imports (or re-imports) a captured session into a design.
 *
 * Floors previously created from the same session are replaced in place, keeping their ids so the
 * currently selected floor and anything drawn on it survive a re-scan. Floors captured from a
 * different session are left untouched, which is what lets a multi-storey building be scanned one
 * storey at a time.
 */
export function importCaptureIntoDesign(
  design: BuildingDesign,
  session: FireAlarmScanSession,
): BuildingDesign {
  const groups = groupCaptureFloors(session);
  const scale = resolveCoordinateScale(session);

  const floors = [...design.floors];
  const zones = [...design.zones];
  const devices = design.devices.filter(
    (device) => !groups.some((group) => isFloorFromGroup(design, device.floorId, group.level, session.id)),
  );
  const areas = design.areas;

  groups.forEach((group) => {
    const existing =
      floors.find((floor) => floor.sourceSessionId === session.id && floor.level === group.level) ??
      floors.find(
        (floor) => floor.manual && floor.rooms.length === 0 && floor.level === group.level,
      ) ??
      null;

    const floorId = existing?.id;
    const floor =
      existing ??
      createFloor({
        level: group.level,
        kind: floorKindForLevel(group.level),
        heightMeters: group.floorHeightMeters,
        manual: false,
        sourceSessionId: session.id,
      });

    const { rooms, roomIdByCaptureId } = buildRooms(group, scale);
    const previousDevices = design.devices.filter((device) => device.floorId === floor.id);
    const capturedDevices = buildCapturedDevices(
      session,
      group,
      floor.id,
      rooms,
      roomIdByCaptureId,
      previousDevices,
    );

    const floorZones = zones.filter((zone) => zone.floorId === floor.id);
    const createdZones =
      floorZones.length === 0 ? buildRoomZones(floor.id, rooms, zones) : [];

    const settledDevices = assignDevicesToZones(capturedDevices, [
      ...floorZones,
      ...createdZones,
    ]);

    devices.push(...settledDevices);
    zones.push(...createdZones);

    const nextFloor = {
      ...floor,
      rooms,
      heightMeters: group.floorHeightMeters,
      sourceSessionId: session.id,
      manual: false,
    };

    const index = floors.findIndex((candidate) => candidate.id === floor.id);

    if (floorId && index >= 0) {
      floors[index] = nextFloor;
    } else {
      floors.push(nextFloor);
    }
  });

  return {
    ...design,
    sourceSessionId: design.sourceSessionId ?? session.id,
    floors: floors.sort((left, right) => left.level - right.level),
    zones,
    devices,
    areas,
  };
}

function isFloorFromGroup(
  design: BuildingDesign,
  floorId: string,
  level: number,
  sessionId: string,
): boolean {
  const floor = design.floors.find((candidate) => candidate.id === floorId);

  if (!floor) {
    return false;
  }

  return floor.level === level && floor.sourceSessionId === sessionId;
}

/** Creates a design from one captured session. */
export function createDesignFromCapture(
  session: FireAlarmScanSession,
  name?: string,
): BuildingDesign {
  const base = createEmptyDesign(
    name ??
      session.metadata.sessionName?.trim() ??
      session.floorplan?.rooms?.find((room) => room.name?.trim())?.name ??
      'Captured design',
  );

  return importCaptureIntoDesign(base, session);
}

/**
 * Creates a design from several sessions, which is how a building scanned floor by floor is
 * assembled: each session contributes its own storeys, keyed by the level it reported.
 */
export function createDesignFromCaptures(
  sessions: FireAlarmScanSession[],
  name?: string,
): BuildingDesign {
  const first = sessions[0];
  const base = createEmptyDesign(name ?? first?.metadata.sessionName?.trim() ?? 'Captured design');

  return sessions.reduce<BuildingDesign>(
    (design, session) => importCaptureIntoDesign(design, session),
    base,
  );
}

/** Levels present in a design, used by the floor switcher and by the mobile publish response. */
export function designLevels(design: BuildingDesign): number[] {
  return Array.from(new Set(design.floors.map((floor) => floor.level))).sort(
    (left, right) => left - right,
  );
}

import type {
  FireAlarmDeviceDetection,
  FireAlarmFloorplanRoom,
  FireAlarmScanSession,
} from '../types';

/**
 * Storey support for captured sessions.
 *
 * RoomPlan reports a `level` on every captured room, so a session that covered more than one
 * storey already contains everything needed to draw them separately — the plan generator simply
 * never read it. Grouping rooms by level here keeps that logic in one place, shared by the plan
 * generator, the hosted viewer and the design import.
 */

export interface Plan3DSessionFloor {
  /** Storey index as captured. Ground is 0, upper floors positive, basements negative. */
  level: number;
  name: string;
  roomCount: number;
  deviceCount: number;
}

export interface Plan3DFloorOptions {
  /** Draw only this storey. Omitted draws every storey at once. */
  level?: number | null;
}

export function readRoomLevel(room: FireAlarmFloorplanRoom): number {
  return typeof room.level === 'number' && Number.isFinite(room.level) ? Math.round(room.level) : 0;
}

/** Storeys present in a session, ordered bottom to top. */
export function resolveSessionLevels(session: FireAlarmScanSession): number[] {
  const levels = (session.floorplan?.rooms ?? []).map(readRoomLevel);

  return Array.from(new Set(levels.length > 0 ? levels : [0])).sort((left, right) => left - right);
}

const FLOOR_NAMES = [
  'Ground floor',
  'First floor',
  'Second floor',
  'Third floor',
  'Fourth floor',
  'Fifth floor',
];

export function describeLevel(level: number): string {
  if (level < 0) {
    return level === -1 ? 'Basement' : `Basement ${Math.abs(level)}`;
  }

  return FLOOR_NAMES[level] ?? `Floor ${level}`;
}

/** Summary of each captured storey, used by the viewer's floor tabs and by the design import. */
export function resolveSessionFloors(session: FireAlarmScanSession): Plan3DSessionFloor[] {
  const rooms = session.floorplan?.rooms ?? [];
  const devices = session.devices ?? [];
  const levels = resolveSessionLevels(session);
  const lowestLevel = levels[0] ?? 0;

  const roomIdsByLevel = new Map<number, Set<string>>();
  levels.forEach((level) => roomIdsByLevel.set(level, new Set()));

  rooms.forEach((room) => {
    roomIdsByLevel.get(readRoomLevel(room))?.add(room.id);
  });

  return levels.map((level) => {
    const roomIds = roomIdsByLevel.get(level) ?? new Set<string>();
    const deviceCount = devices.filter((device) => {
      if (!device.roomId) {
        // A device with no room cannot be placed on a storey; it belongs to the capture origin.
        return level === lowestLevel;
      }

      return roomIds.has(device.roomId);
    }).length;

    return {
      level,
      name: describeLevel(level),
      roomCount: roomIds.size,
      deviceCount,
    };
  });
}

function deviceBelongs(
  device: FireAlarmDeviceDetection,
  roomIds: Set<string>,
  isLowestLevel: boolean,
): boolean {
  if (!device.roomId) {
    return isLowestLevel;
  }

  return roomIds.has(device.roomId);
}

/**
 * Narrows a session to one storey.
 *
 * The returned session keeps its id and metadata so the zone plan and every other consumer still
 * recognise it; only the floorplan rooms and the devices belonging to those rooms are kept.
 */
export function filterSessionForLevel(
  session: FireAlarmScanSession,
  level: number,
): FireAlarmScanSession {
  const rooms = session.floorplan?.rooms ?? [];
  const scopedRooms = rooms.filter((room) => readRoomLevel(room) === level);

  if (scopedRooms.length === 0) {
    return session;
  }

  const roomIds = new Set(scopedRooms.map((room) => room.id));
  const isLowestLevel = level === (resolveSessionLevels(session)[0] ?? 0);
  const scopedDevices = (session.devices ?? []).filter((device) =>
    deviceBelongs(device, roomIds, isLowestLevel),
  );

  return {
    ...session,
    floorplan: session.floorplan
      ? {
          ...session.floorplan,
          rooms: scopedRooms,
          deviceCount: scopedDevices.length,
        }
      : session.floorplan,
    devices: scopedDevices,
  };
}

/** True when the session carries more than one storey, which is what turns floor tabs on. */
export function hasMultipleFloors(session: FireAlarmScanSession): boolean {
  return resolveSessionLevels(session).length > 1;
}

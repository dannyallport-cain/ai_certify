import { createArea, createDevice, createFloor, createZone, nextLevel } from './defaults';
import { boundsOfPoints, normalisePolygon, pointInPolygon, polygonArea } from './geometry';
import { clampOpacity } from './palette';
import {
  axisAlignedRect,
  collectSnapEdges,
  findZoneConflict,
  findZoneConflictExcept,
  rectInsidePolygons,
  rectToPolygon,
  snapRect,
  subtractRects,
  zoneAppearsOnFloor,
  zoneFloorIds,
  zoneIsAncestor,
  zoneRegions,
  zonesOnFloor,
  MIN_ZONE_REGION_AREA_SQUARE_METERS,
} from './zones';
import type {
  BuildingDesign,
  DesignArea,
  DesignAreaKind,
  DesignDevice,
  DesignFloor,
  DesignMounting,
  DesignPoint,
  DesignPolygon,
  DesignSheet,
  DesignZone,
} from './types';

/**
 * Every edit the design studio can make, as a pure function from design to design.
 *
 * Keeping the mutations here rather than inside the React state hook means the server can apply
 * the same rules to a stored design, and the undo history is just a stack of these results.
 */

function replaceDevice(design: BuildingDesign, deviceId: string, patch: Partial<DesignDevice>): BuildingDesign {
  return {
    ...design,
    devices: design.devices.map((device) =>
      device.id === deviceId ? { ...device, ...patch } : device,
    ),
  };
}

function replaceZone(design: BuildingDesign, zoneId: string, patch: Partial<DesignZone>): BuildingDesign {
  return {
    ...design,
    zones: design.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone)),
  };
}

function replaceArea(design: BuildingDesign, areaId: string, patch: Partial<DesignArea>): BuildingDesign {
  return {
    ...design,
    areas: design.areas.map((area) => (area.id === areaId ? { ...area, ...patch } : area)),
  };
}

export function renameDesign(design: BuildingDesign, name: string): BuildingDesign {
  return { ...design, name: name.trim() || design.name };
}

export function updateSheet(design: BuildingDesign, patch: Partial<DesignSheet>): BuildingDesign {
  return { ...design, sheet: { ...design.sheet, ...patch } };
}

// ---------------------------------------------------------------- devices

export interface AddDeviceInput {
  floorId: string;
  kind: string;
  position: DesignPoint;
  zoneId?: string | null;
  label?: string;
}

export function addDevice(design: BuildingDesign, input: AddDeviceInput): {
  design: BuildingDesign;
  device: DesignDevice;
} {
  const device = createDevice({
    floorId: input.floorId,
    kind: input.kind,
    position: input.position,
    zoneId: input.zoneId ?? null,
    label: input.label,
  });

  // A device dropped inside a compartment belongs to it straight away; the surveyor should not
  // have to touch a zone for the roll-up to be right.
  const sealed = sealDevicesOnFloors(
    { ...design, devices: [...design.devices, device] },
    [input.floorId],
  );

  return {
    design: sealed,
    device: sealed.devices.find((candidate) => candidate.id === device.id) ?? device,
  };
}

/**
 * Moves a device, optionally onto another floor. Dropping a device on a floor tab is how a
 * surveyor corrects a mis-scanned storey, so the floor change is part of the same operation.
 */
export function moveDevice(
  design: BuildingDesign,
  deviceId: string,
  position: DesignPoint,
  floorId?: string,
): BuildingDesign {
  return replaceDevice(design, deviceId, {
    position,
    ...(floorId ? { floorId } : {}),
  });
}

export function updateDeviceLabel(
  design: BuildingDesign,
  deviceId: string,
  label: string,
): BuildingDesign {
  return replaceDevice(design, deviceId, { label });
}

export function updateDeviceKind(
  design: BuildingDesign,
  deviceId: string,
  kind: string,
): BuildingDesign {
  return replaceDevice(design, deviceId, { kind });
}

export function updateDeviceMounting(
  design: BuildingDesign,
  deviceId: string,
  mounting: DesignMounting,
): BuildingDesign {
  return replaceDevice(design, deviceId, { mounting });
}

export function updateDeviceAddress(
  design: BuildingDesign,
  deviceId: string,
  address: string,
): BuildingDesign {
  return replaceDevice(design, deviceId, { address: address.trim() || null });
}

export function updateDeviceNotes(
  design: BuildingDesign,
  deviceId: string,
  notes: string,
): BuildingDesign {
  return replaceDevice(design, deviceId, { notes: notes.trim() || null });
}

export function assignDeviceToZone(
  design: BuildingDesign,
  deviceId: string,
  zoneId: string | null,
): BuildingDesign {
  return replaceDevice(design, deviceId, { zoneId });
}

export function rotateDevice(
  design: BuildingDesign,
  deviceId: string,
  rotation: number,
): BuildingDesign {
  return replaceDevice(design, deviceId, { rotation: ((rotation % 360) + 360) % 360 });
}

export function removeDevice(design: BuildingDesign, deviceId: string): BuildingDesign {
  return { ...design, devices: design.devices.filter((device) => device.id !== deviceId) };
}

export function duplicateDevice(design: BuildingDesign, deviceId: string): BuildingDesign {
  const source = design.devices.find((device) => device.id === deviceId);

  if (!source) {
    return design;
  }

  const copy = createDevice({
    floorId: source.floorId,
    kind: source.kind,
    position: { x: source.position.x + 0.6, y: source.position.y + 0.6 },
    zoneId: source.zoneId,
    label: source.label ? `${source.label} (copy)` : '',
    mounting: source.mounting,
    fromCapture: source.fromCapture,
  });

  return { ...design, devices: [...design.devices, copy] };
}

// ---------------------------------------------------------------- zones

export interface AddZoneInput {
  floorId: string;
  polygon: DesignPolygon;
  name?: string;
  colour?: string;
  opacity?: number;
}

/**
 * Assigns every device on the given floors to the compartment containing it.
 *
 * The most specific compartment wins: a detector on a landing inside a shaft belongs to the shaft
 * zone, not to the floor plate that surrounds it. A vertical zone therefore claims devices on
 * every storey it passes through.
 */
function sealDevicesOnFloors(design: BuildingDesign, floorIds: string[]): BuildingDesign {
  const floors = new Set(floorIds);

  return {
    ...design,
    devices: design.devices.map((device) => {
      if (!floors.has(device.floorId)) {
        return device;
      }

      const candidates = zonesOnFloor(design.zones, device.floorId)
        .filter((zone) =>
          zoneRegions(zone).some((region) => pointInPolygon(device.position, region)),
        )
        .sort((left, right) =>
          depthOf(design.zones, right) - depthOf(design.zones, left) ||
          zoneRegions(left).length - zoneRegions(right).length,
        );

      const zoneId = candidates[0]?.id ?? null;

      return device.zoneId === zoneId ? device : { ...device, zoneId };
    }),
  };
}

/** Nesting depth, used to prefer a shaft over the plate it sits in. */
function depthOf(zones: DesignZone[], zone: DesignZone, limit = 8): number {
  let depth = 0;
  let current = zone;

  while (current.parentZoneId && depth < limit) {
    const parent = zones.find((candidate) => candidate.id === current.parentZoneId);

    if (!parent) {
      break;
    }

    depth += 1;
    current = parent;
  }

  return depth;
}

export type AddZoneRegionFailure = 'too_small' | 'overlap' | 'not_contained';

export interface AddZoneRegionInput {
  floorId: string;
  /** The rectangle the surveyor dragged. It is snapped and trimmed before it is added. */
  polygon: DesignPolygon;
  /** Draw into this zone. Omit to start a new zone with this region. */
  zoneId?: string | null;
  /**
   * Start this rectangle as its own compartment nested inside this parent — a lift shaft or stair
   * inside a floor plate. The rectangle must sit wholly within the parent.
   */
  parentZoneId?: string | null;
  /** Storeys the new compartment also covers, e.g. a stair continuing up through the building. */
  spansFloorIds?: string[];
  /** Snap edges onto neighbouring compartments and room walls. Defaults to true. */
  snap?: boolean;
  name?: string;
  colour?: string;
  opacity?: number;
}

/** A zone and every zone it is nested inside, used to let a child overlap its ancestors. */
function zoneAncestorIds(zones: DesignZone[], zone: DesignZone, limit = 8): string[] {
  const ids = [zone.id];
  let current = zone;
  let guard = 0;

  while (current.parentZoneId && guard < limit) {
    const parent = zones.find((candidate) => candidate.id === current.parentZoneId);

    if (!parent) {
      break;
    }

    ids.push(parent.id);
    current = parent;
    guard += 1;
  }

  return ids;
}

export interface AddZoneRegionResult {
  design: BuildingDesign;
  zone: DesignZone | null;
  /** How many pieces of the drag survived trimming. */
  regionsAdded: number;
  /** True when part of the drag was clipped away because it overlapped another zone. */
  trimmed: boolean;
  failure: AddZoneRegionFailure | null;
}

/**
 * Adds a drawn rectangle to a zone, or starts a new zone with it.
 *
 * This is the core of the zone designer: the drag is snapped onto neighbouring edges, anything
 * overlapping another compartment is clipped away, and the remainder becomes one or more regions
 * of the target zone. A zone may therefore end up as several unconnected pieces, which is what
 * makes an L-shaped compartment or a storey split in two workable.
 */
export function addZoneRegion(
  design: BuildingDesign,
  input: AddZoneRegionInput,
): AddZoneRegionResult {
  const bounds = boundsOfPoints(input.polygon);
  const drawn = { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY };

  if ((drawn.maxX - drawn.minX) * (drawn.maxY - drawn.minY) < MIN_ZONE_REGION_AREA_SQUARE_METERS) {
    return { design, zone: null, regionsAdded: 0, trimmed: false, failure: 'too_small' };
  }

  const target = input.zoneId
    ? design.zones.find(
        (zone) => zone.id === input.zoneId && zoneAppearsOnFloor(zone, input.floorId),
      ) ?? null
    : null;

  const parent = input.parentZoneId
    ? design.zones.find((zone) => zone.id === input.parentZoneId) ?? null
    : null;

  const rect =
    input.snap === false
      ? drawn
      : snapRect(drawn, collectSnapEdges(design.zones, input.floorId, target?.id ?? null));

  // A nested compartment is only meaningful if it actually sits inside its parent.
  if (input.parentZoneId) {
    if (!parent || !zoneAppearsOnFloor(parent, input.floorId)) {
      return { design, zone: null, regionsAdded: 0, trimmed: false, failure: 'not_contained' };
    }

    if (!rectInsidePolygons(rect, zoneRegions(parent))) {
      return { design, zone: null, regionsAdded: 0, trimmed: false, failure: 'not_contained' };
    }
  }

  // A zone may overlap the compartment it sits inside, and that compartment's own parents.
  const allowed = parent
    ? zoneAncestorIds(design.zones, parent)
    : target
      ? [target.id]
      : [];

  const conflicting = findZoneConflictExcept(rect, design.zones, input.floorId, allowed);

  if (conflicting && !target && !parent && zonesOnFloor(design.zones, input.floorId).length > 0) {
    // Starting a new zone over an existing one is a mistake worth reporting plainly. Nesting it
    // is the explicit way to put a compartment inside another one.
    return { design, zone: null, regionsAdded: 0, trimmed: false, failure: 'overlap' };
  }

  // Clip away every part of the drag that belongs to another compartment.
  const blocked = new Set(allowed);
  const blockers = zonesOnFloor(design.zones, input.floorId)
    .filter((zone) => !blocked.has(zone.id))
    .flatMap((zone) => zoneRegions(zone))
    .map(axisAlignedRect)
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        entry !== null &&
        !(
          entry.minX >= rect.maxX ||
          entry.maxX <= rect.minX ||
          entry.minY >= rect.maxY ||
          entry.maxY <= rect.minY
        ),
    );

  const pieces = subtractRects(rect, blockers).filter(
    (piece) => findZoneConflictExcept(piece, design.zones, input.floorId, allowed) === null,
  );

  const regions = pieces
    .map(rectToPolygon)
    .filter((polygon) => polygonArea(polygon) >= MIN_ZONE_REGION_AREA_SQUARE_METERS);

  if (regions.length === 0) {
    return {
      design,
      zone: null,
      regionsAdded: 0,
      trimmed: true,
      failure: 'overlap',
    };
  }

  if (target) {
    const updated: DesignZone = {
      ...target,
      regions: [...zoneRegions(target), ...regions],
    };

    const next: BuildingDesign = {
      ...design,
      zones: design.zones.map((zone) => (zone.id === target.id ? updated : zone)),
    };

    return {
      design: sealDevicesOnFloors(next, zoneFloorIds(updated)),
      zone: updated,
      regionsAdded: regions.length,
      trimmed: regions.length !== 1 || conflicting !== null,
      failure: null,
    };
  }

  const zone = createZone({
    floorId: input.floorId,
    regions,
    existing: design.zones,
    name: input.name,
    colour: input.colour,
    opacity: input.opacity,
    spansFloorIds: input.spansFloorIds,
    parentZoneId: parent?.id ?? null,
  });

  const next: BuildingDesign = { ...design, zones: [...design.zones, zone] };

  return {
    design: sealDevicesOnFloors(next, zoneFloorIds(zone)),
    zone,
    regionsAdded: regions.length,
    trimmed: regions.length !== 1,
    failure: null,
  };
}

/** Creates a zone from a single outline, which is what importing a room does. */
export function addZone(design: BuildingDesign, input: AddZoneInput): {
  design: BuildingDesign;
  zone: DesignZone | null;
} {
  const polygon = normalisePolygon(input.polygon);

  if (polygonArea(polygon) <= 0) {
    return { design, zone: null };
  }

  const zone = createZone({
    floorId: input.floorId,
    regions: [polygon],
    existing: design.zones,
    name: input.name,
    colour: input.colour,
    opacity: input.opacity,
  });

  return {
    design: sealDevicesOnFloors({ ...design, zones: [...design.zones, zone] }, [input.floorId]),
    zone,
  };
}

/** Removes one part of a zone. Removing the last part removes the zone itself. */
export function removeZoneRegion(
  design: BuildingDesign,
  zoneId: string,
  regionIndex: number,
): BuildingDesign {
  const zone = design.zones.find((entry) => entry.id === zoneId);

  if (!zone) {
    return design;
  }

  const regions = zoneRegions(zone).filter((_, index) => index !== regionIndex);

  if (regions.length === 0) {
    return removeZone(design, zoneId);
  }

  const next: BuildingDesign = {
    ...design,
    zones: design.zones.map((entry) => (entry.id === zoneId ? { ...entry, regions } : entry)),
  };

  return sealDevicesOnFloors(next, zoneFloorIds(zone));
}

export type ZoneNestingFailure = 'unknown' | 'cycle' | 'not_contained';

export interface ZoneNestingResult {
  design: BuildingDesign;
  failure: ZoneNestingFailure | null;
}

/**
 * Puts a compartment inside another one, or takes it back out when `parentZoneId` is null.
 *
 * This is what makes a lift shaft a zone in its own right: the shaft is nested inside the floor
 * plate it passes through, so the plate's area becomes the plate minus the shaft and a device on
 * the landing counts against the shaft. Cycles and a child that does not fit inside its new parent
 * are refused rather than silently producing an unreadable plan.
 */
export function nestZone(
  design: BuildingDesign,
  zoneId: string,
  parentZoneId: string | null,
): ZoneNestingResult {
  const zone = design.zones.find((candidate) => candidate.id === zoneId);

  if (!zone) {
    return { design, failure: 'unknown' };
  }

  if (!parentZoneId) {
    const next = replaceZone(design, zoneId, { parentZoneId: null });

    return { design: sealDevicesOnFloors(next, zoneFloorIds(zone)), failure: null };
  }

  const parent = design.zones.find((candidate) => candidate.id === parentZoneId);

  if (!parent || parent.id === zone.id) {
    return { design, failure: 'unknown' };
  }

  // A zone cannot be nested inside something that is already inside it.
  if (zoneIsAncestor(design.zones, zone.id, parent.id)) {
    return { design, failure: 'cycle' };
  }

  const sharedFloors = zoneFloorIds(zone).filter((floorId) => zoneAppearsOnFloor(parent, floorId));
  const fits = sharedFloors.length > 0 && zoneRegions(zone).every((region) => {
    const bounds = boundsOfPoints(region);

    return rectInsidePolygons(
      { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY },
      zoneRegions(parent),
    );
  });

  if (!fits) {
    return { design, failure: 'not_contained' };
  }

  const next = replaceZone(design, zoneId, { parentZoneId: parent.id });

  return { design: sealDevicesOnFloors(next, zoneFloorIds(zone)), failure: null };
}

/**
 * Sets the storeys a compartment runs through — a stair from the ground floor to the third, say.
 *
 * The floor the zone was drawn on is always included, unknown floors are dropped, and devices on
 * every affected storey are re-sealed so a shaft claims the detectors inside it on each level.
 */
export function setZoneFloors(
  design: BuildingDesign,
  zoneId: string,
  floorIds: string[],
): BuildingDesign {
  const zone = design.zones.find((candidate) => candidate.id === zoneId);

  if (!zone) {
    return design;
  }

  const known = new Set(design.floors.map((floor) => floor.id));
  const spans = Array.from(new Set(floorIds)).filter(
    (floorId) => floorId !== zone.floorId && known.has(floorId),
  );

  const next = replaceZone(design, zoneId, { spansFloorIds: spans });

  return sealDevicesOnFloors(next, [zone.floorId, ...spans]);
}

export function updateZone(design: BuildingDesign, zoneId: string, patch: Partial<DesignZone>): BuildingDesign {
  const next: Partial<DesignZone> = { ...patch };

  if (typeof patch.opacity === 'number') {
    next.opacity = clampOpacity(patch.opacity);
  }

  if (Array.isArray(patch.regions)) {
    const regions = patch.regions
      .map((region) => normalisePolygon(region))
      .filter((region) => polygonArea(region) > 0);

    if (regions.length > 0) {
      next.regions = regions;
    } else {
      delete next.regions;
    }
  }

  return replaceZone(design, zoneId, next);
}

export function renameZone(design: BuildingDesign, zoneId: string, name: string): BuildingDesign {
  return replaceZone(design, zoneId, { name: name.trim() || 'Zone' });
}

export function recolourZone(design: BuildingDesign, zoneId: string, colour: string): BuildingDesign {
  return replaceZone(design, zoneId, { colour });
}

export function setZoneOpacity(design: BuildingDesign, zoneId: string, opacity: number): BuildingDesign {
  return replaceZone(design, zoneId, { opacity: clampOpacity(opacity) });
}

/**
 * Removes a compartment. Anything nested inside it is promoted to its parent rather than deleted,
 * because the shaft is still a real compartment even when the plate around it is redrawn. Devices
 * are re-sealed afterwards, so one that was in the removed zone falls back to whatever else
 * contains it (usually the parent) or to no zone at all.
 */
export function removeZone(design: BuildingDesign, zoneId: string): BuildingDesign {
  const removed = design.zones.find((zone) => zone.id === zoneId);

  if (!removed) {
    return design;
  }

  const zones = design.zones
    .filter((zone) => zone.id !== zoneId)
    .map((zone) =>
      zone.parentZoneId === zoneId ? { ...zone, parentZoneId: removed.parentZoneId } : zone,
    );

  return sealDevicesOnFloors({ ...design, zones }, zoneFloorIds(removed));
}

export function duplicateZone(design: BuildingDesign, zoneId: string): BuildingDesign {
  const source = design.zones.find((zone) => zone.id === zoneId);

  if (!source) {
    return design;
  }

  const shifted = zoneRegions(source).map((region) =>
    normalisePolygon(region.map((point) => ({ x: point.x + 1, y: point.y + 1 }))),
  );
  const zone = createZone({
    floorId: source.floorId,
    regions: shifted,
    existing: design.zones,
    name: `${source.name} (copy)`,
    colour: source.colour,
    opacity: source.opacity,
    // The copy is offset, so it cannot stay inside the original's parent.
    parentZoneId: null,
    spansFloorIds: source.spansFloorIds,
  });

  return sealDevicesOnFloors({ ...design, zones: [...design.zones, zone] }, zoneFloorIds(zone));
}

/** One zone per room on the current floor, skipping rooms that already own a zone. */
export function zoneEveryRoom(design: BuildingDesign, floorId: string): BuildingDesign {
  const floor = design.floors.find((entry) => entry.id === floorId);

  if (!floor) {
    return design;
  }

  const existing = [...design.zones];
  const created: DesignZone[] = [];

  floor.rooms.forEach((room) => {
    if (polygonArea(room.polygon) <= 0) {
      return;
    }

    // A room already inside a compartment — including one a vertical zone reaches from another
    // storey — is left alone; only the gaps get a zone.
    const bounds = boundsOfPoints(room.polygon);
    const alreadyCovered = zonesOnFloor([...existing, ...created], floorId).some(
      (zone) =>
        findZoneConflict(
          { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY },
          [zone],
          floorId,
          null,
        ) !== null,
    );

    if (alreadyCovered) {
      return;
    }

    created.push(
      createZone({
        floorId,
        regions: [room.polygon],
        existing: [...existing, ...created],
        name: room.name,
      }),
    );
  });

  return { ...design, zones: [...design.zones, ...created] };
}

// ---------------------------------------------------------------- areas

export interface AddAreaInput {
  floorId: string;
  polygon: DesignPolygon;
  kind?: DesignAreaKind;
  name?: string;
  colour?: string;
}

export function addArea(design: BuildingDesign, input: AddAreaInput): {
  design: BuildingDesign;
  area: DesignArea | null;
} {
  const polygon = normalisePolygon(input.polygon);

  if (polygonArea(polygon) <= 0) {
    return { design, area: null };
  }

  const area = createArea({
    floorId: input.floorId,
    polygon,
    kind: input.kind,
    name: input.name,
    colour: input.colour,
  });

  return { design: { ...design, areas: [...design.areas, area] }, area };
}

export function updateArea(design: BuildingDesign, areaId: string, patch: Partial<DesignArea>): BuildingDesign {
  const next: Partial<DesignArea> = { ...patch };

  if (Array.isArray(patch.polygon)) {
    const polygon = normalisePolygon(patch.polygon);

    if (polygonArea(polygon) > 0) {
      next.polygon = polygon;
    } else {
      delete next.polygon;
    }
  }

  return replaceArea(design, areaId, next);
}

export function removeArea(design: BuildingDesign, areaId: string): BuildingDesign {
  return { ...design, areas: design.areas.filter((area) => area.id !== areaId) };
}

// ---------------------------------------------------------------- floors

export interface AddFloorInput {
  name?: string;
  level?: number;
  heightMeters?: number;
}

export function addFloor(design: BuildingDesign, input: AddFloorInput = {}): {
  design: BuildingDesign;
  floor: DesignFloor;
} {
  const floor = createFloor({
    name: input.name,
    level: input.level ?? nextLevel(design.floors),
    heightMeters: input.heightMeters,
  });

  return {
    design: {
      ...design,
      floors: [...design.floors, floor].sort((left, right) => left.level - right.level),
    },
    floor,
  };
}

export function updateFloor(
  design: BuildingDesign,
  floorId: string,
  patch: Partial<Pick<DesignFloor, 'name' | 'level' | 'heightMeters' | 'notes' | 'kind'>>,
): BuildingDesign {
  return {
    ...design,
    floors: design.floors
      .map((floor) => (floor.id === floorId ? { ...floor, ...patch } : floor))
      .sort((left, right) => left.level - right.level),
  };
}

/**
 * Removes a floor with everything drawn on it. The last floor is never removed, because a design
 * with no floors has nothing to edit.
 */
export function removeFloor(design: BuildingDesign, floorId: string): BuildingDesign {
  if (design.floors.length <= 1) {
    return design;
  }

  // A vertical zone keeps running through its remaining storeys; it only disappears when the
  // floor it was drawn on is the one being removed.
  const zones = design.zones
    .filter((zone) => zone.floorId !== floorId)
    .map((zone) =>
      zone.spansFloorIds.includes(floorId)
        ? { ...zone, spansFloorIds: zone.spansFloorIds.filter((id) => id !== floorId) }
        : zone,
    );

  const surviving = new Set(zones.map((zone) => zone.id));

  return {
    ...design,
    floors: design.floors.filter((floor) => floor.id !== floorId),
    devices: design.devices.filter((device) => device.floorId !== floorId),
    zones: zones.map((zone) =>
      zone.parentZoneId && !surviving.has(zone.parentZoneId)
        ? { ...zone, parentZoneId: null }
        : zone,
    ),
    areas: design.areas.filter((area) => area.floorId !== floorId),
  };
}

/** Copies a floor's rooms, devices, zones and areas onto a new storey above it. */
export function duplicateFloor(design: BuildingDesign, floorId: string): {
  design: BuildingDesign;
  floor: DesignFloor | null;
} {
  const source = design.floors.find((floor) => floor.id === floorId);

  if (!source) {
    return { design, floor: null };
  }

  const floor = createFloor({
    name: `${source.name} copy`,
    level: nextLevel(design.floors),
    heightMeters: source.heightMeters,
  });

  const rooms = source.rooms.map((room) => ({
    ...room,
    id: `${room.id}-copy-${floor.id}`,
  }));

  const zoneMap = new Map<string, string>();
  const zones = design.zones
    .filter((zone) => zone.floorId === floorId)
    .map((zone) => {
      const copy = createZone({
        floorId: floor.id,
        regions: zoneRegions(zone),
        existing: design.zones,
        name: zone.name,
        colour: zone.colour,
        opacity: zone.opacity,
      });

      zoneMap.set(zone.id, copy.id);

      return copy;
    })
    .map((copy, index) => {
      // Restore nesting on the copied storey: a shaft stays inside the copy of its plate.
      const source = design.zones.filter((zone) => zone.floorId === floorId)[index];
      const mappedParent = source?.parentZoneId ? zoneMap.get(source.parentZoneId) ?? null : null;

      return mappedParent ? { ...copy, parentZoneId: mappedParent } : copy;
    });

  const devices = design.devices
    .filter((device) => device.floorId === floorId)
    .map((device) =>
      createDevice({
        floorId: floor.id,
        kind: device.kind,
        position: device.position,
        label: device.label,
        mounting: device.mounting,
        zoneId: device.zoneId ? zoneMap.get(device.zoneId) ?? null : null,
        fromCapture: device.fromCapture,
      }),
    );

  const areas = design.areas
    .filter((area) => area.floorId === floorId)
    .map((area) =>
      createArea({
        floorId: floor.id,
        polygon: area.polygon,
        kind: area.kind,
        name: area.name,
        colour: area.colour,
      }),
    );

  return {
    design: {
      ...design,
      floors: [...design.floors, { ...floor, rooms }].sort((left, right) => left.level - right.level),
      zones: [...design.zones, ...zones],
      devices: [...design.devices, ...devices],
      areas: [...design.areas, ...areas],
    },
    floor,
  };
}

// ---------------------------------------------------------------- rooms

export function renameRoom(
  design: BuildingDesign,
  floorId: string,
  roomId: string,
  name: string,
): BuildingDesign {
  return {
    ...design,
    floors: design.floors.map((floor) =>
      floor.id !== floorId
        ? floor
        : {
            ...floor,
            rooms: floor.rooms.map((room) =>
              room.id === roomId ? { ...room, name: name.trim() || room.name } : room,
            ),
          },
    ),
  };
}

/** Adds a hand-drawn room to a floor, which is how an uncaptured extension gets onto the plan. */
export function addRoom(
  design: BuildingDesign,
  floorId: string,
  polygon: DesignPolygon,
  name?: string,
): BuildingDesign {
  const cleaned = normalisePolygon(polygon);

  if (polygonArea(cleaned) <= 0) {
    return design;
  }

  return {
    ...design,
    floors: design.floors.map((floor) =>
      floor.id !== floorId
        ? floor
        : {
            ...floor,
            rooms: [
              ...floor.rooms,
              {
                id: `room-drawn-${Date.now().toString(36)}`,
                name: name?.trim() || `Room ${floor.rooms.length + 1}`,
                polygon: cleaned,
                open: false,
                notes: null,
              },
            ],
          },
    ),
  };
}

export function removeRoom(
  design: BuildingDesign,
  floorId: string,
  roomId: string,
): BuildingDesign {
  return {
    ...design,
    floors: design.floors.map((floor) =>
      floor.id !== floorId
        ? floor
        : { ...floor, rooms: floor.rooms.filter((room) => room.id !== roomId) },
    ),
  };
}

/**
 * Runtime smoke test for the building design pipeline.
 *
 * Exercises the path the product actually uses: a two-storey RoomPlan capture becomes a design,
 * the design is edited (device dropped, zone drawn, car park added, label changed), saved through
 * the same JSON the API stores, read back through the sanitiser, and drawn to a scene.
 *
 * Run with: npx tsx scripts/smoke-design.ts
 */

import {
  addArea,
  addDevice,
  addFloor,
  addRoom,
  addZone,
  addZoneRegion,
  adoptCaptureZones,
  buildFloorScene,
  createDesignFromCapture,
  createEmptyDesign,
  findOverlappingZones,
  floorCoverage,
  moveDevice,
  nestZone,
  polygonArea,
  polygonFromRect,
  removeZone,
  removeZoneRegion,
  sanitiseDesign,
  setZoneFloors,
  sortFloors,
  updateDeviceLabel,
  zoneNetAreaSquareMeters,
  zoneRegions,
  zonesOnFloor,
} from '../lib/design';
import type { FireAlarmScanSession } from '../mobile/modules/fire-alarm-roomplan/types';
import { buildPublishDesignBody } from '../mobile/services/roomplan/design-payload';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }

  console.log(`ok — ${message}`);
}

function room(id: string, name: string, level: number, originX: number) {
  return {
    id,
    name,
    level,
    areaSquareMeters: 20,
    outline: [
      { x: originX, y: 0 },
      { x: originX + 5, y: 0 },
      { x: originX + 5, y: 4 },
      { x: originX, y: 4 },
    ],
    wallSegments: [
      { id: `${id}-w1`, start: { x: originX, y: 0 }, end: { x: originX + 5, y: 0 }, height: 2.7 },
    ],
  };
}

const session: FireAlarmScanSession = {
  id: 'smoke-session',
  status: 'completed',
  metadata: {
    startedAt: new Date(0).toISOString(),
    platform: 'ios',
    sessionName: 'Two storey smoke test',
  },
  floorplan: {
    units: 'meters',
    rooms: [
      room('gf-1', 'Reception', 0, 0),
      room('gf-2', 'Store', 0, 6),
      room('ff-1', 'Open office', 1, 0),
      room('ff-2', 'Meeting room', 1, 6),
    ],
  },
  devices: [
    {
      id: 'dev-1',
      type: 'detector',
      label: 'Reception ceiling',
      roomId: 'gf-1',
      location: { x: 2.5, y: 2 },
      metadata: { mounting: 'ceiling' },
    },
    {
      id: 'dev-2',
      type: 'sounder',
      label: 'Store sounder',
      roomId: 'gf-2',
      location: { x: 8, y: 2 },
    },
    {
      id: 'dev-3',
      type: 'detector',
      label: 'Office detector',
      roomId: 'ff-1',
      location: { x: 2.5, y: 2 },
    },
    {
      id: 'dev-4',
      type: 'vad',
      label: 'Meeting VAD',
      roomId: 'ff-2',
      location: { x: 8, y: 2 },
    },
  ],
};

const design = createDesignFromCapture(session, 'Smoke test building');

assert(design.floors.length === 2, 'a two-storey capture produces two floors');
assert(
  sortFloors(design.floors)
    .map((floor) => floor.level)
    .join(',') === '0,1',
  'floors are ordered bottom to top',
);
assert(design.devices.length === 4, 'every captured device lands on a floor');
assert(design.zones.length === 4, 'one zone is created per captured room');

const groundFloor = sortFloors(design.floors)[0];
const firstFloor = sortFloors(design.floors)[1];

const groundDevices = design.devices.filter((device) => device.floorId === groundFloor.id);
const firstDevices = design.devices.filter((device) => device.floorId === firstFloor.id);

assert(groundDevices.length === 2, 'ground floor owns its own devices');
assert(firstDevices.length === 2, 'first floor owns its own devices');
assert(
  design.devices.every((device) => device.zoneId !== null),
  'captured devices are sealed into the zone of the room they were found in',
);

// A zone drawn by hand.
const withZone = addZone(design, {
  floorId: groundFloor.id,
  polygon: polygonFromRect({ minX: 12, minY: 6, maxX: 16, maxY: 8 }),
});

assert(withZone.zone !== null, 'a dragged rectangle becomes a zone');
assert(withZone.design.zones.length === design.zones.length + 1, 'adding a zone grows the list');

// Device edit: drop one by hand, move it, relabel it.
const placed = addDevice(withZone.design, {
  floorId: groundFloor.id,
  kind: 'mcp',
  position: { x: 1, y: 3.4 },
});

assert(placed.device.kind === 'mcp', 'a manual call point can be dropped on the plan');
assert(placed.device.mounting === 'wall', 'the catalogue default mounting is applied');

const moved = moveDevice(placed.design, placed.device.id, { x: 2, y: 1 });
const relabelled = updateDeviceLabel(moved, placed.device.id, 'GF-01 by the main door');
const editedDevice = relabelled.devices.find((device) => device.id === placed.device.id);

assert(editedDevice?.position.x === 2, 'a device can be moved after placement');
assert(editedDevice?.label === 'GF-01 by the main door', 'a device label is editable');

// External area: a car park drawn outside the building.
const withCarPark = addArea(relabelled, {
  floorId: groundFloor.id,
  kind: 'car_park',
  name: 'Staff car park',
  polygon: polygonFromRect({ minX: 0, minY: 10, maxX: 20, maxY: 24 }),
});

assert(withCarPark.area !== null, 'a car park can be drawn onto the design');

// Round trip through the same JSON the API stores and the sanitiser reads back.
const stored = JSON.parse(JSON.stringify(withCarPark.design));
const restored = sanitiseDesign(stored);

assert(restored !== null, 'a stored design survives the sanitiser');
assert(restored?.floors.length === 2, 'both floors survive the round trip');
assert(
  restored?.devices.length === withCarPark.design.devices.length,
  'every device survives the round trip',
);
assert(restored?.areas.length === 1, 'the car park survives the round trip');

// Scene generation for each floor.
const groundScene = buildFloorScene(restored!, groundFloor.id, { width: 1000, height: 680 });
const firstScene = buildFloorScene(restored!, firstFloor.id, { width: 1000, height: 680 });

assert(groundScene.rooms.length === 2, 'the ground floor scene draws its two rooms');
assert(firstScene.rooms.length === 2, 'the first floor scene draws its two rooms');
assert(groundScene.devices.length === 3, 'the ground floor scene draws its devices');
assert(firstScene.devices.length === 2, 'the first floor scene draws its devices');
assert(groundScene.areas.length === 1, 'the car park is drawn on the ground floor only');
assert(firstScene.areas.length === 0, 'the car park does not appear on the first floor');
assert(
  groundScene.zones.every((zone) => zone.fillOpacity >= 0.05 && zone.fillOpacity <= 0.6),
  'zone fills stay semi translucent',
);
assert(
  groundScene.viewport.scale === firstScene.viewport.scale,
  'both floors share one transform so storeys stay registered',
);
assert(groundScene.deviceLegend.length > 0, 'the legend counts the devices on the floor');
assert(groundScene.stats.floorAreaSquareMeters > 0, 'floor area is measured');

// Zones drawn on the phone replace the room zones for their storey and keep their identity.
const phoneZones = [
  {
    id: 'phone-zone-1',
    name: 'Escape route',
    reference: 'Z9',
    level: 0,
    colour: '#F97316',
    polygon: polygonFromRect({ minX: 0, minY: 0, maxX: 6, maxY: 6 }),
    notes: 'Drawn on site',
  },
  {
    id: 'phone-zone-2',
    name: 'Open plan',
    reference: 'Z8',
    level: 1,
    colour: '#0EA5E9',
    polygon: polygonFromRect({ minX: 0, minY: 0, maxX: 6, maxY: 6 }),
    notes: null,
  },
];

const adopted = adoptCaptureZones(restored!, phoneZones);
const adoptedGround = adopted.zones.filter((zone) => zone.floorId === groundFloor.id);

assert(adoptedGround.length === 1, 'the drawn compartment replaces the room zones on its storey');
assert(adoptedGround[0].reference === 'Z9', 'the drawn reference is kept');
assert(adoptedGround[0].colour === '#F97316', 'the drawn colour is kept');
assert(adoptedGround[0].name === 'Escape route', 'the drawn name is kept');
assert(adoptedGround[0].notes === 'Drawn on site', 'the note written on site is kept');
// The drawn compartment covers 0..6 m, so the reception detector is inside it and the store
// sounder at x = 8 is not: exactly the split the re-sealing should produce.
const adoptedZoneId = adoptedGround[0].id;
const insideDevice = adopted.devices.find(
  (device) => device.floorId === groundFloor.id && device.position.x < 6 && device.position.y < 6,
);
const outsideDevice = adopted.devices.find(
  (device) => device.floorId === groundFloor.id && device.position.x >= 6,
);

assert(
  insideDevice !== undefined && insideDevice.zoneId === adoptedZoneId,
  'a device inside the drawn compartment is sealed into it',
);
assert(
  outsideDevice !== undefined && outsideDevice.zoneId === null,
  'a device outside every drawn compartment is left unassigned',
);
assert(
  adoptCaptureZones(restored!, []).zones.length === restored!.zones.length,
  'publishing without zones leaves the room zones alone',
);
assert(
  adoptCaptureZones(restored!, null).zones.length === restored!.zones.length,
  'a caller that sends no zone field changes nothing',
);

// What the phone actually posts when the surveyor taps "Design it on the web".
const posted = buildPublishDesignBody({
  session,
  zones: phoneZones,
  name: '  Riverside House  ',
  editEnabled: true,
});

assert(posted.session.id === session.id, 'the publish body carries the captured session');
assert(posted.zones.length === 2, 'the zones drawn on the phone are posted with the capture');
assert(posted.zones[0].reference === 'Z9', 'a drawn zone keeps its reference in the body');
assert(posted.name === 'Riverside House', 'the design name is trimmed in the body');
assert(posted.editEnabled, 'the shared-link switch is passed through');

const bare = buildPublishDesignBody({ session });

assert(bare.zones.length === 0, 'a publish with no zones posts an empty array, not undefined');
assert(bare.name === null, 'a publish with no name posts null rather than an empty string');
assert(bare.editEnabled === false, 'the shared link is off unless it was asked for');

// The zone designer: snapping, no overlap, multi-part zones, and full coverage of the floor.
const grid = createEmptyDesign('Zone grid');
const hallId = grid.floors[0].id;
const withHall = addRoom(
  grid,
  hallId,
  polygonFromRect({ minX: 0, minY: 0, maxX: 10, maxY: 20 }),
  'Hall',
);

const before = floorCoverage(withHall.floors[0], withHall.zones);
assert(before.ratio === 0, 'a floor with no zones reports no coverage');
assert(before.complete === false, 'an unzoned floor is not complete');

// First compartment: the left half of the top band.
const zoneOne = addZoneRegion(withHall, {
  floorId: hallId,
  polygon: polygonFromRect({ minX: 0, minY: 0, maxX: 5, maxY: 10 }),
  name: 'West wing',
});

assert(zoneOne.zone !== null, 'dragging a rectangle creates a zone');
assert(zoneOne.failure === null, 'a clear rectangle is accepted');

const zoneOneId = zoneOne.zone!.id;

// Second compartment, drawn 0.25 m adrift so the shared edge has to snap.
const zoneTwo = addZoneRegion(zoneOne.design, {
  floorId: hallId,
  polygon: polygonFromRect({ minX: 5.25, minY: 0, maxX: 10, maxY: 10 }),
  name: 'East wing',
});

assert(zoneTwo.zone !== null, 'a second compartment can be drawn beside the first');
assert(
  zoneTwo.zone!.regions[0].some((point) => Math.abs(point.x - 5) < 1e-6),
  'the shared edge snaps onto the neighbouring zone instead of leaving a gap',
);
assert(
  findOverlappingZones(zoneTwo.design.zones, hallId).length === 0,
  'two snapped compartments do not overlap',
);

// A third compartment drawn wholly inside an existing one is refused.
const insideExisting = addZoneRegion(zoneTwo.design, {
  floorId: hallId,
  polygon: polygonFromRect({ minX: 1, minY: 1, maxX: 4, maxY: 4 }),
});

assert(
  insideExisting.failure === 'overlap' && insideExisting.zone === null,
  'a zone drawn inside an existing one is refused',
);
assert(
  insideExisting.design.zones.length === zoneTwo.design.zones.length,
  'a refused zone does not change the design',
);

// Growing a zone: a second, unconnected part is added to the same compartment by id.
const zoneOneExtended = addZoneRegion(zoneTwo.design, {
  floorId: hallId,
  polygon: polygonFromRect({ minX: 0, minY: 10, maxX: 5, maxY: 20 }),
  zoneId: zoneOneId,
});

assert(
  zoneOneExtended.zone !== null && zoneRegions(zoneOneExtended.zone).length === 2,
  'a zone may be built from more than one part',
);
assert(
  Math.abs(
    zoneOneExtended.zone!.regions.reduce((total, region) => total + polygonArea(region), 0) - 100,
  ) < 0.5,
  'the two parts add up to the area that was drawn',
);

// A drag that clips a neighbour contributes only its free remainder.
// Drawn into the west wing, but reaching across the east wing: only the free part is added.
const clipped = addZoneRegion(zoneOneExtended.design, {
  floorId: hallId,
  polygon: polygonFromRect({ minX: 3, minY: 5, maxX: 8, maxY: 12 }),
  zoneId: zoneOneId,
});

assert(clipped.zone !== null, 'a partially overlapping drag is still accepted');
assert(clipped.trimmed, 'the overlapping part of the drag is clipped away');
assert(
  findOverlappingZones(clipped.design.zones, hallId).length === 0,
  'clipping keeps every compartment clear of the others',
);

const covered = floorCoverage(
  clipped.design.floors.find((entry) => entry.id === hallId)!,
  clipped.design.zones,
);

assert(covered.ratio > 0.5, 'coverage rises as compartments are drawn');
assert(
  covered.uncoveredRooms.some((room) => room.name === 'Hall'),
  'the report names a room that is not fully covered yet',
);

// Removing one part leaves the rest of the zone in place; removing the last part drops the zone.
const partsBefore = zoneRegions(clipped.design.zones.find((zone) => zone.id === zoneOneId)!).length;
const afterRemoval = removeZoneRegion(clipped.design, zoneOneId, 0);

assert(
  zoneRegions(afterRemoval.zones.find((zone) => zone.id === zoneOneId)!).length === partsBefore - 1,
  'one part of a zone can be removed on its own',
);

// A shaft is its own compartment nested inside a floor plate, and it runs through the storeys it
// passes — the two things a plain "no overlap" rule cannot express.
const shell = createEmptyDesign('Vertical check');
const groundId = shell.floors[0].id;
const withGroundHall = addRoom(
  shell,
  groundId,
  polygonFromRect({ minX: 0, minY: 0, maxX: 10, maxY: 20 }),
  'Hall',
);
const upper = addFloor(withGroundHall);
const upperId = upper.floor.id;
const withBothFloors = addRoom(
  upper.design,
  upperId,
  polygonFromRect({ minX: 0, minY: 0, maxX: 10, maxY: 20 }),
  'Upper hall',
);

// The ground floor plate covers the whole storey.
const plate = addZoneRegion(withBothFloors, {
  floorId: groundId,
  polygon: polygonFromRect({ minX: 0, minY: 0, maxX: 10, maxY: 20 }),
  name: 'Ground plate',
});

assert(plate.zone !== null, 'a floor plate can be drawn over the whole storey');

const plateId = plate.zone!.id;
const plateReference = plate.zone!.reference;

// A lift shaft drawn inside it becomes its own compartment rather than being refused.
const shaft = addZoneRegion(plate.design, {
  floorId: groundId,
  polygon: polygonFromRect({ minX: 4, minY: 4, maxX: 6, maxY: 6 }),
  parentZoneId: plateId,
  name: 'Lift shaft',
});

assert(shaft.zone !== null, 'a zone can be inserted inside an existing zone');
assert(shaft.zone!.parentZoneId === plateId, 'the shaft records the plate it sits inside');

const shaftId = shaft.zone!.id;
const plateNow = shaft.design.zones.find((zone) => zone.id === plateId)!;

assert(
  Math.abs(zoneNetAreaSquareMeters(shaft.design.zones, plateNow) - 196) < 0.5,
  'the plate area excludes the shaft nested inside it',
);
assert(
  findOverlappingZones(shaft.design.zones, groundId).length === 0,
  'a nested pair is not reported as an overlap',
);

// A nested compartment has to actually sit inside its parent.
const outsideParent = addZoneRegion(shaft.design, {
  floorId: groundId,
  polygon: polygonFromRect({ minX: 9, minY: 9, maxX: 12, maxY: 12 }),
  parentZoneId: plateId,
});

assert(
  outsideParent.failure === 'not_contained' && outsideParent.zone === null,
  'a compartment that overhangs its parent is refused',
);

// Sealing prefers the most specific compartment.
const onLanding = addDevice(shaft.design, {
  floorId: groundId,
  kind: 'smoke_optical',
  position: { x: 5, y: 5 },
});
const onPlate = addDevice(onLanding.design, {
  floorId: groundId,
  kind: 'smoke_optical',
  position: { x: 1, y: 1 },
});

assert(onLanding.device.zoneId === shaftId, 'a detector inside the shaft counts against the shaft');
assert(onPlate.device.zoneId === plateId, 'a detector on the plate counts against the plate');

// Nesting cannot loop.
const cycle = nestZone(onLanding.design, plateId, shaftId);

assert(cycle.failure === 'cycle', 'a zone cannot be nested inside its own child');

// The shaft continues up through the first floor as the same zone.
const vertical = setZoneFloors(onPlate.design, shaftId, [upperId, 'floor-that-does-not-exist']);
const shaftAfter = vertical.zones.find((zone) => zone.id === shaftId)!;

assert(
  shaftAfter.spansFloorIds.length === 1 && shaftAfter.spansFloorIds[0] === upperId,
  'a vertical zone records the storeys it passes through, ignoring unknown ones',
);
assert(
  zonesOnFloor(vertical.zones, upperId).some((zone) => zone.id === shaftId),
  'a vertical zone appears on every storey it passes through',
);

// A device upstairs inside the shaft footprint belongs to the same vertical zone.
const upperDevice = addDevice(vertical, {
  floorId: upperId,
  kind: 'smoke_optical',
  position: { x: 5, y: 5 },
});

assert(
  upperDevice.device.zoneId === shaftId,
  'a device on an upper storey is sealed into the vertical zone reaching it',
);

// The plate is drawn with a hole where the shaft sits.
const nestedScene = buildFloorScene(upperDevice.design, groundId, {});
const plateShape = nestedScene.zones.find((zone) => zone.zoneId === plateId);

assert(
  plateShape !== undefined && (plateShape.holes?.length ?? 0) === 1,
  'a plate containing a shaft is drawn with a real hole',
);

const shaftLegend = nestedScene.zoneLegend.find((entry) => entry.zoneId === shaftId)!;

assert(
  shaftLegend.nestedInReference === plateReference,
  'the legend says which compartment the shaft is nested in',
);

const upperScene = buildFloorScene(upperDevice.design, upperId, {});
const upperShaft = upperScene.zoneLegend.find((entry) => entry.zoneId === shaftId)!;

assert(upperShaft.floorCount === 2, 'the legend counts the storeys a vertical zone covers');
assert(upperShaft.areaSquareMeters < 5, 'a vertical zone keeps its own footprint on each storey');

// Removing the plate promotes the shaft rather than deleting a real compartment.
const promoted = removeZone(upperDevice.design, plateId);
const survivingShaft = promoted.zones.find((zone) => zone.id === shaftId)!;

assert(survivingShaft.parentZoneId === null, 'the shaft survives its parent and becomes top level');
assert(
  promoted.zones.some((zone) => zone.id === shaftId),
  'removing a plate does not remove the compartments inside it',
);
assert(
  promoted.devices.every((device) => device.zoneId !== plateId),
  'devices that were in the removed plate fall back to what still contains them',
);

// A nested, multi-storey design survives the JSON round trip the API performs on every save.
const saved = sanitiseDesign(
  JSON.parse(JSON.stringify(upperDevice.design)),
) as typeof upperDevice.design;

const savedShaft = saved.zones.find((zone) => zone.id === shaftId)!;

assert(savedShaft.parentZoneId === plateId, 'nesting survives a save and reload');
assert(
  savedShaft.spansFloorIds.length === 1 && savedShaft.spansFloorIds[0] === upperId,
  'the storeys a vertical zone covers survive a save and reload',
);
assert(
  saved.zones.find((zone) => zone.id === plateId)?.parentZoneId === null,
  'a top-level compartment stays top level after the round trip',
);

// A tampered document cannot smuggle in a loop or a parent on another storey.
const tampered = sanitiseDesign(
  JSON.parse(
    JSON.stringify({
      ...upperDevice.design,
      zones: upperDevice.design.zones.map((zone) =>
        zone.id === plateId
          ? { ...zone, parentZoneId: shaftId }
          : zone.id === shaftId
            ? { ...zone, parentZoneId: plateId }
            : zone,
      ),
    }),
  ),
) as typeof upperDevice.design;

const plateAfterTamper = tampered.zones.find((zone) => zone.id === plateId)!;
const shaftAfterTamper = tampered.zones.find((zone) => zone.id === shaftId)!;

assert(
  !(plateAfterTamper.parentZoneId === shaftId && shaftAfterTamper.parentZoneId === plateId),
  'a nesting loop in a stored document is broken rather than kept',
);

const crossFloorNest = sanitiseDesign(
  JSON.parse(
    JSON.stringify({
      ...upperDevice.design,
      zones: upperDevice.design.zones.map((zone) =>
        zone.id === shaftId ? { ...zone, parentZoneId: 'zone-on-another-floor' } : zone,
      ),
    }),
  ),
) as typeof upperDevice.design;

assert(
  crossFloorNest.zones.find((zone) => zone.id === shaftId)?.parentZoneId === null,
  'a parent that does not exist is dropped instead of leaving a dangling reference',
);

// An empty design still opens, which is what a brand new sheet is.
const empty = createEmptyDesign('Empty');
const emptyScene = buildFloorScene(empty, empty.floors[0]?.id ?? null, {});

assert(emptyScene.rooms.length === 0, 'a new design starts with no rooms');
assert(emptyScene.viewport.scale > 0, 'an empty design still has a usable viewport');

console.log('\nAll design smoke checks passed.');

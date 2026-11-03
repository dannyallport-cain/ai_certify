import { strict as assert } from 'node:assert';

import { buildFloorScene } from '../lib/design/scene';
import { sanitiseDesign } from '../lib/design/sanitise';
import { isKnownDeviceKind } from '../lib/design/device-catalogue';
import {
  findOverlappingZones,
  floorCoverage,
  zoneFloorIds,
  zoneRegions,
  zonesOnFloor,
} from '../lib/design/zones';
import { polygonArea } from '../lib/design/geometry';
import {
  DEMO_BLOCK_DEPTH_METERS,
  DEMO_BLOCK_WIDTH_METERS,
  DEMO_DESIGN_ID,
  DEMO_DESIGN_NAME,
  createDemoDesign,
  summariseDemoDesign,
} from '../lib/design/demo';

/**
 * Proves the demonstration plan is a coherent design rather than a plausible-looking list of
 * numbers.
 *
 * The assertions cover what would actually be wrong on a printed zone plan: a room nobody zoned,
 * two compartments claiming the same square metre, a device floating outside every compartment,
 * and a document that cannot survive the sanitiser every saved design goes through.
 */

let checks = 0;

function check(label: string, condition: boolean): void {
  checks += 1;
  assert.ok(condition, label);
}

function equal<T>(label: string, actual: T, expected: T): void {
  checks += 1;
  assert.deepEqual(
    actual,
    expected,
    `${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

const design = createDemoDesign();
const [ground, first] = design.floors;

// ---------------------------------------------------------------- structure

equal('two storeys', design.floors.length, 2);
equal('design id', design.id, DEMO_DESIGN_ID);
equal('design name', design.name, DEMO_DESIGN_NAME);
equal('storeys read bottom to top', design.floors.map((floor) => floor.level), [0, 1]);
equal('ground floor rooms', ground.rooms.length, 12);
equal('first floor rooms', first.rooms.length, 11);
equal('thirteen compartments', design.zones.length, 13);
equal('three external areas', design.areas.length, 3);

check(
  'every room outline has a real area',
  design.floors.every((floor) => floor.rooms.every((room) => polygonArea(room.polygon) > 1)),
);
check(
  'every compartment has usable regions',
  design.zones.every(
    (zone) => zoneRegions(zone).length > 0 && zoneRegions(zone).every((region) => region.length >= 3),
  ),
);
equal(
  'zone references are unique',
  new Set(design.zones.map((zone) => zone.reference)).size,
  design.zones.length,
);
check(
  'every device kind is in the catalogue',
  design.devices.every((device) => isKnownDeviceKind(device.kind)),
);

// The block is a real, measured size: 30 m × 14 m per storey.
design.floors.forEach((floor) => {
  const width = Math.max(...floor.rooms.flatMap((room) => room.polygon.map((point) => point.x)));
  const depth = Math.max(...floor.rooms.flatMap((room) => room.polygon.map((point) => point.y)));

  equal(`${floor.name} width`, width, DEMO_BLOCK_WIDTH_METERS);
  equal(`${floor.name} depth`, depth, DEMO_BLOCK_DEPTH_METERS);
});

// ---------------------------------------------------------------- zoning

design.floors.forEach((floor) => {
  const coverage = floorCoverage(floor, design.zones);

  check(`${floor.name} is fully zoned (${Math.round(coverage.ratio * 100)}%)`, coverage.complete);
  equal(`${floor.name} has no unzoned room`, coverage.uncoveredRooms.length, 0);
});

design.floors.forEach((floor) => {
  equal(
    `${floor.name} compartments do not overlap`,
    findOverlappingZones(design.zones, floor.id).map(([left, right]) => `${left}/${right}`),
    [],
  );
});

const riser = design.zones.find((zone) => zone.reference === 'Z6');
const southRooms = design.zones.find((zone) => zone.reference === 'Z4');

check('the riser exists', Boolean(riser));
check('the riser is nested inside Z4', riser?.parentZoneId === southRooms?.id);
equal('Z4 is drawn as four regions', zoneRegions(southRooms!).length, 4);
equal(
  'the riser is 1 m² to the nearest square metre',
  Math.round(polygonArea(zoneRegions(riser!)[0])),
  1,
);

const stair = design.zones.find((zone) => zone.reference === 'Z7');

check('the stair exists', Boolean(stair));
equal('the stair covers two storeys', zoneFloorIds(stair!).length, 2);
check(
  'the stair appears on the first floor',
  zonesOnFloor(design.zones, first.id).some((zone) => zone.id === stair!.id),
);

// ---------------------------------------------------------------- devices

const groundDevices = design.devices.filter((device) => device.floorId === ground.id);
const firstDevices = design.devices.filter((device) => device.floorId === first.id);

check('the ground floor is populated', groundDevices.length >= 40);
check('the first floor is populated', firstDevices.length >= 30);

const unassigned = design.devices.filter((device) => device.zoneId === null);

// Only the three yard devices sit outside a compartment, which is what a real zone plan shows.
equal('three unassigned devices', unassigned.length, 3);
equal(
  'the unassigned devices are the yard ones',
  unassigned.map((device) => device.kind).sort(),
  ['assembly_point', 'dry_riser', 'mcp_outdoor'],
);

// Sealing prefers the deepest compartment: the riser symbol belongs to the riser, not to Z4.
equal(
  'the riser symbol seals to the riser zone',
  design.devices.find((device) => device.kind === 'riser')?.zoneId,
  riser?.id,
);

equal(
  'the plant room detector stays in Z4',
  design.devices.find(
    (device) =>
      device.kind === 'heat_detector' && device.floorId === ground.id && device.position.x > 21,
  )?.zoneId,
  southRooms?.id,
);

// A vertical compartment claims devices on the storey it passes through.
const firstFloorStairDetector = firstDevices.find(
  (device) =>
    device.kind === 'smoke_optical' &&
    device.position.x >= 26.4 &&
    device.position.y >= 6 &&
    device.position.y < 8.6,
);

check('the first floor stair has a detector', Boolean(firstFloorStairDetector));
equal(
  'the first floor stair detector seals to the stair',
  firstFloorStairDetector?.zoneId,
  stair?.id,
);

// The drawing must stay readable: a zone plan annotates a symbol with its address, not with the
// device's full catalogue name, which would swamp a 55-device storey.
check(
  'device labels are short enough to print beside a symbol',
  design.devices.every((device) => device.label.trim().length > 0 && device.label.length <= 24),
);
check(
  'unnamed devices are annotated with their loop address',
  design.devices.filter((device) => device.label === device.address).length > design.devices.length / 2,
);

const addresses = design.devices.map((device) => device.address);

check(
  'every device has an address',
  addresses.every((address) => typeof address === 'string' && address.length > 0),
);
equal('addresses are unique', new Set(addresses).size, addresses.length);
check('ground floor devices are on loop 1', groundDevices.every((d) => d.address?.startsWith('L1-')));
check('first floor devices are on loop 2', firstDevices.every((d) => d.address?.startsWith('L2-')));
// ---------------------------------------------------------------- scene

const groundScene = buildFloorScene(design, ground.id);
const firstScene = buildFloorScene(design, first.id);

const groundRegions = design.zones
  .filter((zone) => zoneFloorIds(zone).includes(ground.id))
  .reduce((total, zone) => total + zoneRegions(zone).length, 0);

equal('the ground scene draws every room', groundScene.rooms.length, ground.rooms.length);
equal('the ground scene draws every zone region', groundScene.zones.length, groundRegions);
equal('the ground scene draws every device', groundScene.devices.length, groundDevices.length);
equal('the ground scene draws every external area', groundScene.areas.length, 3);
equal('the first scene draws every room', firstScene.rooms.length, first.rooms.length);
check('the scene carries the panel in its legend', groundScene.deviceLegend.some((entry) => entry.kind === 'panel'));
check(
  'the stair legend reports two storeys',
  firstScene.zoneLegend.some((entry) => entry.reference === 'Z7' && entry.floorCount === 2),
);
check(
  'the riser legend reports its parent compartment',
  groundScene.zoneLegend.some((entry) => entry.reference === 'Z6' && entry.nestedInReference === 'Z4'),
);
equal(
  'every zoned ground device is counted in the legend',
  groundScene.zoneLegend.reduce((total, entry) => total + entry.deviceCount, 0),
  groundDevices.filter((device) => Boolean(device.zoneId)).length,
);
check('the viewport is usable', groundScene.viewport.scale > 0 && groundScene.viewport.width > 120);
check(
  'both storeys share one transform, so the stair lines up',
  Math.abs(groundScene.viewport.scale - firstScene.viewport.scale) < 1e-9 &&
    Math.abs(groundScene.viewport.offsetX - firstScene.viewport.offsetX) < 1e-9,
);

// ---------------------------------------------------------------- sanitiser

const roundTripped = sanitiseDesign(JSON.parse(JSON.stringify(design)));

check('the design survives the sanitiser', roundTripped !== null);
equal('sanitiser keeps the storeys', roundTripped?.floors.length, design.floors.length);
equal('sanitiser keeps the compartments', roundTripped?.zones.length, design.zones.length);
equal('sanitiser keeps the devices', roundTripped?.devices.length, design.devices.length);
equal('sanitiser keeps the external areas', roundTripped?.areas.length, design.areas.length);
equal(
  'sanitiser keeps the nesting',
  roundTripped?.zones.find((zone) => zone.reference === 'Z6')?.parentZoneId,
  riser?.parentZoneId,
);
equal(
  'sanitiser keeps the vertical compartment',
  roundTripped?.zones.find((zone) => zone.reference === 'Z7')?.spansFloorIds,
  stair?.spansFloorIds,
);
equal(
  'sanitiser keeps the device sealing',
  roundTripped?.devices.filter((device) => device.zoneId === null).length,
  3,
);
equal('sanitiser keeps the title block', roundTripped?.sheet.jobReference, 'DEMO-001');
equal(
  'sanitiser keeps every room name',
  roundTripped?.floors[0].rooms.map((room) => room.name),
  ground.rooms.map((room) => room.name),
);

// A tampered document must lose nonsense rather than the whole plan.
const tampered = JSON.parse(JSON.stringify(design));

tampered.zones[0].parentZoneId = 'zone-that-does-not-exist';
tampered.zones[1].parentZoneId = tampered.zones[1].id;

const repaired = sanitiseDesign(tampered);

equal('a missing parent is dropped', repaired?.zones[0].parentZoneId, null);
equal('a self parent is dropped', repaired?.zones[1].parentZoneId, null);
equal('the rest of the plan survives', repaired?.devices.length, design.devices.length);
equal(
  'the rest of the zoning survives',
  repaired?.zones.filter((zone) => Boolean(zone.parentZoneId)).length,
  1,
);

// ---------------------------------------------------------------- summary

const summary = summariseDemoDesign(design);

equal('summary storeys', summary.floors, 2);
equal('summary compartments', summary.zones, 13);
equal('summary devices', summary.devices, design.devices.length);
equal('summary external areas', summary.areas, 3);
equal('summary counts the vertical compartment', summary.verticalZones, 1);
equal('summary counts the nested compartment', summary.nestedZones, 1);
equal('the whole floor plate is zoned', Math.round(summary.zoneCoverageRatio * 100), 100);
check(
  'the floor area is two 30 m × 14 m plates',
  Math.abs(summary.floorAreaSquareMeters - 2 * DEMO_BLOCK_WIDTH_METERS * DEMO_BLOCK_DEPTH_METERS) < 0.01,
);
check('the area of each plate is what the blueprint says', DEMO_BLOCK_WIDTH_METERS * DEMO_BLOCK_DEPTH_METERS === 420);

// ---------------------------------------------------------------- determinism

equal('the plan is reproducible', JSON.stringify(createDemoDesign()), JSON.stringify(design));

console.log(`Demonstration plan smoke test passed — ${checks} assertions.`);
console.log(
  `${summary.floors} storeys · ${summary.zones} compartments · ${summary.devices} devices · ` +
    `${summary.areas} external areas · ${summary.floorAreaSquareMeters} m² · ` +
    `${Math.round(summary.zoneCoverageRatio * 100)}% zoned`,
);

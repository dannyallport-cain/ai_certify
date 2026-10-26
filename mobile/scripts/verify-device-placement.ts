/**
 * Verifies the 3D device placement maths: that a tap on the canvas maps to a world position on the
 * surface under the finger, and that this position projects back to the same pixel at every camera
 * angle the placement view allows.
 *
 * Run with: npx tsx scripts/verify-device-placement.ts
 */
import {
  generateFireAlarmPlan3D,
  mapProjectedPoint,
  pickPlan3DPlacement,
  projectVertex,
  resolvePlan3DCamera,
  resolvePlan3DRooms,
} from '../modules/fire-alarm-roomplan/plan3d';
import {
  resolveDeviceHeightMeters,
  resolveDeviceMounting,
} from '../modules/fire-alarm-roomplan/plan3d/devices';
import type { Plan3DVertex } from '../modules/fire-alarm-roomplan/plan3d/plan3d-types';
import type {
  FireAlarmDeviceDetection,
  FireAlarmScanSession,
} from '../modules/fire-alarm-roomplan/types';
import { quadFillSlices } from '../components/roomplan/quad-fill-slices';

let failures = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS  ${name}`);
    return;
  }

  failures += 1;
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

const VIEWPORT = { width: 360, height: 380, padding: 26 };
const ROOM_HEIGHT_METERS = 2.7;

const session: FireAlarmScanSession = {
  id: 'verify-session',
  status: 'completed',
  metadata: { startedAt: new Date('2026-01-01T00:00:00Z').toISOString(), platform: 'ios' },
  floorplan: {
    units: 'meters',
    rooms: [
      {
        id: 'room-1',
        name: 'Kitchen',
        outline: [
          { x: 0, y: 0 },
          { x: 6, y: 0 },
          { x: 6, y: 4 },
          { x: 0, y: 4 },
        ],
      },
    ],
    deviceCount: 1,
    wallCount: 4,
  },
  devices: [{ id: 'detector-1', type: 'detector' }],
};

const rooms = resolvePlan3DRooms(session, ROOM_HEIGHT_METERS).rooms;

check('one room is resolved', rooms.length === 1, String(rooms.length));
check('room keeps its footprint', rooms[0].footprint.length === 4, String(rooms[0].footprint.length));
check('room keeps its captured name', rooms[0].name === 'Kitchen', rooms[0].name);

const camera = resolvePlan3DCamera({
  projection: 'isometric',
  yawDegrees: 45,
  pitchDegrees: 32,
  zoom: 1,
  wallHeightMeters: ROOM_HEIGHT_METERS,
});

const plan = generateFireAlarmPlan3D(session, {
  camera: { ...camera, projection: 'isometric' },
  wallHeightMeters: ROOM_HEIGHT_METERS,
  viewport: VIEWPORT,
});

function screenOf(vertex: Plan3DVertex) {
  return mapProjectedPoint(projectVertex(vertex, plan.camera), plan.viewport);
}

// 1. A point on the floor round-trips through the picker.
const floorWorld = { x: 2.5, y: 1.5, z: 0 };
const floorTap = screenOf(floorWorld);
const floorPick = pickPlan3DPlacement({
  point: floorTap,
  rooms,
  camera: plan.camera,
  viewport: plan.viewport,
});

check('floor tap hits a surface', floorPick !== null);
check('floor tap reports the floor', floorPick?.surfaceKind === 'floor', String(floorPick?.surfaceKind));
check('floor tap keeps the room', floorPick?.roomId === 'room-1', String(floorPick?.roomId));
check(
  'floor tap lands within 1 cm',
  Boolean(
    floorPick &&
      Math.abs(floorPick.position.x - floorWorld.x) < 0.01 &&
      Math.abs(floorPick.position.y - floorWorld.y) < 0.01,
  ),
  floorPick ? `${floorPick.position.x}, ${floorPick.position.y}` : 'no pick',
);
check(
  'floor tap is drawn under the finger',
  Boolean(
    floorPick && Math.hypot(floorPick.point.x - floorTap.x, floorPick.point.y - floorTap.y) < 0.75,
  ),
  floorPick ? `${floorPick.point.x}, ${floorPick.point.y}` : 'no pick',
);
// 2. Pinch-zoom does not change which world point the surface is.
const zoomedPlan = generateFireAlarmPlan3D(session, {
  camera: { ...camera, zoom: 2.4 },
  wallHeightMeters: ROOM_HEIGHT_METERS,
  viewport: VIEWPORT,
});

const zoomedPick = pickPlan3DPlacement({
  point: mapProjectedPoint(projectVertex(floorWorld, zoomedPlan.camera), zoomedPlan.viewport),
  rooms,
  camera: zoomedPlan.camera,
  viewport: zoomedPlan.viewport,
});

check(
  'zooming keeps the same world point',
  Boolean(
    zoomedPick &&
      Math.abs(zoomedPick.position.x - floorWorld.x) < 0.02 &&
      Math.abs(zoomedPick.position.y - floorWorld.y) < 0.02,
  ),
  zoomedPick ? `${zoomedPick.position.x}, ${zoomedPick.position.y}` : 'no pick',
);

// 3. Every angle round-trips, and nothing lands outside the room.
const yaws = [0, 17, 45, 90, 137, 200, 271, 315, 359];
const pitches = [8, 20, 32, 55, 74, 89];
const tapsPerAxis = 9;

let roundTripChecks = 0;
let roundTripFailures = 0;
let outOfBounds = 0;
let misses = 0;
let largestStandOff = 0;

for (const yawDegrees of yaws) {
  for (const pitchDegrees of pitches) {
    const angledPlan = generateFireAlarmPlan3D(session, {
      camera: {
        projection: 'isometric',
        yawDegrees,
        pitchDegrees,
        zoom: 1,
        wallHeightMeters: ROOM_HEIGHT_METERS,
      },
      wallHeightMeters: ROOM_HEIGHT_METERS,
      viewport: VIEWPORT,
    });

    for (let column = 0; column < tapsPerAxis; column += 1) {
      for (let row = 0; row < tapsPerAxis; row += 1) {
        const point = {
          x: ((column + 0.5) / tapsPerAxis) * VIEWPORT.width,
          y: ((row + 0.5) / tapsPerAxis) * VIEWPORT.height,
        };

        const picked = pickPlan3DPlacement({
          point,
          rooms,
          camera: angledPlan.camera,
          viewport: angledPlan.viewport,
        });

        if (!picked) {
          misses += 1;
          continue;
        }

        roundTripChecks += 1;

        const redrawn = mapProjectedPoint(
          projectVertex(picked.surfacePoint, angledPlan.camera),
          angledPlan.viewport,
        );
        const drift = Math.hypot(redrawn.x - point.x, redrawn.y - point.y);

        const standOff = Math.hypot(
          picked.position.x - picked.surfacePoint.x,
          picked.position.y - picked.surfacePoint.y,
          picked.position.z - picked.surfacePoint.z,
        );

        if (standOff > largestStandOff) {
          largestStandOff = standOff;
        }

        if (drift > 0.75) {
          roundTripFailures += 1;

          if (roundTripFailures <= 3) {
            console.log(
              `      drift ${drift.toFixed(2)}px at yaw ${yawDegrees} pitch ${pitchDegrees}`,
            );
          }
        }

        const withinRoom =
          picked.position.x >= -0.2 &&
          picked.position.x <= 6.2 &&
          picked.position.y >= -0.2 &&
          picked.position.y <= 4.2 &&
          picked.position.z >= -0.01 &&
          picked.position.z <= ROOM_HEIGHT_METERS;

        if (!withinRoom) {
          outOfBounds += 1;
        }
      }
    }
  }
}

check(
  `every pick redraws under its own tap (${roundTripChecks} taps)`,
  roundTripFailures === 0,
  `${roundTripFailures} drifted`,
);
check(
  `no pick lands outside the room (${roundTripChecks} taps)`,
  outOfBounds === 0,
  `${outOfBounds} outside`,
);
check('taps outside the drawing miss instead of snapping', misses > 0, `${misses} misses`);
check(
  'a placed device never floats far from its surface',
  largestStandOff < 0.35,
  `${largestStandOff.toFixed(2)} m`,
);
// 4. Plan view puts the cross on the floor at the room centre.
const topDownPlan = generateFireAlarmPlan3D(session, {
  camera: {
    projection: 'isometric',
    yawDegrees: 0,
    pitchDegrees: 89,
    zoom: 1,
    wallHeightMeters: ROOM_HEIGHT_METERS,
  },
  wallHeightMeters: ROOM_HEIGHT_METERS,
  viewport: VIEWPORT,
});

const centreTap = mapProjectedPoint(
  projectVertex({ x: 3, y: 2, z: 0 }, topDownPlan.camera),
  topDownPlan.viewport,
);

const centrePick = pickPlan3DPlacement({
  point: centreTap,
  rooms,
  camera: topDownPlan.camera,
  viewport: topDownPlan.viewport,
});

check('plan view pick lands on the floor', centrePick?.surfaceKind === 'floor', String(centrePick?.surfaceKind));
check(
  'plan view pick is at the room centre',
  Boolean(
    centrePick &&
      Math.abs(centrePick.position.x - 3) < 0.05 &&
      Math.abs(centrePick.position.y - 2) < 0.05,
  ),
  centrePick ? `${centrePick.position.x}, ${centrePick.position.y}` : 'no pick',
);

const ceilingOffered = pickPlan3DPlacement({
  point: centreTap,
  rooms,
  camera: topDownPlan.camera,
  viewport: topDownPlan.viewport,
  includeCeiling: true,
});

check('a ceiling target is only offered on request', ceilingOffered !== null);

// 5. A placed mounting outranks the per-type default.
const detectorOnWall: FireAlarmDeviceDetection = {
  id: 'placed',
  type: 'detector',
  location: { x: 2, y: 0.12, z: 1.4 },
  metadata: { mounting: 'wall' },
};

const detectorOnCeiling: FireAlarmDeviceDetection = {
  id: 'ceiling',
  type: 'detector',
  location: { x: 2, y: 2, z: ROOM_HEIGHT_METERS },
  metadata: { mounting: 'ceiling' },
};

const panelOnFloor: FireAlarmDeviceDetection = {
  id: 'floor',
  type: 'panel',
  location: { x: 1, y: 1, z: 0.02 },
  metadata: { mounting: 'floor' },
};

const unplacedPanel: FireAlarmDeviceDetection = { id: 'unplaced', type: 'panel' };

const wallHeight = resolveDeviceHeightMeters(detectorOnWall, ROOM_HEIGHT_METERS);

check('wall placement keeps its height', Math.abs(wallHeight - 1.4) < 1e-6, String(wallHeight));
check(
  'wall placement stays wall mounted',
  resolveDeviceMounting(detectorOnWall, wallHeight, ROOM_HEIGHT_METERS) === 'wall',
  resolveDeviceMounting(detectorOnWall, wallHeight, ROOM_HEIGHT_METERS),
);
check(
  'ceiling placement sits at the ceiling',
  Math.abs(resolveDeviceHeightMeters(detectorOnCeiling, ROOM_HEIGHT_METERS) - ROOM_HEIGHT_METERS) < 1e-6,
  String(resolveDeviceHeightMeters(detectorOnCeiling, ROOM_HEIGHT_METERS)),
);
check(
  'floor placement sits on the floor',
  resolveDeviceHeightMeters(panelOnFloor, ROOM_HEIGHT_METERS) < 0.1,
  String(resolveDeviceHeightMeters(panelOnFloor, ROOM_HEIGHT_METERS)),
);
check(
  'an unplaced panel falls back to its type default',
  Math.abs(resolveDeviceHeightMeters(unplacedPanel, ROOM_HEIGHT_METERS) - 1.3) < 1e-6,
  String(resolveDeviceHeightMeters(unplacedPanel, ROOM_HEIGHT_METERS)),
);

// 6. The surface fills rasterise the projected quad, not something else.
const rectangleSlices = quadFillSlices({ origin: { x: 10, y: 20 }, u: { x: 100, y: 0 }, v: { x: 0, y: 40 } });

check('a rectangle fill produces slices', rectangleSlices.length > 0, String(rectangleSlices.length));
check(
  'rectangle slices start at the quad origin',
  rectangleSlices.every((slice) => Math.abs(slice.left - 10) < 1e-6 && Math.abs(slice.width - 100) < 1e-6),
  JSON.stringify(rectangleSlices[0]),
);
check(
  'rectangle slices cover the quad height',
  Math.abs(rectangleSlices[0].top - 20) < 1.5 &&
    Math.abs(rectangleSlices[rectangleSlices.length - 1].top + 3 - 60) < 4,
  `${rectangleSlices[0].top}..${rectangleSlices[rectangleSlices.length - 1].top}`,
);

const shearedSlices = quadFillSlices({ origin: { x: 0, y: 0 }, u: { x: 120, y: 0 }, v: { x: 30, y: 60 } });
const middleSlice = shearedSlices[Math.floor(shearedSlices.length / 2)];

check('a sheared fill produces slices', shearedSlices.length > 1, String(shearedSlices.length));
check(
  'sheared slices follow the lean of the quad',
  Math.abs(middleSlice.left - 15) < 4,
  String(middleSlice.left),
);
check(
  'sheared slices keep the quad width',
  shearedSlices.every((slice) => Math.abs(slice.width - 120) < 1e-6),
  String(shearedSlices[0].width),
);

check(
  'a degenerate quad fills nothing',
  quadFillSlices({ origin: { x: 0, y: 0 }, u: { x: 0, y: 0 }, v: { x: 0, y: 0 } }).length === 0,
);
check(
  'the slice cap is respected',
  quadFillSlices(
    { origin: { x: 0, y: 0 }, u: { x: 50, y: 0 }, v: { x: 0, y: 2000 } },
    { maxSlices: 12 },
  ).length <= 13,
);

if (failures > 0) {
  console.error(`\n${failures} device placement check(s) failed`);
  process.exit(1);
}

console.log('\nall device placement checks passed');

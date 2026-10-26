import {
  CEILING_VOID_OFFSET_METERS,
  generateFireAlarmPlan3D,
  getDefaultMounting,
  getMountingCamera,
  getMountingOptions,
  getPlan3DDeviceStyle,
  mapProjectedPoint,
  pickPlan3DPlacement,
  projectVertex,
  resolvePlan3DCamera,
  resolvePlan3DRooms,
} from '../modules/fire-alarm-roomplan/plan3d';
import { resolveDeviceHeightMeters, resolveDeviceMounting } from '../modules/fire-alarm-roomplan/plan3d/devices';
import { buildPlan3DLegend } from '../modules/fire-alarm-roomplan/plan3d/annotations';
import type {
  FireAlarmDeviceDetection,
  FireAlarmScanSession,
} from '../modules/fire-alarm-roomplan/types';

/**
 * Guards the mounting model: a detector asked for on the ceiling must land on the ceiling, a void
 * placement must sit above it, and a wall placement must pick a wall face rather than snapping to
 * the floor. The first few checks reproduce the original bug, where the placement view never
 * offered a ceiling target at all.
 */

let failures = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS  ${name}`);
    return;
  }

  failures += 1;
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

const VIEWPORT = { width: 360, height: 340, padding: 26 };
const ROOM_HEIGHT_METERS = 2.7;
const ROOM_CENTRE = { x: 3, y: 2 };

const session: FireAlarmScanSession = {
  id: 'mounting-session',
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
    deviceCount: 0,
    wallCount: 4,
  },
  devices: [],
};

const rooms = resolvePlan3DRooms(session, ROOM_HEIGHT_METERS).rooms;

function planFor(mounting: Parameters<typeof getMountingCamera>[0]) {
  const preset = getMountingCamera(mounting);

  return generateFireAlarmPlan3D(session, {
    camera: {
      projection: preset.projection,
      yawDegrees: preset.yawDegrees,
      pitchDegrees: preset.pitchDegrees,
      zoom: 1,
      wallHeightMeters: ROOM_HEIGHT_METERS,
    },
    wallHeightMeters: ROOM_HEIGHT_METERS,
    viewport: VIEWPORT,
  });
}

function screenOf(plan: ReturnType<typeof planFor>, vertex: { x: number; y: number; z: number }) {
  return mapProjectedPoint(projectVertex(vertex, plan.camera), plan.viewport);
}

// --- Per-type mounting rules -------------------------------------------------------------

check('a detector defaults to the ceiling', getDefaultMounting('detector') === 'ceiling');
check('a panel defaults to the wall', getDefaultMounting('panel') === 'wall');
check('an interface defaults to the wall', getDefaultMounting('interface') === 'wall');

const panelOptions = getMountingOptions('panel').map((option) => option.mounting);
check('a panel is only offered a wall', panelOptions.length === 1 && panelOptions[0] === 'wall');

const interfaceOptions = getMountingOptions('interface').map((option) => option.mounting);
check(
  'an interface is only offered a wall',
  interfaceOptions.length === 1 && interfaceOptions[0] === 'wall',
);

const sounderOptions = getMountingOptions('sounder').map((option) => option.mounting);
check(
  'a sounder is offered a wall and a ceiling',
  sounderOptions.includes('wall') && sounderOptions.includes('ceiling'),
);

const detectorOptions = getMountingOptions('detector').map((option) => option.mounting);
check(
  'a detector is offered the ceiling void',
  detectorOptions.includes('ceiling_void'),
);
check(
  'a detector is not offered the floor',
  !detectorOptions.includes('floor'),
);

// --- Camera views suit the surface -------------------------------------------------------

check(
  'the ceiling view is a plan view',
  getMountingCamera('ceiling').projection === 'top-down' &&
    getMountingCamera('ceiling').pitchDegrees === 90,
);
check(
  'the void view is a plan view',
  getMountingCamera('ceiling_void').projection === 'top-down',
);
check(
  'the wall view is a near-elevation',
  getMountingCamera('wall').pitchDegrees > 0 && getMountingCamera('wall').pitchDegrees < 45,
);

// --- The original bug: a ceiling tap used to land on the floor --------------------------

const ceilingPlan = planFor('ceiling');
const centreTap = screenOf(ceilingPlan, { ...ROOM_CENTRE, z: 0 });

const ceilingPick = pickPlan3DPlacement({
  point: centreTap,
  rooms,
  camera: ceilingPlan.camera,
  viewport: ceilingPlan.viewport,
  includeCeiling: true,
  surfaceKinds: ['ceiling'],
});

check('a ceiling tap hits a surface', ceilingPick !== null);
check(
  'a ceiling tap mounts to the ceiling',
  ceilingPick?.mounting === 'ceiling',
  String(ceilingPick?.mounting),
);
check(
  'a ceiling tap sits at ceiling height',
  Boolean(ceilingPick && Math.abs(ceilingPick.position.z - (ROOM_HEIGHT_METERS - 0.06)) < 1e-6),
  ceilingPick ? ceilingPick.position.z.toFixed(3) : 'no pick',
);
check(
  'a ceiling tap keeps the room position',
  Boolean(
    ceilingPick &&
      Math.abs(ceilingPick.position.x - ROOM_CENTRE.x) < 0.05 &&
      Math.abs(ceilingPick.position.y - ROOM_CENTRE.y) < 0.05,
  ),
  ceilingPick ? `${ceilingPick.position.x.toFixed(2)}, ${ceilingPick.position.y.toFixed(2)}` : 'no pick',
);

// The same tap with no ceiling target offered reproduces the reported behaviour: the ray falls
// through to the floor, which is why the detector never aligned to the ceiling.
const floorFallbackPick = pickPlan3DPlacement({
  point: centreTap,
  rooms,
  camera: ceilingPlan.camera,
  viewport: ceilingPlan.viewport,
  includeCeiling: false,
});

check(
  'without a ceiling target the same tap lands on the floor (the old behaviour)',
  floorFallbackPick?.mounting === 'floor',
  String(floorFallbackPick?.mounting),
);

// --- Ceiling void -----------------------------------------------------------------------

const voidPlan = planFor('ceiling_void');
const voidPick = pickPlan3DPlacement({
  point: screenOf(voidPlan, { ...ROOM_CENTRE, z: 0 }),
  rooms,
  camera: voidPlan.camera,
  viewport: voidPlan.viewport,
  includeCeiling: true,
  includeCeilingVoid: true,
  surfaceKinds: ['ceiling_void'],
});

check(
  'a void tap mounts into the ceiling void',
  voidPick?.mounting === 'ceiling_void',
  String(voidPick?.mounting),
);
check(
  'a void tap sits above the ceiling',
  Boolean(
    voidPick &&
      Math.abs(voidPick.position.z - (ROOM_HEIGHT_METERS + CEILING_VOID_OFFSET_METERS)) < 1e-6,
  ),
  voidPick ? voidPick.position.z.toFixed(3) : 'no pick',
);

// --- Wall ---------------------------------------------------------------------------------

const wallPlan = planFor('wall');
const wallPick = pickPlan3DPlacement({
  point: { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 },
  rooms,
  camera: wallPlan.camera,
  viewport: wallPlan.viewport,
  surfaceKinds: ['wall'],
});

check('a wall tap hits a wall', wallPick?.mounting === 'wall', String(wallPick?.mounting));
check(
  'a wall tap lands at a plausible mounting height',
  Boolean(wallPick && wallPick.position.z >= 0.3 && wallPick.position.z <= ROOM_HEIGHT_METERS - 0.06),
  wallPick ? wallPick.position.z.toFixed(2) : 'no pick',
);

// --- Device resolution agrees with the placement -----------------------------------------

const voidDetector: FireAlarmDeviceDetection = {
  id: 'void-detector',
  type: 'detector',
  location: { x: 3, y: 2, z: ROOM_HEIGHT_METERS + CEILING_VOID_OFFSET_METERS },
  metadata: { mounting: 'ceiling_void' },
};

const roomDetector: FireAlarmDeviceDetection = {
  id: 'room-detector',
  type: 'detector',
  location: { x: 1, y: 1, z: ROOM_HEIGHT_METERS },
  metadata: { mounting: 'ceiling' },
};

check(
  'a void device keeps its height above the ceiling',
  Math.abs(
    resolveDeviceHeightMeters(voidDetector, ROOM_HEIGHT_METERS) -
      (ROOM_HEIGHT_METERS + CEILING_VOID_OFFSET_METERS),
  ) < 1e-6,
  String(resolveDeviceHeightMeters(voidDetector, ROOM_HEIGHT_METERS)),
);
check(
  'a void device reports the void mounting',
  resolveDeviceMounting(
    voidDetector,
    resolveDeviceHeightMeters(voidDetector, ROOM_HEIGHT_METERS),
    ROOM_HEIGHT_METERS,
  ) === 'ceiling_void',
);
check(
  'a ceiling device sits at the ceiling',
  resolveDeviceHeightMeters(roomDetector, ROOM_HEIGHT_METERS) === ROOM_HEIGHT_METERS,
);

// --- Void devices look different and are counted apart ------------------------------------

const voidStyle = getPlan3DDeviceStyle('detector', 'ceiling_void');
const roomStyle = getPlan3DDeviceStyle('detector', 'ceiling');

check('a void device is styled as in the void', voidStyle.inCeilingVoid);
check('a ceiling device is not styled as in the void', !roomStyle.inCeilingVoid);
check('a void device is labelled distinctly', voidStyle.label !== roomStyle.label);

const mixedRooms = resolvePlan3DRooms(
  { ...session, devices: [voidDetector, roomDetector] },
  ROOM_HEIGHT_METERS,
).rooms;

const legend = buildPlan3DLegend(mixedRooms);
const voidEntries = legend.filter((entry) => entry.inCeilingVoid);
const roomEntries = legend.filter((entry) => !entry.inCeilingVoid);

check('the legend lists the void device separately', voidEntries.length === 1, `${voidEntries.length}`);
check('the legend keeps the in-room detector', roomEntries.length === 1, `${roomEntries.length}`);
check(
  'the legend counts both detectors once each',
  voidEntries[0]?.count === 1 && roomEntries[0]?.count === 1,
);

// --- Every mounting view can still place something ---------------------------------------

(['ceiling', 'ceiling_void', 'wall', 'floor'] as const).forEach((mounting) => {
  const plan = planFor(mounting);
  const camera = resolvePlan3DCamera({ ...plan.camera });

  check(
    `the ${mounting} view resolves a sane camera`,
    Number.isFinite(camera.zoom) && camera.pitchDegrees >= 0 && camera.pitchDegrees <= 90,
  );
});

if (failures > 0) {
  console.error(`\n${failures} mounting placement check(s) failed`);
  process.exit(1);
}

console.log('\nall mounting placement checks passed');

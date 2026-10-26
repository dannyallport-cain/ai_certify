import {
  createSampleScanSession,
  generateFireAlarmPlan3D,
  resolvePlan3DCamera,
  type FireAlarmPlan3D,
} from '../modules/fire-alarm-roomplan/plan3d';

/**
 * Guards the plan screen's gesture wiring: the orbit camera hands yaw, pitch and zoom to the
 * generator, so each of those values must actually change the drawing. If the generator ignored
 * one of them, dragging or pinching would look like a dead gesture on the device.
 */

interface CheckResult {
  label: string;
  passed: boolean;
}

const VIEWPORT = { width: 360, height: 300, padding: 26 };
const CENTRE = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };

const results: CheckResult[] = [];

function check(label: string, passed: boolean): void {
  results.push({ label, passed });
}

function planFor(camera: {
  yawDegrees?: number;
  pitchDegrees?: number;
  zoom?: number;
}): FireAlarmPlan3D {
  return generateFireAlarmPlan3D(createSampleScanSession(), {
    camera: { projection: 'isometric', ...camera },
    viewport: VIEWPORT,
  });
}

function markerSignature(plan: FireAlarmPlan3D): string {
  return plan.markers
    .map((marker) => `${Math.round(marker.position.x)},${Math.round(marker.position.y)}`)
    .join('|');
}

function farthestMarkerDistanceFromCentre(plan: FireAlarmPlan3D): number {
  return plan.markers.reduce((farthest, marker) => {
    const distance = Math.hypot(marker.position.x - CENTRE.x, marker.position.y - CENTRE.y);

    return Math.max(farthest, distance);
  }, 0);
}

const basePlan = planFor({ yawDegrees: 45, pitchDegrees: 30, zoom: 1 });
const rotatedPlan = planFor({ yawDegrees: 90, pitchDegrees: 30, zoom: 1 });
const tiltedPlan = planFor({ yawDegrees: 45, pitchDegrees: 60, zoom: 1 });
const zoomedPlan = planFor({ yawDegrees: 45, pitchDegrees: 30, zoom: 2 });

check('the sample plan draws markers', basePlan.markers.length > 0);
check('yaw changes the drawing', markerSignature(basePlan) !== markerSignature(rotatedPlan));
check('pitch changes the drawing', markerSignature(basePlan) !== markerSignature(tiltedPlan));
check(
  'zoom doubles the viewport scale',
  Math.abs(zoomedPlan.viewport.scale - basePlan.viewport.scale * 2) < 1e-6,
);
check(
  'zoom pushes geometry away from the centre',
  farthestMarkerDistanceFromCentre(zoomedPlan) > farthestMarkerDistanceFromCentre(basePlan),
);
check('a camera defaults to zoom 1', resolvePlan3DCamera({}).zoom === 1);
check('zoom above the ceiling is clamped', resolvePlan3DCamera({ zoom: 99 }).zoom === 4);
check('zoom below the floor is clamped', resolvePlan3DCamera({ zoom: 0.01 }).zoom === 0.2);
check(
  'yaw is normalised',
  resolvePlan3DCamera({ yawDegrees: 405 }).yawDegrees === 45,
);

for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'}  ${result.label}`);
}

const failures = results.filter((result) => !result.passed);

if (failures.length > 0) {
  console.error(`\n${failures.length} plan 3D orbit check(s) failed`);
  process.exit(1);
}

console.log('\nall plan 3D orbit checks passed');

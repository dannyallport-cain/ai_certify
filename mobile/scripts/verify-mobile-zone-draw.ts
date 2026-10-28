import { createSampleScanSession, generateFireAlarmPlan3D } from '../modules/fire-alarm-roomplan/plan3d';
import { unprojectFloorPoint } from '../modules/fire-alarm-roomplan/plan3d/projection';
import { createZoneFromRectangle } from '../modules/fire-alarm-roomplan/plan3d/zone-presets';
import {
  PLAN3D_ZONE_COLOURS,
  sanitiseZones,
  zoneAreaSquareMeters,
} from '../modules/fire-alarm-roomplan/plan3d/zone-model';
import type { Plan3DZone } from '../modules/fire-alarm-roomplan/plan3d/plan3d-types';

/**
 * The phone draws zones by unprojecting two screen points onto the floor and building a rectangle,
 * which is the same maths the browser editor uses. This covers that path so a drag on the device
 * cannot silently produce a zone in the wrong place or an empty one.
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

const VIEWPORT = { width: 900, height: 600, padding: 32 };
const session = createSampleScanSession();

const plan = generateFireAlarmPlan3D(session, {
  camera: {
    projection: 'top-down',
    yawDegrees: 0,
    pitchDegrees: 90,
    zoom: 1,
    showCeiling: false,
    showFloorGrid: true,
    showDevices: true,
    showLabels: true,
  },
  colourScheme: 'schematic',
  viewport: VIEWPORT,
});

const centre = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };

// --- Unprojection -------------------------------------------------------------------------

const centreWorld = unprojectFloorPoint(centre, plan.camera, plan.viewport);
check('a tap in plan view maps onto the floor', centreWorld !== null);

check(
  'the centre of the drawing is not at the origin',
  Boolean(centreWorld && (Math.abs(centreWorld.x) > 0.01 || Math.abs(centreWorld.y) > 0.01)),
  centreWorld ? `${centreWorld.x.toFixed(2)}, ${centreWorld.y.toFixed(2)}` : 'null',
);

const outside = unprojectFloorPoint({ x: -50, y: -50 }, plan.camera, plan.viewport);
check('a tap off the drawing is still a floor point', outside !== null);

// --- Rectangle from two taps --------------------------------------------------------------

const startTap = { x: centre.x - 120, y: centre.y - 90 };
const endTap = { x: centre.x + 120, y: centre.y + 90 };

const startWorld = unprojectFloorPoint(startTap, plan.camera, plan.viewport);
const endWorld = unprojectFloorPoint(endTap, plan.camera, plan.viewport);

check('both drag corners unproject', Boolean(startWorld && endWorld));

const zone = startWorld && endWorld ? createZoneFromRectangle(startWorld, endWorld, []) : null;

check('a drag creates a zone', zone !== null);
check('the zone has four corners', zone?.polygon.length === 4, String(zone?.polygon.length));
check('the zone has a real area', Boolean(zone && zoneAreaSquareMeters(zone) > 0.2));
check('the zone gets the first palette colour', zone?.colour === PLAN3D_ZONE_COLOURS[0]);
check('the zone is referenced Z1', zone?.reference === 'Z1', zone?.reference);

const tinyDrag = startWorld ? createZoneFromRectangle(startWorld, startWorld, []) : null;
check('a drag with no distance creates nothing', tinyDrag === null);

// --- The drawn zone reaches the plan ------------------------------------------------------

const zones: Plan3DZone[] = zone ? [zone] : [];
const zonedPlan = generateFireAlarmPlan3D(session, {
  camera: plan.camera,
  colourScheme: 'schematic',
  viewport: VIEWPORT,
  zones,
});

check('the generated plan draws the drawn zone', zonedPlan.zones.length === 1);
check('the drawn zone is filled with its colour', zonedPlan.zones[0]?.fill === zone?.colour);

// --- It survives publishing ---------------------------------------------------------------

const roundTripped = sanitiseZones(JSON.parse(JSON.stringify(zones)) as Plan3DZone[]);
check('the zone survives the publish round trip', roundTripped.length === 1);
check('the round tripped zone keeps its corners', roundTripped[0]?.polygon.length === 4);
check('the round tripped zone keeps its colour', roundTripped[0]?.colour === zone?.colour);

// --- Colour cycling matches the palette ----------------------------------------------------

const first = PLAN3D_ZONE_COLOURS[0];
const second = PLAN3D_ZONE_COLOURS[1 % PLAN3D_ZONE_COLOURS.length];
check('the palette has more than one colour so cycling is visible', first !== second);

if (failures > 0) {
  console.error(`\n${failures} mobile zone draw check(s) failed`);
  process.exit(1);
}

console.log('\nall mobile zone draw checks passed');

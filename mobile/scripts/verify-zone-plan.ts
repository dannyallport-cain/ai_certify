import {
  createSampleScanSession,
  generateFireAlarmPlan3D,
  renderFireAlarmPlan3DSvg,
} from '../modules/fire-alarm-roomplan/plan3d';
import { createZoneFromRectangle } from '../modules/fire-alarm-roomplan/plan3d/zone-presets';
import { normaliseZonePolygon, sanitiseZones } from '../modules/fire-alarm-roomplan/plan3d/zone-model';
import { normaliseLegendConfig } from '../modules/fire-alarm-roomplan/plan3d/legend-config';
import type { Plan3DZone } from '../modules/fire-alarm-roomplan/plan3d/plan3d-types';

/**
 * Guards the zone pipeline the hosted viewer depends on: a drawn zone must survive storage,
 * reach the generated plan as a fill, and appear in the exported SVG alongside the zone key,
 * the device key and the company block.
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

const legend = normaliseLegendConfig({
  planTitle: 'Zone plan — Riverside House',
  siteName: 'Riverside House',
  jobReference: 'JOB-4471',
  company: {
    name: 'Northgate Fire Safety Ltd',
    addressLines: ['12 Mill Lane', 'Leeds LS1 4AB'],
    phone: '0113 000 0000',
    email: 'plans@northgate.example',
    website: 'northgate.example',
    accreditation: 'BAFE SP101',
  },
});

function buildPlan(zones: Plan3DZone[]) {
  return generateFireAlarmPlan3D(session, {
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
    zones,
  });
}

// --- Drawing a zone -----------------------------------------------------------------------

const emptyPlan = buildPlan([]);
check('an unzoned plan draws no zone fills', emptyPlan.zones.length === 0);
check('an unzoned plan has no zone summary', emptyPlan.zoneSummary.length === 0);

const firstZone = createZoneFromRectangle({ x: 0.5, y: 0.5 }, { x: 3, y: 2.5 }, []);
check('a drag produces a zone', firstZone !== null);

const zones = firstZone ? [firstZone] : [];
const zonedPlan = buildPlan(zones);

check('a zoned plan draws the zone', zonedPlan.zones.length === 1, String(zonedPlan.zones.length));
check('a drawn zone keeps its points', (zonedPlan.zones[0]?.points.length ?? 0) >= 3);
check(
  'a drawn zone is filled with its colour',
  zonedPlan.zones[0]?.fill === firstZone?.colour,
  `${zonedPlan.zones[0]?.fill} vs ${firstZone?.colour}`,
);
check('the zone summary reports one zone', zonedPlan.zoneSummary.length === 1);
check(
  'the zone summary carries a device count',
  typeof zonedPlan.zoneSummary[0]?.deviceCount === 'number',
);

// --- Stored zones are re-validated --------------------------------------------------------

const degenerate = sanitiseZones([
  { id: 'tiny', name: 'Sliver', reference: 'Z9', colour: '#123456', polygon: [{ x: 0, y: 0 }, { x: 0.01, y: 0 }, { x: 0, y: 0.01 }], notes: null },
  { id: '', name: 'No id', reference: 'Z8', colour: '#123456', polygon: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }], notes: null },
] as Plan3DZone[]);

check('a sliver zone is dropped', degenerate.every((zone) => zone.id !== 'tiny'));
check('a zone without an id is dropped', degenerate.length === 0, String(degenerate.length));

const repaired = sanitiseZones([
  { id: 'ok', name: '   ', reference: '', colour: 'not-a-colour', polygon: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }], notes: '' },
] as Plan3DZone[]);

check('an unnamed zone gets a default name', repaired[0]?.name === 'Zone 1', repaired[0]?.name);
check('a missing reference is filled in', repaired[0]?.reference === 'Z1', repaired[0]?.reference);
check('an invalid colour is replaced', /^#[0-9a-fA-F]{6}$/.test(repaired[0]?.colour ?? ''));
check('blank notes become null', repaired[0]?.notes === null);

check('an open polygon is rejected', normaliseZonePolygon([{ x: 0, y: 0 }, { x: 1, y: 1 }]).length === 0);
check('a zero-area polygon is rejected', normaliseZonePolygon([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]).length === 0);

// --- The exported drawing carries the legend ----------------------------------------------

const svg = renderFireAlarmPlan3DSvg(zonedPlan, { legend });

check('the svg is a document', svg.startsWith('<svg'));
check('the svg closes', svg.trimEnd().endsWith('</svg>'));
check('the svg paints the zone fill', svg.includes(firstZone?.colour ?? '#none'), firstZone?.colour);
check('the svg carries the plan title', svg.includes('Zone plan — Riverside House'));
check('the svg carries the company name', svg.includes('Northgate Fire Safety Ltd'));
check('the svg carries the company phone', svg.includes('0113 000 0000'));
check('the svg carries the site name', svg.includes('Riverside House'));
check('the svg labels the zone key', /ZONE/i.test(svg), 'no zone key heading');
check('the svg labels the device key', /DEVICE/i.test(svg), 'no device key heading');
check('the svg carries the session footer', /room\(s\)/i.test(svg), 'no footer counts');

const viewOnlySvg = renderFireAlarmPlan3DSvg(zonedPlan, { legend, includeLegend: false });
check('the legend can be left out', !/DEVICE LEGEND/i.test(viewOnlySvg));

// --- Legend defaults ----------------------------------------------------------------------

const blank = normaliseLegendConfig(null);
check('a blank legend keeps a plan title', blank.planTitle.length > 0);
check('a blank legend has an empty company', blank.company.name === '');
check('legend booleans default on', blank.showZoneLegend && blank.showDeviceLegend);
check(
  'a legend with wrong types is repaired',
  normaliseLegendConfig({ planTitle: 42, showZoneLegend: 'yes', company: { name: 'X' } }).company
    .name === 'X',
);

if (failures > 0) {
  console.error(`\n${failures} zone plan check(s) failed`);
  process.exit(1);
}

console.log('\nall zone plan checks passed');

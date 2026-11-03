import type { DesignAreaKind, DesignMounting } from '../types';

/**
 * The measured blueprint the demonstration plan is drawn from.
 *
 * The geometry below is a two-storey office block laid out from published architectural plans
 * rather than invented freehand:
 *
 * - The room schedule follows the published school/office plan in Cadbull's catalogue
 *   (`School AutoCAD plan featuring 47 m² and 60 m² classroom layouts`, file 271383): classrooms
 *   of 46–60 m², a 34.80 m² kitchen, a 17.28 m² secretary's office, a 10.86 m² director's office,
 *   a 25.29 m² staff room, and circulation 2.80–3.90 m wide with a 2.40 m service corridor.
 * - The structural grid follows the educational-facility ground/first floor plan that specifies
 *   8 m × 7.5 m teaching rooms and 7 m × 9 m staff rooms either side of a straight spine corridor.
 *
 * From those two references the block is drawn at true size: a 30 m × 14 m rectangular floor
 * plate, a 2.6 m spine corridor running the full length, rooms of 19–72 m² either side, a
 * 3.6 m × 2.6 m stair core at the east end and a 1.2 m × 1.2 m service riser in the plant room.
 * Dimensions are in metres on the floor plane, matching `BuildingDesign` — every floor shares one
 * coordinate system, so the stair core sits above itself.
 *
 * This module is data only. `demo-plan.ts` turns it into a `BuildingDesign`.
 */

export interface BlueprintSource {
  title: string;
  publisher: string;
  reference: string;
  url: string;
  /** What was taken from the source, and what was drawn for this demonstration. */
  derived: string;
}

export const DEMO_BLUEPRINT_SOURCE: BlueprintSource = {
  title: 'School AutoCAD plan featuring 47 m² and 60 m² classroom layouts',
  publisher: 'Cadbull',
  reference: 'File 271383',
  url: 'https://cadbull.com/amp/271383/school-autocad-plan-featuring-47m2-and-60m2-classroom-layouts',
  derived:
    'Room sizes, corridor widths and the service riser follow the published schedule (classrooms 46.14–60.00 m², kitchen 34.80 m², staff room 25.29 m², director 10.86 m², corridors 2.80–3.90 m, service corridor 2.40 m). The floor plate, room arrangement and all fire alarm positions are drawn for this demonstration.',
};

/** Overall block, used by the sheet title block and by the smoke test. */
export const DEMO_BLOCK_WIDTH_METERS = 30;
export const DEMO_BLOCK_DEPTH_METERS = 14;
/** Depth of a room band either side of the spine corridor. */
export const DEMO_ROOM_BAND_DEPTH_METERS = 6;
export const DEMO_CORRIDOR_DEPTH_METERS = 2.6;
export const DEMO_CORRIDOR_FRONT_EDGE_METERS = 8.6;
export const DEMO_CORRIDOR_REAR_EDGE_METERS = 6;

export const DEMO_GROUND_FLOOR_ID = 'floor-demo-ground';
export const DEMO_FIRST_FLOOR_ID = 'floor-demo-first';

/** A rectangular room on the blueprint. `x`/`y` are the north-west corner in metres. */
export interface BlueprintRoom {
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  /** True for a space that is not enclosed, e.g. a break-out area open to the corridor. */
  open?: boolean;
}

/** A compartment, described by the rooms it contains so its geometry can never drift. */
export interface BlueprintZone {
  reference: string;
  name: string;
  colour: string;
  opacity: number;
  /** Names of the rooms whose outlines form this zone's regions. */
  roomNames: string[];
  /** An extra drawn region that is not a room, e.g. the service riser. */
  extraRegion?: BlueprintRoom;
  /** Storeys this compartment also covers, given as floor keys. */
  spans?: Array<'ground' | 'first'>;
  /** Reference of the compartment this one is nested inside. */
  parentReference?: string | null;
  notes?: string;
}

export interface BlueprintDevice {
  kind: string;
  x: number;
  y: number;
  label?: string;
  mounting?: DesignMounting;
  rotation?: number;
  notes?: string;
}

export interface BlueprintArea {
  kind: DesignAreaKind;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
}

/**
 * Ground floor. The front door is in the south wall (y = 14) straight into reception, which is
 * where the panel sits; the rear band holds the working rooms and the kitchen.
 */
export const DEMO_GROUND_ROOMS: BlueprintRoom[] = [
  // Front (south) band, y 8.6 → 14.
  { name: 'Reception', x: 0, y: 8.6, width: 5, depth: 5.4 },
  { name: 'Open plan office', x: 5, y: 8.6, width: 10, depth: 5.4 },
  { name: 'Toilets', x: 15, y: 8.6, width: 4.4, depth: 5.4 },
  { name: 'Plant room', x: 19.4, y: 8.6, width: 5.3, depth: 5.4 },
  { name: 'Store', x: 24.7, y: 8.6, width: 5.3, depth: 5.4 },

  // Spine corridor and stair core, y 6 → 8.6.
  { name: 'Corridor', x: 0, y: 6, width: 26.4, depth: 2.6 },
  { name: 'Stair core', x: 26.4, y: 6, width: 3.6, depth: 2.6 },

  // Rear (north) band, y 0 → 6.
  { name: 'Office 1', x: 0, y: 0, width: 6, depth: 6 },
  { name: 'Meeting room 1', x: 6, y: 0, width: 7.5, depth: 6 },
  { name: 'Kitchen', x: 13.5, y: 0, width: 6.5, depth: 6 },
  { name: 'Staff room', x: 20, y: 0, width: 5, depth: 6 },
  { name: 'Server room', x: 25, y: 0, width: 5, depth: 6 },
];

/** First floor: same plate and core, quieter rooms above the working floor. */
export const DEMO_FIRST_ROOMS: BlueprintRoom[] = [
  // Front (south) band.
  { name: "Director's office", x: 0, y: 8.6, width: 5.4, depth: 5.4 },
  { name: 'Office 2', x: 5.4, y: 8.6, width: 6.6, depth: 5.4 },
  { name: 'Toilets', x: 12, y: 8.6, width: 4.4, depth: 5.4 },
  { name: 'Store 2', x: 16.4, y: 8.6, width: 3.6, depth: 5.4 },
  { name: 'Break-out area', x: 20, y: 8.6, width: 10, depth: 5.4, open: true },

  // Spine corridor, stair core and landing.
  { name: 'Corridor', x: 0, y: 6, width: 26.4, depth: 2.6 },
  { name: 'Stair core', x: 26.4, y: 6, width: 3.6, depth: 2.6 },

  // Rear (north) band.
  { name: 'Open plan office', x: 0, y: 0, width: 12, depth: 6 },
  { name: 'Meeting room 2', x: 12, y: 0, width: 6.5, depth: 6 },
  { name: 'Meeting room 3', x: 18.5, y: 0, width: 6.5, depth: 6 },
  { name: 'Kitchenette', x: 25, y: 0, width: 5, depth: 6 },
];

/** The service riser: not a room anyone walks through, but a compartment in its own right. */
export const DEMO_RISER_REGION: BlueprintRoom = {
  name: 'Service riser',
  x: 20.2,
  y: 9,
  width: 1.2,
  depth: 1.2,
};

/**
 * Ground floor compartments.
 *
 * Twelve zones over two storeys: single-room zones, multi-region compartments, one compartment
 * nested inside another (the riser inside the plant-room zone) and one vertical compartment (the
 * stair) that claims devices on both storeys.
 */
export const DEMO_GROUND_ZONES: BlueprintZone[] = [
  {
    reference: 'Z1',
    name: 'Entrance and reception',
    colour: '#0EA5E9',
    opacity: 0.24,
    roomNames: ['Reception'],
    notes: 'Panel position, entrance call point and the front exit sign.',
  },
  {
    reference: 'Z2',
    name: 'Office and meeting room',
    colour: '#22C55E',
    opacity: 0.22,
    roomNames: ['Office 1', 'Meeting room 1'],
  },
  {
    reference: 'Z3',
    name: 'Kitchen and staff',
    colour: '#F97316',
    opacity: 0.22,
    roomNames: ['Kitchen', 'Staff room'],
    notes: 'Heat detection throughout: cooking and vending in normal use.',
  },
  {
    reference: 'Z4',
    name: 'South rooms',
    colour: '#A855F7',
    opacity: 0.2,
    roomNames: ['Open plan office', 'Toilets', 'Plant room', 'Store'],
    notes: 'Four unconnected parts of the storey, so the zone is drawn as four regions.',
  },
  {
    reference: 'Z5',
    name: 'Circulation',
    colour: '#EC4899',
    opacity: 0.2,
    roomNames: ['Corridor'],
  },
  {
    reference: 'Z6',
    name: 'Riser',
    colour: '#EF4444',
    opacity: 0.3,
    roomNames: [],
    extraRegion: DEMO_RISER_REGION,
    // Drawn on the ground floor only: the plate above it is a different compartment (Z12), and
    // one zone cannot be a hole in two unrelated parents. The stair (Z7) carries the vertical case.
    spans: [],
    parentReference: 'Z4',
    notes: 'Nested inside Z4: the plate around it is the parent, the riser is the hole.',
  },
  {
    reference: 'Z7',
    name: 'Stair',
    colour: '#14B8A6',
    opacity: 0.26,
    roomNames: ['Stair core'],
    spans: ['first'],
    notes: 'One compartment from ground to first: the reference travels with the stair.',
  },
  {
    reference: 'Z8',
    name: 'Server room',
    colour: '#8B5CF6',
    opacity: 0.28,
    roomNames: ['Server room'],
    notes: 'Aspirating detection: the ceiling void and floor void are both sampled.',
  },
];

/** First floor compartments. */
export const DEMO_FIRST_ZONES: BlueprintZone[] = [
  {
    reference: 'Z9',
    name: 'Office and kitchenette',
    colour: '#84CC16',
    opacity: 0.22,
    roomNames: ['Open plan office', 'Kitchenette'],
  },
  {
    reference: 'Z10',
    name: 'Meeting rooms',
    colour: '#EAB308',
    opacity: 0.22,
    roomNames: ['Meeting room 2', 'Meeting room 3'],
  },
  {
    reference: 'Z11',
    name: 'South rooms',
    colour: '#0EA5E9',
    opacity: 0.2,
    roomNames: ["Director's office", 'Office 2', 'Toilets', 'Store 2'],
  },
  {
    reference: 'Z12',
    name: 'Break-out',
    colour: '#3B82F6',
    opacity: 0.2,
    roomNames: ['Break-out area'],
  },
  {
    reference: 'Z13',
    name: 'Circulation',
    colour: '#EC4899',
    opacity: 0.2,
    roomNames: ['Corridor'],
  },
];

/**
 * Ground floor devices. Addresses are generated per storey by the builder, so a device only has
 * to say what it is and where it sits.
 */
export const DEMO_GROUND_DEVICES: BlueprintDevice[] = [
  // Reception — the panel, the entrance call point and the front door.
  { kind: 'panel', x: 0.9, y: 12.6, label: 'Main panel', notes: 'Two-loop addressable CIE, 24 h standby.' },
  { kind: 'smoke_optical', x: 3.4, y: 10.2 },
  { kind: 'mcp', x: 2.5, y: 13.55, label: 'Entrance MCP' },
  { kind: 'sounder_beacon', x: 3.9, y: 8.95 },
  { kind: 'fire_exit', x: 0.9, y: 13.85 },

  // Spine corridor — detection at the compartment breaks, sounder coverage along the run.
  { kind: 'smoke_optical', x: 4, y: 7.3 },
  { kind: 'smoke_optical', x: 11, y: 7.3 },
  { kind: 'smoke_optical', x: 18, y: 7.3 },
  { kind: 'smoke_optical', x: 24.5, y: 7.3 },
  { kind: 'sounder_beacon', x: 6.5, y: 6.45 },
  { kind: 'sounder_beacon', x: 15.5, y: 6.45 },
  { kind: 'sounder_beacon', x: 23, y: 6.45 },
  { kind: 'mcp', x: 0.7, y: 8.1, label: 'West exit MCP' },
  { kind: 'fire_exit', x: 0.7, y: 6.35 },
  { kind: 'door_holder', x: 12.3, y: 6.4, label: 'DH-01' },
  { kind: 'fire_door', x: 19.6, y: 6.4 },
  { kind: 'extinguisher', x: 8.6, y: 8.15, label: 'FE CO2' },

  // Office 1.
  { kind: 'smoke_optical', x: 3, y: 2.2 },
  { kind: 'smoke_optical', x: 3, y: 4.4 },
  { kind: 'sounder_beacon', x: 1.1, y: 1.1 },
  { kind: 'mcp', x: 5.5, y: 5.5 },

  // Meeting room 1.
  { kind: 'smoke_optical', x: 9.75, y: 1.8 },
  { kind: 'smoke_optical', x: 9.75, y: 4.3 },
  { kind: 'vad', x: 6.6, y: 5.4 },
  { kind: 'mcp', x: 9.75, y: 5.55 },

  // Kitchen — heat, not smoke, plus the kitchen suppression interface.
  { kind: 'heat_detector', x: 16.7, y: 2, label: 'Kitchen HD 1' },
  { kind: 'heat_detector', x: 17.6, y: 4.4, label: 'Kitchen HD 2' },
  { kind: 'suppression_panel', x: 19.3, y: 5.4 },
  { kind: 'sounder_beacon', x: 14.1, y: 1.1 },

  // Staff room.
  { kind: 'smoke_optical', x: 22.5, y: 2.4 },
  { kind: 'sounder', x: 24.4, y: 5.3 },

  // Server room — aspirating detection in the void, a point detector below.
  { kind: 'aspirating_detector', x: 27.5, y: 2.6, label: 'Server ASD', mounting: 'wall' },
  { kind: 'smoke_optical', x: 27.5, y: 4.6 },
  { kind: 'pse', x: 29.3, y: 5.4, label: 'PSE 1' },
  { kind: 'interface', x: 25.6, y: 5.5 },

  // Open plan office (ground).
  { kind: 'smoke_optical', x: 7.5, y: 10 },
  { kind: 'smoke_optical', x: 7.5, y: 12.7 },
  { kind: 'smoke_optical', x: 12.5, y: 10 },
  { kind: 'smoke_optical', x: 12.5, y: 12.7 },
  { kind: 'sounder_beacon', x: 9.9, y: 13.5 },
  { kind: 'mcp', x: 5.5, y: 9.1 },

  // Toilets — a VAD, because a door is normally closed on the sounder.
  { kind: 'smoke_optical', x: 17.2, y: 10.2 },
  { kind: 'vad', x: 17.2, y: 13.2 },

  // Plant room — heat and CO for the boiler, plus the riser symbol.
  { kind: 'heat_detector', x: 22, y: 10.4 },
  { kind: 'co_detector', x: 22, y: 12.9, label: 'Boiler CO' },
  { kind: 'interface', x: 23.9, y: 9.3 },
  { kind: 'riser', x: 20.8, y: 9.6, label: 'Riser' },

  // Store.
  { kind: 'smoke_optical', x: 27.3, y: 10.5 },
  { kind: 'interface', x: 29.3, y: 13.3 },

  // Stair core. The core is only 3.6 m × 2.6 m, so these carry loop addresses rather than names:
  // three worded labels in that box would overprint each other and the zone reference.
  { kind: 'smoke_optical', x: 28.2, y: 7.3 },
  { kind: 'mcp', x: 29.4, y: 8.35 },
  { kind: 'smoke_vent', x: 26.9, y: 6.5 },

  // Outside, on the same storey drawing: yard devices and the muster point.
  { kind: 'assembly_point', x: 23.5, y: 17.5 },
  { kind: 'mcp_outdoor', x: 17.5, y: 22, label: 'Car park MCP' },
  { kind: 'dry_riser', x: -1.4, y: 14.6, label: 'Dry riser' },
];

/** First floor devices. */
export const DEMO_FIRST_DEVICES: BlueprintDevice[] = [
  // Spine corridor.
  { kind: 'smoke_optical', x: 4, y: 7.3 },
  { kind: 'smoke_optical', x: 11, y: 7.3 },
  { kind: 'smoke_optical', x: 18, y: 7.3 },
  { kind: 'smoke_optical', x: 24.5, y: 7.3 },
  { kind: 'sounder_beacon', x: 6.5, y: 6.45 },
  { kind: 'sounder_beacon', x: 15.5, y: 6.45 },
  { kind: 'sounder_beacon', x: 23, y: 6.45 },
  { kind: 'mcp', x: 25.9, y: 7.3, label: 'First floor MCP' },
  { kind: 'fire_door', x: 12.3, y: 6.4 },

  // Open plan office (first floor).
  { kind: 'smoke_optical', x: 3, y: 1.8 },
  { kind: 'smoke_optical', x: 3, y: 4.2 },
  { kind: 'smoke_optical', x: 8, y: 1.8 },
  { kind: 'smoke_optical', x: 8, y: 4.2 },
  { kind: 'sounder_beacon', x: 11.2, y: 5.3 },
  { kind: 'mcp', x: 0.7, y: 5.3 },

  // Meeting rooms 2 and 3.
  { kind: 'smoke_optical', x: 15.25, y: 2 },
  { kind: 'smoke_optical', x: 15.25, y: 4.2 },
  { kind: 'vad', x: 17.8, y: 1.1 },
  { kind: 'smoke_optical', x: 21.75, y: 2 },
  { kind: 'smoke_optical', x: 21.75, y: 4.2 },
  { kind: 'vad', x: 19.1, y: 1.1 },

  // Kitchenette — heat detection, mirroring the kitchen below.
  { kind: 'heat_detector', x: 27.5, y: 2.4 },
  { kind: 'sounder', x: 29.2, y: 5.3 },

  // Director's office.
  { kind: 'smoke_optical', x: 2.7, y: 10.3 },
  { kind: 'sounder', x: 0.9, y: 13.4 },

  // Office 2.
  { kind: 'smoke_optical', x: 8.7, y: 10.4 },
  { kind: 'smoke_optical', x: 8.7, y: 12.8 },
  { kind: 'interface', x: 11.6, y: 13.4 },

  // Toilets.
  { kind: 'smoke_optical', x: 14.2, y: 10.4 },
  { kind: 'vad', x: 14.2, y: 13.2 },

  // Store 2.
  { kind: 'smoke_optical', x: 18.2, y: 10.6 },

  // Break-out area and the repeater.
  { kind: 'smoke_optical', x: 22.5, y: 10.6 },
  { kind: 'smoke_optical', x: 27.5, y: 10.6 },
  { kind: 'smoke_optical', x: 25, y: 13 },
  { kind: 'sounder_beacon', x: 20.6, y: 13.4 },
  { kind: 'repeater_panel', x: 29, y: 9.2, label: 'Repeater' },

  // Stair core, on the storey it passes through (see the ground floor note on labelling).
  { kind: 'smoke_optical', x: 28.2, y: 7.3 },
  { kind: 'mcp', x: 27, y: 8.35 },
];

/**
 * External areas, drawn on the ground floor because that is where someone standing in the yard
 * would look for them on the sheet.
 */
export const DEMO_GROUND_AREAS: BlueprintArea[] = [
  { kind: 'car_park', name: 'Car park (14 spaces)', x: 0, y: 15.5, width: 16, depth: 9 },
  { kind: 'bin_store', name: 'Bin store', x: 17.5, y: 15.5, width: 3.5, depth: 3 },
  { kind: 'other', name: 'Assembly point', x: 21.5, y: 16, width: 4, depth: 4 },
];

import type { DesignMounting } from './types';

/**
 * The generic fire alarm device set used by the design studio.
 *
 * Manufacturers are deliberately not named: a surveyor needs to describe *what* the device is,
 * not who made it. The kinds follow the device taxonomy of BS 5839-1 and the BS EN 54 series
 * (detection, manual call points, alarm devices, control and indicating equipment, interfaces and
 * ancillary interfaces), so a plan drawn with this set reads correctly to anyone familiar with a
 * UK zone plan.
 */

export type DesignDeviceCategory =
  | 'detection'
  | 'manual'
  | 'alarm'
  | 'control'
  | 'interface'
  | 'ancillary'
  | 'site';

export interface DesignDeviceDefinition {
  kind: string;
  /** Full name printed in the legend. */
  label: string;
  /** Short code printed beside the symbol and inside the palette chip. */
  glyph: string;
  category: DesignDeviceCategory;
  /** Where this device is normally fixed; drives the default when it is dropped. */
  defaultMounting: DesignMounting;
  /** Standard the symbol follows, printed in the legend for traceability. */
  standardReference: string;
  /** Search terms so the palette can be filtered by what a surveyor actually types. */
  keywords: string[];
}

export interface DesignDeviceCategoryDefinition {
  id: DesignDeviceCategory;
  label: string;
  /** Accent colour for every device in this category. */
  colour: string;
  description: string;
}

export const DESIGN_DEVICE_CATEGORIES: DesignDeviceCategoryDefinition[] = [
  {
    id: 'detection',
    label: 'Detection',
    colour: '#0E7490',
    description: 'Automatic fire detectors',
  },
  {
    id: 'manual',
    label: 'Call points',
    colour: '#B91C1C',
    description: 'Manual break-glass call points',
  },
  {
    id: 'alarm',
    label: 'Alarm devices',
    colour: '#C2410C',
    description: 'Sounders, beacons and voice alarm',
  },
  {
    id: 'control',
    label: 'Control equipment',
    colour: '#1E293B',
    description: 'Panels, power supplies and network nodes',
  },
  {
    id: 'interface',
    label: 'Interfaces',
    colour: '#166534',
    description: 'Interfaces, I/O units and relays',
  },
  {
    id: 'ancillary',
    label: 'Ancillaries',
    colour: '#78716C',
    description: 'Doors, dampers and suppression',
  },
  {
    id: 'site',
    label: 'Site features',
    colour: '#4D7C0F',
    description: 'Exits, extinguishers and assembly points',
  },
];

const DETECTION_STANDARD = 'BS EN 54-7 / ISO 6790';
const HEAT_STANDARD = 'BS EN 54-5 / ISO 6790';
const ALARM_STANDARD = 'BS EN 54-3 / BS EN 54-23';
const CONTROL_STANDARD = 'BS EN 54-2 / BS EN 54-4';
const INTERFACE_STANDARD = 'BS EN 54-18';

export const DESIGN_DEVICE_CATALOGUE: DesignDeviceDefinition[] = [
  {
    kind: 'smoke_optical',
    label: 'Optical smoke detector',
    glyph: 'S',
    category: 'detection',
    defaultMounting: 'ceiling',
    standardReference: DETECTION_STANDARD,
    keywords: ['smoke', 'optical', 'photoelectric', 'detector', 'sd'],
  },
  {
    kind: 'smoke_ionisation',
    label: 'Ionisation smoke detector',
    glyph: 'S',
    category: 'detection',
    defaultMounting: 'ceiling',
    standardReference: DETECTION_STANDARD,
    keywords: ['smoke', 'ionisation', 'ionization', 'detector'],
  },
  {
    kind: 'detector_multi',
    label: 'Multi-criteria detector',
    glyph: 'M',
    category: 'detection',
    defaultMounting: 'ceiling',
    standardReference: 'BS EN 54-7 / BS EN 54-5',
    keywords: ['multi', 'multi-criteria', 'multi-sensor', 'combined', 'detector'],
  },
  {
    kind: 'heat_detector',
    label: 'Heat detector',
    glyph: 'H',
    category: 'detection',
    defaultMounting: 'ceiling',
    standardReference: HEAT_STANDARD,
    keywords: ['heat', 'thermal', 'detector', 'hd'],
  },
  {
    kind: 'heat_ror',
    label: 'Rate of rise heat detector',
    glyph: 'H',
    category: 'detection',
    defaultMounting: 'ceiling',
    standardReference: HEAT_STANDARD,
    keywords: ['heat', 'rate of rise', 'ror', 'detector'],
  },
  {
    kind: 'co_detector',
    label: 'Carbon monoxide detector',
    glyph: 'CO',
    category: 'detection',
    defaultMounting: 'ceiling',
    standardReference: 'BS EN 54-26',
    keywords: ['co', 'carbon monoxide', 'gas', 'detector'],
  },
  {
    kind: 'beam_detector',
    label: 'Optical beam detector',
    glyph: 'B',
    category: 'detection',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-12',
    keywords: ['beam', 'projected', 'line', 'detector'],
  },
  {
    kind: 'aspirating_detector',
    label: 'Aspirating smoke detection',
    glyph: 'A',
    category: 'detection',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-20',
    keywords: ['aspirating', 'asd', 'air sampling', 'detector'],
  },
  {
    kind: 'duct_detector',
    label: 'Duct mounted detector',
    glyph: 'D',
    category: 'detection',
    defaultMounting: 'ceiling_void',
    standardReference: DETECTION_STANDARD,
    keywords: ['duct', 'air handling', 'detector'],
  },
  {
    kind: 'flame_detector',
    label: 'Flame detector',
    glyph: 'F',
    category: 'detection',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-10',
    keywords: ['flame', 'ir', 'uv', 'detector'],
  },
  {
    kind: 'linear_heat',
    label: 'Linear heat detection cable',
    glyph: 'L',
    category: 'detection',
    defaultMounting: 'ceiling',
    standardReference: 'BS EN 54-22',
    keywords: ['linear', 'cable', 'lhd', 'heat'],
  },
  {
    kind: 'video_detection',
    label: 'Video smoke detection',
    glyph: 'V',
    category: 'detection',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-29',
    keywords: ['video', 'camera', 'vfd', 'detector'],
  },
  {
    kind: 'mcp',
    label: 'Manual call point',
    glyph: 'MCP',
    category: 'manual',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-11',
    keywords: ['mcp', 'call point', 'break glass', 'manual', 'pull station'],
  },
  {
    kind: 'mcp_outdoor',
    label: 'Weatherproof call point',
    glyph: 'MCP',
    category: 'manual',
    defaultMounting: 'external',
    standardReference: 'BS EN 54-11',
    keywords: ['mcp', 'external', 'weatherproof', 'call point', 'car park'],
  },
  {
    kind: 'sounder',
    label: 'Sounder',
    glyph: 'SND',
    category: 'alarm',
    defaultMounting: 'wall',
    standardReference: ALARM_STANDARD,
    keywords: ['sounder', 'sound', 'audible', 'alarm'],
  },
  {
    kind: 'sounder_beacon',
    label: 'Sounder beacon',
    glyph: 'S/B',
    category: 'alarm',
    defaultMounting: 'wall',
    standardReference: ALARM_STANDARD,
    keywords: ['sounder', 'beacon', 'combined', 'alarm'],
  },
  {
    kind: 'beacon',
    label: 'Beacon',
    glyph: 'BCN',
    category: 'alarm',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-3',
    keywords: ['beacon', 'visual', 'strobe', 'alarm'],
  },
  {
    kind: 'vad',
    label: 'Visual alarm device (VAD)',
    glyph: 'VAD',
    category: 'alarm',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-23',
    keywords: ['vad', 'visual alarm device', 'flashing', 'alarm'],
  },
  {
    kind: 'loudspeaker',
    label: 'Voice alarm loudspeaker',
    glyph: 'VA',
    category: 'alarm',
    defaultMounting: 'ceiling',
    standardReference: 'BS EN 54-24',
    keywords: ['voice', 'loudspeaker', 'speaker', 'va', 'speech'],
  },
  {
    kind: 'sounder_base',
    label: 'Sounder base',
    glyph: 'SB',
    category: 'alarm',
    defaultMounting: 'ceiling',
    standardReference: ALARM_STANDARD,
    keywords: ['sounder base', 'base', 'detector sounder', 'alarm'],
  },
  {
    kind: 'panel',
    label: 'Fire alarm control panel',
    glyph: 'FACP',
    category: 'control',
    defaultMounting: 'wall',
    standardReference: CONTROL_STANDARD,
    keywords: ['panel', 'facp', 'control', 'cie', 'main panel'],
  },
  {
    kind: 'repeater_panel',
    label: 'Repeater panel',
    glyph: 'RPT',
    category: 'control',
    defaultMounting: 'wall',
    standardReference: CONTROL_STANDARD,
    keywords: ['repeater', 'panel', 'remote display'],
  },
  {
    kind: 'pse',
    label: 'Power supply equipment',
    glyph: 'PSE',
    category: 'control',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-4',
    keywords: ['pse', 'power supply', 'psu', 'battery'],
  },
  {
    kind: 'network_node',
    label: 'Network node / gateway',
    glyph: 'NET',
    category: 'control',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-2',
    keywords: ['network', 'gateway', 'node', 'ip', 'bridge'],
  },
  {
    kind: 'printer',
    label: 'Event printer',
    glyph: 'PRN',
    category: 'control',
    defaultMounting: 'wall',
    standardReference: 'BS EN 54-2',
    keywords: ['printer', 'log', 'event'],
  },
  {
    kind: 'interface',
    label: 'Interface unit',
    glyph: 'INT',
    category: 'interface',
    defaultMounting: 'wall',
    standardReference: INTERFACE_STANDARD,
    keywords: ['interface', 'int', 'zone monitor', 'interposing'],
  },
  {
    kind: 'io_unit',
    label: 'Input / output unit',
    glyph: 'I/O',
    category: 'interface',
    defaultMounting: 'wall',
    standardReference: INTERFACE_STANDARD,
    keywords: ['io', 'input', 'output', 'module'],
  },
  {
    kind: 'relay',
    label: 'Relay unit',
    glyph: 'RLY',
    category: 'interface',
    defaultMounting: 'wall',
    standardReference: INTERFACE_STANDARD,
    keywords: ['relay', 'rly', 'switching'],
  },
  {
    kind: 'zone_monitor',
    label: 'Zone monitor unit',
    glyph: 'ZM',
    category: 'interface',
    defaultMounting: 'wall',
    standardReference: INTERFACE_STANDARD,
    keywords: ['zone monitor', 'zm', 'conventional', 'interface'],
  },
  {
    kind: 'door_holder',
    label: 'Door hold-open unit',
    glyph: 'DH',
    category: 'ancillary',
    defaultMounting: 'wall',
    standardReference: 'BS 7273-4',
    keywords: ['door', 'holder', 'magnet', 'release', 'dh'],
  },
  {
    kind: 'damper',
    label: 'Fire damper',
    glyph: 'DMP',
    category: 'ancillary',
    defaultMounting: 'ceiling_void',
    standardReference: 'BS EN 15650',
    keywords: ['damper', 'dmp', 'duct', 'shutter'],
  },
  {
    kind: 'flow_switch',
    label: 'Sprinkler flow switch',
    glyph: 'FS',
    category: 'ancillary',
    defaultMounting: 'wall',
    standardReference: 'BS EN 12259-1',
    keywords: ['flow', 'sprinkler', 'switch', 'fs'],
  },
  {
    kind: 'pressure_switch',
    label: 'Pressure switch',
    glyph: 'PS',
    category: 'ancillary',
    defaultMounting: 'wall',
    standardReference: 'BS EN 12259-1',
    keywords: ['pressure', 'switch', 'ps', 'sprinkler'],
  },
  {
    kind: 'valve_monitor',
    label: 'Valve monitor switch',
    glyph: 'VM',
    category: 'ancillary',
    defaultMounting: 'wall',
    standardReference: 'BS EN 12259-1',
    keywords: ['valve', 'monitor', 'vm', 'butterfly'],
  },
  {
    kind: 'suppression_panel',
    label: 'Suppression control panel',
    glyph: 'SUP',
    category: 'ancillary',
    defaultMounting: 'wall',
    standardReference: 'BS EN 12094-1',
    keywords: ['suppression', 'gas', 'kitchen', 'extinguishing', 'sup'],
  },
  {
    kind: 'smoke_vent',
    label: 'Smoke vent actuator',
    glyph: 'SVP',
    category: 'ancillary',
    defaultMounting: 'ceiling',
    standardReference: 'BS 7346-8',
    keywords: ['smoke vent', 'aov', 'actuator', 'ventilation'],
  },
  {
    kind: 'fire_exit',
    label: 'Fire exit',
    glyph: 'EXIT',
    category: 'site',
    defaultMounting: 'wall',
    standardReference: 'ISO 7010 E001/E002',
    keywords: ['exit', 'escape', 'egress', 'door'],
  },
  {
    kind: 'assembly_point',
    label: 'Assembly point',
    glyph: 'AP',
    category: 'site',
    defaultMounting: 'external',
    standardReference: 'ISO 7010 E007',
    keywords: ['assembly', 'muster', 'point', 'ap'],
  },
  {
    kind: 'extinguisher',
    label: 'Fire extinguisher',
    glyph: 'FE',
    category: 'site',
    defaultMounting: 'wall',
    standardReference: 'BS 5306 / ISO 7010 F001',
    keywords: ['extinguisher', 'fe', 'appliance'],
  },
  {
    kind: 'fire_door',
    label: 'Fire door',
    glyph: 'FD',
    category: 'site',
    defaultMounting: 'wall',
    standardReference: 'BS 8214',
    keywords: ['fire door', 'fd', 'door', 'compartment'],
  },
  {
    kind: 'riser',
    label: 'Riser / shaft',
    glyph: 'RSR',
    category: 'site',
    defaultMounting: 'floor',
    standardReference: 'BS 5839-1',
    keywords: ['riser', 'shaft', 'service', 'cupboard'],
  },
  {
    kind: 'dry_riser',
    label: 'Dry riser inlet',
    glyph: 'DR',
    category: 'site',
    defaultMounting: 'external',
    standardReference: 'BS 9990',
    keywords: ['dry riser', 'inlet', 'dr', 'firefighting'],
  },
];

const DEFINITIONS_BY_KIND = new Map(
  DESIGN_DEVICE_CATALOGUE.map((definition) => [definition.kind, definition]),
);

const CATEGORIES_BY_ID = new Map(
  DESIGN_DEVICE_CATEGORIES.map((category) => [category.id, category]),
);

const FALLBACK_KIND = 'interface';

/** The generic marker used when a stored design names a kind this build does not know. */
export const UNKNOWN_DEVICE_DEFINITION: DesignDeviceDefinition = {
  kind: 'unknown',
  label: 'Unidentified device',
  glyph: '?',
  category: 'interface',
  defaultMounting: 'wall',
  standardReference: '—',
  keywords: ['unknown'],
};

export function getDeviceDefinition(kind: string | null | undefined): DesignDeviceDefinition {
  if (!kind) {
    return DEFINITIONS_BY_KIND.get(FALLBACK_KIND) ?? UNKNOWN_DEVICE_DEFINITION;
  }

  return DEFINITIONS_BY_KIND.get(kind) ?? UNKNOWN_DEVICE_DEFINITION;
}

export function isKnownDeviceKind(kind: string | null | undefined): boolean {
  return typeof kind === 'string' && DEFINITIONS_BY_KIND.has(kind);
}

export function getDeviceCategory(
  category: DesignDeviceCategory,
): DesignDeviceCategoryDefinition {
  return (
    CATEGORIES_BY_ID.get(category) ?? {
      id: 'interface',
      label: 'Interfaces',
      colour: '#166534',
      description: 'Interfaces',
    }
  );
}

/** Accent colour for a device kind, taken from its category. */
export function getDeviceColour(kind: string): string {
  return getDeviceCategory(getDeviceDefinition(kind).category).colour;
}

export interface CatalogueGroup {
  category: DesignDeviceCategoryDefinition;
  devices: DesignDeviceDefinition[];
}

export function groupCatalogueByCategory(): CatalogueGroup[] {
  return DESIGN_DEVICE_CATEGORIES.map((category) => ({
    category,
    devices: DESIGN_DEVICE_CATALOGUE.filter((device) => device.category === category.id),
  }));
}

/** Case-insensitive search across labels, glyphs and keywords. */
export function searchCatalogue(query: string): DesignDeviceDefinition[] {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return DESIGN_DEVICE_CATALOGUE;
  }

  return DESIGN_DEVICE_CATALOGUE.filter((device) => {
    const haystack = [device.label, device.glyph, ...device.keywords].join(' ').toLowerCase();

    return haystack.includes(needle);
  });
}

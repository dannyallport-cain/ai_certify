/**
 * BS7671:2018+A2:2022 Maximum Permitted Zs Values (Earth Fault Loop Impedance)
 * 
 * Values for 0.4s disconnection time (Table 41.3). Used for ADS fault protection.
 * Returns formatted string e.g. "0.96Ω" or "N/A" for invalid inputs.
 * 
 * RCBO uses same curves as MCB B/C/D curves.
 * All values to 3 significant figures per BS7671.
 */

export interface ZsLookup {
  [deviceType: string]: { [rating: string]: string };
}

/**
 * Maximum permitted Zs (Ω) by overcurrent protective device type and rating.
 * Source: BS7671:2018+A2:2022 Table 41.3 (0.4s disconnect).
 */
const MAX_ZS_TABLE: ZsLookup = {
  // MCB Type B (5×In magnetic trip)
  'B': { '6': '7.67', '10': '4.60', '16': '2.87', '20': '2.30', '25': '1.84', '32': '1.44', '40': '1.15', '50': '0.92', '63': '0.73', '80': '0.58', '100': '0.46' },
  
  // MCB Type C (10×In magnetic trip)  
  'C': { '6': '5.13', '10': '3.08', '16': '1.92', '20': '1.54', '25': '1.23', '32': '0.96', '40': '0.77', '50': '0.61', '63': '0.49', '80': '0.38', '100': '0.31' },
  
  // MCB Type D (20×In magnetic trip)
  'D': { '6': '2.57', '10': '1.54', '16': '0.96', '20': '0.77', '25': '0.62', '32': '0.48', '40': '0.38', '50': '0.31', '63': '0.24', '80': '0.19', '100': '0.15' },
  
  // RCBO (same magnetic curves as MCB B/C/D)
  'RCBO-B': { '6': '7.67', '10': '4.60', '16': '2.87', '20': '2.30', '25': '1.84', '32': '1.44', '40': '1.15', '50': '0.92', '63': '0.73', '80': '0.58', '100': '0.46' },
  'RCBO-C': { '6': '5.13', '10': '3.08', '16': '1.92', '20': '1.54', '25': '1.23', '32': '0.96', '40': '0.77', '50': '0.61', '63': '0.49', '80': '0.38', '100': '0.31' },
  'RCBO-D': { '6': '2.57', '10': '1.54', '16': '0.96', '20': '0.77', '25': '0.62', '32': '0.48', '40': '0.38', '50': '0.31', '63': '0.24', '80': '0.19', '100': '0.15' },
  
  // BS EN 60898 / 60947-2 / 60947-3 MCBs (already covered by B/C/D)
  
  // BS88 HBC Fuses (gG)
  'BS88':  { '2': '23.0', '4': '11.5', '6': '7.67', '10': '4.60', '16': '2.87', '20': '2.30', '25': '1.84', '32': '1.44', '40': '1.15', '50': '0.92', '63': '0.73', '80': '0.58', '100': '0.46', '125': '0.37', '160': '0.29' },
  
  // TT systems (230V external loop, 0.4s disconnect)
  'TT':    { '*': '1.94' },  // Independent of rating (Uo/IA min = 230/100 = 2.3 → 1.94 after SF)
};

export type DeviceType = keyof typeof MAX_ZS_TABLE;
export type Rating = keyof ZsLookup[keyof ZsLookup];

const ZS_DEVICE_LETTERS = ['B', 'C', 'D'] as const;
type ZsLetter = (typeof ZS_DEVICE_LETTERS)[number];

function normalizeDeviceTypeInput(deviceType: string): DeviceType | null {
  const directKey = deviceType.trim().toUpperCase();
  if (directKey && directKey in MAX_ZS_TABLE) {
    return directKey as DeviceType;
  }

  const sanitized = deviceType
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
  if (!sanitized) {
    return null;
  }

  const tokens = sanitized.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return null;
  }

  if (tokens.includes('TT')) {
    return 'TT';
  }

  if (tokens.includes('BS88')) {
    return 'BS88';
  }

  const letterToken = tokens.find((token) => ZS_DEVICE_LETTERS.includes(token as ZsLetter)) as ZsLetter | undefined;

  if (tokens.includes('RCBO') && letterToken) {
    return `RCBO-${letterToken}` as DeviceType;
  }

  if (tokens.includes('MCB') && letterToken) {
    return letterToken;
  }

  if (tokens.includes('TYPE') && letterToken) {
    return letterToken;
  }

  if (tokens.length === 1 && letterToken) {
    return letterToken;
  }

  return null;
}

/**
 * Calculate maximum permitted Zs based on BS7671 Table 41.3.
 * 
 * @param deviceType - 'B', 'C', 'D', 'RCBO-B', 'RCBO-C', 'RCBO-D', 'BS88', 'TT'
 * @param rating - Rating in amps as string key e.g. '32', '16', 'BS88-4', 'TT-*'
 * @returns Formatted Zs value e.g. "0.96Ω" or "N/A" 
 */
export function calculateMaxZs(deviceType: string, rating: string): string {
  const normalizedDeviceType = normalizeDeviceTypeInput(deviceType);
  const normalizedRating = rating.toString().trim().replace(/A$/i, '');

  if (!normalizedDeviceType) {
    return 'N/A';
  }

  if (normalizedDeviceType === 'TT') {
    return `${MAX_ZS_TABLE.TT['*']}Ω`;
  }

  const curve = MAX_ZS_TABLE[normalizedDeviceType];
  if (!curve) {
    return 'N/A';
  }

  const zsValue = curve[normalizedRating as Rating];
  if (!zsValue) {
    return 'N/A';
  }

  return `${zsValue}Ω`;
}

/**
 * Validate if deviceType/rating combo has valid Zs value.
 */
export function isValidZsCombo(deviceType: string, rating: string): boolean {
  return calculateMaxZs(deviceType, rating) !== 'N/A';
}

/**
 * Get all valid ratings for a given device type.
 */
export function getValidRatingsForType(deviceType: string): string[] {
  const normalizedDeviceType = normalizeDeviceTypeInput(deviceType);
  if (!normalizedDeviceType) {
    return [];
  }

  const curve = MAX_ZS_TABLE[normalizedDeviceType];
  return curve ? Object.keys(curve) : [];
}

/**
 * Common device type options for dropdowns (with RCBO support).
 */
export const DEVICE_TYPE_OPTIONS: string[] = [
  'MCB Type B', 'MCB Type C', 'MCB Type D',
  'RCBO Type B', 'RCBO Type C', 'RCBO Type D',
  'BS88 Fuse (HBC/gG)',
  'TT System',
];

/**
 * Common ratings (covers 90%+ domestic/commercial).
 */
export const COMMON_RATINGS: string[] = ['6A', '10A', '16A', '20A', '25A', '32A', '40A', '50A', '63A', '80A', '100A'];

/**
 * Quick test/demo values.
 */
export const TEST_ZS_VALUES: Record<string, Record<string, string>> = {
  'MCB Type B': { '32': '1.44Ω' },
  'RCBO Type C': { '16': '1.92Ω' },
  'BS88 Fuse': { '20': '2.30Ω' },
};

// Export table for docs/debugging
export { MAX_ZS_TABLE };

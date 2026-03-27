/**
 * BS7671 Table 4D5A: Steel Wire Armoured (SWA) CPC CSA by Live CSA
 * XLPE/PVC SWA Flat (2-core) — Armour CSA used as CPC
 * 
 * Source: BS7671 Appendix 4 Table 4D5A (page 484)
 */

export interface SWACpcLookup {
  [liveCsa: string]: string; // e.g. "2.5" → "0.71"
}

/**
 * CPC CSA (mm²) for SWA when `wiringType="SWA/F/G"` and `liveCsa` given.
 */
const SWA_CPC_TABLE: Record<string, string> = {
  // 2-core XLPE/PVC SWA (steel wire armour)
  '1.5': '0.71',
  '2.5': '0.71',
  '4.0': '1.13',
  '6.0': '1.13',
  '10.0': '1.78',
  '16.0': '1.78',
  '25.0': '2.84',
  '35.0': '2.84',
  '50.0': '4.50',
  '70.0': '4.50',
  '95.0': '6.33',
  '120.0': '6.33',
  '150.0': '7.94',
  '185.0': '7.94',
  '240.0': '10.3',
  '300.0': '10.3',
};

/**
 * Calculate CPC CSA for SWA cable from live conductor CSA.
 * 
 * @param liveCsa - Live conductor CSA mm² as string e.g. "2.5", "4"
 * @param wiringType - "F"|"G"|"SWA"|"Thermosetting/SWA"|"Thermoplastic/SWA"
 * @returns CPC CSA e.g. "0.71mm²" or "N/A"
 */
export function calculateSwaCpcCsa(liveCsa: string, wiringType: string): string {
  if (!['F', 'G', 'SWA', 'Thermosetting/SWA', 'Thermoplastic/SWA'].some(t => 
      wiringType.includes(t))) {
    return 'N/A';
  }

  const normalizedCsa = liveCsa.replace(/mm²$|sq|CSA/i, '').trim();
  const cpcCsa = SWA_CPC_TABLE[normalizedCsa];
  
  return cpcCsa ? `${cpcCsa}mm²` : 'N/A';
}

/**
 * Valid live CSAs for SWA CPC lookup (dropdown options).
 */
export const SWA_LIVE_CSA_OPTIONS: string[] = [
  '1.5mm²', '2.5mm²', '4mm²', '6mm²', '10mm²', '16mm²', '25mm²', 
  '35mm²', '50mm²', '70mm²', '95mm²'
];

/**
 * Wiring types triggering SWA CPC auto-calc.
 */
export const SWA_WIRING_TYPES: string[] = [
  'F', 'G', 'SWA', 'Thermosetting/SWA', 'Thermoplastic/SWA'
];

/** Demo values */
export const SWA_TEST_VALUES: Record<string, string> = {
  '2.5mm²': '0.71mm²',
  '4mm²': '1.13mm²',
  '16mm²': '1.78mm²',
};

export { SWA_CPC_TABLE };


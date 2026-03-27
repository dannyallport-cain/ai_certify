/**
 * BS7671 Prospective Fault Current (PFC) Calculation
 * 
 * Ipf = Uo / Ze    (External PFC at origin)
 * Ipf = Uo / Zs    (PFC at circuit end)
 * 
 * Uo = 230V nominal phase-earth voltage.
 * Values in kA, rounded to 2 decimal places.
 */

export interface PfcInputs {
  ze: string;           // Ze (Ω)
  zsMeasured?: string;  // Measured Zs at circuit (Ω)
}

/**
 * Calculate Prospective Fault Current (kA).
 * 
 * @param ze - External earth fault loop impedance (Ω)
 * @param zsMeasured - Optional measured Zs at load end (Ω). Uses Ze if absent.
 * @returns PFC in kA, e.g. "0.12 kA" or "N/A"
 */
export function calculatePFC({ ze, zsMeasured }: PfcInputs): string {
  const zeNum = parseFloat(ze.replace(/[ΩΩ]|ohms?/i, '')) || 0;
  if (zeNum <= 0) return 'N/A';

  // Use Zs if provided (PFC at circuit end), else Ze (PFC at origin)
  const parsedZs = zsMeasured ? parseFloat(zsMeasured.replace(/[ΩΩ]|ohms?/i, '')) : NaN;
  const zValue = Number.isFinite(parsedZs) && parsedZs > 0 ? parsedZs : zeNum;
  if (zValue <= 0) return 'N/A';

  const uo = 230;  // Nominal phase-earth voltage
  const ipfKa = (uo / zValue / 1000).toFixed(2);  // kA, 2dp per BS7671

  return `${ipfKa} kA`;
}

/**
 * Validate PFC against typical DB ratings (e.g. 6kA, 10kA).
 */
export function validatePfc(ipfStr: string, dbRatingKa: number = 6): 'PASS' | 'FAIL' | 'N/A' {
  const ipfNum = parseFloat(ipfStr.replace(/kA/g, '')) || 0;
  return ipfNum > 0 && ipfNum <= dbRatingKa ? 'PASS' : ipfNum > dbRatingKa ? 'FAIL' : 'N/A';
}


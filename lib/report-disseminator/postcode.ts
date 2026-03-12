/**
 * UK Postcode validation via postcodes.io (free, no API key needed)
 * https://postcodes.io/
 */

export type PostcodeResult = {
  valid: boolean;
  postcode?: string;
  country?: string;
  region?: string;
  county?: string | null;
  district?: string;
  ward?: string;
  latitude?: number;
  longitude?: number;
  error?: string;
};

/**
 * Validates a UK postcode by calling the postcodes.io REST API.
 * Can be called from any client or server context.
 */
export async function validateUkPostcode(postcode: string): Promise<PostcodeResult> {
  const cleaned = postcode.trim().toUpperCase();

  if (!cleaned) {
    return { valid: false, error: 'No postcode provided' };
  }

  // Quick local format check before making a network call
  const formatOk = /^([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i.test(cleaned);
  if (!formatOk) {
    return { valid: false, error: 'Postcode does not match UK format (e.g. SW1A 1AA)' };
  }

  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`);
    if (res.status === 404) {
      return { valid: false, error: `Postcode "${cleaned}" not found in Royal Mail database` };
    }
    if (!res.ok) {
      return { valid: false, error: `postcodes.io returned status ${res.status}` };
    }
    const json = await res.json();
    const r = json.result;
    return {
      valid: true,
      postcode: r.postcode,
      country: r.country,
      region: r.region,
      county: r.admin_county,
      district: r.admin_district,
      ward: r.admin_ward,
      latitude: r.latitude,
      longitude: r.longitude,
    };
  } catch (e: any) {
    return { valid: false, error: `Network error: ${e.message}` };
  }
}

/**
 * Bulk validate up to 100 postcodes in one request.
 */
export async function bulkValidateUkPostcodes(postcodes: string[]): Promise<Record<string, PostcodeResult>> {
  if (!postcodes.length) return {};

  try {
    const res = await fetch('https://api.postcodes.io/postcodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcodes: postcodes.slice(0, 100) }),
    });

    if (!res.ok) return postcodes.reduce((acc, p) => ({ ...acc, [p]: { valid: false, error: `HTTP ${res.status}` } }), {});
    const json = await res.json();

    const out: Record<string, PostcodeResult> = {};
    for (const item of json.result ?? []) {
      const pc = item.query as string;
      if (!item.result) {
        out[pc] = { valid: false, error: 'Not found' };
      } else {
        const r = item.result;
        out[pc] = {
          valid: true,
          postcode: r.postcode,
          country: r.country,
          region: r.region,
          county: r.admin_county,
          district: r.admin_district,
          latitude: r.latitude,
          longitude: r.longitude,
        };
      }
    }
    return out;
  } catch (e: any) {
    return postcodes.reduce((acc, p) => ({ ...acc, [p]: { valid: false, error: e.message } }), {});
  }
}

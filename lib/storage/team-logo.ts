import { downloadFromR2, uploadDataUrlToR2 } from '@/lib/storage/r2';

/**
 * Team logos used to be written into `teams.logo_data_uri` as base64, which put
 * up to a megabyte of image into every row that carries a team. Logos now live
 * in R2 and the row keeps only the object key; `logoDataUri` remains readable so
 * rows that were never migrated keep working.
 */

const LOGO_CACHE_TTL_MS = 10 * 60 * 1000;
const LOGO_CACHE_MAX_ENTRIES = 50;

type TeamLogoSource = {
  logoDataUri?: string | null;
  logoR2Key?: string | null;
};

type CacheEntry = {
  dataUri: string;
  expiresAt: number;
};

const logoCache = new Map<string, CacheEntry>();

function contentTypeFromKey(key: string): string {
  const extension = key.slice(key.lastIndexOf('.') + 1).toLowerCase();

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

/** A stable key per team, so a replaced logo overwrites the previous object. */
export function buildTeamLogoKey(teamId: number | string, contentType: string): string {
  const extension = contentType.toLowerCase().includes('png')
    ? 'png'
    : contentType.toLowerCase().includes('webp')
      ? 'webp'
      : 'jpg';

  return `teams/${String(teamId).trim()}/logo/logo.${extension}`;
}

/** Uploads a data URI to R2 and returns the key to store on the team. */
export async function storeTeamLogoFromDataUri(
  teamId: number | string,
  dataUri: string,
): Promise<{ key: string; url: string }> {
  const contentType = dataUri.slice(5, dataUri.indexOf(';')) || 'image/jpeg';
  const key = buildTeamLogoKey(teamId, contentType);
  const upload = await uploadDataUrlToR2({ key, dataUrl: dataUri });

  logoCache.set(key, { dataUri, expiresAt: Date.now() + LOGO_CACHE_TTL_MS });

  return { key: upload.key, url: upload.url };
}

/**
 * Returns a data URI for the team's logo, or null.
 *
 * PDF generation and ServiceM8 publishing both need the bytes rather than a
 * URL, so an R2-backed logo is downloaded and cached rather than linked.
 */
export async function resolveTeamLogoDataUri(team: TeamLogoSource | null | undefined): Promise<string | null> {
  if (!team) {
    return null;
  }

  const key = team.logoR2Key?.trim();

  if (key) {
    const cached = logoCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.dataUri;
    }

    try {
      const object = await downloadFromR2(key);

      if (object) {
        const contentType = object.contentType ?? contentTypeFromKey(key);
        const dataUri = `data:${contentType};base64,${object.body.toString('base64')}`;

        if (logoCache.size >= LOGO_CACHE_MAX_ENTRIES) {
          const oldestKey = logoCache.keys().next().value;
          if (oldestKey) {
            logoCache.delete(oldestKey);
          }
        }

        logoCache.set(key, { dataUri, expiresAt: Date.now() + LOGO_CACHE_TTL_MS });

        return dataUri;
      }
    } catch (error) {
      console.warn(`Unable to read team logo ${key} from R2:`, error);
    }
  }

  // Rows written before the move to R2 still hold the image inline.
  return team.logoDataUri ?? null;
}

/**
 * URL the web UI can put straight into an <img>. The endpoint resolves the
 * team from the session, so no object key is exposed in the page.
 */
export function resolveTeamLogoUrl(team: TeamLogoSource | null | undefined): string | null {
  if (!team) {
    return null;
  }

  if (team.logoR2Key?.trim()) {
    return '/api/team/logo';
  }

  return team.logoDataUri ?? null;
}

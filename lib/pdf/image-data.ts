/**
 * Resolves arbitrary image sources into data URIs that jsPDF can embed.
 *
 * jsPDF ships pure-JavaScript decoders for PNG, JPEG, WEBP, GIF and BMP, so no
 * native image library is required for those formats — they are passed straight
 * through. Anything else (SVG, TIFF, HEIC…) is rasterised in the browser when
 * that is possible; on the server the source is reported as unsupported so the
 * caller can fall back to text instead of silently drawing nothing.
 *
 * This deliberately avoids the `canvas` npm package: its native binary is not
 * built during `pnpm install`, which previously caused every logo lookup to
 * return null and the PDFs to show a text placeholder in place of the logos.
 */

export type PdfImageFormat = 'PNG' | 'JPEG' | 'WEBP' | 'GIF' | 'BMP';

export type ResolvedPdfImage = {
  dataUri: string;
  format: PdfImageFormat;
};

const MIME_FORMAT_MAP: Record<string, PdfImageFormat> = {
  'image/png': 'PNG',
  'image/x-png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'image/pjpeg': 'JPEG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/bmp': 'BMP',
  'image/x-ms-bmp': 'BMP',
};

const EXTENSION_MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

const DATA_URI_PATTERN = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+)(;[^,]*)?,/i;
const MAX_RASTER_DIMENSION = 1600;

const resolvedImageCache = new Map<string, ResolvedPdfImage | null>();
const unsupportedRasterisationWarnings = new Set<string>();

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getExtensionMime(path: string): string | null {
  const match = path.toLowerCase().match(/\.[a-z0-9]+$/);
  if (!match) return null;
  return EXTENSION_MIME_MAP[match[0]] ?? null;
}

/** Reads the MIME type out of a data URI. */
export function getDataUriMime(dataUri: string): string | null {
  const match = dataUri.match(DATA_URI_PATTERN);
  return match?.[1]?.toLowerCase() ?? null;
}

/** Derives the jsPDF format token for a data URI, or null when unsupported. */
export function getPdfImageFormat(dataUri: string): PdfImageFormat | null {
  const mime = getDataUriMime(dataUri);
  if (!mime) return null;
  return MIME_FORMAT_MAP[mime] ?? null;
}

function bytesToBase64(bytes: Uint8Array): string {
  const globalBuffer = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(bytes).toString('base64');
  }

  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/** Loads a same-origin public asset (e.g. `/logos/niceic-logo.png`) into a data URI. */
async function loadPublicAsset(assetPath: string): Promise<string | null> {
  if (isBrowser()) {
    try {
      const response = await fetch(assetPath);
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      const mime =
        response.headers.get('content-type')?.split(';')[0]?.trim() ||
        getExtensionMime(assetPath) ||
        'application/octet-stream';
      return `data:${mime};base64,${bytesToBase64(new Uint8Array(buffer))}`;
    } catch {
      return null;
    }
  }

  try {
    const [{ default: path }, fs] = await Promise.all([
      import('node:path'),
      import('node:fs/promises'),
    ]);
    const absolutePath = path.join(process.cwd(), 'public', assetPath.replace(/^\//, ''));
    const fileBuffer = await fs.readFile(absolutePath);
    const mime = getExtensionMime(assetPath) ?? 'application/octet-stream';
    return `data:${mime};base64,${fileBuffer.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Downloads a remote image into a data URI. */
async function loadRemoteAsset(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        accept:
          'image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    const mime =
      contentType && contentType.startsWith('image/')
        ? contentType
        : getExtensionMime(url) ?? 'image/png';

    return `data:${mime};base64,${bytesToBase64(new Uint8Array(buffer))}`;
  } catch {
    return null;
  }
}

/** Turns any supported source reference into a base64 data URI. */
async function loadImageDataUri(source: string): Promise<string | null> {
  if (source.startsWith('data:')) return source;
  if (source.startsWith('/')) return loadPublicAsset(source);
  if (/^https?:\/\//i.test(source)) return loadRemoteAsset(source);
  return null;
}

/** Rasterises an image using the browser's native decoder (SVG, TIFF, HEIC…). */
async function rasteriseInBrowser(dataUri: string): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  return new Promise<string | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const naturalWidth = image.naturalWidth || image.width;
        const naturalHeight = image.naturalHeight || image.height;
        if (!naturalWidth || !naturalHeight) {
          resolve(null);
          return;
        }

        const scale = Math.min(1, MAX_RASTER_DIMENSION / Math.max(naturalWidth, naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(naturalHeight * scale));

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = dataUri;
  });
}

async function rasteriseToPng(dataUri: string, source: string): Promise<string | null> {
  if (isBrowser()) {
    return rasteriseInBrowser(dataUri);
  }

  if (!unsupportedRasterisationWarnings.has(source)) {
    unsupportedRasterisationWarnings.add(source);
    console.warn(
      `[pdf] Image "${source}" is not a PNG/JPEG/WEBP/GIF/BMP file and cannot be rasterised on the ` +
        'server. Convert it to PNG or JPEG so it can be embedded in generated PDFs.'
    );
  }

  return null;
}

async function resolvePdfImageUncached(source: string): Promise<ResolvedPdfImage | null> {
  const dataUri = await loadImageDataUri(source);
  if (!dataUri) return null;

  const format = getPdfImageFormat(dataUri);
  if (format) {
    return { dataUri, format };
  }

  const rasterised = await rasteriseToPng(dataUri, source);
  if (!rasterised) return null;

  return { dataUri: rasterised, format: 'PNG' };
}

/**
 * Resolves an image source into a jsPDF-ready data URI and format token.
 * Results are memoised because PDF generation asks for the same logos
 * repeatedly across pages and certificates.
 */
export async function resolvePdfImage(source?: string | null): Promise<ResolvedPdfImage | null> {
  if (!source) return null;

  const cached = resolvedImageCache.get(source);
  if (cached !== undefined) return cached;

  const resolved = await resolvePdfImageUncached(source);
  resolvedImageCache.set(source, resolved);
  return resolved;
}

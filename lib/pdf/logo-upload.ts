/**
 * Normalises an uploaded company logo into a data URI that jsPDF can embed.
 *
 * PNG, JPEG, WEBP, GIF and BMP are passed through untouched because jsPDF ships
 * decoders for them. Anything else (SVG, TIFF, HEIC…) is rasterised to PNG with
 * the browser's own decoder, so logos are never stored in a format that the PDF
 * engine would later fail to draw.
 */

const PDF_SAFE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/x-ms-bmp',
]);

const MAX_UPLOAD_DIMENSION = 1200;
const FALLBACK_DIMENSION = 512;

export const COMPANY_LOGO_ACCEPTED_FORMATS = 'PNG, JPG, WEBP, GIF, BMP or SVG';

export const COMPANY_LOGO_ACCEPT_ATTRIBUTE = 'image/*,.svg';

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read image'));
    };

    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(dataUri: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('This image could not be read. Try a PNG or JPEG version.'));

    image.src = dataUri;
  });
}

async function rasteriseToPngDataUri(dataUri: string): Promise<string> {
  const image = await loadImageElement(dataUri);

  const naturalWidth = image.naturalWidth || image.width || FALLBACK_DIMENSION;
  const naturalHeight = image.naturalHeight || image.height || FALLBACK_DIMENSION;
  const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(naturalWidth, naturalHeight));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(naturalHeight * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not prepare the image for upload');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** Converts a selected file into a logo data URI safe for PDF embedding. */
export async function normaliseCompanyLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.svg')) {
    throw new Error('Please select an image file');
  }

  const dataUri = await readFileAsDataUri(file);
  if (PDF_SAFE_MIME_TYPES.has(file.type.toLowerCase())) {
    return dataUri;
  }

  return rasteriseToPngDataUri(dataUri);
}

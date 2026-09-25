import type { jsPDF } from 'jspdf';

import type { ResolvedPdfImage } from './image-data';

export type ImageBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Draws an image centred inside `box`, preserving its natural aspect ratio so
 * logos are never stretched. Returns false when the image could not be drawn.
 */
export function drawContainedImage(
  pdf: jsPDF,
  image: ResolvedPdfImage,
  box: ImageBox,
  padding = 0
): boolean {
  const availableWidth = Math.max(0.5, box.width - padding * 2);
  const availableHeight = Math.max(0.5, box.height - padding * 2);

  let naturalWidth = availableWidth;
  let naturalHeight = availableHeight;

  try {
    const properties = pdf.getImageProperties(image.dataUri);
    if (properties?.width && properties?.height) {
      naturalWidth = properties.width;
      naturalHeight = properties.height;
    }
  } catch {
    // Unmeasurable formats fall back to filling the available box.
  }

  const scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
  const drawWidth = Math.max(0.5, naturalWidth * scale);
  const drawHeight = Math.max(0.5, naturalHeight * scale);
  const drawX = box.x + (box.width - drawWidth) / 2;
  const drawY = box.y + (box.height - drawHeight) / 2;

  try {
    pdf.addImage(image.dataUri, image.format, drawX, drawY, drawWidth, drawHeight);
    return true;
  } catch {
    return false;
  }
}

type RedactionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PositionedTextItem = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

function toPositionedTextItems(textContent: any, viewport: any) {
  const items = Array.isArray(textContent?.items) ? textContent.items : [];

  return items
    .map((item: any) => {
      const text = typeof item?.str === 'string' ? item.str : '';
      if (!text.trim()) return null;

      const transform = Array.isArray(item?.transform) ? item.transform : null;
      if (!transform) return null;

      const [left, baseline] = viewport.convertToViewportPoint(transform[4], transform[5]);
      const width = Math.max((item.width || 0) * viewport.scale, 0);
      const height = Math.max((item.height || 0) * viewport.scale, 0);
      const top = baseline - height;

      return {
        text,
        left,
        top,
        width,
        height,
      } satisfies PositionedTextItem;
    })
    .filter((item: PositionedTextItem | null): item is PositionedTextItem => Boolean(item));
}

function groupItemsIntoLines(items: PositionedTextItem[]) {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.top - b.top) > 4) return a.top - b.top;
    return a.left - b.left;
  });

  const lines: PositionedTextItem[][] = [];
  for (const item of sorted) {
    const line = lines.find((candidate) => Math.abs(candidate[0].top - item.top) <= 4);
    if (line) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines.map((line) => line.sort((a, b) => a.left - b.left));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function removeContainerRedactions(rects: RedactionRect[]) {
  if (rects.length < 2) return rects;

  const keep = new Array(rects.length).fill(true);

  const area = (r: RedactionRect) => r.width * r.height;
  const intersectionArea = (a: RedactionRect, b: RedactionRect) => {
    const x1 = Math.max(a.left, b.left);
    const y1 = Math.max(a.top, b.top);
    const x2 = Math.min(a.left + a.width, b.left + b.width);
    const y2 = Math.min(a.top + a.height, b.top + b.height);
    const w = Math.max(x2 - x1, 0);
    const h = Math.max(y2 - y1, 0);
    return w * h;
  };

  for (let i = 0; i < rects.length; i++) {
    if (!keep[i]) continue;
    for (let j = i + 1; j < rects.length; j++) {
      if (!keep[j]) continue;

      const a = rects[i];
      const b = rects[j];
      const overlap = intersectionArea(a, b);
      if (overlap <= 0) continue;

      const aArea = area(a);
      const bArea = area(b);
      const smallerArea = Math.min(aArea, bArea);
      if (smallerArea <= 0) continue;

      const overlapRatio = overlap / smallerArea;
      const sameColumn = Math.abs(a.left - b.left) <= 16;

      if (sameColumn && overlapRatio >= 0.82) {
        if (aArea <= bArea) {
          keep[j] = false;
        } else {
          keep[i] = false;
          break;
        }
      }
    }
  }

  return rects.filter((_, idx) => keep[idx]);
}

function tokenizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function scoreTokenOverlap(label: string, linePart: string) {
  const labelTokens = tokenizeForMatch(label);
  const lineTokens = new Set(tokenizeForMatch(linePart));
  if (!labelTokens.length || !lineTokens.size) return 0;

  let matches = 0;
  for (const token of labelTokens) {
    if (lineTokens.has(token)) matches++;
  }

  return matches / labelTokens.length;
}

/**
 * Label-matched redaction: for each supplied field label, find the corresponding
 * line in the PDF text content and redact only the value portion after the colon.
 * Generates at most one rect per unique matched label, eliminating double-masking.
 */
export async function buildFieldLabelRedactions(
  page: any,
  viewport: any,
  fieldLabels: string[],
): Promise<RedactionRect[]> {
  if (!fieldLabels.length) return [];

  const textContent = await page.getTextContent();
  const items = toPositionedTextItems(textContent, viewport);
  const lines = groupItemsIntoLines(items);

  // Deduplicate labels and normalize for case-insensitive matching.
  const normalizedLabels = [
    ...new Set(fieldLabels.map((l) => l.trim().toLowerCase().replace(/\s+/g, ' '))),
  ].filter(Boolean);

  const rects: RedactionRect[] = [];
  const usedLabels = new Set<string>();

  for (const line of lines) {
    const lineText = line
      .map((item) => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const lineNorm = lineText.toLowerCase();

    // Only look for labels in the portion of the line up to (and including) the first colon.
    const colonIdx = lineNorm.indexOf(':');
    const labelSearchArea = colonIdx !== -1 ? lineNorm.slice(0, colonIdx + 1) : lineNorm;

    const exactMatch = normalizedLabels.find(
      (label) => !usedLabels.has(label) && labelSearchArea.includes(label),
    );

    let matchedLabel = exactMatch;
    if (!matchedLabel) {
      let bestScore = 0;
      let bestLabel: string | null = null;
      for (const label of normalizedLabels) {
        if (usedLabels.has(label)) continue;
        const score = scoreTokenOverlap(label, labelSearchArea);
        if (score > bestScore) {
          bestScore = score;
          bestLabel = label;
        }
      }

      // Require meaningful overlap to avoid spurious matches.
      if (bestLabel && bestScore >= 0.55) {
        matchedLabel = bestLabel;
      }
    }

    if (!matchedLabel) continue;

    // Find the item that contains the colon so we know where the value starts.
    let redactionStart = -1;
    if (colonIdx !== -1) {
      for (const item of line) {
        if (item.text.includes(':')) {
          redactionStart = item.left + item.width + 2;
          break;
        }
      }
    }

    // Mark label as used regardless of whether there's a value (prevents duplicate rects).
    usedLabels.add(matchedLabel);

    if (redactionStart === -1) continue;

    // Only extend redaction through items contiguous with redactionStart.
    // Items beyond a gap of >24px are likely a separate column – stop there.
    const sortedByLeft = [...line].sort((a, b) => a.left - b.left);
    let lineRight = redactionStart;
    for (const item of sortedByLeft) {
      if (item.left + item.width <= redactionStart - 4) continue; // left of colon
      if (item.left > lineRight + 24) break; // large gap = separate column
      lineRight = Math.max(lineRight, item.left + item.width);
    }
    const width = lineRight - redactionStart + 3;
    if (width <= 8) continue;

    const lineTop = median(line.map((item) => item.top));
    const lineHeight = Math.min(Math.max(median(line.map((item) => item.height)), 8), 22);

    rects.push({
      left: redactionStart,
      top: Math.max(lineTop - 1, 0),
      width,
      height: lineHeight + 2,
    });
  }

  return removeContainerRedactions(rects);
}

export async function buildPdfValueRedactions(page: any, viewport: any): Promise<RedactionRect[]> {
  const textContent = await page.getTextContent();
  const items = toPositionedTextItems(textContent, viewport);
  const lines = groupItemsIntoLines(items);

  const rawRects = lines.flatMap((line) => {
    const lineText = line.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();
    const colonIndex = lineText.indexOf(':');
    if (colonIndex === -1) return [];

    const suffix = lineText.slice(colonIndex + 1).trim();
    if (!suffix) return [];

    let redactionStart = -1;
    let consumedLength = 0;

    for (const item of line) {
      const nextConsumedLength = consumedLength + item.text.length;
      if (redactionStart === -1 && item.text.includes(':')) {
        redactionStart = item.left + item.width + 2;
        break;
      }
      if (colonIndex >= consumedLength && colonIndex < nextConsumedLength) {
        redactionStart = item.left + item.width + 2;
        break;
      }
      consumedLength = nextConsumedLength + 1;
    }

    if (redactionStart === -1) return [];

    // Only extend through contiguous value items; stop before column gaps (>24px).
    const sortedByLeft = [...line].sort((a, b) => a.left - b.left);
    let lineRight = redactionStart;
    for (const item of sortedByLeft) {
      if (item.left + item.width <= redactionStart - 4) continue;
      if (item.left > lineRight + 24) break;
      lineRight = Math.max(lineRight, item.left + item.width);
    }
    const lineTop = median(line.map((item) => item.top));
    const lineHeight = Math.min(Math.max(median(line.map((item) => item.height)), 8), 22);
    const width = lineRight - redactionStart + 3;
    if (width <= 12) return [];

    return [
      {
        left: redactionStart,
        top: Math.max(lineTop - 1, 0),
        width,
        height: lineHeight + 2,
      },
    ];
  });

  return removeContainerRedactions(rawRects);
}

export function buildCanvasFallbackRedactions(canvas: HTMLCanvasElement): RedactionRect[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const width = canvas.width;
  const height = canvas.height;
  if (width < 400 || height < 300) return [];

  // Keep labels on the left, mask likely values on the right side.
  const leftStart = 40;
  const splitX = Math.floor(width * 0.3);
  const rightStart = splitX + 20;
  const rightEnd = width - 20;

  if (rightStart >= rightEnd) return [];

  const imageData = ctx.getImageData(0, 0, width, height).data;

  const isDarkPixel = (r: number, g: number, b: number) => {
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 155;
  };

  const rowSignals: boolean[] = new Array(height).fill(false);
  for (let y = 0; y < height; y++) {
    let leftDark = 0;
    let rightDark = 0;

    for (let x = leftStart; x < splitX; x += 2) {
      const idx = (y * width + x) * 4;
      if (isDarkPixel(imageData[idx], imageData[idx + 1], imageData[idx + 2])) leftDark++;
    }

    for (let x = rightStart; x < rightEnd; x += 2) {
      const idx = (y * width + x) * 4;
      if (isDarkPixel(imageData[idx], imageData[idx + 1], imageData[idx + 2])) rightDark++;
    }

    // Require signal on both sides to reduce false positives that can white-out the preview.
    rowSignals[y] = leftDark >= 2 && rightDark >= 7;
  }

  const bands: Array<{ start: number; end: number }> = [];
  let start = -1;
  for (let y = 0; y < height; y++) {
    if (rowSignals[y] && start === -1) {
      start = y;
      continue;
    }

    if (!rowSignals[y] && start !== -1) {
      bands.push({ start, end: y - 1 });
      start = -1;
    }
  }
  if (start !== -1) {
    bands.push({ start, end: height - 1 });
  }

  const merged: Array<{ start: number; end: number }> = [];
  for (const band of bands) {
    if (!merged.length) {
      merged.push({ ...band });
      continue;
    }

    const last = merged[merged.length - 1];
    if (band.start - last.end <= 4) {
      last.end = band.end;
    } else {
      merged.push({ ...band });
    }
  }

  const redactions = merged
    .flatMap((band) => {
      const bandHeight = band.end - band.start + 1;
      const columnSignals: boolean[] = [];

      for (let x = rightStart; x < rightEnd; x += 2) {
        let darkCount = 0;
        for (let y = band.start; y <= band.end; y++) {
          const idx = (y * width + x) * 4;
          if (isDarkPixel(imageData[idx], imageData[idx + 1], imageData[idx + 2])) {
            darkCount++;
          }
        }

        // Require at least a small amount of vertical support in the band.
        columnSignals.push(darkCount >= Math.max(2, Math.ceil(bandHeight * 0.2)));
      }

      const clusters: Array<{ start: number; end: number }> = [];
      let clusterStart = -1;
      for (let index = 0; index < columnSignals.length; index++) {
        if (columnSignals[index] && clusterStart === -1) {
          clusterStart = index;
          continue;
        }

        if (!columnSignals[index] && clusterStart !== -1) {
          clusters.push({ start: clusterStart, end: index - 1 });
          clusterStart = -1;
        }
      }
      if (clusterStart !== -1) {
        clusters.push({ start: clusterStart, end: columnSignals.length - 1 });
      }

      const mergedClusters: Array<{ start: number; end: number }> = [];
      for (const cluster of clusters) {
        const last = mergedClusters[mergedClusters.length - 1];
        if (last && cluster.start - last.end <= 2) {
          last.end = cluster.end;
        } else {
          mergedClusters.push({ ...cluster });
        }
      }

      const horizontalPadding = 4;
      return mergedClusters
        .map((cluster) => {
          const minX = rightStart + cluster.start * 2;
          const maxX = rightStart + cluster.end * 2;
          const left = Math.max(minX - horizontalPadding, rightStart);
          const right = Math.min(maxX + horizontalPadding, rightEnd);
          return {
            left,
            top: Math.max(band.start - 1, 0),
            width: Math.max(right - left, 0),
            height: bandHeight + 2,
          };
        })
        .filter((rect) => rect.width > 20 && rect.height >= 8);
    });

  const totalArea = width * height;
  const redactedArea = redactions.reduce((sum, rect) => sum + rect.width * rect.height, 0);
  const coverageRatio = totalArea > 0 ? redactedArea / totalArea : 0;

  // Safety valve: if fallback attempts to mask too much, disable it entirely.
  if (redactions.length > 120 || coverageRatio > 0.28) {
    return [];
  }

  // Slight inset to avoid visible overdraw on nearby label/border pixels.
  return redactions
    .map((rect) => {
      const inset = 2;
      return {
        left: rect.left + inset,
        top: rect.top + 1,
        width: Math.max(rect.width - inset * 2, 0),
        height: Math.max(rect.height - 2, 0),
      };
    })
    .filter((rect) => rect.width > 16 && rect.height >= 6);
}
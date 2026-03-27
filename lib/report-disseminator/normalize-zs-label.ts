/**
 * Normalizes labels commonly used for maximum permitted Zs fields.
 * Returns null when the label does not look like a Zs field.
 */
export function normalizeZsLabel(rawLabel: string): string | null {
  const normalized = rawLabel
    .toLowerCase()
    .replace(/maximum\s+(permitted|permissible|value)?|required|value|0?\.4s?\)?/gi, '')
    .replace(/[()\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.includes('max zs') || normalized.includes('zs max')) {
    const cleaned = rawLabel
      .replace(/\b(?:maximum\s+(?:permitted|permissible|value)|required|0?\.4s?\))\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || 'Max Zs';
  }

  return null;
}

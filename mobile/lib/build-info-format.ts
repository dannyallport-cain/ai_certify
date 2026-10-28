/**
 * Pure formatting for the build label shown on the login and unlock screen.
 *
 * Kept apart from the module that reads Expo constants so the formatting can be checked without a
 * React Native runtime.
 */

export interface BuildInfo {
  version: string;
  buildNumber: string;
  /** Localised build date, or null when this build did not carry a timestamp. */
  builtOn: string | null;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

/** Returns null for anything unparsable, rather than printing "Invalid Date" on the login screen. */
export function formatBuildDate(isoTimestamp: string): string | null {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, DATE_FORMAT);
}

/** e.g. "v1.0.0 (11) · built 28 Oct 2026". */
export function describeBuild(info: BuildInfo): string {
  const base = `v${info.version} (${info.buildNumber})`;

  return info.builtOn ? `${base} · built ${info.builtOn}` : base;
}

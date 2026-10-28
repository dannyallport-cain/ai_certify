import Constants from 'expo-constants';

import { describeBuild as formatBuildInfo, formatBuildDate, type BuildInfo } from './build-info-format';

/**
 * Build identity shown on the login and unlock screen.
 *
 * The build number and timestamp are injected by the release build as EXPO_PUBLIC_* values, which
 * Metro inlines at bundle time — so the date shown is when this binary's JavaScript was built, not
 * when the app happens to be launched. Outside a release build there is no timestamp and the label
 * simply omits it rather than inventing one.
 */

const BUNDLE_BUILD_NUMBER = process.env.EXPO_PUBLIC_BUILD_NUMBER ?? '';
const BUNDLE_BUILT_AT = process.env.EXPO_PUBLIC_BUILD_AT ?? '';

const FALLBACK_VERSION = '1.0.0';
const UNKNOWN_BUILD = '—';

export type { BuildInfo };
export { formatBuildDate };

export function getBuildInfo(): BuildInfo {
  return {
    version: Constants.expoConfig?.version ?? FALLBACK_VERSION,
    buildNumber: BUNDLE_BUILD_NUMBER || Constants.expoConfig?.ios?.buildNumber || UNKNOWN_BUILD,
    builtOn: BUNDLE_BUILT_AT ? formatBuildDate(BUNDLE_BUILT_AT) : null,
  };
}

/** The single line printed under the sign-in and unlock buttons. */
export function describeBuild(): string {
  return formatBuildInfo(getBuildInfo());
}

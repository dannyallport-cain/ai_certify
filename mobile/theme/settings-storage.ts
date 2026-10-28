import * as SecureStore from 'expo-secure-store';

import { isFontScaleKey, type FontScaleKey } from './typography';

/** Appearance preference: follow the device, or pin light/dark. */
export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_MODE_KEY = 'app:theme-mode';
const FONT_SCALE_KEY = 'app:font-scale';

export interface StoredSettings {
  mode: ThemeMode;
  fontScale: FontScaleKey;
}

export const DEFAULT_SETTINGS: StoredSettings = {
  mode: 'system',
  fontScale: 'medium',
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * SecureStore is already wired into the app for the session token, so it is
 * also the least surprising place for these two preferences. A failed read
 * simply falls back to the defaults rather than blocking the UI.
 */
async function readValue(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeValue(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Preferences are not worth interrupting a survey over.
  }
}

export async function loadSettings(): Promise<StoredSettings> {
  const [storedMode, storedScale] = await Promise.all([
    readValue(THEME_MODE_KEY),
    readValue(FONT_SCALE_KEY),
  ]);

  return {
    mode: isThemeMode(storedMode) ? storedMode : DEFAULT_SETTINGS.mode,
    fontScale: isFontScaleKey(storedScale) ? storedScale : DEFAULT_SETTINGS.fontScale,
  };
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await writeValue(THEME_MODE_KEY, mode);
}

export async function saveFontScale(fontScale: FontScaleKey): Promise<void> {
  await writeValue(FONT_SCALE_KEY, fontScale);
}

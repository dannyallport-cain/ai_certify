import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { colorScheme as nativewindColorScheme } from 'nativewind';

import { paletteFor, type ThemeScheme } from './palette';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveFontScale,
  saveThemeMode,
  type ThemeMode,
} from './settings-storage';
import { ThemeContext, type ThemeContextValue } from './theme-context';
import type { FontScaleKey } from './typography';

function resolveScheme(mode: ThemeMode, deviceScheme: 'light' | 'dark' | null | undefined): ThemeScheme {
  if (mode === 'system') {
    return deviceScheme === 'dark' ? 'dark' : 'light';
  }

  return mode;
}

/**
 * Owns the light/dark choice and the font-size preference.
 *
 * Both are persisted, both apply instantly across every screen, and the
 * colour scheme is pushed into NativeWind so `dark:` utilities and any
 * library that reads the colour scheme agree with the app.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_SETTINGS.mode);
  const [fontScale, setFontScaleState] = useState<FontScaleKey>(DEFAULT_SETTINGS.fontScale);

  useEffect(() => {
    let isMounted = true;

    void loadSettings().then((settings) => {
      if (!isMounted) {
        return;
      }

      setModeState(settings.mode);
      setFontScaleState(settings.fontScale);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const scheme = resolveScheme(mode, deviceScheme);

  // Keeps NativeWind's dark: variant and any third-party component that reads
  // the colour scheme in step with the user's choice.
  useEffect(() => {
    nativewindColorScheme.set(mode === 'system' ? 'system' : scheme);
  }, [mode, scheme]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void saveThemeMode(nextMode);
  }, []);

  const setFontScale = useCallback((nextScale: FontScaleKey) => {
    setFontScaleState(nextScale);
    void saveFontScale(nextScale);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      scheme,
      palette: paletteFor(scheme),
      fontScale,
      setMode,
      setFontScale,
    }),
    [fontScale, mode, scheme, setFontScale, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

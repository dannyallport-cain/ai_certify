import { createContext } from 'react';

import type { ThemePalette, ThemeScheme } from './palette';
import type { ThemeMode } from './settings-storage';
import type { FontScaleKey } from './typography';

export interface ThemeContextValue {
  /** What the user chose in Settings. */
  mode: ThemeMode;
  /** What that choice resolves to right now. */
  scheme: ThemeScheme;
  palette: ThemePalette;
  fontScale: FontScaleKey;
  setMode: (mode: ThemeMode) => void;
  setFontScale: (fontScale: FontScaleKey) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

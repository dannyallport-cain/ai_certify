import { useContext, useMemo } from 'react';

import { accentTokens, type AccentTokens, type FlowAccent } from './accents';
import { ThemeContext, type ThemeContextValue } from './theme-context';
import { typeStyle, type TypeRole, type TypeStyle } from './typography';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}

/** Colour tokens for a workflow step, resolved for the active scheme. */
export function useAccent(accent: FlowAccent): AccentTokens {
  const { scheme } = useTheme();

  return useMemo(() => accentTokens(accent, scheme), [accent, scheme]);
}

/** Point sizes for a type role, already scaled by the Settings font size. */
export function useTypeStyle(role: TypeRole): TypeStyle {
  const { fontScale } = useTheme();

  return useMemo(() => typeStyle(role, fontScale), [fontScale, role]);
}

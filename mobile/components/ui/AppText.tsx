import { Text, type TextProps } from 'react-native';

import { useTheme, useTypeStyle } from '@/theme/useTheme';
import type { TypeRole } from '@/theme/typography';

export type TextTone =
  | 'default'
  | 'muted'
  | 'soft'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'inverse';

export interface AppTextProps extends TextProps {
  /** Size/weight from the shared type scale, scaled by the Settings font size. */
  variant?: TypeRole;
  tone?: TextTone;
}

/**
 * Every piece of text in the app renders through here so one Settings control
 * (font size) reaches all of it, and light/dark are handled in one place.
 */
export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const { palette } = useTheme();
  const typeStyle = useTypeStyle(variant);

  const colour = resolveTone(tone, palette);

  return <Text {...rest} style={[typeStyle, { color: colour }, style]} />;
}

function resolveTone(tone: TextTone, palette: ReturnType<typeof useTheme>['palette']): string {
  switch (tone) {
    case 'muted':
      return palette.inkMuted;
    case 'soft':
      return palette.inkSoft;
    case 'brand':
      return palette.brand;
    case 'success':
      return palette.success;
    case 'warning':
      return palette.warning;
    case 'danger':
      return palette.danger;
    case 'inverse':
      return palette.onSolid;
    case 'default':
    default:
      return palette.ink;
  }
}

export default AppText;

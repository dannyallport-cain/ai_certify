import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export type PillTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export interface PillProps {
  label: string;
  tone?: PillTone;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Small status chip: one line, no wrapping, consistent height in both schemes. */
export function Pill({ label, tone = 'neutral', icon }: PillProps) {
  const { palette } = useTheme();

  const { background, foreground } = resolveTone(tone, palette);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: background,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={foreground} /> : null}
      <AppText variant="caption" style={{ color: foreground }} numberOfLines={1}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );
}

function resolveTone(
  tone: PillTone,
  palette: ReturnType<typeof useTheme>['palette'],
): { background: string; foreground: string } {
  switch (tone) {
    case 'brand':
      return { background: palette.brandSoft, foreground: palette.brand };
    case 'success':
      return { background: palette.successSoft, foreground: palette.success };
    case 'warning':
      return { background: palette.warningSoft, foreground: palette.warning };
    case 'danger':
      return { background: palette.dangerSoft, foreground: palette.danger };
    case 'info':
      return { background: palette.infoSoft, foreground: palette.info };
    case 'neutral':
    default:
      return { background: palette.surfaceAlt, foreground: palette.inkMuted };
  }
}

export default Pill;

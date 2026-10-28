import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { accentTokens, type FlowAccent } from '@/theme/accents';
import { AppText } from './AppText';

export interface StatTileProps {
  label: string;
  value: string | number;
  accent?: FlowAccent;
}

/** Compact metric: big number, small caps label. Used in step headers. */
export function StatTile({ label, value, accent }: StatTileProps) {
  const { palette, scheme } = useTheme();
  const tokens = accent ? accentTokens(accent, scheme) : null;

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: tokens ? tokens.soft : palette.surfaceAlt,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <AppText variant="heading" style={{ color: tokens ? tokens.ink : palette.ink }}>
        {value}
      </AppText>
      <AppText variant="caption" style={{ color: tokens ? tokens.ink : palette.inkMuted }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

export default StatTile;

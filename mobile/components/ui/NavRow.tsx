import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/useTheme';
import { accentTokens, type FlowAccent } from '@/theme/accents';
import { AppText } from './AppText';

export interface NavRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Colour-codes the row so related destinations read as a group. */
  accent?: FlowAccent;
  onPress: () => void;
  /** Highlighted as the current screen. */
  active?: boolean;
  /** Small count or status on the right instead of the chevron. */
  trailingLabel?: string;
}

/** One tappable destination. Used by the home hub and the slide-out menu. */
export function NavRow({
  icon,
  title,
  subtitle,
  accent = 'sky',
  onPress,
  active = false,
  trailingLabel,
}: NavRowProps) {
  const { palette, scheme } = useTheme();
  const tokens = accentTokens(accent, scheme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: active ? tokens.line : palette.line,
        backgroundColor: active ? tokens.soft : palette.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.soft,
        }}
      >
        <Ionicons name={icon} size={19} color={tokens.ink} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {trailingLabel ? (
        <AppText variant="caption" style={{ color: tokens.ink }} numberOfLines={1}>
          {trailingLabel}
        </AppText>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={palette.inkSoft} />
      )}
    </Pressable>
  );
}

export default NavRow;

import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/useTheme';
import { useDrawer } from './useDrawer';

export const HEADER_HEIGHT = 54;

/** Only the navigator header props this component reads. */
export interface AppHeaderProps {
  navigation: { canGoBack: () => boolean; goBack: () => void };
  route: { name: string };
  options: { title?: string };
}

const HOME_ROUTE = '/(tabs)';

/**
 * The one header used by every screen.
 *
 * Left: the menu button, always in the same place and always present. Next to
 * it, a back control that appears only when there is genuinely somewhere to go
 * back to, so its presence means something instead of being decorative.
 */
export default function AppHeader({ navigation, route, options }: AppHeaderProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useDrawer();

  const title = options.title ?? route.name;
  const canGoBack = navigation.canGoBack();

  const handleBack = () => {
    if (canGoBack) {
      navigation.goBack();
      return;
    }

    router.replace(HOME_ROUTE as never);
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: palette.surface,
        borderBottomWidth: 1,
        borderBottomColor: palette.line,
      }}
    >
      <View
        style={{
          height: HEADER_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 6,
          gap: 2,
        }}
      >
        <HeaderControl icon="menu" label="Open menu" onPress={openDrawer} />

        {canGoBack ? (
          <HeaderControl icon="chevron-back" label="Go back" onPress={handleBack} />
        ) : null}

        <View style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
          <AppText variant="subheading" numberOfLines={1}>
            {title}
          </AppText>
        </View>

        <HeaderControl
          icon="options-outline"
          label="Settings"
          tint="muted"
          onPress={() => router.push('/settings' as never)}
        />
      </View>
    </View>
  );
}

function HeaderControl({
  icon,
  label,
  onPress,
  tint = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tint?: 'default' | 'muted';
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? palette.surfaceAlt : 'transparent',
      })}
    >
      <Ionicons
        name={icon}
        size={tint === 'muted' ? 20 : 22}
        color={tint === 'muted' ? palette.inkMuted : palette.ink}
      />
    </Pressable>
  );
}

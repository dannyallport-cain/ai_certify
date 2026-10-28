import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { NavRow } from '@/components/ui/NavRow';
import { useTheme } from '@/theme/useTheme';
import type { ThemeMode } from '@/theme/settings-storage';
import { NAVIGATION_DESTINATIONS } from './navigation-destinations';

export interface AppDrawerProps {
  onClose: () => void;
}

const APPEARANCE_OPTIONS: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { mode: 'system', icon: 'phone-portrait-outline', label: 'Auto' },
  { mode: 'light', icon: 'sunny-outline', label: 'Light' },
  { mode: 'dark', icon: 'moon-outline', label: 'Dark' },
];

/**
 * The app's main menu. Every destination lives here, so the hamburger is a
 * complete answer to "where am I and where can I go" from any screen.
 */
export function AppDrawer({ onClose }: AppDrawerProps) {
  const { palette, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isActive = (route: string) => {
    if (route === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)';
    }

    return pathname.startsWith(route.replace('/(tabs)', ''));
  };

  const navigate = (route: string) => {
    onClose();

    if (route === '/(tabs)') {
      router.replace('/(tabs)' as never);
      return;
    }

    router.push(route as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View
        style={{
          paddingTop: insets.top + 14,
          paddingHorizontal: 18,
          paddingBottom: 16,
          backgroundColor: palette.surface,
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            backgroundColor: palette.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name="flash" size={21} color={palette.brand} />
        </View>

        <View style={{ flex: 1 }}>
          <AppText variant="heading">AI Certify</AppText>
          <AppText variant="caption" tone="muted">
            Field inspections
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={onClose}
          hitSlop={8}
          style={{ padding: 8 }}
        >
          <Ionicons name="close" size={22} color={palette.inkMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="label" tone="soft" style={{ marginLeft: 4, marginBottom: 2 }}>
          GO TO
        </AppText>

        {NAVIGATION_DESTINATIONS.map((destination) => (
          <NavRow
            key={destination.key}
            icon={destination.icon}
            title={destination.title}
            subtitle={destination.subtitle}
            accent={destination.accent}
            active={isActive(destination.route)}
            onPress={() => navigate(destination.route)}
          />
        ))}
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: palette.line,
          backgroundColor: palette.surface,
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <AppText variant="label" tone="soft" style={{ marginBottom: 8, marginLeft: 2 }}>
          APPEARANCE
        </AppText>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = mode === option.mode;

            return (
              <Pressable
                key={option.mode}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label} appearance`}
                accessibilityState={{ selected }}
                onPress={() => setMode(option.mode)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 10,
                  borderRadius: 13,
                  borderWidth: 1.5,
                  borderColor: selected ? palette.brand : palette.line,
                  backgroundColor: selected ? palette.brandSoft : palette.surface,
                }}
              >
                <Ionicons
                  name={option.icon}
                  size={17}
                  color={selected ? palette.brand : palette.inkMuted}
                />
                <AppText
                  variant="caption"
                  style={{ color: selected ? palette.brand : palette.inkMuted }}
                >
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default AppDrawer;

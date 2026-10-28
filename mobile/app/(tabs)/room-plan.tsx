import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/useTheme';

/**
 * The capture flow now lives at /fire-alarm/scan as step 1 of five. This old
 * entry point is kept only so existing links land in the new workflow instead
 * of a second, unordered copy of it.
 */
export default function RoomPlanRedirectScreen() {
  const { palette } = useTheme();

  useEffect(() => {
    router.replace('/fire-alarm/scan' as never);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.canvas,
      }}
    >
      <AppText variant="body" tone="muted">
        Opening fire alarm capture…
      </AppText>
    </View>
  );
}

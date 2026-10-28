import type { ReactNode, RefObject } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScreen } from '@/components/keyboard/KeyboardAwareScreen';
import { useTheme } from '@/theme/useTheme';

export interface ScreenProps {
  children: ReactNode;
  /** Padding applied inside the scroll area. Defaults to 16 on all sides. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Pinned below the scroll area — primary actions live here. */
  footer?: ReactNode;
  scrollViewRef?: RefObject<ScrollView | null>;
  /** Extra space under the last element, e.g. to clear a floating tab bar. */
  bottomGap?: number;
  dismissKeyboardOnTap?: boolean;
}

/**
 * Themed page scaffold. Every screen paints its background through this so
 * dark mode has exactly one source of truth.
 */
export function Screen({
  children,
  contentStyle,
  footer,
  scrollViewRef,
  bottomGap = 24,
  dismissKeyboardOnTap = true,
}: ScreenProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAwareScreen
      className="flex-1"
      contentContainerStyle={[{ padding: 16 }, contentStyle]}
      contentBottomPadding={bottomGap + insets.bottom}
      scrollViewRef={scrollViewRef}
      dismissKeyboardOnTap={dismissKeyboardOnTap}
      footer={
        footer ? (
          <View
            style={{
              backgroundColor: palette.surface,
              borderTopWidth: 1,
              borderTopColor: palette.line,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {footer}
          </View>
        ) : undefined
      }
      scrollViewProps={{ style: { backgroundColor: palette.canvas } }}
    >
      {children}
    </KeyboardAwareScreen>
  );
}

export default Screen;

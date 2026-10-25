import { useCallback, type ReactNode, type RefObject } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardVerticalOffset } from './useKeyboardVerticalOffset';

const IS_ANDROID = Platform.OS === 'android';

/** Space kept below the last control so it never sits flush against the edge. */
const DEFAULT_BOTTOM_GAP = 24;

/** Breathing room under a pinned footer, above the home indicator. */
const FOOTER_BOTTOM_GAP = 12;

/** Lets the user swipe the keyboard away while scrolling. */
const KEYBOARD_DISMISS_MODE = Platform.OS === 'ios' ? 'interactive' : 'on-drag';

/** Clearance for the floating tab bar (74pt bar + 16pt offset + breathing room). */
export const TAB_BAR_CLEARANCE = 106;

export type KeyboardAwareScreenProps = {
  children: ReactNode;
  /** Extra classes for the ScrollView itself (background colours, horizontal padding...). */
  className?: string;
  /** Extra classes for the scrollable content container. */
  contentContainerClassName?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Bottom padding between the last control and the end of the scrollable area.
   * Defaults to a small gap plus the safe-area inset.
   */
  contentBottomPadding?: number;
  /** Tapping empty space dismisses the keyboard. Defaults to true. */
  dismissKeyboardOnTap?: boolean;
  /** Lets a screen scroll its own content, e.g. to reveal a submit button. */
  scrollViewRef?: RefObject<ScrollView | null>;
  /**
   * Content pinned below the scroll area, e.g. the primary submit action. It
   * stays visible at any scroll position and rides above the keyboard.
   */
  footer?: ReactNode;
  scrollViewProps?: Omit<
    ScrollViewProps,
    'contentContainerStyle' | 'keyboardShouldPersistTaps' | 'keyboardDismissMode'
  >;
};

/**
 * Screen scaffold that keeps focused inputs and submit buttons above the
 * software keyboard.
 *
 * - iOS: the ScrollView grows its bottom inset to the keyboard height and
 *   scrolls the focused field into view (`automaticallyAdjustKeyboardInsets`).
 * - Android: KeyboardAvoidingView shrinks the content area once the keyboard
 *   is measured, using the container position as its vertical offset.
 * - Both: scrolling dismisses the keyboard, tapping empty space dismisses it,
 *   and taps land first time while the keyboard is open
 *   (`keyboardShouldPersistTaps="handled"`) instead of being swallowed.
 */
export function KeyboardAwareScreen({
  children,
  className,
  contentContainerClassName,
  contentContainerStyle,
  contentBottomPadding,
  dismissKeyboardOnTap = true,
  scrollViewProps,
  scrollViewRef,
  footer,
}: KeyboardAwareScreenProps) {
  const insets = useSafeAreaInsets();
  const { offset, viewRef, measureOffset } = useKeyboardVerticalOffset();

  const handleLayout = useCallback(() => {
    measureOffset();
  }, [measureOffset]);

  const bottomPadding = contentBottomPadding ?? DEFAULT_BOTTOM_GAP + insets.bottom;

  const content = (
    <View className={contentContainerClassName} style={styles.growingContent}>
      {children}
    </View>
  );

  return (
    <View ref={viewRef} collapsable={false} style={styles.fill} onLayout={handleLayout}>
      <KeyboardAvoidingView
        enabled={IS_ANDROID}
        behavior={IS_ANDROID ? 'height' : undefined}
        keyboardVerticalOffset={offset}
        style={styles.fill}
      >
        <ScrollView
          ref={scrollViewRef}
          className={className}
          style={styles.fill}
          contentContainerStyle={[
            { paddingBottom: bottomPadding },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={KEYBOARD_DISMISS_MODE}
          automaticallyAdjustKeyboardInsets={!IS_ANDROID}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator
          {...scrollViewProps}
        >
          {dismissKeyboardOnTap ? (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              {content}
            </TouchableWithoutFeedback>
          ) : (
            content
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {footer ? (
        <KeyboardAvoidingView
          enabled={!IS_ANDROID}
          behavior={IS_ANDROID ? undefined : 'padding'}
          keyboardVerticalOffset={offset}
          style={styles.footerAnchor}
        >
          <View style={{ paddingBottom: insets.bottom + FOOTER_BOTTOM_GAP }}>{footer}</View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  growingContent: {
    flexGrow: 1,
  },
  footerAnchor: {
    // Keeps the pinned actions at the bottom edge even when the scroll content
    // is shorter than the screen.
    marginTop: 'auto',
  },
});

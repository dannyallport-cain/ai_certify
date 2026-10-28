import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { AppDrawer } from './AppDrawer';
import { DrawerContext, type DrawerContextValue } from './drawer-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(340, Math.round(SCREEN_WIDTH * 0.86));
const ANIMATION_MS = 200;

/**
 * Owns the slide-out menu. It renders above the navigator so the hamburger in
 * the header works identically on every screen, inside the tab navigator or in
 * a pushed stack.
 */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    translateX.setValue(-DRAWER_WIDTH);
    backdropOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: ANIMATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ANIMATION_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, isOpen, translateX]);

  const value = useMemo<DrawerContextValue>(
    () => ({ isOpen, openDrawer, closeDrawer }),
    [closeDrawer, isOpen, openDrawer],
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
        statusBarTranslucent
      >
        <View style={styles.fill}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: palette.scrim, opacity: backdropOpacity },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              style={styles.fill}
              onPress={closeDrawer}
            />
          </Animated.View>

          <Animated.View
            style={{
              width: DRAWER_WIDTH,
              height: '100%',
              transform: [{ translateX }],
              shadowColor: '#000000',
              shadowOpacity: 0.25,
              shadowRadius: 18,
              shadowOffset: { width: 6, height: 0 },
              elevation: 16,
            }}
          >
            <AppDrawer onClose={closeDrawer} />
          </Animated.View>
        </View>
      </Modal>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default DrawerProvider;

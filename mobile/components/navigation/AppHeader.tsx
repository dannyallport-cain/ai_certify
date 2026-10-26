import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HeaderNavButton from './HeaderNavButton';
import { HeaderBackButton, HeaderForwardButton } from './StackHeaderNav';

/** Matches the app's bar colour so the header never seams against the screen below it. */
export const HEADER_BACKGROUND = '#FAFBFC';
const LOGO_SIZE = 28;

/**
 * Only the pieces of the navigator header props this component uses, so the same header can be
 * rendered by the native stack and by the tab navigator.
 */
export interface AppHeaderProps {
  navigation: { canGoBack: () => boolean; goBack: () => void };
  route: { name: string };
  options: { title?: string };
  /** Where the forward chevron should go when the screen offers one. */
  forwardHref?: string;
}

/**
 * The single header used everywhere: brand mark and screen title on the left, an always-present
 * back control, and an optional forward control.
 *
 * Rendering it from the navigator rather than from each screen is what keeps it pinned while the
 * content scrolls, and stops screens drifting apart in their titles and navigation.
 */
export default function AppHeader({ navigation, route, options, forwardHref }: AppHeaderProps) {
  const title = options.title ?? route.name;
  // A custom header owns its own safe-area handling, otherwise the title runs under the clock.
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <HeaderBackButton navigation={navigation} />

      <View style={styles.titleGroup}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </View>

      {forwardHref ? <HeaderForwardButton fallbackHref={forwardHref} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: HEADER_BACKGROUND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDE4DA',
  },
  titleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 8,
  },
  title: {
    marginLeft: 8,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
  },
});

export { HeaderNavButton };

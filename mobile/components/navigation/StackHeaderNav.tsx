import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import type { NavigationProp } from '@react-navigation/native';
import HeaderNavButton from './HeaderNavButton';
import { useAppNavigation } from './AppNavigationContext';

type HeaderBackButtonProps = {
  navigation: Pick<NavigationProp<ReactNavigation.RootParamList>, 'canGoBack' | 'goBack'>;
  /** Where to go when the screen has no history to pop, e.g. a cold app launch. */
  fallbackHref?: string;
};

/** Home tab, used when there is nothing to go back to. */
const DEFAULT_BACK_FALLBACK_HREF = '/(tabs)';

type HeaderForwardButtonProps = {
  fallbackHref?: string;
};

export function useTrackCurrentRoute() {
  const pathname = usePathname();
  const { recordNavigation } = useAppNavigation();

  useEffect(() => {
    recordNavigation(pathname);
  }, [pathname, recordNavigation]);
}

export function HeaderBackButton({
  navigation,
  fallbackHref = DEFAULT_BACK_FALLBACK_HREF,
}: HeaderBackButtonProps) {
  const { goBackInHistory } = useAppNavigation();

  // Always render. It used to return null when the screen had no history,
  // which is why a freshly opened tab appeared to have no way back at all.
  return (
    <HeaderNavButton
      icon="chevron-back"
      onPress={() => {
        const target = goBackInHistory();

        if (target) {
          router.replace(target as never);
          return;
        }

        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }

        router.replace(fallbackHref as never);
      }}
    />
  );
}

export function HeaderForwardButton({ fallbackHref }: HeaderForwardButtonProps) {
  const { canGoForwardInHistory, goForwardInHistory } = useAppNavigation();

  if (!canGoForwardInHistory && !fallbackHref) {
    return null;
  }

  return (
    <HeaderNavButton
      icon="chevron-forward"
      onPress={() => {
        const target = goForwardInHistory();

        if (target) {
          router.replace(target as never);
          return;
        }

        if (fallbackHref) {
          router.push(fallbackHref as never);
        }
      }}
    />
  );
}

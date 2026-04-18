import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import type { NavigationProp } from '@react-navigation/native';
import HeaderNavButton from './HeaderNavButton';
import { useAppNavigation } from './AppNavigationContext';

type HeaderBackButtonProps = {
  navigation: Pick<NavigationProp<ReactNavigation.RootParamList>, 'canGoBack' | 'goBack'>;
};

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

export function HeaderBackButton({ navigation }: HeaderBackButtonProps) {
  const { canGoBackInHistory, goBackInHistory } = useAppNavigation();

  if (!navigation.canGoBack() && !canGoBackInHistory) {
    return null;
  }

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
        }
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

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type NavigationEntry = {
  pathname: string;
};

type AppNavigationContextValue = {
  history: NavigationEntry[];
  future: NavigationEntry[];
  recordNavigation: (pathname: string) => void;
  goBackInHistory: () => string | null;
  goForwardInHistory: () => string | null;
  canGoBackInHistory: boolean;
  canGoForwardInHistory: boolean;
};

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

export function AppNavigationProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<NavigationEntry[]>([]);
  const [future, setFuture] = useState<NavigationEntry[]>([]);

  const recordNavigation = useCallback((pathname: string) => {
    setHistory((current) => {
      const previous = current[current.length - 1];
      if (previous?.pathname === pathname) {
        return current;
      }

      return [...current, { pathname }];
    });
    setFuture([]);
  }, []);

  const goBackInHistory = useCallback(() => {
    let target: string | null = null;

    setHistory((current) => {
      if (current.length <= 1) {
        return current;
      }

      const nextCurrent = [...current];
      const currentEntry = nextCurrent.pop();
      const previousEntry = nextCurrent[nextCurrent.length - 1] ?? null;

      if (currentEntry) {
        setFuture((existing) => [currentEntry, ...existing]);
      }

      target = previousEntry?.pathname ?? null;
      return nextCurrent;
    });

    return target;
  }, []);

  const goForwardInHistory = useCallback(() => {
    let target: string | null = null;

    setFuture((current) => {
      if (current.length === 0) {
        return current;
      }

      const [nextEntry, ...remaining] = current;
      target = nextEntry.pathname;

      setHistory((existing) => {
        const last = existing[existing.length - 1];
        if (last?.pathname === nextEntry.pathname) {
          return existing;
        }

        return [...existing, nextEntry];
      });

      return remaining;
    });

    return target;
  }, []);

  const value = useMemo<AppNavigationContextValue>(
    () => ({
      history,
      future,
      recordNavigation,
      goBackInHistory,
      goForwardInHistory,
      canGoBackInHistory: history.length > 1,
      canGoForwardInHistory: future.length > 0,
    }),
    [future, goBackInHistory, goForwardInHistory, history, recordNavigation],
  );

  return <AppNavigationContext.Provider value={value}>{children}</AppNavigationContext.Provider>;
}

export function useAppNavigation() {
  const context = useContext(AppNavigationContext);

  if (!context) {
    throw new Error('useAppNavigation must be used within AppNavigationProvider');
  }

  return context;
}

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

/**
 * How long the app may sit in the background before it locks again. A field
 * engineer who glances at a notification should not have to re-scan their face;
 * a phone left in a van overnight should.
 */
const BACKGROUND_LOCK_GRACE_MS = 60_000;

interface BackgroundRelockOptions {
  /** Lock when the app returns to the foreground after the grace period. */
  enabled: boolean;
  /**
   * True while a native biometric prompt is up. The OS pauses and resumes the
   * host activity around that prompt, which must not count as leaving the app.
   */
  suspended?: boolean;
  onRelock: () => void;
}

/**
 * Re-locks a signed-in session after it has been in the background for longer
 * than the grace period.
 */
export function useBackgroundRelock({
  enabled,
  suspended = false,
  onRelock,
}: BackgroundRelockOptions): void {
  const backgroundedAt = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  const suspendedRef = useRef(suspended);
  const onRelockRef = useRef(onRelock);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    suspendedRef.current = suspended;

    if (suspended) {
      backgroundedAt.current = null;
    }
  }, [suspended]);

  useEffect(() => {
    onRelockRef.current = onRelock;
  }, [onRelock]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (suspendedRef.current) {
        return;
      }

      if (next === 'active') {
        const leftAt = backgroundedAt.current;
        backgroundedAt.current = null;

        if (leftAt === null || !enabledRef.current) {
          return;
        }

        if (Date.now() - leftAt >= BACKGROUND_LOCK_GRACE_MS) {
          onRelockRef.current();
        }

        return;
      }

      if (backgroundedAt.current === null) {
        backgroundedAt.current = Date.now();
      }
    });

    return () => subscription.remove();
  }, []);
}

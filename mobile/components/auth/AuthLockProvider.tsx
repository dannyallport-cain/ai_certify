import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { deleteToken } from '@/services/api';
import {
  authenticateWithBiometrics,
  clearBiometricUnlock,
  getBiometricAccountEmail,
  setBiometricUnlockEnabled,
  UNSUPPORTED_BIOMETRIC_CAPABILITY,
  type BiometricCapability,
} from '@/services/biometrics';
import { AuthLockContext, type AuthLockStatus, type AuthLockValue } from './authLockContext';
import { resolveStartupState } from './resolveStartupState';
import { useBackgroundRelock } from './useBackgroundRelock';

/**
 * Reading the stored session touches the keychain and the biometric hardware.
 * If either never answers, the app must still open on the login screen rather
 * than sit on the splash forever.
 */
const STARTUP_READ_TIMEOUT_MS = 6000;

function withStartupTimeout<T>(read: Promise<T>): Promise<T> {
  return Promise.race([
    read,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error('startup-state-timeout')), STARTUP_READ_TIMEOUT_MS);
    }),
  ]);
}

export function AuthLockProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthLockStatus>('checking');
  const [capability, setCapability] = useState<BiometricCapability>(
    UNSUPPORTED_BIOMETRIC_CAPABILITY,
  );
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [enrolledEmail, setEnrolledEmail] = useState<string | null>(null);
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Guards against a second prompt while one is already on screen.
  const authenticatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    withStartupTimeout(resolveStartupState())
      .then((state) => {
        if (cancelled) return;
        setCapability(state.capability);
        setEnrolledEmail(state.enrolledEmail);
        setHasStoredToken(state.hasStoredToken);
        setIsBiometricEnabled(state.isBiometricEnabled);
        setUnlockError(state.notice);
        setStatus(state.status);
      })
      .catch((error) => {
        console.warn('Unable to resolve the stored session:', error);
        if (cancelled) return;
        setStatus('signed-out');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    if (authenticatingRef.current) {
      return false;
    }

    authenticatingRef.current = true;
    setIsAuthenticating(true);

    try {
      const result = await authenticateWithBiometrics({
        promptMessage: `Unlock AI Certify with ${capability.label}`,
      });

      if (result.success) {
        setUnlockError(null);
        setStatus('unlocked');
        return true;
      }

      setUnlockError(result.reason === 'cancelled' ? null : result.message);
      return false;
    } finally {
      authenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, [capability.label]);

  const enableBiometricUnlock = useCallback(
    async (email?: string) => {
      if (!capability.isSupported || !capability.isEnrolled) {
        return false;
      }

      if (authenticatingRef.current) {
        return false;
      }

      authenticatingRef.current = true;
      setIsAuthenticating(true);

      try {
        const result = await authenticateWithBiometrics({
          promptMessage: `Enable ${capability.label} for AI Certify`,
          cancelLabel: 'Not now',
        });

        if (!result.success) {
          setUnlockError(result.reason === 'cancelled' ? null : result.message);
          return false;
        }

        const accountEmail =
          email ?? enrolledEmail ?? (await getBiometricAccountEmail()) ?? null;

        await setBiometricUnlockEnabled(accountEmail);
        setEnrolledEmail(accountEmail);
        setIsBiometricEnabled(true);
        setUnlockError(null);
        return true;
      } catch (error) {
        console.warn('Unable to enable biometric unlock:', error);
        setUnlockError('Biometric unlock could not be enabled on this device.');
        return false;
      } finally {
        authenticatingRef.current = false;
        setIsAuthenticating(false);
      }
    },
    [capability.isEnrolled, capability.isSupported, capability.label, enrolledEmail],
  );

  const disableBiometricUnlock = useCallback(async () => {
    await clearBiometricUnlock();
    setIsBiometricEnabled(false);
    setEnrolledEmail(null);
    setUnlockError(null);
  }, []);

  const signOut = useCallback(async () => {
    await deleteToken();
    await clearBiometricUnlock();
    setIsBiometricEnabled(false);
    setEnrolledEmail(null);
    setHasStoredToken(false);
    setUnlockError(null);
    setStatus('signed-out');
  }, []);

  const usePasswordInstead = useCallback(() => {
    setUnlockError(null);
    setStatus('password');
  }, []);

  const canUseBiometricUnlock =
    isBiometricEnabled && capability.isSupported && capability.isEnrolled && hasStoredToken;

  const returnToBiometricUnlock = useCallback(() => {
    if (!canUseBiometricUnlock) {
      return;
    }

    setUnlockError(null);
    setStatus('locked');
  }, [canUseBiometricUnlock]);

  const completePasswordLogin = useCallback(
    (email: string) => {
      const normalisedEmail = email.trim().toLowerCase();

      setHasStoredToken(true);
      setUnlockError(null);
      setStatus('unlocked');

      if (!normalisedEmail) {
        return;
      }

      setEnrolledEmail(normalisedEmail);

      // Keep the saved account in step with the token that is now stored so the
      // lock screen shows the right account after a restart.
      if (isBiometricEnabled) {
        void setBiometricUnlockEnabled(normalisedEmail);
      }
    },
    [isBiometricEnabled],
  );

  const dismissUnlockError = useCallback(() => {
    setUnlockError(null);
  }, []);

  useBackgroundRelock({
    enabled: canUseBiometricUnlock,
    suspended: isAuthenticating,
    onRelock: () => {
      setUnlockError(null);
      setStatus('locked');
    },
  });

  const value = useMemo<AuthLockValue>(
    () => ({
      status,
      capability,
      isBiometricEnabled,
      enrolledEmail,
      hasStoredToken,
      isAuthenticating,
      unlockError,
      canUseBiometricUnlock,
      unlockWithBiometrics,
      usePasswordInstead,
      returnToBiometricUnlock,
      completePasswordLogin,
      enableBiometricUnlock,
      disableBiometricUnlock,
      signOut,
      dismissUnlockError,
    }),
    [
      status,
      capability,
      isBiometricEnabled,
      enrolledEmail,
      hasStoredToken,
      isAuthenticating,
      unlockError,
      canUseBiometricUnlock,
      unlockWithBiometrics,
      usePasswordInstead,
      returnToBiometricUnlock,
      completePasswordLogin,
      enableBiometricUnlock,
      disableBiometricUnlock,
      signOut,
      dismissUnlockError,
    ],
  );

  return <AuthLockContext.Provider value={value}>{children}</AuthLockContext.Provider>;
}

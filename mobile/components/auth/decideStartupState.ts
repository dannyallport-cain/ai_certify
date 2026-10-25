import type { BiometricCapability } from '../../services/biometrics/types';
import type { AuthLockStatus } from './authLockContext';

export interface StartupDecisionInput {
  /** A mobile session token is stored on this device. */
  hasToken: boolean;
  /** The user previously turned on face/fingerprint unlock. */
  preferenceEnabled: boolean;
  capability: BiometricCapability;
}

export interface StartupDecision {
  status: Exclude<AuthLockStatus, 'checking'>;
  isBiometricEnabled: boolean;
  /** Shown on the password screen when the sensor disappeared. */
  notice: string | null;
  /** The stored preference is stale and should be wiped. */
  shouldClearPreference: boolean;
}

/**
 * Pure launch decision: given what is stored on the device and what the hardware
 * can do, decide which screen the app opens on. Kept free of I/O so it can be
 * checked directly (see __checks__/decideStartupState.check.ts).
 */
export function decideStartupState({
  hasToken,
  preferenceEnabled,
  capability,
}: StartupDecisionInput): StartupDecision {
  if (!hasToken) {
    return {
      status: 'signed-out',
      isBiometricEnabled: false,
      notice: null,
      shouldClearPreference: preferenceEnabled,
    };
  }

  if (!preferenceEnabled) {
    return {
      status: 'unlocked',
      isBiometricEnabled: false,
      notice: null,
      shouldClearPreference: false,
    };
  }

  if (capability.isSupported && capability.isEnrolled) {
    return {
      status: 'locked',
      isBiometricEnabled: true,
      notice: null,
      shouldClearPreference: false,
    };
  }

  return {
    status: 'password',
    isBiometricEnabled: false,
    notice: `${capability.label} is no longer set up on this device. Sign in with your password to continue.`,
    shouldClearPreference: true,
  };
}

import {
  clearBiometricUnlock,
  getBiometricAccountEmail,
  getBiometricCapability,
  isBiometricUnlockEnabled,
  type BiometricCapability,
} from '@/services/biometrics';
import { getToken } from '@/services/api';
import { decideStartupState } from './decideStartupState';
import type { AuthLockStatus } from './authLockContext';

export interface StartupState {
  status: Exclude<AuthLockStatus, 'checking'>;
  capability: BiometricCapability;
  isBiometricEnabled: boolean;
  hasStoredToken: boolean;
  enrolledEmail: string | null;
  notice: string | null;
}

/**
 * Reads what is stored on the device and turns it into an opening screen.
 * Stale preferences (no token, or the enrolled face/fingerprint was removed) are
 * cleared so a device that lost its sensor never silently bypasses the lock.
 */
export async function resolveStartupState(): Promise<StartupState> {
  const [token, preferenceEnabled, capability, storedEmail] = await Promise.all([
    getToken(),
    isBiometricUnlockEnabled(),
    getBiometricCapability(),
    getBiometricAccountEmail(),
  ]);

  const hasToken = Boolean(token);
  const decision = decideStartupState({ hasToken, preferenceEnabled, capability });

  if (decision.shouldClearPreference) {
    await clearBiometricUnlock();
  }

  return {
    status: decision.status,
    capability,
    isBiometricEnabled: decision.isBiometricEnabled,
    hasStoredToken: hasToken,
    enrolledEmail: hasToken ? storedEmail : null,
    notice: decision.notice,
  };
}

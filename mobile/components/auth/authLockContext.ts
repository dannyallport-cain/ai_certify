import { createContext } from 'react';
import type { BiometricCapability } from '@/services/biometrics';

export type AuthLockStatus =
  /** Reading the stored session — render the boot splash. */
  | 'checking'
  /** A session exists and the device must be unlocked with face/fingerprint first. */
  | 'locked'
  /** Signed in and visible. */
  | 'unlocked'
  /** Biometrics unusable, or the user chose the password path — login screen shows. */
  | 'password'
  /** No stored session at all. */
  | 'signed-out';

export interface AuthLockValue {
  status: AuthLockStatus;
  capability: BiometricCapability;
  isBiometricEnabled: boolean;
  enrolledEmail: string | null;
  hasStoredToken: boolean;
  isAuthenticating: boolean;
  /** Message to show on the unlock screen or login screen after a failed attempt. */
  unlockError: string | null;
  /** Biometric unlock can actually be offered right now. */
  canUseBiometricUnlock: boolean;
  unlockWithBiometrics: () => Promise<boolean>;
  /** Leave the lock screen and sign in with email + password instead. */
  usePasswordInstead: () => void;
  /** Return to the face/fingerprint lock screen from the login screen. */
  returnToBiometricUnlock: () => void;
  /** Called by the login screen once a password login succeeded. */
  completePasswordLogin: (email: string) => void;
  /** Prompts for the biometric, then remembers the choice on this device. */
  enableBiometricUnlock: (email?: string) => Promise<boolean>;
  disableBiometricUnlock: () => Promise<void>;
  signOut: () => Promise<void>;
  dismissUnlockError: () => void;
}

export const AuthLockContext = createContext<AuthLockValue | null>(null);

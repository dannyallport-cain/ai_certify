import * as LocalAuthentication from 'expo-local-authentication';
import type { BiometricAuthResult, BiometricFailureReason } from './types';

interface AuthenticateOptions {
  promptMessage?: string;
  cancelLabel?: string;
  /** Allow the OS passcode/PIN as a fallback after repeated failures. */
  allowDeviceFallback?: boolean;
}

interface FailureCopy {
  reason: BiometricFailureReason;
  message: string;
}

const FAILURE_COPY: Record<LocalAuthentication.LocalAuthenticationError, FailureCopy> = {
  user_cancel: {
    reason: 'cancelled',
    message: 'Authentication cancelled.',
  },
  app_cancel: {
    reason: 'cancelled',
    message: 'Authentication cancelled.',
  },
  system_cancel: {
    reason: 'cancelled',
    message: 'Authentication cancelled by the system.',
  },
  user_fallback: {
    reason: 'cancelled',
    message: 'Authentication cancelled.',
  },
  authentication_failed: {
    reason: 'failed',
    message: 'That did not match. Try again or sign in with your password.',
  },
  lockout: {
    reason: 'lockout',
    message: 'Too many attempts. Sign in with your password to continue.',
  },
  not_enrolled: {
    reason: 'not-enrolled',
    message: 'No face or fingerprint is set up on this device. Sign in with your password.',
  },
  not_available: {
    reason: 'unavailable',
    message: 'Face or fingerprint unlock is unavailable right now. Sign in with your password.',
  },
  passcode_not_set: {
    reason: 'unavailable',
    message: 'Set a device passcode, then sign in with your password.',
  },
  no_space: {
    reason: 'unavailable',
    message: 'The device could not store your authentication attempt. Try again.',
  },
  timeout: {
    reason: 'unavailable',
    message: 'Authentication timed out. Try again.',
  },
  unable_to_process: {
    reason: 'unknown',
    message: 'Authentication could not be processed. Sign in with your password.',
  },
  invalid_context: {
    reason: 'unknown',
    message: 'Authentication could not be processed. Sign in with your password.',
  },
  unknown: {
    reason: 'unknown',
    message: 'Authentication failed. Sign in with your password.',
  },
};

const DEFAULT_FAILURE: FailureCopy = {
  reason: 'unknown',
  message: 'Authentication failed. Sign in with your password.',
};

/**
 * Shows the native Face ID / Touch ID / fingerprint prompt.
 *
 * Device passcode fallback is off by default so an unlock really did come from
 * the enrolled biometric; callers always offer a password path for the cases
 * where the sensor cannot be used.
 */
export async function authenticateWithBiometrics(
  options: AuthenticateOptions = {},
): Promise<BiometricAuthResult> {
  const { promptMessage = 'Unlock AI Certify', cancelLabel = 'Cancel', allowDeviceFallback = false } =
    options;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: !allowDeviceFallback,
    });

    if (result.success) {
      return { success: true };
    }

    const copy = FAILURE_COPY[result.error] ?? DEFAULT_FAILURE;
    return { success: false, reason: copy.reason, message: copy.message };
  } catch (error) {
    console.warn('Biometric prompt failed to start:', error);
    return {
      success: false,
      reason: 'unknown',
      message: 'Face or fingerprint unlock could not start. Sign in with your password.',
    };
  }
}

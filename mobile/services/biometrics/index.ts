export { getBiometricCapability } from './capability';
export { authenticateWithBiometrics } from './authenticate';
export {
  clearBiometricUnlock,
  getBiometricAccountEmail,
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
} from './preferences';
export {
  UNSUPPORTED_BIOMETRIC_CAPABILITY,
  type BiometricAuthResult,
  type BiometricCapability,
  type BiometricFailureReason,
  type BiometricKind,
} from './types';

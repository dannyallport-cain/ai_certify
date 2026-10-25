export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'biometric';

export interface BiometricCapability {
  /** True when the device physically has a face, fingerprint or iris scanner. */
  isSupported: boolean;
  /** True when the user has enrolled at least one biometric in device settings. */
  isEnrolled: boolean;
  kind: BiometricKind;
  /** Device-appropriate name such as "Face ID", "Touch ID" or "Fingerprint". */
  label: string;
  /** One sentence telling the user how to use — or set up — the sensor. */
  description: string;
}

export type BiometricFailureReason =
  | 'cancelled'
  | 'failed'
  | 'lockout'
  | 'not-enrolled'
  | 'unavailable'
  | 'unknown';

export type BiometricAuthResult =
  | { success: true }
  | { success: false; reason: BiometricFailureReason; message: string };

export const UNSUPPORTED_BIOMETRIC_CAPABILITY: BiometricCapability = {
  isSupported: false,
  isEnrolled: false,
  kind: 'biometric',
  label: 'Biometric login',
  description: 'Face or fingerprint unlock is not available on this device.',
};

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import {
  UNSUPPORTED_BIOMETRIC_CAPABILITY,
  type BiometricCapability,
  type BiometricKind,
} from './types';

const FACE_LABEL = Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
const FINGERPRINT_LABEL = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';

function resolveKind(types: LocalAuthentication.AuthenticationType[]): BiometricKind {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  return 'biometric';
}

function labelFor(kind: BiometricKind): string {
  switch (kind) {
    case 'face':
      return FACE_LABEL;
    case 'fingerprint':
      return FINGERPRINT_LABEL;
    case 'iris':
      return 'Iris unlock';
    default:
      return 'Biometric login';
  }
}

function descriptionFor(kind: BiometricKind, label: string, isEnrolled: boolean): string {
  if (!isEnrolled) {
    const sensorName = kind === 'face' ? FACE_LABEL : 'a fingerprint';
    return `Set up ${sensorName} in your device settings to unlock AI Certify with ${label}.`;
  }

  return `Unlock AI Certify with ${label} instead of typing your password.`;
}

/**
 * Reads what the current device supports. Safe to call on web and on devices
 * without a sensor: it never throws, it reports the missing capability instead.
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') {
    return UNSUPPORTED_BIOMETRIC_CAPABILITY;
  }

  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    if (!hasHardware) {
      return UNSUPPORTED_BIOMETRIC_CAPABILITY;
    }

    const kind = resolveKind(types);
    const label = labelFor(kind);

    return {
      isSupported: true,
      isEnrolled,
      kind,
      label,
      description: descriptionFor(kind, label, isEnrolled),
    };
  } catch (error) {
    console.warn('Unable to read biometric capability:', error);
    return UNSUPPORTED_BIOMETRIC_CAPABILITY;
  }
}

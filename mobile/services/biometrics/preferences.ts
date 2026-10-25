import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENABLED_KEY = 'mobile_biometric_unlock_enabled';
const EMAIL_KEY = 'mobile_biometric_account_email';

// The device that enabled biometric unlock is the only one that should be able
// to read the flag back, and only while it is unlocked.
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function getWebStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function readValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return getWebStorage()?.getItem(key) ?? null;
  }

  try {
    return await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  } catch (error) {
    console.warn(`Unable to read biometric preference "${key}":`, error);
    return null;
  }
}

async function writeValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
}

async function deleteValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    getWebStorage()?.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`Unable to clear biometric preference "${key}":`, error);
  }
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  return (await readValue(ENABLED_KEY)) === 'true';
}

export async function getBiometricAccountEmail(): Promise<string | null> {
  return readValue(EMAIL_KEY);
}

/**
 * Records that this device should ask for the enrolled face or fingerprint
 * before showing the signed-in app. The token itself stays in SecureStore and
 * is never duplicated here.
 */
export async function setBiometricUnlockEnabled(email: string | null): Promise<void> {
  await writeValue(ENABLED_KEY, 'true');

  if (email) {
    await writeValue(EMAIL_KEY, email.toLowerCase());
  }
}

export async function clearBiometricUnlock(): Promise<void> {
  await Promise.all([deleteValue(ENABLED_KEY), deleteValue(EMAIL_KEY)]);
}

import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BiometricGlyph } from './BiometricGlyph';
import { useAuthLock } from './useAuthLock';

/** Let the overlay paint before the OS prompt covers it. */
const AUTO_PROMPT_DELAY_MS = 400;

export function UnlockScreen() {
  const {
    capability,
    enrolledEmail,
    isAuthenticating,
    unlockError,
    unlockWithBiometrics,
    usePasswordInstead,
  } = useAuthLock();

  const autoPrompted = useRef(false);

  useEffect(() => {
    if (autoPrompted.current) {
      return;
    }

    autoPrompted.current = true;
    const timer = setTimeout(() => {
      void unlockWithBiometrics();
    }, AUTO_PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [unlockWithBiometrics]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} className="bg-[#173c98]">
      <SafeAreaView className="flex-1 px-6">
        <View className="flex-1 justify-center">
          <View className="rounded-[32px] bg-white px-6 py-8">
            <View className="mb-6 h-20 w-20 items-center justify-center self-center rounded-[28px] bg-[#E3F2FD]">
              <BiometricGlyph kind={capability.kind} size={40} color="#0D47A1" />
            </View>

            <Text className="text-center text-2xl font-bold text-[#1A202C]">Unlock AI Certify</Text>

            <Text className="mt-3 text-center text-sm leading-6 text-[#718096]">
              {enrolledEmail
                ? `Signed in as ${enrolledEmail}. Use ${capability.label} to continue.`
                : `Use ${capability.label} to continue where you left off.`}
            </Text>

            {unlockError ? (
              <View className="mt-5 rounded-[20px] bg-[#FFF4E6] px-4 py-3">
                <Text className="text-sm leading-5 text-[#8A6A3A]">{unlockError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              className="mt-6 flex-row items-center justify-center rounded-2xl bg-[#0D47A1] py-4"
              onPress={() => void unlockWithBiometrics()}
              disabled={isAuthenticating}
              accessibilityRole="button"
              accessibilityLabel={`Unlock with ${capability.label}`}
              activeOpacity={0.85}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <BiometricGlyph kind={capability.kind} size={20} color="#FFFFFF" />
                  <Text className="ml-2 text-base font-semibold text-white">
                    Unlock with {capability.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-2 items-center py-3"
              onPress={usePasswordInstead}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold text-[#718096]">
                Sign in with password instead
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="items-center pb-2">
          <Ionicons name="shield-checkmark-outline" size={16} color="#B9CDF2" />
          <Text className="mt-2 text-center text-xs leading-5 text-[#B9CDF2]">
            Face and fingerprint data never leave this device.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 20,
    elevation: 20,
  },
});

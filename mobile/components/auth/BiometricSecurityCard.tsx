import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BiometricGlyph } from './BiometricGlyph';
import { useAuthLock } from './useAuthLock';

interface BiometricSecurityCardProps {
  /** Account the unlock is being enabled for; falls back to the stored email. */
  accountEmail?: string | null;
}

export function BiometricSecurityCard({ accountEmail }: BiometricSecurityCardProps) {
  const {
    capability,
    isBiometricEnabled,
    isAuthenticating,
    unlockError,
    dismissUnlockError,
    enableBiometricUnlock,
    disableBiometricUnlock,
  } = useAuthLock();

  const [isSaving, setIsSaving] = useState(false);
  const canUseSensor = capability.isSupported && capability.isEnrolled;
  const isBusy = isSaving || isAuthenticating;

  async function handleEnable() {
    setIsSaving(true);
    try {
      await enableBiometricUnlock(accountEmail ?? undefined);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDisable() {
    Alert.alert(
      `Turn off ${capability.label}?`,
      'You will sign in with your email and password next time you open the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: () => {
            setIsSaving(true);
            void disableBiometricUnlock().finally(() => setIsSaving(false));
          },
        },
      ],
    );
  }

  function handleToggle(nextValue: boolean) {
    if (isBusy) {
      return;
    }

    if (nextValue) {
      void handleEnable();
      return;
    }

    handleDisable();
  }

  function statusLabel() {
    if (!capability.isSupported) return 'Not available on this device';
    if (!capability.isEnrolled) return 'No face or fingerprint set up';
    return isBiometricEnabled ? 'On' : 'Off';
  }

  return (
    <View className="mb-3 rounded-[24px] border border-[#E0E6ED] bg-[#FFFFFF] px-4 py-4">
      <View className="flex-row items-center">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#E3F2FD]">
          <BiometricGlyph kind={capability.kind} size={22} color="#0D47A1" />
        </View>

        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-[#1A202C]">
            {capability.label} unlock
          </Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-[0.8px] text-[#8FA3B8]">
            {statusLabel()}
          </Text>
        </View>

        {isBusy ? (
          <ActivityIndicator color="#0D47A1" />
        ) : canUseSensor ? (
          <Switch
            value={isBiometricEnabled}
            onValueChange={handleToggle}
            trackColor={{ false: '#D6DEE8', true: '#0D47A1' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#D6DEE8"
            accessibilityLabel={`${capability.label} unlock`}
          />
        ) : null}
      </View>

      <Text className="mt-3 text-sm leading-5 text-[#718096]">{capability.description}</Text>

      {!canUseSensor ? (
        <TouchableOpacity
          className="mt-3 flex-row items-center self-start rounded-full bg-[#F5F7FA] px-4 py-2"
          onPress={() => void Linking.openSettings()}
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          <Ionicons name="settings-outline" size={16} color="#0D47A1" />
          <Text className="ml-2 text-sm font-semibold text-[#0D47A1]">Open device settings</Text>
        </TouchableOpacity>
      ) : null}

      {unlockError ? (
        <View className="mt-3 flex-row items-start rounded-[18px] bg-[#FFF4E6] px-4 py-3">
          <Ionicons name="alert-circle-outline" size={18} color="#C56E00" style={{ marginTop: 1 }} />
          <Text className="ml-2 flex-1 text-sm leading-5 text-[#8A6A3A]">{unlockError}</Text>
          <TouchableOpacity
            onPress={dismissUnlockError}
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#C56E00" />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

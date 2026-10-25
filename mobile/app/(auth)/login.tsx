import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScreen } from '@/components/keyboard/KeyboardAwareScreen';
import { BiometricGlyph } from '@/components/auth/BiometricGlyph';
import { useAuthLock } from '@/components/auth/useAuthLock';
import { login, saveToken } from '@/services/api';

const BRAND_BLUE = '#0D47A1';
const FIELDS_MISSING_MESSAGE = 'Please enter your email and password.';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const {
    capability,
    isBiometricEnabled,
    canUseBiometricUnlock,
    unlockError,
    dismissUnlockError,
    completePasswordLogin,
    enableBiometricUnlock,
    returnToBiometricUnlock,
  } = useAuthLock();

  const buildLabel = Constants.expoConfig?.ios?.buildNumber;

  function offerBiometricUnlock(accountEmail: string) {
    if (isBiometricEnabled || !capability.isSupported || !capability.isEnrolled) {
      return;
    }

    Alert.alert(
      `Enable ${capability.label}?`,
      `Unlock AI Certify with ${capability.label} next time instead of typing your password. You can turn this off in Account.`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: () => {
            void enableBiometricUnlock(accountEmail);
          },
        },
      ],
    );
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Error', FIELDS_MISSING_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const normalisedEmail = email.trim();
      const { token } = await login(normalisedEmail, password);
      await saveToken(token);
      // The auth lock owns navigation: flipping the session state routes the
      // user into the app, so signing in must not also navigate by itself.
      completePasswordLogin(normalisedEmail);
      offerBiometricUnlock(normalisedEmail);
    } catch (err) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const actions = (
    <View className="px-8 pt-3">
      <TouchableOpacity
        style={{ backgroundColor: BRAND_BLUE }}
        className="items-center rounded-xl py-4"
        onPress={handleLogin}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Sign In"
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-base font-semibold text-white">Sign In</Text>
        )}
      </TouchableOpacity>

      {canUseBiometricUnlock ? (
        <TouchableOpacity
          className="mt-3 flex-row items-center justify-center rounded-xl border border-[#D6E2F5] bg-[#F5F9FF] py-4"
          onPress={returnToBiometricUnlock}
          accessibilityRole="button"
          accessibilityLabel={`Unlock with ${capability.label}`}
          activeOpacity={0.85}
        >
          <BiometricGlyph kind={capability.kind} size={20} color={BRAND_BLUE} />
          <Text className="ml-2 text-base font-semibold" style={{ color: BRAND_BLUE }}>
            Unlock with {capability.label}
          </Text>
        </TouchableOpacity>
      ) : null}

      {buildLabel ? (
        <Text className="mt-2 text-center text-[11px] text-[#A0AEC0]">Build {buildLabel}</Text>
      ) : null}
    </View>
  );

  return (
    <KeyboardAwareScreen
      className="bg-white"
      contentContainerClassName="px-8 pt-24"
      contentContainerStyle={{ paddingBottom: 24 }}
      dismissKeyboardOnTap={false}
      footer={actions}
    >
      <Text className="mb-2 text-4xl font-bold" style={{ color: BRAND_BLUE }}>
        AI Certify
      </Text>
      <Text className="mb-10 text-base text-gray-500">Field Inspection App</Text>

      {unlockError ? (
        <View className="mb-6 flex-row items-start rounded-2xl bg-[#FFF4E6] px-4 py-3">
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

      <Text className="mb-1 font-medium text-gray-700">Email</Text>
      <TextInput
        className="mb-4 rounded-lg border border-gray-300 px-4 py-3 text-base"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />

      <Text className="mb-1 font-medium text-gray-700">Password</Text>
      <TextInput
        ref={passwordRef}
        className="mb-6 rounded-lg border border-gray-300 px-4 py-3 text-base"
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        returnKeyType="go"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleLogin}
      />
    </KeyboardAwareScreen>
  );
}

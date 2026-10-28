import { useRef, useState } from 'react';
import { Alert, Image, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { KeyboardAwareScreen } from '@/components/keyboard/KeyboardAwareScreen';
import { BiometricGlyph } from '@/components/auth/BiometricGlyph';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useAuthLock } from '@/components/auth/useAuthLock';
import { describeBuild } from '@/lib/build-info';
import { login, saveToken } from '@/services/api';
import { useTheme } from '@/theme/useTheme';

const FIELDS_MISSING_MESSAGE = 'Enter your email and password.';

export default function LoginScreen() {
  const { palette } = useTheme();
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

  const buildLine = describeBuild();

  function offerBiometricUnlock(accountEmail: string) {
    if (isBiometricEnabled || !capability.isSupported || !capability.isEnrolled) {
      return;
    }

    Alert.alert(
      `Enable ${capability.label}?`,
      `Unlock AI Certify with ${capability.label} next time instead of typing your password.`,
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
      Alert.alert('Missing details', FIELDS_MISSING_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const normalisedEmail = email.trim();
      const { token } = await login(normalisedEmail, password);
      await saveToken(token);
      completePasswordLogin(normalisedEmail);
      offerBiometricUnlock(normalisedEmail);
    } catch (err) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.ink,
    fontSize: 15,
  } as const;

  const footer = (
    <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
      <Button
        label="Sign in"
        icon="log-in-outline"
        accent="sky"
        size="large"
        loading={loading}
        onPress={() => void handleLogin()}
        block
      />

      {canUseBiometricUnlock ? (
        <TouchableOpacity
          onPress={returnToBiometricUnlock}
          accessibilityRole="button"
          accessibilityLabel={`Unlock with ${capability.label}`}
          activeOpacity={0.85}
          style={{
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: palette.brand,
            backgroundColor: palette.brandSoft,
          }}
        >
          <BiometricGlyph kind={capability.kind} size={18} color={palette.brand} />
          <AppText variant="bodyStrong" tone="brand">
            {`Unlock with ${capability.label}`}
          </AppText>
        </TouchableOpacity>
      ) : null}

      <AppText variant="caption" tone="soft" style={{ marginTop: 10, textAlign: 'center' }}>
        {buildLine}
      </AppText>
    </View>
  );

  return (
    <KeyboardAwareScreen
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56 }}
      contentBottomPadding={24}
      dismissKeyboardOnTap={false}
      scrollViewProps={{ style: { backgroundColor: palette.canvas } }}
      footer={footer}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 46, height: 46, borderRadius: 12 }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={{ marginLeft: 12 }}>
          <AppText variant="title">AI Certify</AppText>
          <AppText variant="caption" tone="muted">
            Field inspection app
          </AppText>
        </View>
      </View>

      {unlockError ? (
        <View
          style={{
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            backgroundColor: palette.warningSoft,
            borderRadius: 14,
            padding: 12,
          }}
        >
          <Ionicons name="alert-circle-outline" size={17} color={palette.warning} />
          <AppText variant="caption" tone="warning" style={{ flex: 1 }}>
            {unlockError}
          </AppText>
          <TouchableOpacity
            onPress={dismissUnlockError}
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
          >
            <Ionicons name="close" size={17} color={palette.warning} />
          </TouchableOpacity>
        </View>
      ) : null}

      <AppText variant="label" tone="muted" style={{ marginBottom: 6 }}>
        EMAIL
      </AppText>
      <TextInput
        style={[inputStyle, { marginBottom: 16 }]}
        placeholder="you@example.com"
        placeholderTextColor={palette.inkSoft}
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

      <AppText variant="label" tone="muted" style={{ marginBottom: 6 }}>
        PASSWORD
      </AppText>
      <TextInput
        ref={passwordRef}
        style={inputStyle}
        placeholder="••••••••"
        placeholderTextColor={palette.inkSoft}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        returnKeyType="go"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={() => void handleLogin()}
      />
    </KeyboardAwareScreen>
  );
}

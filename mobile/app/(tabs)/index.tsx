import { useEffect, useState } from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { NavRow } from '@/components/ui/NavRow';
import { Button } from '@/components/ui/Button';
import { useJob } from '@/components/JobStateContext';
import { useAuthLock } from '@/components/auth/useAuthLock';
import { useTheme } from '@/theme/useTheme';
import { getServiceM8ConnectionStatus, startServiceM8Connection } from '@/services/api';
import { hasMeaningfulDraft } from '@/services/draft-storage';

type ServiceM8State =
  | { status: 'checking' }
  | { status: 'connected'; companyName: string | null }
  | { status: 'disconnected' };

async function connectServiceM8(): Promise<void> {
  try {
    const authorizeUrl = await startServiceM8Connection();
    const supported = await Linking.canOpenURL(authorizeUrl);

    if (!supported) {
      Alert.alert('Unable to open ServiceM8', 'This device cannot open the sign-in page.');
      return;
    }

    await Linking.openURL(authorizeUrl);
  } catch (error) {
    Alert.alert(
      'ServiceM8 sign-in failed',
      error instanceof Error ? error.message : 'Please try again in a moment.',
    );
  }
}

export default function HomeScreen() {
  const { palette } = useTheme();
  const { state, dispatch } = useJob();
  const { signOut } = useAuthLock();
  const [serviceM8, setServiceM8] = useState<ServiceM8State>({ status: 'checking' });

  useEffect(() => {
    let isMounted = true;

    getServiceM8ConnectionStatus()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setServiceM8(
          result.connected
            ? { status: 'connected', companyName: result.connection?.companyName ?? null }
            : { status: 'disconnected' },
        );
      })
      .catch(() => {
        if (isMounted) {
          setServiceM8({ status: 'disconnected' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const confirmSignOut = () => {
    Alert.alert('Log out', 'Log out of the mobile app?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void signOut().then(() => router.replace('/(auth)/login'));
        },
      },
    ]);
  };

  const hasDraftCertificate = !!state.createdCertificate;
  const hasUnfinishedDraft = hasMeaningfulDraft(state);

  const unfinishedDraftSummary = (() => {
    if (!hasUnfinishedDraft) {
      return '';
    }

    const parts: string[] = [];

    if (state.selectedCustomer?.name) {
      parts.push(state.selectedCustomer.name);
    }

    parts.push(`${state.capturedImages.length} photo${state.capturedImages.length === 1 ? '' : 's'}`);

    if (state.wizard.reportPurpose) {
      parts.push(state.wizard.reportPurpose.replaceAll('_', ' '));
    }

    return parts.join(' · ');
  })();

  return (
    <Screen bottomGap={28}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: palette.dangerSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="flame" size={23} color={palette.danger} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="title">Fire alarm survey</AppText>
            <AppText variant="caption" tone="muted">
              Five ordered steps, colour coded
            </AppText>
          </View>
        </View>

        {/* The primary action of the whole app: deliberately the largest,
            highest-contrast control on the screen. */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Start fire alarm capture"
          onPress={() => router.push('/fire-alarm/scan' as never)}
          activeOpacity={0.85}
          style={{
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 18,
            backgroundColor: palette.danger,
            paddingHorizontal: 18,
            paddingVertical: 20,
            shadowColor: palette.danger,
            shadowOpacity: 0.35,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.22)',
            }}
          >
            <Ionicons name="camera" size={24} color="#ffffff" />
          </View>

          <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
            <Text style={{ fontSize: 19, fontWeight: '800', color: '#ffffff' }}>
              Start capture
            </Text>
            <Text style={{ fontSize: 13, marginTop: 2, color: 'rgba(255,255,255,0.88)' }}>
              Scan a room and start the fire alarm survey
            </Text>
          </View>

          <Ionicons name="arrow-forward" size={22} color="#ffffff" />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {['Scan', 'Identify', 'Review', 'Plan', 'Export'].map((label, index) => (
            <AppText key={label} variant="caption" tone="soft">
              {`${index + 1}. ${label}`}
            </AppText>
          ))}
        </View>
      </Card>

      <View style={{ height: 13 }} />

      <AppText variant="label" tone="soft" style={{ marginLeft: 4, marginBottom: 8 }}>
        MORE
      </AppText>

      <View style={{ gap: 8 }}>
        <NavRow
          icon="albums-outline"
          title="Saved surveys"
          subtitle="Fire alarm surveys saved to your dashboard"
          accent="rose"
          onPress={() => router.push('/fire-alarm-surveys' as never)}
        />

        <NavRow
          icon="pulse-outline"
          title="Fault diagnostics"
          subtitle="Triage a fault, get the checks"
          accent="amber"
          onPress={() => router.push('/(tabs)/fire-alarm-diagnostics' as never)}
        />

        {hasDraftCertificate ? (
          <NavRow
            icon="document-text-outline"
            title="Continue certificate"
            subtitle={state.createdCertificate?.certificateNumber ?? 'Draft in progress'}
            accent="indigo"
            onPress={() => router.push('/(tabs)/certificate' as never)}
          />
        ) : hasUnfinishedDraft ? (
          <NavRow
            icon="time-outline"
            title="Continue certificate draft"
            subtitle={unfinishedDraftSummary}
            accent="indigo"
            onPress={() => router.push('/(tabs)/wizard' as never)}
          />
        ) : (
          <NavRow
            icon="document-text-outline"
            title="Certificate wizard"
            subtitle="Guided EICR evidence capture"
            accent="indigo"
            onPress={() =>
              router.push({
                pathname: '/(tabs)/wizard',
                params: { entryMode: 'guided_photo' },
              } as never)
            }
          />
        )}

        <NavRow
          icon="create-outline"
          title="Manual certificate"
          subtitle="Type the details straight in"
          accent="teal"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/wizard',
              params: { entryMode: 'manual_only' },
            } as never)
          }
        />

        <NavRow
          icon="albums-outline"
          title="Certificates"
          subtitle="Saved records"
          accent="emerald"
          onPress={() => router.push('/certificates' as never)}
        />

        <NavRow
          icon="link-outline"
          title={serviceM8.status === 'connected' ? 'ServiceM8 connected' : 'ServiceM8 login'}
          subtitle={
            serviceM8.status === 'connected'
              ? serviceM8.companyName ?? 'Tap to re-authorise'
              : serviceM8.status === 'checking'
                ? 'Checking connection…'
                : 'Import jobs, clients and photos'
          }
          accent="violet"
          onPress={() => void connectServiceM8()}
        />

        <NavRow
          icon="settings-outline"
          title="Settings"
          subtitle="Appearance and text size"
          accent="sky"
          onPress={() => router.push('/settings' as never)}
        />
      </View>

      <View style={{ height: 13 }} />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Button
            label="Log out"
            icon="log-out-outline"
            accent="rose"
            variant="outline"
            size="small"
            onPress={confirmSignOut}
          />

          <View style={{ flex: 1 }} />

          <Button
            label="Reset job"
            icon="refresh-outline"
            variant="ghost"
            size="small"
            onPress={() => dispatch({ type: 'RESET' })}
          />
        </View>
      </Card>
    </Screen>
  );
}

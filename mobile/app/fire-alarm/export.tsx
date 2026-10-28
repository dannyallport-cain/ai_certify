import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Share, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { FlowScreen } from '@/components/fire-alarm/FlowScreen';
import { SectionCard } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StatTile } from '@/components/ui/StatTile';
import SurveyJobPickerCard from '@/components/fire-alarm/SurveyJobPickerCard';
import { useFireAlarmFlow } from '@/components/fire-alarm/useFireAlarmFlow';
import type { FireAlarmScanSession } from '@/modules/fire-alarm-roomplan';
import { countIdentifiedDevices } from '@/modules/fire-alarm-flow/devices';
import { getRoomPlanSession } from '@/services/roomplan/session-store';
import { saveSurveyToServer } from '@/services/fire-alarm-surveys';
import { useTheme } from '@/theme/useTheme';

export default function FireAlarmExportScreen() {
  const { palette } = useTheme();
  const {
    sessionId,
    surveyName,
    serviceM8Job,
    savedSurveyId,
    setSurveyName,
    setServiceM8Job,
    setSavedSurveyId,
    markStepComplete,
  } = useFireAlarmFlow();
  const params = useLocalSearchParams<{ sessionId?: string }>();

  const requestedSessionId =
    sessionId ?? (Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId);

  const [session, setSession] = useState<FireAlarmScanSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!requestedSessionId) {
        setIsLoading(false);
        return;
      }

      const stored = await getRoomPlanSession(requestedSessionId);

      if (!cancelled) {
        setSession(stored);
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [requestedSessionId]);

  const devices = useMemo(() => session?.devices ?? [], [session]);
  const json = useMemo(() => JSON.stringify(session, null, 2), [session]);

  const shareJson = async () => {
    try {
      await Share.share({ title: `Fire alarm plan ${session?.id ?? ''}`, message: json });
    } catch (error) {
      Alert.alert('Unable to share', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const saveSurvey = async () => {
    if (!session) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveNotice(null);

    try {
      const result = await saveSurveyToServer({
        session,
        devices,
        name: surveyName,
        status: 'completed',
        serviceM8JobUuid: serviceM8Job?.uuid ?? null,
        metadata: {
          ignoredRoomContents: true,
          totalDetectedDeviceCount: devices.length,
          identifiedDeviceCount: countIdentifiedDevices(devices),
        },
      });

      setSavedSurveyId(result.surveyId || null);
      markStepComplete('export');

      setSaveNotice(
        [
          result.survey?.name ? `Saved "${result.survey.name}" to the dashboard.` : 'Survey saved to the dashboard.',
          result.linkedToServiceM8 ? 'Filed against the ServiceM8 job.' : null,
          result.warning,
        ]
          .filter((part): part is string => Boolean(part))
          .join(' '),
      );
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Could not save the survey. Check your connection and try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <FlowScreen stepId="export">
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={palette.brand} />
        </View>
      </FlowScreen>
    );
  }

  const deviceCount = devices.length;
  const identifiedCount = countIdentifiedDevices(devices);
  const roomCount = session?.floorplan?.rooms?.length ?? 0;

  return (
    <FlowScreen
      stepId="export"
      footer={
        <View style={{ flex: 1 }}>
          <Button
            label={isSaving ? 'Saving…' : savedSurveyId ? 'Save again' : 'Save survey to dashboard'}
            icon="cloud-upload-outline"
            accent="emerald"
            onPress={() => void saveSurvey()}
            loading={isSaving}
            disabled={!session || isSaving}
            block
          />
        </View>
      }
      headerExtra={
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <StatTile label="Devices" value={deviceCount} accent="emerald" />
          <StatTile label="Identified" value={identifiedCount} accent="teal" />
          <StatTile label="Rooms" value={roomCount} accent="sky" />
        </View>
      }
    >
      <SectionCard
        title="Survey name"
        hint="Optional. Without one, the app names the survey after the client or the capture date."
      >
        <TextInput
          value={surveyName ?? ''}
          onChangeText={setSurveyName}
          placeholder="e.g. Riverside House — ground floor"
          placeholderTextColor={palette.inkSoft}
          style={{
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: palette.line,
            backgroundColor: palette.surfaceAlt,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            color: palette.ink,
          }}
        />
      </SectionCard>

      <View style={{ height: 13 }} />

      <SurveyJobPickerCard selectedJob={serviceM8Job} onSelect={setServiceM8Job} />

      <View style={{ height: 13 }} />

      <SectionCard
        title="Ready to save"
        badge={
          savedSurveyId ? (
            <Pill label="Saved" tone="success" icon="checkmark" />
          ) : session ? (
            <Pill label="Not saved" tone="warning" />
          ) : (
            <Pill label="No session" tone="neutral" />
          )
        }
        hint={session ? `Session ${session.id.slice(0, 12)}` : 'Nothing to save yet.'}
      >
        {session ? (
          <View style={{ gap: 10 }}>
            <AppText variant="body" tone="muted">
              Saving puts the plan, its zones and every identified device on the dashboard for
              your team. Save again after editing and the same survey is updated.
            </AppText>

            {saveError ? (
              <AppText variant="body" tone="danger">
                {saveError}
              </AppText>
            ) : null}

            {saveNotice ? (
              <AppText variant="caption" tone="success">
                {saveNotice}
              </AppText>
            ) : null}

            <View style={{ gap: 8, marginTop: 4 }}>
              <Button
                label="Share plan data"
                icon="share-outline"
                accent="emerald"
                variant="soft"
                onPress={() => void shareJson()}
                block
              />

              <Button
                label={showJson ? 'Hide raw data' : 'Show raw data'}
                icon={showJson ? 'chevron-up' : 'chevron-down'}
                accent="emerald"
                variant="outline"
                onPress={() => setShowJson((current) => !current)}
                block
              />
            </View>
          </View>
        ) : (
          <AppText variant="body" tone="muted">
            Capture a room first, then come back to save the finished survey.
          </AppText>
        )}
      </SectionCard>

      {showJson && session ? (
        <>
          <View style={{ height: 13 }} />
          <SectionCard title="Raw payload">
            <View
              style={{
                backgroundColor: palette.surfaceAlt,
                borderRadius: 12,
                padding: 12,
                maxHeight: 320,
              }}
            >
              <AppText variant="caption" tone="muted">
                {json}
              </AppText>
            </View>
          </SectionCard>
        </>
      ) : null}
    </FlowScreen>
  );
}

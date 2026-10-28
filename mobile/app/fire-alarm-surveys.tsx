import { useCallback, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card, SectionCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import {
  listFireAlarmSurveys,
  type MobileSurveySummary,
} from '@/services/fire-alarm-surveys';
import { useTheme } from '@/theme/useTheme';

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function describeContents(survey: MobileSurveySummary): string {
  const devices = `${survey.deviceCount} device${survey.deviceCount === 1 ? '' : 's'}`;

  if (survey.roomCount <= 0) {
    return devices;
  }

  return `${devices} · ${survey.roomCount} room${survey.roomCount === 1 ? '' : 's'}`;
}

/**
 * Saved fire alarm surveys.
 *
 * This is the phone's view of what the dashboard holds: a survey that cannot be
 * found here after saving is a save that did not reach the server, so the list
 * doubles as the check that the mobile flow really persists.
 */
export default function FireAlarmSurveysScreen() {
  const { palette } = useTheme();
  const [surveys, setSurveys] = useState<MobileSurveySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSurveys(await listFireAlarmSurveys());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load your surveys. Check your connection.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload whenever the screen is focused, so a survey saved on the export step
  // is visible the moment the engineer navigates here.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen bottomGap={28}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.dangerSoft,
            }}
          >
            <Ionicons name="albums-outline" size={22} color={palette.danger} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="title">Saved surveys</AppText>
            <AppText variant="caption" tone="muted">
              What your dashboard can see
            </AppText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="New survey"
              icon="add-circle-outline"
              accent="rose"
              size="small"
              onPress={() => router.push('/fire-alarm/scan' as never)}
              block
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Refresh"
              icon="refresh-outline"
              variant="outline"
              size="small"
              onPress={() => void load()}
              loading={isLoading}
              block
            />
          </View>
        </View>
      </Card>

      <View style={{ height: 13 }} />

      {isLoading && surveys.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={palette.brand} />
        </View>
      ) : error ? (
        <SectionCard title="Could not load surveys">
          <AppText variant="body" tone="danger">
            {error}
          </AppText>
          <View style={{ marginTop: 12 }}>
            <Button
              label="Try again"
              variant="outline"
              size="small"
              onPress={() => void load()}
              block
            />
          </View>
        </SectionCard>
      ) : surveys.length === 0 ? (
        <SectionCard title="No surveys yet">
          <AppText variant="body" tone="muted">
            Finish the five capture steps and tap “Save survey to dashboard” on the export step.
            It will appear here and in the web dashboard straight away.
          </AppText>
        </SectionCard>
      ) : (
        <View style={{ gap: 10 }}>
          {surveys.map((survey) => {
            const jobLabel = survey.serviceM8?.jobNumber
              ? `Job ${survey.serviceM8.jobNumber}`
              : survey.serviceM8?.jobUuid
                ? 'ServiceM8 job linked'
                : null;
            const updated = formatDate(survey.updatedAt);

            return (
              <TouchableOpacity
                key={survey.id}
                accessibilityRole="button"
                accessibilityLabel={survey.name}
                onPress={() =>
                  router.push({
                    pathname: '/fire-alarm/export',
                    params: { sessionId: survey.sessionId },
                  } as never)
                }
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: palette.line,
                  backgroundColor: palette.surface,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="bodyStrong" numberOfLines={2}>
                      {survey.name}
                    </AppText>

                    <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                      {survey.customerName ?? survey.serviceM8?.companyName ?? 'No client linked'}
                    </AppText>

                    {jobLabel ? (
                      <AppText variant="caption" tone="soft" numberOfLines={1} style={{ marginTop: 2 }}>
                        {jobLabel}
                        {survey.serviceM8?.jobAddress ? ` · ${survey.serviceM8.jobAddress}` : ''}
                      </AppText>
                    ) : null}

                    <AppText variant="caption" tone="soft" style={{ marginTop: 6 }}>
                      {describeContents(survey)}
                      {updated ? ` · ${updated}` : ''}
                    </AppText>
                  </View>

                  <Pill
                    label={survey.status === 'completed' ? 'Completed' : 'Draft'}
                    tone={survey.status === 'completed' ? 'success' : 'warning'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

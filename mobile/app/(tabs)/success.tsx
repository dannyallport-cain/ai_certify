import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useJob } from '@/components/JobStateContext';
import { useTheme } from '@/theme/useTheme';

export default function SuccessScreen() {
  const { palette } = useTheme();
  const { state, dispatch } = useJob();
  const certificate = state.createdCertificate;

  const startNewJob = () => {
    dispatch({ type: 'RESET' });
    router.replace('/(tabs)');
  };

  return (
    <Screen bottomGap={28}>
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: palette.successSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark-circle" size={40} color={palette.success} />
        </View>

        <AppText variant="title" style={{ marginTop: 14 }}>
          Draft created
        </AppText>
        <AppText variant="body" tone="muted" style={{ marginTop: 4, textAlign: 'center' }}>
          Finish the details on site, or continue in the web app later.
        </AppText>
      </View>

      {certificate ? (
        <Card>
          <AppText variant="label" tone="muted">
            CERTIFICATE NUMBER
          </AppText>
          <AppText variant="display" tone="brand" style={{ marginTop: 2 }}>
            {certificate.certificateNumber}
          </AppText>
        </Card>
      ) : null}

      <View style={{ height: 13 }} />

      <View style={{ gap: 10 }}>
        <Button
          label="Edit certificate on site"
          icon="create-outline"
          accent="indigo"
          onPress={() => router.replace('/(tabs)/certificate' as never)}
          block
        />
        <Button
          label="Start a new job"
          icon="add-circle-outline"
          accent="indigo"
          variant="outline"
          onPress={startNewJob}
          block
        />
      </View>
    </Screen>
  );
}

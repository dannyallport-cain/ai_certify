import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { FlowScreen } from '@/components/fire-alarm/FlowScreen';
import { useRoomPlanCapture } from '@/components/fire-alarm/useRoomPlanCapture';
import { SectionCard } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StatTile } from '@/components/ui/StatTile';
import { useTheme } from '@/theme/useTheme';

export default function FireAlarmScanScreen() {
  const { palette } = useTheme();
  const capture = useRoomPlanCapture();

  const isSupported = capture.support?.isSupported === true;

  return (
    <FlowScreen
      stepId="scan"
      nextLabel="Next: Identify"
      nextDisabled={!capture.session}
      headerExtra={
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <StatTile label="Detected" value={capture.devices.length} accent="sky" />
          <StatTile label="Identified" value={capture.identifiedCount} accent="amber" />
        </View>
      }
    >
      <SectionCard
        title="RoomPlan status"
        badge={
          capture.isCheckingSupport ? (
            <Pill label="Checking" tone="neutral" />
          ) : (
            <Pill
              label={isSupported ? 'Supported' : 'Unavailable'}
              tone={isSupported ? 'success' : 'danger'}
            />
          )
        }
        hint={
          capture.isScanning
            ? 'Capturing — move slowly around the room.'
            : isSupported
              ? 'Ready to capture this room.'
              : 'This device cannot run RoomPlan.'
        }
      >
        {capture.progressPercent != null ? (
          <View style={{ gap: 6 }}>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: palette.surfaceAlt,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${capture.progressPercent}%`,
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: palette.brand,
                }}
              />
            </View>
            <AppText variant="caption" tone="muted">
              {`${capture.progressPercent}% complete`}
            </AppText>
          </View>
        ) : null}

        {!isSupported && capture.support?.reason ? (
          <AppText variant="body" tone="muted">
            {capture.support.reason}
          </AppText>
        ) : null}

        {capture.errorMessage ? (
          <AppText variant="body" tone="danger">
            {capture.errorMessage}
          </AppText>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {capture.isScanning ? (
            <View style={{ flex: 1 }}>
              <Button
                label="Stop"
                icon="stop-circle-outline"
                accent="sky"
                variant="outline"
                onPress={() => void capture.stopScan()}
                block
              />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Button
                label="Start capture"
                icon="scan-outline"
                accent="sky"
                onPress={() => void capture.startScan()}
                disabled={!isSupported}
                block
              />
            </View>
          )}
        </View>
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard
        title="Session"
        badge={
          capture.session ? (
            <Pill label="Captured" tone="success" icon="checkmark" />
          ) : (
            <Pill label="Not started" tone="neutral" />
          )
        }
        hint={capture.session ? `ID ${capture.session.id.slice(0, 12)}` : 'No capture yet.'}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatTile label="Rooms" value={capture.session?.floorplan?.rooms?.length ?? 0} />
          <StatTile label="Walls" value={capture.session?.floorplan?.wallCount ?? 0} />
        </View>

        {capture.session ? (
          <View style={{ marginTop: 12 }}>
            <Button
              label={capture.isSaving ? 'Saving…' : 'Save devices to database'}
              icon="cloud-upload-outline"
              accent="emerald"
              variant="soft"
              loading={capture.isSaving}
              onPress={() => void capture.saveToDatabase()}
              block
            />
          </View>
        ) : null}

        {capture.statusMessage ? (
          <AppText variant="caption" tone="success" style={{ marginTop: 10 }}>
            {capture.statusMessage}
          </AppText>
        ) : null}
      </SectionCard>

      <View style={{ height: 13 }} />

      <SectionCard title="Not supported?" hint="You can still place devices by hand.">
        <Button
          label="Open plan builder"
          icon="cube-outline"
          accent="teal"
          variant="outline"
          onPress={() => router.push('/fire-alarm/plan' as never)}
          block
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Ionicons name="information-circle-outline" size={14} color={palette.inkSoft} />
          <AppText variant="caption" tone="soft">
            Requires an iOS device with a LiDAR sensor.
          </AppText>
        </View>
      </SectionCard>
    </FlowScreen>
  );
}

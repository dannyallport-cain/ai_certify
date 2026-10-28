import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { FlowScreen } from '@/components/fire-alarm/FlowScreen';
import { DeviceEditor } from '@/components/fire-alarm/DeviceEditor';
import { useEditableDevices } from '@/components/fire-alarm/useEditableDevices';
import { SectionCard } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StatTile } from '@/components/ui/StatTile';
import { formatDeviceType, formatManufacturer } from '@/modules/fire-alarm-flow/devices';
import { accentTokens } from '@/theme/accents';
import { useTheme } from '@/theme/useTheme';

export default function FireAlarmIdentifyScreen() {
  const { palette, scheme } = useTheme();
  const amber = accentTokens('amber', scheme);
  const state = useEditableDevices();

  if (state.isLoading) {
    return (
      <FlowScreen stepId="identify" nextDisabled>
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={palette.brand} />
        </View>
      </FlowScreen>
    );
  }

  if (!state.session) {
    return (
      <FlowScreen stepId="identify" nextDisabled>
        <SectionCard title="No capture yet" hint="Step 1 produces the devices to identify.">
          <Button
            label="Go to scan"
            icon="scan-outline"
            accent="sky"
            onPress={() => router.push('/fire-alarm/scan' as never)}
            block
          />
        </SectionCard>
      </FlowScreen>
    );
  }

  const selected = state.selectedDevice;

  return (
    <FlowScreen
      stepId="identify"
      nextLabel="Next: Review"
      onNext={() => {
        void state.save().then(() => router.push('/fire-alarm/review' as never));
      }}
      headerExtra={
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <StatTile label="Devices" value={state.devices.length} accent="amber" />
          <StatTile label="Identified" value={state.identifiedCount} accent="emerald" />
          <StatTile label="To do" value={state.unidentifiedCount} accent="rose" />
        </View>
      }
    >
      <SectionCard
        title="Detected devices"
        badge={
          state.unidentifiedCount === 0 ? (
            <Pill label="All identified" tone="success" icon="checkmark" />
          ) : (
            <Pill label={`${state.unidentifiedCount} to do`} tone="warning" />
          )
        }
        hint="Tap a device to set its type and label."
      >
        {state.devices.length === 0 ? (
          <AppText variant="body" tone="muted">
            The scan found no devices. Add them by hand in the review step.
          </AppText>
        ) : (
          <View style={{ gap: 8 }}>
            {state.devices.map((device) => {
              const isSelected = device.id === state.selectedDeviceId;
              const identified = device.identifiedByUser === true;
              const deviceLabel = device.label?.trim() || formatDeviceType(device.type ?? 'unknown');

              return (
                <Pressable
                  key={device.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={deviceLabel}
                  onPress={() => state.setSelectedDeviceId(device.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: isSelected ? amber.line : palette.line,
                    backgroundColor: isSelected ? amber.soft : palette.surface,
                  }}
                >
                  <Ionicons
                    name={identified ? 'checkmark-circle' : 'help-circle-outline'}
                    size={19}
                    color={identified ? palette.success : palette.inkSoft}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {deviceLabel}
                    </AppText>
                    <AppText variant="caption" tone="muted" numberOfLines={1}>
                      {`${formatDeviceType(device.type ?? 'unknown')} · ${formatManufacturer(device.manufacturer)}`}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={palette.inkSoft} />
                </Pressable>
              );
            })}
          </View>
        )}

        {state.unidentifiedCount > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Button
              label="Auto-identify likely devices"
              icon="flash-outline"
              accent="amber"
              variant="soft"
              onPress={state.autoIdentify}
              block
            />
          </View>
        ) : null}
      </SectionCard>

      {selected ? (
        <>
          <View style={{ height: 13 }} />
          <SectionCard title="Selected device" hint="Changes save automatically.">
            <DeviceEditor
              device={selected}
              onChange={(updater) => state.updateDevice(selected.id, updater)}
            />
          </SectionCard>
        </>
      ) : null}
    </FlowScreen>
  );
}

import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type {
  FireAlarmDeviceDetection,
  FireAlarmDeviceType,
} from '@/modules/fire-alarm-roomplan';
import {
  DEVICE_TYPES,
  MANUFACTURER_OPTIONS,
  formatDeviceType,
  getManufacturerName,
} from '@/modules/fire-alarm-flow/devices';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { accentTokens } from '@/theme/accents';
import { useTheme } from '@/theme/useTheme';

export interface DeviceEditorProps {
  device: FireAlarmDeviceDetection;
  onChange: (updater: (device: FireAlarmDeviceDetection) => FireAlarmDeviceDetection) => void;
}

/**
 * Edits one detection. Type and manufacturer are chips rather than pickers so
 * the whole edit is a couple of taps with a thumb, standing in a plant room.
 */
export function DeviceEditor({ device, onChange }: DeviceEditorProps) {
  const { palette, scheme } = useTheme();
  const accent = accentTokens('amber', scheme);

  const setType = (type: FireAlarmDeviceType) => {
    onChange((current) => ({
      ...current,
      type,
      identifiedByUser: type !== 'unknown',
      source: current.source ?? 'manual',
      metadata: { ...(current.metadata ?? {}), identifiedByUser: type !== 'unknown' },
    }));
  };

  const setManufacturer = (manufacturer: string) => {
    onChange((current) => ({
      ...current,
      manufacturer,
      identifiedByUser: current.type !== 'unknown',
      metadata: { ...(current.metadata ?? {}), identifiedByUser: current.type !== 'unknown' },
    }));
  };

  return (
    <View style={{ gap: 14 }}>
      <Field label="Label">
        <TextInput
          value={device.label ?? ''}
          onChangeText={(label) => onChange((current) => ({ ...current, label }))}
          placeholder="e.g. L1-04 Stair core"
          placeholderTextColor={palette.inkSoft}
          style={inputStyle(palette)}
        />
      </Field>

      <Field label="Type">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DEVICE_TYPES.map((type) => {
            const selected = (device.type ?? 'unknown') === type;

            return (
              <Chip
                key={type}
                label={formatDeviceType(type)}
                selected={selected}
                onPress={() => setType(type)}
              />
            );
          })}
        </View>
      </Field>

      <Field label="Manufacturer">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MANUFACTURER_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={getManufacturerName(device.manufacturer) === option}
              onPress={() => setManufacturer(option)}
            />
          ))}
        </View>
      </Field>

      <Field label="Notes">
        <TextInput
          value={device.notes ?? ''}
          onChangeText={(notes) => onChange((current) => ({ ...current, notes }))}
          placeholder="Mounting height, condition, anything to check"
          placeholderTextColor={palette.inkSoft}
          multiline
          textAlignVertical="top"
          style={[inputStyle(palette), { minHeight: 76 }]}
        />
      </Field>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={device.identifiedByUser ? 'Identified' : 'Mark identified'}
            icon={device.identifiedByUser ? 'checkmark-circle' : 'checkmark-circle-outline'}
            accent="amber"
            onPress={() =>
              onChange((current) => ({
                ...current,
                identifiedByUser: true,
                metadata: { ...(current.metadata ?? {}), identifiedByUser: true },
              }))
            }
            block
          />
        </View>

        <View style={{ flex: 1 }}>
          <Button
            label="Ignore"
            icon="close-circle-outline"
            accent="amber"
            variant="outline"
            onPress={() =>
              onChange((current) => ({
                ...current,
                type: 'unknown',
                identifiedByUser: false,
                metadata: { ...(current.metadata ?? {}), identifiedByUser: false },
              }))
            }
            block
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="information-circle-outline" size={13} color={accent.ink} />
        <AppText variant="caption" style={{ color: accent.ink }} numberOfLines={1}>
          {`Position ${device.location ? `${device.location.x.toFixed(1)}, ${device.location.y.toFixed(1)} m` : 'unknown'}`}
        </AppText>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" tone="muted">
        {label.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? palette.warning : palette.line,
        backgroundColor: selected ? palette.warningSoft : palette.surface,
      }}
    >
      <AppText
        variant="caption"
        numberOfLines={1}
        style={{ color: selected ? palette.warning : palette.inkMuted, fontWeight: '600' }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function inputStyle(palette: ReturnType<typeof useTheme>['palette']) {
  return {
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.ink,
    fontSize: 14,
  } as const;
}

export default DeviceEditor;

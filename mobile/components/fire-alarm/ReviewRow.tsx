import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { FireAlarmDeviceDetection } from '@/modules/fire-alarm-roomplan';
import { formatDeviceType, formatManufacturer } from '@/modules/fire-alarm-flow/devices';
import {
  describeDevicePlacement,
  readDevicePlacement,
  type EditableDevice,
} from '@/components/roomplan/review-types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { accentTokens } from '@/theme/accents';
import { useTheme } from '@/theme/useTheme';
import { DeviceEditor } from './DeviceEditor';

export interface ReviewRowProps {
  device: EditableDevice;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (updater: (device: EditableDevice) => EditableDevice) => void;
  onDelete: () => void;
  onRequestPlacement: () => void;
}

/** One device in the review list: summary line, then its editor when opened. */
export function ReviewRow({
  device,
  index,
  expanded,
  onToggleExpand,
  onChange,
  onDelete,
  onRequestPlacement,
}: ReviewRowProps) {
  const { palette, scheme } = useTheme();
  const violet = accentTokens('violet', scheme);
  const placement = readDevicePlacement(device);

  const summary = device.label?.trim() || formatDeviceType(device.type ?? 'unknown');

  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: expanded ? violet.line : palette.line,
        backgroundColor: expanded ? violet.soft : palette.surface,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Device ${index + 1}: ${summary}`}
        onPress={onToggleExpand}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: violet.solid,
          }}
        >
          <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>
            {index + 1}
          </AppText>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {summary}
          </AppText>
          <AppText variant="caption" style={{ color: violet.ink }} numberOfLines={1}>
            {describeDevicePlacement(device)}
          </AppText>
        </View>

        {device.reviewed ? (
          <Ionicons name="checkmark-circle" size={17} color={palette.success} />
        ) : null}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={palette.inkSoft}
        />
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <AppText variant="caption" tone="muted">
            {`${formatDeviceType(device.type ?? 'unknown')} · ${formatManufacturer(device.manufacturer)}`}
          </AppText>

          <DeviceEditor
            device={device as FireAlarmDeviceDetection}
            onChange={(updater) =>
              onChange((current) => ({ ...updater(current as FireAlarmDeviceDetection), reviewed: true }))
            }
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderTopWidth: 1,
              borderTopColor: violet.line,
              paddingTop: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                label={placement ? 'Move on plan' : 'Place on plan'}
                icon="locate-outline"
                accent="violet"
                variant="soft"
                size="small"
                onPress={onRequestPlacement}
                block
              />
            </View>

            <View style={{ flex: 1 }}>
              <Button
                label={device.reviewed ? 'Reviewed' : 'Mark reviewed'}
                icon={device.reviewed ? 'checkmark-circle' : 'ellipse-outline'}
                accent="violet"
                variant="outline"
                size="small"
                onPress={() =>
                  onChange((current) => ({ ...current, reviewed: !current.reviewed }))
                }
                block
              />
            </View>
          </View>

          <Button
            label="Remove device"
            icon="trash-outline"
            accent="violet"
            variant="ghost"
            size="small"
            onPress={onDelete}
          />
        </View>
      ) : null}
    </View>
  );
}

export default ReviewRow;

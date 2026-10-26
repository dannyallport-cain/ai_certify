import { memo, useCallback } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { describeDevicePlacement, readDevicePlacement, type EditableDevice } from './review-types';
import {
  DEVICE_TYPES,
  MANUFACTURER_OPTIONS,
  formatTypeLabel,
  getManufacturerName,
} from './review-options';

type ReviewDeviceCardProps = {
  device: EditableDevice;
  index: number;
  onChange: (deviceId: string, updater: (device: EditableDevice) => EditableDevice) => void;
  onDelete: (deviceId: string) => void;
  onRequestPlacement: (device: EditableDevice) => void;
};

export const ReviewDeviceCard = memo(function ReviewDeviceCard({
  device,
  index,
  onChange,
  onDelete,
  onRequestPlacement,
}: ReviewDeviceCardProps) {
  const manufacturerName = getManufacturerName(device.manufacturer);

  const update = useCallback(
    (updater: (device: EditableDevice) => EditableDevice) => onChange(device.id, updater),
    [device.id, onChange],
  );

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-slate-900">
            Device {index + 1}: {formatTypeLabel(device.type)}
          </Text>
          <Text className="mt-1 text-xs text-slate-500">
            {device.source === 'manual' ? 'Added manually' : `Source: ${device.source ?? 'unknown'}`}
          </Text>
        </View>

        <Pressable
          onPress={() => onDelete(device.id)}
          accessibilityLabel={`Delete device ${index + 1}`}
          hitSlop={8}
          className="rounded-full bg-red-50 p-2"
        >
          <Ionicons name="trash-outline" size={18} color="#dc2626" />
        </Pressable>
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Device type
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {DEVICE_TYPES.map((typeOption) => {
          const selected = device.type === typeOption;

          return (
            <Pressable
              key={typeOption}
              className={`rounded-full border px-3 py-2 ${
                selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
              }`}
              onPress={() => update((current) => ({ ...current, type: typeOption, reviewed: true }))}
            >
              <Text
                className={`text-xs font-medium ${selected ? 'text-blue-700' : 'text-slate-700'}`}
              >
                {formatTypeLabel(typeOption)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Manufacturer
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {MANUFACTURER_OPTIONS.map((option) => {
          const selected = (manufacturerName || 'Unknown') === option;

          return (
            <Pressable
              key={option}
              className={`rounded-full border px-3 py-2 ${
                selected ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'
              }`}
              onPress={() => update((current) => ({ ...current, manufacturer: option, reviewed: true }))}
            >
              <Text
                className={`text-xs font-medium ${selected ? 'text-emerald-700' : 'text-slate-700'}`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</Text>
      <TextInput
        value={device.notes ?? ''}
        onChangeText={(value) => update((current) => ({ ...current, notes: value, reviewed: true }))}
        placeholder="Mounting hints, uncertainty comments, anything the report should carry"
        multiline
        className="mt-2 min-h-[64px] rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
      />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Position on plan
      </Text>
      <View className="mt-2 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-medium text-slate-800">
            {describeDevicePlacement(device)}
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            Tap the 3D view to set where it is — no coordinates to type.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            readDevicePlacement(device)
              ? `Move device ${index + 1} on the plan`
              : `Place device ${index + 1} on the plan`
          }
          onPress={() => onRequestPlacement(device)}
          hitSlop={6}
          className="flex-row items-center rounded-full bg-orange-500 px-3 py-2"
        >
          <Ionicons name="locate" size={14} color="#FFFFFF" />
          <Text className="ml-1 text-xs font-semibold text-white">
            {readDevicePlacement(device) ? 'Move' : 'Place'}
          </Text>
        </Pressable>
      </View>

      <Pressable
        className={`mt-4 flex-row items-center justify-center rounded-xl px-4 py-3 ${
          device.reviewed ? 'bg-emerald-600' : 'bg-slate-400'
        }`}
        onPress={() => update((current) => ({ ...current, reviewed: !current.reviewed }))}
      >
        <Ionicons
          name={device.reviewed ? 'checkmark-circle' : 'ellipse-outline'}
          size={16}
          color="#FFFFFF"
        />
        <Text className="ml-2 text-xs font-semibold text-white">
          {device.reviewed ? 'Marked as reviewed' : 'Not reviewed yet'}
        </Text>
      </Pressable>
    </View>
  );
});

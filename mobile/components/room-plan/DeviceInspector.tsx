import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { FireAlarmDeviceDetection, FireAlarmDeviceType } from '@/modules/fire-alarm-roomplan';

const DEVICE_TYPES: FireAlarmDeviceType[] = [
  'detector',
  'sounder',
  'vad',
  'panel',
  'interface',
  'io_unit',
  'unknown',
];

const MANUFACTURERS = [
  'Unknown',
  'Apollo',
  'Hochiki',
  'Gent',
  'Advanced',
  'Morley',
  'Notifier',
  'Kentec',
  'C-Tec',
  'Siemens',
  'Eaton',
  'Hyfire',
  'System Sensor',
];

function formatType(type: string) {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function manufacturerName(device: FireAlarmDeviceDetection): string {
  const manufacturer = device.manufacturer;

  if (!manufacturer) {
    return 'Unknown';
  }

  if (typeof manufacturer === 'string') {
    return manufacturer;
  }

  return manufacturer.name ?? 'Unknown';
}

export interface DeviceInspectorProps {
  device: FireAlarmDeviceDetection;
  onUpdate: (patch: Partial<FireAlarmDeviceDetection>) => void;
  onDelete: () => void;
  onPlaceMode: () => void;
  isPlacing: boolean;
  ceilingHeight: number;
}

export function DeviceInspector({
  device,
  onUpdate,
  onDelete,
  onPlaceMode,
  isPlacing,
  ceilingHeight,
}: DeviceInspectorProps) {
  const height = device.location?.z ?? 0;

  return (
    <View className="rounded-[24px] border border-[#E0E6ED] bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-[#1A202C]">Selected device</Text>
          <Text className="mt-1 text-xs text-[#718096]">
            x {(device.location?.x ?? 0).toFixed(2)} m · y {(device.location?.y ?? 0).toFixed(2)} m ·
            z {height.toFixed(2)} m
          </Text>
        </View>
        <Pressable
          className="rounded-full bg-[#FEF2F2] p-2"
          onPress={onDelete}
          accessibilityLabel="Delete device"
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </Pressable>
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
        Label
      </Text>
      <TextInput
        className="mt-2 rounded-2xl border border-[#E0E6ED] bg-white px-4 py-3 text-sm text-[#1A202C]"
        value={device.label ?? ''}
        onChangeText={(label) => onUpdate({ label })}
        placeholder="e.g. L1 corridor smoke detector"
        placeholderTextColor="#94A3B8"
      />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
        Device type
      </Text>
      <View className="mt-2 flex-row flex-wrap">
        {DEVICE_TYPES.map((typeOption) => {
          const selected = device.type === typeOption;

          return (
            <Pressable
              key={typeOption}
              className={`mb-2 mr-2 rounded-full border px-3 py-2 ${
                selected ? 'border-[#0D47A1] bg-[#EAF1FF]' : 'border-[#E0E6ED] bg-white'
              }`}
              onPress={() => onUpdate({ type: typeOption })}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? 'text-[#0D47A1]' : 'text-[#475569]'
                }`}
              >
                {formatType(typeOption)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
        Manufacturer
      </Text>
      <View className="mt-2 flex-row flex-wrap">
        {MANUFACTURERS.map((option) => {
          const selected = manufacturerName(device) === option;

          return (
            <Pressable
              key={option}
              className={`mb-2 mr-2 rounded-full border px-3 py-2 ${
                selected ? 'border-[#15803D] bg-[#E8F5E9]' : 'border-[#E0E6ED] bg-white'
              }`}
              onPress={() => onUpdate({ manufacturer: option })}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? 'text-[#15803D]' : 'text-[#475569]'
                }`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
        Mounting height
      </Text>
      <View className="mt-2 flex-row flex-wrap items-center">
        {[
          { label: 'Floor', value: 0 },
          { label: 'Wall', value: 1.1 },
          { label: 'Ceiling', value: ceilingHeight },
        ].map((preset) => {
          const active = Math.abs(height - preset.value) < 0.06;

          return (
            <Pressable
              key={preset.label}
              className={`mb-2 mr-2 rounded-full border px-3 py-2 ${
                active ? 'border-[#0D47A1] bg-[#EAF1FF]' : 'border-[#E0E6ED] bg-white'
              }`}
              onPress={() =>
                onUpdate({ location: { x: device.location?.x ?? 0, y: device.location?.y ?? 0, z: preset.value } })
              }
            >
              <Text className={`text-xs font-semibold ${active ? 'text-[#0D47A1]' : 'text-[#475569]'}`}>
                {preset.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          className="mb-2 mr-2 h-9 w-9 items-center justify-center rounded-full border border-[#E0E6ED] bg-white"
          onPress={() =>
            onUpdate({
              location: {
                x: device.location?.x ?? 0,
                y: device.location?.y ?? 0,
                z: Math.max(0, Number((height - 0.1).toFixed(2))),
              },
            })
          }
        >
          <Ionicons name="remove" size={16} color="#0D47A1" />
        </Pressable>

        <Pressable
          className="mb-2 mr-2 h-9 w-9 items-center justify-center rounded-full border border-[#E0E6ED] bg-white"
          onPress={() =>
            onUpdate({
              location: {
                x: device.location?.x ?? 0,
                y: device.location?.y ?? 0,
                z: Math.min(ceilingHeight + 0.3, Number((height + 0.1).toFixed(2))),
              },
            })
          }
        >
          <Ionicons name="add" size={16} color="#0D47A1" />
        </Pressable>

        <Text className="mb-2 text-xs font-semibold text-[#475569]">{height.toFixed(1)} m</Text>
      </View>

      <Pressable
        className={`mt-2 flex-row items-center justify-center rounded-2xl px-4 py-3 ${
          isPlacing ? 'bg-[#15803D]' : 'bg-[#0D47A1]'
        }`}
        onPress={onPlaceMode}
      >
        <Ionicons name={isPlacing ? 'checkmark-circle-outline' : 'locate-outline'} size={16} color="#FFFFFF" />
        <Text className="ml-2 text-sm font-semibold text-white">
          {isPlacing ? 'Tap the plan to position' : 'Move on plan'}
        </Text>
      </Pressable>

      <Pressable
        className={`mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3 ${
          device.identifiedByUser ? 'bg-[#E8F5E9]' : 'bg-[#EEF2F7]'
        }`}
        onPress={() => onUpdate({ identifiedByUser: !device.identifiedByUser })}
      >
        <Text className="text-sm font-semibold text-[#1A202C]">
          {device.identifiedByUser ? 'Identified' : 'Not identified'}
        </Text>
        <Ionicons
          name={device.identifiedByUser ? 'checkmark-circle' : 'ellipse-outline'}
          size={18}
          color={device.identifiedByUser ? '#15803D' : '#64748B'}
        />
      </Pressable>
    </View>
  );
}

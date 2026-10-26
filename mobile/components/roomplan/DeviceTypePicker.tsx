import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getPlan3DDeviceStyle,
  type FireAlarmDeviceType,
} from '@/modules/fire-alarm-roomplan';

import { DEVICE_TYPES, formatTypeLabel } from './review-options';

interface DeviceTypePickerProps {
  type: FireAlarmDeviceType;
  notes: string;
  onTypeChange: (type: FireAlarmDeviceType) => void;
  onNotesChange: (notes: string) => void;
}

/**
 * Step two of adding a device: the cross is already on the plan, so all that is left is what the
 * device is. Every type is one tap, and the swatch matches the colour it will get on the plan.
 */
export default function DeviceTypePicker({
  type,
  notes,
  onTypeChange,
  onNotesChange,
}: DeviceTypePickerProps) {
  return (
    <View>
      <Text className="text-base font-semibold text-[#1A202C]">What is this device?</Text>
      <Text className="mt-1 text-sm leading-5 text-[#718096]">
        Pick the device type. The position you placed on the plan is kept.
      </Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {DEVICE_TYPES.map((option) => {
          const style = getPlan3DDeviceStyle(option);
          const selected = option === type;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={style.label}
              onPress={() => onTypeChange(option)}
              className={`flex-row items-center rounded-xl border px-3 py-3 ${
                selected ? 'border-[#0D47A1] bg-[#EAF1FF]' : 'border-[#E0E6ED] bg-white'
              }`}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: style.colour,
                  marginRight: 8,
                }}
              />
              <Text
                className={`text-sm font-medium ${selected ? 'text-[#0D47A1]' : 'text-[#334155]'}`}
              >
                {formatTypeLabel(option)}
              </Text>
              {selected ? (
                <Ionicons name="checkmark-circle" size={16} color="#0D47A1" style={{ marginLeft: 6 }} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-6 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
        Notes
      </Text>
      <TextInput
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Mounting height, zone, anything the report should carry"
        multiline
        className="mt-2 min-h-[72px] rounded-xl border border-[#E0E6ED] bg-white px-4 py-3 text-sm text-[#1A202C]"
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Plan3DColourScheme } from '@/modules/fire-alarm-roomplan';

import Plan3DChip from './Plan3DChip';

interface Plan3DDisplayControlsProps {
  colourScheme: Plan3DColourScheme;
  showCeiling: boolean;
  showFloorGrid: boolean;
  showDevices: boolean;
  showLabels: boolean;
  isSharing: boolean;
  onChange: (patch: {
    colourScheme?: Plan3DColourScheme;
    showCeiling?: boolean;
    showFloorGrid?: boolean;
    showDevices?: boolean;
    showLabels?: boolean;
  }) => void;
  onShareSvg: () => void;
}

const COLOUR_SCHEMES: { value: Plan3DColourScheme; label: string }[] = [
  { value: 'blueprint', label: 'Blueprint' },
  { value: 'schematic', label: 'Schematic' },
];

function ToggleRow({
  label,
  description,
  value,
  onPress,
}: {
  label: string;
  description: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={onPress}
      className="mb-2 flex-row items-center justify-between rounded-2xl border border-[#E0E6ED] bg-white px-4 py-3"
    >
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold text-[#1A202C]">{label}</Text>
        <Text className="mt-0.5 text-xs leading-5 text-[#718096]">{description}</Text>
      </View>
      <View className={`h-6 w-11 justify-center rounded-full ${value ? 'bg-[#15803D]' : 'bg-[#CBD5E1]'}`}>
        <View
          className="h-5 w-5 rounded-full bg-white"
          style={{ marginLeft: value ? 22 : 2 }}
        />
      </View>
    </Pressable>
  );
}

export default function Plan3DDisplayControls({
  colourScheme,
  showCeiling,
  showFloorGrid,
  showDevices,
  showLabels,
  isSharing,
  onChange,
  onShareSvg,
}: Plan3DDisplayControlsProps) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
        Colour scheme
      </Text>
      <View className="mb-4 mt-2 flex-row flex-wrap gap-2">
        {COLOUR_SCHEMES.map((option) => (
          <Plan3DChip
            key={option.value}
            label={option.label}
            selected={colourScheme === option.value}
            onPress={() => onChange({ colourScheme: option.value })}
          />
        ))}
      </View>

      <ToggleRow
        label="Show ceiling"
        description="Closes the room geometry for a solid architectural look."
        value={showCeiling}
        onPress={() => onChange({ showCeiling: !showCeiling })}
      />
      <ToggleRow
        label="Floor grid"
        description="Draws a 1 m survey grid across each captured room."
        value={showFloorGrid}
        onPress={() => onChange({ showFloorGrid: !showFloorGrid })}
      />
      <ToggleRow
        label="Device markers"
        description="Plots fire alarm devices at their captured mounting height."
        value={showDevices}
        onPress={() => onChange({ showDevices: !showDevices })}
      />
      <ToggleRow
        label="Device labels"
        description="Adds the device name under each marker."
        value={showLabels}
        onPress={() => onChange({ showLabels: !showLabels })}
      />

      <Pressable
        accessibilityRole="button"
        onPress={onShareSvg}
        disabled={isSharing}
        className={`mt-2 flex-row items-center justify-center rounded-2xl px-4 py-4 ${
          isSharing ? 'bg-[#C6E8D5]' : 'bg-[#15803D]'
        }`}
      >
        {isSharing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
        )}
        <Text className="ml-2 text-sm font-semibold text-white">
          {isSharing ? 'Preparing plan…' : 'Share plan as SVG'}
        </Text>
      </Pressable>
    </View>
  );
}

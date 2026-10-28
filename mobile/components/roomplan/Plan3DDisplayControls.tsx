import { Pressable, View } from 'react-native';

import type { Plan3DColourScheme } from '@/modules/fire-alarm-roomplan';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/theme/useTheme';

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
  const { palette } = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor: palette.surface,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {description}
        </AppText>
      </View>

      <View
        style={{
          width: 40,
          height: 23,
          borderRadius: 12,
          justifyContent: 'center',
          backgroundColor: value ? palette.success : palette.lineStrong,
        }}
      >
        <View
          style={{
            width: 19,
            height: 19,
            borderRadius: 10,
            backgroundColor: '#FFFFFF',
            marginLeft: value ? 19 : 2,
          }}
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
    <View style={{ gap: 10 }}>
      <SegmentedControl
        options={COLOUR_SCHEMES}
        value={colourScheme}
        onChange={(value) => onChange({ colourScheme: value })}
      />

      <ToggleRow
        label="Show ceiling"
        description="Closes the room geometry."
        value={showCeiling}
        onPress={() => onChange({ showCeiling: !showCeiling })}
      />
      <ToggleRow
        label="Floor grid"
        description="1 m survey grid per room."
        value={showFloorGrid}
        onPress={() => onChange({ showFloorGrid: !showFloorGrid })}
      />
      <ToggleRow
        label="Device markers"
        description="Plot devices at their mounting height."
        value={showDevices}
        onPress={() => onChange({ showDevices: !showDevices })}
      />
      <ToggleRow
        label="Device labels"
        description="Name under each marker."
        value={showLabels}
        onPress={() => onChange({ showLabels: !showLabels })}
      />

      <Button
        label={isSharing ? 'Preparing plan…' : 'Share plan as SVG'}
        icon={isSharing ? undefined : 'share-social-outline'}
        accent="teal"
        loading={isSharing}
        onPress={onShareSvg}
        block
      />
    </View>
  );
}

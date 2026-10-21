import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

interface ToolbarButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function ToolbarButton({ icon, label, onPress, disabled }: ToolbarButtonProps) {
  return (
    <Pressable
      className={`mb-2 mr-2 w-[68px] items-center justify-center rounded-2xl border px-2 py-2 ${
        disabled ? 'border-[#EDF1F6] bg-[#F8FAFC]' : 'border-[#E0E6ED] bg-white'
      }`}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={disabled ? '#CBD5E1' : '#0D47A1'} />
      <Text
        className={`mt-1 text-[10px] font-semibold ${disabled ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TogglePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`mr-2 rounded-full border px-3 py-2 ${
        active ? 'border-[#0D47A1] bg-[#EAF1FF]' : 'border-[#E0E6ED] bg-white'
      }`}
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
    >
      <Text className={`text-xs font-semibold ${active ? 'text-[#0D47A1]' : 'text-[#64748B]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface PlanToolbarProps {
  onRotate: (deltaYaw: number) => void;
  onTilt: (deltaPitch: number) => void;
  onZoom: (factor: number) => void;
  onResetView: () => void;
  onTopView: () => void;
  showLabels: boolean;
  showGrid: boolean;
  showCoverage: boolean;
  onToggleLabels: () => void;
  onToggleGrid: () => void;
  onToggleCoverage: () => void;
  canZoomOut: boolean;
  canZoomIn: boolean;
}

export function PlanToolbar(props: PlanToolbarProps) {
  return (
    <View className="rounded-[24px] border border-[#E0E6ED] bg-white p-3">
      {/* A wrapping grid instead of a horizontal scroller: eight controls never fit a phone width. */}
      <View className="flex-row flex-wrap">
        <ToolbarButton icon="arrow-undo-outline" label="Rotate" onPress={() => props.onRotate(-0.3)} />
        <ToolbarButton icon="arrow-redo-outline" label="Rotate" onPress={() => props.onRotate(0.3)} />
        <ToolbarButton icon="chevron-up-outline" label="Tilt up" onPress={() => props.onTilt(0.16)} />
        <ToolbarButton icon="chevron-down-outline" label="Tilt down" onPress={() => props.onTilt(-0.16)} />
        <ToolbarButton icon="add-outline" label="Zoom in" onPress={() => props.onZoom(1.18)} disabled={!props.canZoomIn} />
        <ToolbarButton icon="remove-outline" label="Zoom out" onPress={() => props.onZoom(1 / 1.18)} disabled={!props.canZoomOut} />
        <ToolbarButton icon="layers-outline" label="Plan view" onPress={props.onTopView} />
        <ToolbarButton icon="refresh-outline" label="Reset" onPress={props.onResetView} />
      </View>

      <View className="mt-1 flex-row flex-wrap">
        <TogglePill label="Labels" active={props.showLabels} onPress={props.onToggleLabels} />
        <TogglePill label="Grid" active={props.showGrid} onPress={props.onToggleGrid} />
        <TogglePill label="Coverage" active={props.showCoverage} onPress={props.onToggleCoverage} />
      </View>
    </View>
  );
}

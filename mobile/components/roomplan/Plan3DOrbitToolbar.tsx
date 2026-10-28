import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Plan3DOrbitToolbarProps {
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onTiltUp: () => void;
  onTiltDown: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function ToolButton({
  icon,
  label,
  onPress,
  tone = 'neutral',
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'accent';
}) {
  const isAccent = tone === 'accent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      className={`h-10 w-10 items-center justify-center rounded-xl border ${
        isAccent ? 'border-[#CBD5E1] bg-[#F1F5F9]' : 'border-[#E0E6ED] bg-white'
      }`}
    >
      <Ionicons name={icon} size={17} color={isAccent ? '#334155' : '#1E293B'} />
    </Pressable>
  );
}

/**
 * Explicit rotate, tilt and zoom controls. The canvas supports drag and pinch, but a surveyor in
 * gloves or with one hand still needs a way to aim without a two-finger gesture.
 */
export default function Plan3DOrbitToolbar({
  onRotateLeft,
  onRotateRight,
  onTiltUp,
  onTiltDown,
  onZoomIn,
  onZoomOut,
  onReset,
}: Plan3DOrbitToolbarProps) {
  return (
    <View className="rounded-2xl border border-[#E0E6ED] bg-[#F8FAFC] p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-2">
          <ToolButton icon="chevron-back" label="Rotate the plan left" onPress={onRotateLeft} />
          <ToolButton icon="chevron-forward" label="Rotate the plan right" onPress={onRotateRight} />
          <ToolButton icon="chevron-up" label="Raise the camera angle" onPress={onTiltUp} />
          <ToolButton icon="chevron-down" label="Lower the camera angle" onPress={onTiltDown} />
        </View>

        <View className="flex-row gap-2">
          <ToolButton icon="remove" label="Zoom out" onPress={onZoomOut} />
          <ToolButton icon="add" label="Zoom in" onPress={onZoomIn} />
          <ToolButton icon="refresh" label="Reset the view" onPress={onReset} tone="accent" />
        </View>
      </View>
    </View>
  );
}

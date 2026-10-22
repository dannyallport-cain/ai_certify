import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  PLAN3D_PROJECTIONS,
  getPlan3DProjectionLabel,
  getPlan3DProjectionPreset,
  type Plan3DProjection,
} from '@/modules/fire-alarm-roomplan';

import Plan3DChip from './Plan3DChip';

export const WALL_HEIGHT_CHOICES = [2.4, 2.7, 3, 3.5, 4];

const YAW_STEP_DEGREES = 15;
const PITCH_STEP_DEGREES = 10;
const MIN_PITCH_DEGREES = 5;
const MAX_PITCH_DEGREES = 90;

interface Plan3DViewControlsProps {
  projection: Plan3DProjection;
  yawDegrees: number;
  pitchDegrees: number;
  wallHeightMeters: number;
  onProjectionChange: (projection: Plan3DProjection) => void;
  onYawChange: (yawDegrees: number) => void;
  onPitchChange: (pitchDegrees: number) => void;
  onWallHeightChange: (wallHeightMeters: number) => void;
}

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-full border border-[#E0E6ED] bg-white"
    >
      <Ionicons name={icon} size={16} color="#334155" />
    </Pressable>
  );
}

export default function Plan3DViewControls({
  projection,
  yawDegrees,
  pitchDegrees,
  wallHeightMeters,
  onProjectionChange,
  onYawChange,
  onPitchChange,
  onWallHeightChange,
}: Plan3DViewControlsProps) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
        Projection
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {PLAN3D_PROJECTIONS.map((option) => (
          <Plan3DChip
            key={option}
            label={getPlan3DProjectionLabel(option)}
            selected={projection === option}
            onPress={() => {
              onProjectionChange(option);
              const preset = getPlan3DProjectionPreset(option);
              onYawChange(preset.yawDegrees);
              onPitchChange(preset.pitchDegrees);
            }}
          />
        ))}
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
            Rotation
          </Text>
          <Text className="mt-1 text-sm text-[#1A202C]">{Math.round(yawDegrees)}° around the room</Text>
        </View>
        <View className="flex-row gap-2">
          <StepButton
            icon="chevron-back"
            label="Rotate plan left"
            onPress={() => onYawChange(yawDegrees - YAW_STEP_DEGREES)}
          />
          <StepButton
            icon="chevron-forward"
            label="Rotate plan right"
            onPress={() => onYawChange(yawDegrees + YAW_STEP_DEGREES)}
          />
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
            Camera tilt
          </Text>
          <Text className="mt-1 text-sm text-[#1A202C]">
            {Math.round(pitchDegrees)}° from horizontal
          </Text>
        </View>
        <View className="flex-row gap-2">
          <StepButton
            icon="chevron-back"
            label="Lower the camera"
            onPress={() => onPitchChange(Math.max(MIN_PITCH_DEGREES, pitchDegrees - PITCH_STEP_DEGREES))}
          />
          <StepButton
            icon="chevron-forward"
            label="Raise the camera"
            onPress={() => onPitchChange(Math.min(MAX_PITCH_DEGREES, pitchDegrees + PITCH_STEP_DEGREES))}
          />
        </View>
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
        Ceiling height
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {WALL_HEIGHT_CHOICES.map((height) => (
          <Plan3DChip
            key={height}
            label={`${height.toFixed(1)} m`}
            selected={Math.abs(wallHeightMeters - height) < 0.05}
            onPress={() => onWallHeightChange(height)}
          />
        ))}
      </View>
    </View>
  );
}

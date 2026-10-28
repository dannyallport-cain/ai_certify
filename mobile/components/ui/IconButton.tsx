import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/useTheme';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  /** Diameter of the touch target. Never below 40 — one-handed field use. */
  size?: number;
  disabled?: boolean;
  /** Filled variant for the header's primary control. */
  filled?: boolean;
  color?: string;
}

/**
 * Square-ish icon control with a guaranteed touch target. Used by the app
 * header (menu, back) and by compact card actions.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 40,
  disabled = false,
  filled = false,
  color,
}: IconButtonProps) {
  const { palette } = useTheme();
  const iconColour = color ?? (filled ? palette.brand : palette.ink);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? palette.brandSoft : 'transparent',
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={Math.round(size * 0.55)} color={iconColour} />
    </Pressable>
  );
}

export default IconButton;

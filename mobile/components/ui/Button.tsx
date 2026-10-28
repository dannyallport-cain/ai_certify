import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/useTheme';
import { accentTokens, type FlowAccent } from '@/theme/accents';
import { AppText } from './AppText';

export type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /** Ties the button to a workflow step's colour. Defaults to the brand blue. */
  accent?: FlowAccent;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the width of its container. */
  block?: boolean;
  accessibilityLabel?: string;
}

const PADDING: Record<ButtonSize, { vertical: number; horizontal: number; radius: number }> = {
  small: { vertical: 8, horizontal: 12, radius: 12 },
  medium: { vertical: 12, horizontal: 16, radius: 14 },
  large: { vertical: 15, horizontal: 18, radius: 16 },
};

/**
 * The single button for the app. Colour comes from the step accent so a
 * sequence stays colour-coded from the rail down to its actions.
 */
export function Button({
  label,
  onPress,
  accent,
  variant = 'solid',
  size = 'medium',
  icon,
  disabled = false,
  loading = false,
  block = false,
  accessibilityLabel,
}: ButtonProps) {
  const { palette, scheme } = useTheme();
  const tokens = accent
    ? accentTokens(accent, scheme)
    : { solid: palette.brand, soft: palette.brandSoft, ink: palette.brand, line: palette.brand };

  const isInactive = disabled || loading;
  const padding = PADDING[size];

  const { backgroundColor, borderColor, labelColour } = resolveSurface(variant, tokens, palette);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor,
        borderColor,
        borderWidth: variant === 'outline' ? 1.5 : 0,
        borderRadius: padding.radius,
        paddingVertical: padding.vertical,
        paddingHorizontal: padding.horizontal,
        opacity: isInactive ? 0.5 : pressed ? 0.85 : 1,
        alignSelf: block ? 'stretch' : 'flex-start',
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColour} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'small' ? 15 : 17} color={labelColour} />
      ) : null}

      <AppText
        variant="bodyStrong"
        style={{ color: labelColour }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function resolveSurface(
  variant: ButtonVariant,
  tokens: { solid: string; soft: string; ink: string; line: string },
  palette: ReturnType<typeof useTheme>['palette'],
): { backgroundColor: string; borderColor: string; labelColour: string } {
  switch (variant) {
    case 'soft':
      return { backgroundColor: tokens.soft, borderColor: 'transparent', labelColour: tokens.ink };
    case 'outline':
      return { backgroundColor: 'transparent', borderColor: tokens.line, labelColour: tokens.ink };
    case 'ghost':
      return { backgroundColor: 'transparent', borderColor: 'transparent', labelColour: palette.inkMuted };
    case 'solid':
    default:
      return { backgroundColor: tokens.solid, borderColor: 'transparent', labelColour: '#FFFFFF' };
  }
}

/** Side-by-side button row with an even split. */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
}

export default Button;

import { TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/useTheme';

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Smallest accepted value; anything parsed below it is clamped up. */
  min?: number;
  /** Largest accepted value; anything parsed above it is clamped down. */
  max?: number;
  /** Explains what the number is used for. */
  hint?: string;
  disabled?: boolean;
}

/**
 * Numeric entry for the certificate questions (boards, storeys, alarm counts).
 * Parsing and clamping live here so no screen can persist NaN or a negative
 * count into the certificate draft.
 */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  hint,
  disabled = false,
}: NumberFieldProps) {
  const { palette, fontScale } = useTheme();

  const handleChange = (raw: string) => {
    const parsed = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);
    const next = Number.isNaN(parsed) ? min : parsed;

    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <AppText variant="bodyStrong" style={{ marginBottom: 6 }}>
        {label}
      </AppText>

      <TextInput
        value={String(value)}
        onChangeText={handleChange}
        keyboardType="number-pad"
        editable={!disabled}
        placeholder={String(min)}
        placeholderTextColor={palette.inkSoft}
        accessibilityLabel={label}
        style={{
          borderWidth: 1.5,
          borderColor: palette.line,
          borderRadius: 13,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: palette.surfaceAlt,
          color: palette.ink,
          fontSize: fontScale === 'small' ? 15 : fontScale === 'xlarge' ? 20 : 17,
          opacity: disabled ? 0.45 : 1,
        }}
      />

      {hint ? (
        <AppText variant="caption" tone="soft" style={{ marginTop: 5 }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export default NumberField;

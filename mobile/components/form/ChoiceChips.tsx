import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/useTheme';

export interface ChoiceOption<T> {
  value: T;
  label: string;
}

export interface ChoiceChipsProps<T> {
  /** Question or field label shown above the chips. Omit when the card title says it. */
  label?: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** `wrap` flows chips onto multiple lines; `row` splits the width evenly. */
  layout?: 'wrap' | 'row';
}

/**
 * Single-choice chip group used by every certificate question. Selection is
 * carried by the brand fill, so it reads the same in light and dark without
 * relying on a border colour alone.
 */
export function ChoiceChips<T>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  layout = 'wrap',
}: ChoiceChipsProps<T>) {
  const { palette } = useTheme();

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <AppText variant="bodyStrong" style={{ marginBottom: 8 }}>
          {label}
        </AppText>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: layout === 'wrap' ? 'wrap' : 'nowrap',
          gap: 8,
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={option.label}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => ({
                flexGrow: layout === 'row' ? 1 : 0,
                flexBasis: layout === 'row' ? 0 : undefined,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 13,
                borderWidth: 1.5,
                borderColor: selected ? palette.brand : palette.line,
                backgroundColor: selected ? palette.brand : palette.surface,
                opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
              })}
            >
              <AppText
                variant="bodyStrong"
                numberOfLines={1}
                style={{ color: selected ? palette.onBrand : palette.inkMuted }}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default ChoiceChips;

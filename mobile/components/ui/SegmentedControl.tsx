import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Stack the options instead of laying them out in one row. */
  vertical?: boolean;
}

/**
 * Single-choice control used by Settings. The selected option is the only one
 * with a filled surface, so the current value is readable at a glance.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  vertical = false,
}: SegmentedControlProps<T>) {
  const { palette } = useTheme();

  return (
    <View
      style={{
        flexDirection: vertical ? 'column' : 'row',
        gap: 8,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: vertical ? undefined : 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              paddingVertical: 11,
              paddingHorizontal: 10,
              borderRadius: 13,
              borderWidth: 1.5,
              borderColor: selected ? palette.brand : palette.line,
              backgroundColor: selected ? palette.brandSoft : palette.surface,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={15}
                color={selected ? palette.brand : palette.inkMuted}
              />
            ) : null}
            <AppText
              variant="bodyStrong"
              numberOfLines={1}
              style={{ color: selected ? palette.brand : palette.inkMuted }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default SegmentedControl;

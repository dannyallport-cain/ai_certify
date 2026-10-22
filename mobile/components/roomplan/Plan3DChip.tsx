import { Pressable, Text } from 'react-native';

interface Plan3DChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  tone?: 'accent' | 'neutral';
}

const SELECTED_CLASSES = {
  accent: 'border-[#0D47A1] bg-[#EAF1FF]',
  neutral: 'border-[#15803D] bg-[#E8F5E9]',
} as const;

const SELECTED_TEXT_CLASSES = {
  accent: 'text-[#0D47A1]',
  neutral: 'text-[#15803D]',
} as const;

export default function Plan3DChip({ label, selected, onPress, tone = 'accent' }: Plan3DChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${
        selected ? SELECTED_CLASSES[tone] : 'border-[#E0E6ED] bg-white'
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          selected ? SELECTED_TEXT_CLASSES[tone] : 'text-[#334155]'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

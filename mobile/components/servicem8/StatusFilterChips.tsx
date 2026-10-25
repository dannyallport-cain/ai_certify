import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import type { StatusOption } from '@/services/servicem8/grouping';

interface StatusFilterChipsProps {
  options: StatusOption[];
  selectedStatus: string | null;
  totalCount: number;
  onSelect: (status: string | null) => void;
}

function Chip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`mr-2 flex-row items-center rounded-full border px-3 py-2 ${
        active ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-[#E0E6ED] bg-white'
      }`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`text-xs font-semibold ${active ? 'text-white' : 'text-[#475569]'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View
        className={`ml-2 rounded-full px-1.5 py-0.5 ${active ? 'bg-white/25' : 'bg-[#EEF2F7]'}`}
      >
        <Text className={`text-[10px] font-bold ${active ? 'text-white' : 'text-[#64748B]'}`}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Status filters are built from the statuses actually present in the loaded
 * jobs, so a chip can never select a status that returns nothing.
 */
export function StatusFilterChips({
  options,
  selectedStatus,
  totalCount,
  onSelect,
}: StatusFilterChipsProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 8 }}
      className="mb-3"
    >
      <Chip
        label="All"
        count={totalCount}
        active={selectedStatus === null}
        onPress={() => onSelect(null)}
      />
      {options.map((option) => (
        <Chip
          key={option.status}
          label={option.status}
          count={option.count}
          active={selectedStatus?.toLowerCase() === option.status.toLowerCase()}
          onPress={() => onSelect(option.status)}
        />
      ))}
    </ScrollView>
  );
}

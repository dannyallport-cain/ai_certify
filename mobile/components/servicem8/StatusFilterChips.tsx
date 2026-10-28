import { ScrollView, TouchableOpacity, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { StatusOption } from '@/services/servicem8/grouping';
import { useTheme } from '@/theme/useTheme';

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
  const { palette } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: active ? palette.brand : palette.line,
        backgroundColor: active ? palette.brand : palette.surfaceAlt,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <AppText
        variant="caption"
        numberOfLines={1}
        style={{ color: active ? palette.onBrand : palette.inkMuted, fontWeight: '600' }}
      >
        {label}
      </AppText>

      <View
        style={{
          marginLeft: 8,
          borderRadius: 999,
          paddingHorizontal: 6,
          paddingVertical: 2,
          backgroundColor: active ? 'rgba(255,255,255,0.22)' : palette.surface,
        }}
      >
        <AppText
          variant="caption"
          style={{ color: active ? palette.onBrand : palette.inkSoft, fontWeight: '700' }}
        >
          {String(count)}
        </AppText>
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
      contentContainerStyle={{ paddingRight: 8, paddingBottom: 12 }}
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

export default StatusFilterChips;

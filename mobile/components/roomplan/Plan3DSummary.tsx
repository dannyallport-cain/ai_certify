import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { FireAlarmPlan3D } from '@/modules/fire-alarm-roomplan';

interface Plan3DSummaryProps {
  plan: FireAlarmPlan3D;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-[#E0E6ED] bg-white p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-[0.7px] text-[#64748B]">
        {label}
      </Text>
      <Text className="mt-1 text-lg font-bold text-[#1A202C]">{value}</Text>
    </View>
  );
}

export default function Plan3DSummary({ plan }: Plan3DSummaryProps) {
  const { stats, legend, warnings } = plan;
  const selectedMarker = plan.markers.find((marker) => marker.selected) ?? null;

  return (
    <View>
      <View className="flex-row gap-3">
        <StatTile label="Rooms" value={String(stats.roomCount)} />
        <StatTile label="Devices" value={String(stats.deviceCount)} />
      </View>

      <View className="mt-3 flex-row gap-3">
        <StatTile label="Floor area" value={`${stats.floorAreaSquareMeters.toFixed(1)} m²`} />
        <StatTile label="Ceiling" value={`${stats.wallHeightMeters.toFixed(1)} m`} />
      </View>

      <View className="mt-3 flex-row gap-3">
        <StatTile label="Walls" value={String(stats.wallCount)} />
        <StatTile label="Openings" value={String(stats.openingCount)} />
      </View>

      {legend.length > 0 ? (
        <View className="mt-4 rounded-2xl border border-[#E0E6ED] bg-white p-4">
          <Text className="text-xs font-semibold uppercase tracking-[0.7px] text-[#64748B]">
            Device legend
          </Text>
          <View className="mt-3 gap-2">
            {legend.map((entry) => (
              <View key={entry.deviceType} className="flex-row items-center">
                <View
                  className="h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: entry.colour }}
                >
                  <Text className="text-[8px] font-bold text-[#0B1727]">{entry.glyph}</Text>
                </View>
                <Text className="ml-3 flex-1 text-sm text-[#334155]">{entry.label}</Text>
                <Text className="text-sm font-semibold text-[#1A202C]">{entry.count}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View className="mt-4 rounded-2xl border border-dashed border-[#CBD5E1] p-4">
          <Text className="text-sm leading-6 text-[#718096]">
            No fire alarm devices are present in this session, so the legend is empty. Devices added
            during review will appear here.
          </Text>
        </View>
      )}

      {selectedMarker ? (
        <View className="mt-4 rounded-2xl border border-[#0D47A1] bg-[#EAF1FF] p-4">
          <Text className="text-xs font-semibold uppercase tracking-[0.7px] text-[#0D47A1]">
            Selected device
          </Text>
          <Text className="mt-2 text-sm font-semibold text-[#1A202C]">{selectedMarker.label}</Text>
          <Text className="mt-1 text-sm text-[#334155]">
            {selectedMarker.manufacturer ?? 'Manufacturer not recorded'}
          </Text>
          <Text className="mt-1 text-sm text-[#334155]">
            Mounting: {selectedMarker.mounting} · height {selectedMarker.worldPosition.z.toFixed(1)} m
          </Text>
          {selectedMarker.confidence != null ? (
            <Text className="mt-1 text-sm text-[#334155]">
              Confidence: {Math.round(selectedMarker.confidence * 100)}%
            </Text>
          ) : null}
        </View>
      ) : null}

      {warnings.length > 0 ? (
        <View className="mt-4 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
          <Text className="text-xs font-semibold uppercase tracking-[0.7px] text-[#B45309]">
            Plan notes
          </Text>
          <View className="mt-2 gap-2">
            {warnings.map((warning) => (
              <View key={warning} className="flex-row items-start">
                <Ionicons name="alert-circle-outline" size={14} color="#B45309" />
                <Text className="ml-2 flex-1 text-xs leading-5 text-[#92400E]">{warning}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

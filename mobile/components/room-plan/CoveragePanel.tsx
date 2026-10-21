import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import type { CoverageReport, DetectorClass } from '@/modules/fire-alarm-roomplan';

interface CoveragePanelProps {
  report: CoverageReport;
  detectorClass: DetectorClass;
  onChangeDetectorClass: (next: DetectorClass) => void;
}

function getRatioTone(ratio: number) {
  if (ratio >= 0.95) {
    return { label: 'Likely covered', bg: '#E8F5E9', text: '#15803D', bar: '#16A34A' };
  }

  if (ratio >= 0.8) {
    return { label: 'Review gaps', bg: '#FFF4E6', text: '#B45309', bar: '#F59E0B' };
  }

  return { label: 'Insufficient coverage', bg: '#FEF2F2', text: '#B91C1C', bar: '#DC2626' };
}

export function CoveragePanel({ report, detectorClass, onChangeDetectorClass }: CoveragePanelProps) {
  const tone = getRatioTone(report.ratio);
  const percent = Math.round(report.ratio * 100);

  return (
    <View className="rounded-[24px] border border-[#E0E6ED] bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-[#1A202C]">Coverage check</Text>
          <Text className="mt-1 text-sm leading-5 text-[#718096]">
            Indicative detection coverage across the captured floor area.
          </Text>
        </View>
        <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: tone.bg }}>
          <Text className="text-xs font-semibold" style={{ color: tone.text }}>
            {report.coverageDevices === 0 ? 'No coverage device' : tone.label}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <View className="flex-row items-end justify-between">
          <Text className="text-2xl font-bold text-[#1A202C]">{percent}%</Text>
          <Text className="text-xs text-[#718096]">
            {report.uncoveredAreaSquareMeters.toFixed(1)} m² uncovered
          </Text>
        </View>
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
          <View
            className="h-full rounded-full"
            style={{ width: `${Math.max(2, percent)}%`, backgroundColor: tone.bar }}
          />
        </View>
      </View>

      <View className="mt-4">
        <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-[#64748B]">
          Detector class
        </Text>
        <View className="mt-2 flex-row">
          {(['smoke', 'heat'] as DetectorClass[]).map((option) => {
            const active = detectorClass === option;

            return (
              <Pressable
                key={option}
                className={`mr-2 rounded-full border px-3 py-2 ${
                  active ? 'border-[#0D47A1] bg-[#EAF1FF]' : 'border-[#E0E6ED] bg-white'
                }`}
                onPress={() => onChangeDetectorClass(option)}
              >
                <Text
                  className={`text-xs font-semibold ${active ? 'text-[#0D47A1]' : 'text-[#64748B]'}`}
                >
                  {option === 'smoke' ? 'Smoke · 7.5 m' : 'Heat · 5.3 m'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
{report.rooms.length > 0 ? (
        <View className="mt-4">
          {report.rooms.map((room) => (
            <View key={room.roomId} className="mb-2 flex-row items-center justify-between">
              <Text className="flex-1 pr-3 text-sm text-[#334155]">{room.roomName}</Text>
              <Text className="text-sm font-semibold text-[#1A202C]">
                {Math.round(room.ratio * 100)}% · {room.areaSquareMeters.toFixed(1)} m²
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {report.gaps.length > 0 ? (
        <View className="mt-3 rounded-2xl bg-[#FFF7ED] p-3">
          <View className="flex-row items-center">
            <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
            <Text className="ml-2 text-sm font-semibold text-[#B45309]">
              {report.gaps.length} area{report.gaps.length === 1 ? '' : 's'} to review
            </Text>
          </View>
          {report.gaps.slice(0, 3).map((gap) => (
            <Text key={gap.id} className="mt-1 text-xs text-[#92400E]">
              x {gap.position.x.toFixed(1)} m · y {gap.position.y.toFixed(1)} m · about{' '}
              {gap.approximateAreaSquareMeters.toFixed(1)} m²
            </Text>
          ))}
        </View>
      ) : null}

      <Text className="mt-4 text-[11px] leading-4 text-[#94A3B8]">
        Indicative only. Radii follow published BS 5839-1 Table 1 flat-ceiling figures and must be
        confirmed against the installed device datasheets, ceiling height and the current edition of
        the standard before this plan is used as design evidence.
      </Text>
    </View>
  );
}

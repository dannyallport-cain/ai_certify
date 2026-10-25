import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ServiceM8JobRecord } from '@/services/api';
import {
  formatJobDate,
  getJobReference,
  type CustomerJobGroup,
} from '@/services/servicem8/grouping';

const STATUS_TONES: Record<string, string> = {
  quote: 'bg-[#FFF4E6] text-[#B45309]',
  'work order': 'bg-[#E3F2FD] text-[#0D47A1]',
  completed: 'bg-[#E8F5E9] text-[#15803D]',
  unsuccessful: 'bg-[#FEE2E2] text-[#B91C1C]',
  incomplete: 'bg-[#FEF3C7] text-[#92400E]',
};

function getStatusTone(status: string | null): string {
  if (!status) {
    return 'bg-[#EEF2F7] text-[#475569]';
  }

  return STATUS_TONES[status.trim().toLowerCase()] ?? 'bg-[#EEF2F7] text-[#475569]';
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) {
    return null;
  }

  return (
    <View className={`rounded-full px-2 py-1 ${getStatusTone(status)}`}>
      <Text className="text-[10px] font-bold uppercase tracking-[0.5px]">{status}</Text>
    </View>
  );
}

function JobRow({
  job,
  isSelected,
  isLoading,
  onPress,
}: {
  job: ServiceM8JobRecord;
  isSelected: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const date = formatJobDate(job);

  return (
    <TouchableOpacity
      className={`mb-2 rounded-xl border p-3 ${
        isSelected ? 'border-[#0D47A1] bg-[#EAF1FF]' : 'border-[#E0E6ED] bg-white'
      }`}
      onPress={onPress}
      disabled={isLoading}
      accessibilityRole="button"
    >
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-sm font-semibold text-[#1A202C]">{getJobReference(job)}</Text>
            <StatusPill status={job.status} />
          </View>

          {date ? <Text className="mt-1 text-xs text-[#64748B]">{date}</Text> : null}

          {job.address ? (
            <Text className="mt-1 text-sm text-[#475569]" numberOfLines={2}>
              {job.address}
            </Text>
          ) : null}

          {job.description ? (
            <Text className="mt-1 text-xs text-[#718096]" numberOfLines={2}>
              {job.description}
            </Text>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#0D47A1" />
        ) : isSelected ? (
          <Ionicons name="checkmark-circle" size={20} color="#0D47A1" />
        ) : (
          <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
        )}
      </View>
    </TouchableOpacity>
  );
}

interface CustomerJobGroupCardProps {
  group: CustomerJobGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedJobUuid: string | null;
  loadingJobUuid: string | null;
  onSelectJob: (job: ServiceM8JobRecord) => void;
}

/**
 * One customer with their jobs folded underneath. Collapsed, it still surfaces
 * the newest job so the list is scannable without expanding everything.
 */
export function CustomerJobGroupCard({
  group,
  isExpanded,
  onToggle,
  selectedJobUuid,
  loadingJobUuid,
  onSelectJob,
}: CustomerJobGroupCardProps) {
  const newest = group.jobs[0] ?? null;
  const jobCountLabel = `${group.jobs.length} job${group.jobs.length === 1 ? '' : 's'}`;
  const showContact = group.contactName && group.contactName !== group.customerName;

  return (
    <View className="mb-3 overflow-hidden rounded-2xl border border-[#E0E6ED] bg-white">
      <TouchableOpacity
        className="flex-row items-center px-4 py-3"
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#E3F2FD]">
          <Text className="text-base font-bold text-[#0D47A1]">
            {group.customerName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-sm font-semibold text-[#1A202C]" numberOfLines={1}>
            {group.customerName}
          </Text>
          <View className="mt-0.5 flex-row flex-wrap items-center">
            <Text className="text-xs text-[#718096]">{jobCountLabel}</Text>
            {showContact ? (
              <Text className="ml-2 text-xs text-[#718096]" numberOfLines={1}>
                · {group.contactName}
              </Text>
            ) : null}
            {!isExpanded && newest ? (
              <Text className="ml-2 text-xs text-[#718096]" numberOfLines={1}>
                · {formatJobDate(newest) ?? 'No date'}
              </Text>
            ) : null}
          </View>
        </View>

        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#64748B"
        />
      </TouchableOpacity>

      {isExpanded ? (
        <View className="border-t border-[#EEF2F7] px-3 pt-3 pb-1">
          {group.jobs.map((job) => (
            <JobRow
              key={job.uuid}
              job={job}
              isSelected={selectedJobUuid === job.uuid}
              isLoading={loadingJobUuid === job.uuid}
              onPress={() => onSelectJob(job)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

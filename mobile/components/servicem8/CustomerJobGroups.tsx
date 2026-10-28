import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/AppText';
import { Pill, type PillTone } from '@/components/ui/Pill';
import type { ServiceM8JobRecord } from '@/services/api';
import {
  formatJobDate,
  getJobReference,
  type CustomerJobGroup,
} from '@/services/servicem8/grouping';
import { useTheme } from '@/theme/useTheme';

const STATUS_TONES: Record<string, PillTone> = {
  quote: 'warning',
  'work order': 'brand',
  completed: 'success',
  unsuccessful: 'danger',
  incomplete: 'warning',
};

function getStatusTone(status: string): PillTone {
  return STATUS_TONES[status.trim().toLowerCase()] ?? 'neutral';
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) {
    return null;
  }

  return <Pill label={status} tone={getStatusTone(status)} />;
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
  const { palette } = useTheme();
  const date = formatJobDate(job);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, busy: isLoading }}
      onPress={onPress}
      disabled={isLoading}
      style={{
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: isSelected ? palette.brand : palette.line,
        backgroundColor: isSelected ? palette.brandSoft : palette.surface,
        padding: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <AppText variant="bodyStrong">{getJobReference(job)}</AppText>
            <StatusPill status={job.status} />
          </View>

          {date ? (
            <AppText variant="caption" tone="soft" style={{ marginTop: 4 }}>
              {date}
            </AppText>
          ) : null}

          {job.address ? (
            <AppText variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 4 }}>
              {job.address}
            </AppText>
          ) : null}

          {job.description ? (
            <AppText variant="caption" tone="soft" numberOfLines={2} style={{ marginTop: 4 }}>
              {job.description}
            </AppText>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator color={palette.brand} />
        ) : isSelected ? (
          <Ionicons name="checkmark-circle" size={20} color={palette.brand} />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={palette.inkSoft} />
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
  const { palette } = useTheme();
  const newest = group.jobs[0] ?? null;
  const jobCountLabel = `${group.jobs.length} job${group.jobs.length === 1 ? '' : 's'}`;
  const showContact = group.contactName && group.contactName !== group.customerName;

  return (
    <View
      style={{
        marginBottom: 12,
        overflow: 'hidden',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.line,
        backgroundColor: palette.surface,
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            backgroundColor: palette.brandSoft,
          }}
        >
          <AppText variant="bodyStrong" tone="brand">
            {group.customerName.charAt(0).toUpperCase()}
          </AppText>
        </View>

        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {group.customerName}
          </AppText>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
            <AppText variant="caption" tone="soft">
              {jobCountLabel}
            </AppText>
            {showContact ? (
              <AppText variant="caption" tone="soft" numberOfLines={1}>
                {` · ${group.contactName}`}
              </AppText>
            ) : null}
            {!isExpanded && newest ? (
              <AppText variant="caption" tone="soft" numberOfLines={1}>
                {` · ${formatJobDate(newest) ?? 'No date'}`}
              </AppText>
            ) : null}
          </View>
        </View>

        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={palette.inkSoft}
        />
      </TouchableOpacity>

      {isExpanded ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: palette.line,
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 4,
          }}
        >
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

export default CustomerJobGroupCard;

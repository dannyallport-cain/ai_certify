import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { SectionCard } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import {
  formatJobDate,
  getJobCustomerName,
  getJobReference,
  jobMatchesSearch,
} from '@/services/servicem8/grouping';
import { listServiceM8Jobs, type ServiceM8JobRecord } from '@/services/api';
import type { PersistedSurveyJob } from '@/services/fire-alarm-flow-payload';
import { useTheme } from '@/theme/useTheme';

const JOB_PAGE_SIZE = 25;

/** Jobs are shown newest-first, which is what a surveyor recognises on site. */
function sortJobsNewestFirst(jobs: ServiceM8JobRecord[]): ServiceM8JobRecord[] {
  return [...jobs].sort((left, right) => {
    const leftTime = Date.parse(left.date ?? left.editDate ?? '') || 0;
    const rightTime = Date.parse(right.date ?? right.editDate ?? '') || 0;
    return rightTime - leftTime;
  });
}

/** `16 Oct 2026`, or null — used for the chosen job's stored date string. */
function formatPersistedJobDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toPersistedJob(job: ServiceM8JobRecord): PersistedSurveyJob {
  return {
    uuid: job.uuid,
    jobNumber: job.generatedJobId ?? null,
    jobDate: job.date ?? null,
    companyUuid: job.companyUuid ?? null,
    companyName: job.companyName ?? getJobCustomerName(job),
    address: job.address ?? null,
  };
}

interface SurveyJobPickerCardProps {
  selectedJob: PersistedSurveyJob | null;
  onSelect: (job: PersistedSurveyJob | null) => void;
}

/**
 * Files the survey against a ServiceM8 job.
 *
 * Choosing a job is what lets the survey inherit the client's details and appear
 * in that job's diary, so nothing about the client has to be typed on site.
 */
export default function SurveyJobPickerCard({ selectedJob, onSelect }: SurveyJobPickerCardProps) {
  const { palette } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const jobsQuery = useQuery<ServiceM8JobRecord[]>({
    queryKey: ['servicem8-jobs', 'survey-link'],
    queryFn: () => listServiceM8Jobs({ limit: 200 }),
    enabled: pickerOpen,
  });

  const jobs = useMemo(() => {
    const all = sortJobsNewestFirst(jobsQuery.data ?? []);
    return all.filter((job) => jobMatchesSearch(job, search)).slice(0, JOB_PAGE_SIZE);
  }, [jobsQuery.data, search]);

  const selectedLabel = selectedJob
    ? `${selectedJob.jobNumber ? `Job ${selectedJob.jobNumber}` : 'ServiceM8 job'}${
        selectedJob.companyName ? ` · ${selectedJob.companyName}` : ''
      }`
    : null;

  return (
    <>
      <SectionCard
        title="ServiceM8 job"
        badge={
          selectedJob ? (
            <Pill label="Linked" tone="success" icon="checkmark" />
          ) : (
            <Pill label="Not linked" tone="neutral" />
          )
        }
        hint="Linking a job puts this survey in its diary and fills in the client for you."
      >
        {selectedJob ? (
          <View style={{ gap: 10 }}>
            <View>
              <AppText variant="bodyStrong">{selectedLabel}</AppText>
              {selectedJob.address ? (
                <AppText variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                  {selectedJob.address}
                </AppText>
              ) : null}
              {selectedJob.jobDate ? (
                <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                  {formatPersistedJobDate(selectedJob.jobDate)}
                </AppText>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Change job"
                  variant="soft"
                  accent="violet"
                  size="small"
                  onPress={() => setPickerOpen(true)}
                  block
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Unlink"
                  variant="ghost"
                  size="small"
                  onPress={() => onSelect(null)}
                  block
                />
              </View>
            </View>
          </View>
        ) : (
          <Button
            label="Choose a ServiceM8 job"
            icon="briefcase-outline"
            accent="violet"
            variant="soft"
            onPress={() => setPickerOpen(true)}
            block
          />
        )}
      </SectionCard>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: palette.canvas }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 8,
            }}
          >
            <AppText variant="title">Choose a job</AppText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close job picker"
              onPress={() => setPickerOpen(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.surfaceAlt,
              }}
            >
              <Ionicons name="close" size={20} color={palette.inkMuted} />
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 20,
              marginBottom: 12,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: palette.line,
              backgroundColor: palette.surfaceAlt,
              paddingHorizontal: 10,
            }}
          >
            <Ionicons name="search" size={18} color={palette.inkSoft} />
            <TextInput
              style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 10, fontSize: 16, color: palette.ink }}
              placeholder="Search job number, client or address"
              placeholderTextColor={palette.inkSoft}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>

          {jobsQuery.isLoading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={palette.brand} />
          ) : jobsQuery.isError ? (
            <View style={{ paddingHorizontal: 20 }}>
              <AppText variant="body" tone="danger">
                {jobsQuery.error instanceof Error
                  ? jobsQuery.error.message
                  : 'Unable to load ServiceM8 jobs.'}
              </AppText>
              <View style={{ height: 12 }} />
              <Button
                label="Try again"
                variant="outline"
                size="small"
                onPress={() => void jobsQuery.refetch()}
                block
              />
            </View>
          ) : jobs.length === 0 ? (
            <View style={{ paddingHorizontal: 20 }}>
              <AppText variant="body" tone="muted">
                {search.trim()
                  ? 'No jobs match that search.'
                  : 'No active ServiceM8 jobs were found for this account.'}
              </AppText>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
              {jobs.map((job) => {
                const isSelected = selectedJob?.uuid === job.uuid;
                const date = formatJobDate(job);

                return (
                  <TouchableOpacity
                    key={job.uuid}
                    accessibilityRole="button"
                    onPress={() => {
                      onSelect(toPersistedJob(job));
                      setPickerOpen(false);
                    }}
                    style={{
                      marginBottom: 10,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: isSelected ? palette.brand : palette.line,
                      backgroundColor: isSelected ? palette.brandSoft : palette.surface,
                      padding: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {getJobReference(job)}
                        </AppText>
                        <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                          {getJobCustomerName(job)}
                          {date ? ` · ${date}` : ''}
                        </AppText>
                        {job.address ? (
                          <AppText variant="caption" tone="soft" numberOfLines={2} style={{ marginTop: 2 }}>
                            {job.address}
                          </AppText>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={palette.brand} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

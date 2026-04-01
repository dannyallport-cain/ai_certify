import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/components/JobStateContext';
import {
  buildCertificateEditorPayload,
  createEmptyCircuit,
  createEmptyObservation,
  normalizeCertificateEditorRecord,
  type CertificateAssessment,
  type CertificateCircuit,
  type CertificateObservation,
  type MobileCertificateEditorRecord,
} from '@/components/certificate-editor';
import { getMobileCertificate, updateMobileCertificate } from '@/services/api';

const assessmentOptions: CertificateAssessment[] = ['SATISFACTORY', 'UNSATISFACTORY'];
const observationCodeOptions: CertificateObservation['code'][] = ['C1', 'C2', 'C3', 'FI'];

export default function CertificateScreen() {
  const { state } = useJob();
  const certificateId = state.createdCertificate?.id;

  const [record, setRecord] = useState<MobileCertificateEditorRecord | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const serializedRecord = useMemo(
    () => (record ? JSON.stringify(buildCertificateEditorPayload(record)) : ''),
    [record],
  );
  const isDirty = !!record && !!initialSnapshot && serializedRecord !== initialSnapshot;

  useEffect(() => {
    let mounted = true;

    async function loadCertificate() {
      if (!certificateId) {
        setLoadError('No draft certificate found for this job yet.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const response = await getMobileCertificate(certificateId);
        if (!mounted) return;

        const normalized = normalizeCertificateEditorRecord(response);
        setRecord(normalized);
        setInitialSnapshot(JSON.stringify(buildCertificateEditorPayload(normalized)));
      } catch (error) {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load certificate');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCertificate();

    return () => {
      mounted = false;
    };
  }, [certificateId]);

  function setTopLevelField<Key extends 'siteAddress' | 'inspectionDate' | 'inspectorName'>(
    key: Key,
    value: MobileCertificateEditorRecord[Key],
  ) {
    setRecord((current) => (current ? { ...current, [key]: value } : current));
  }

  function setFormField<Key extends keyof MobileCertificateEditorRecord['formData']>(
    key: Key,
    value: MobileCertificateEditorRecord['formData'][Key],
  ) {
    setRecord((current) =>
      current
        ? {
            ...current,
            formData: {
              ...current.formData,
              [key]: value,
            },
          }
        : current,
    );
  }

  function updateObservation(index: number, patch: Partial<CertificateObservation>) {
    setRecord((current) => {
      if (!current) return current;
      const observations = [...(current.formData.observations ?? [])];
      observations[index] = { ...observations[index], ...patch };
      return {
        ...current,
        formData: {
          ...current.formData,
          observations,
        },
      };
    });
  }

  function removeObservation(index: number) {
    setRecord((current) => {
      if (!current) return current;
      return {
        ...current,
        formData: {
          ...current.formData,
          observations: (current.formData.observations ?? []).filter((_, itemIndex) => itemIndex !== index),
        },
      };
    });
  }

  function addObservation() {
    setRecord((current) => {
      if (!current) return current;
      return {
        ...current,
        formData: {
          ...current.formData,
          observations: [...(current.formData.observations ?? []), createEmptyObservation()],
        },
      };
    });
  }

  function updateCircuit(index: number, patch: Partial<CertificateCircuit>) {
    setRecord((current) => {
      if (!current) return current;
      const circuits = [...(current.formData.circuits ?? [])];
      circuits[index] = { ...circuits[index], ...patch };
      return {
        ...current,
        formData: {
          ...current.formData,
          circuits,
        },
      };
    });
  }

  function removeCircuit(index: number) {
    setRecord((current) => {
      if (!current) return current;
      return {
        ...current,
        formData: {
          ...current.formData,
          circuits: (current.formData.circuits ?? []).filter((_, itemIndex) => itemIndex !== index),
        },
      };
    });
  }

  function addCircuit() {
    setRecord((current) => {
      if (!current) return current;
      return {
        ...current,
        formData: {
          ...current.formData,
          circuits: [...(current.formData.circuits ?? []), createEmptyCircuit()],
        },
      };
    });
  }

  async function handleSave() {
    if (!certificateId || !record || !isDirty) return;

    setSaving(true);
    try {
      const response = await updateMobileCertificate(certificateId, buildCertificateEditorPayload(record));
      const normalized = normalizeCertificateEditorRecord(response);
      setRecord(normalized);
      setInitialSnapshot(JSON.stringify(buildCertificateEditorPayload(normalized)));
      Alert.alert('Saved', 'Draft certificate updated successfully.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Failed to save certificate');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <ActivityIndicator color="#BE0000" />
        <Text className="text-gray-500 mt-3 text-center">Loading draft certificate…</Text>
      </View>
    );
  }

  if (loadError || !record) {
    return (
      <View className="flex-1 bg-gray-50 px-5 pt-8">
        <View className="bg-white rounded-2xl border border-gray-200 p-5">
          <View className="w-12 h-12 rounded-full bg-red-50 items-center justify-center mb-3">
            <Ionicons name="document-text-outline" size={22} color="#dc2626" />
          </View>
          <Text className="text-lg font-bold text-gray-900 mb-2">Certificate unavailable</Text>
          <Text className="text-gray-500 mb-5">{loadError ?? 'Unable to load the draft certificate.'}</Text>
          <TouchableOpacity className="bg-brand rounded-xl py-3 items-center" onPress={() => router.back()}>
            <Text className="text-white font-semibold">Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const observations = record.formData.observations ?? [];
  const circuits = record.formData.circuits ?? [];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pt-6 pb-10">
        <View className="flex-row items-start justify-between mb-5">
          <View className="flex-1 pr-4">
            <Text className="text-2xl font-bold text-gray-900">Edit Draft Certificate</Text>
            <Text className="text-gray-500 mt-1">
              {record.certificateNumber} • {record.status}
            </Text>
          </View>
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
            onPress={() => router.back()}
          >
            <Ionicons name="close-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        <View className={`rounded-xl border p-4 mb-4 ${isDirty ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <Text className={`text-sm font-medium ${isDirty ? 'text-amber-700' : 'text-green-700'}`}>
            {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </Text>
        </View>

        <SectionCard title="Customer" icon="person-outline">
          {record.customer ? (
            <>
              <Text className="text-base font-semibold text-gray-900">{record.customer.name}</Text>
              {record.customer.email ? <Text className="text-sm text-gray-500 mt-1">{record.customer.email}</Text> : null}
              {record.customer.phone ? <Text className="text-sm text-gray-500 mt-1">{record.customer.phone}</Text> : null}
              {record.customer.address ? <Text className="text-sm text-gray-600 mt-2">{record.customer.address}</Text> : null}
            </>
          ) : (
            <Text className="text-sm text-gray-500">No customer linked to this draft.</Text>
          )}
        </SectionCard>

        <SectionCard title="Inspection Details" icon="document-text-outline">
          <FieldLabel label="Site address" />
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[92px]"
            value={record.siteAddress ?? ''}
            onChangeText={(value) => setTopLevelField('siteAddress', value)}
            multiline
            textAlignVertical="top"
            placeholder="Enter the installation address"
          />

          <View className="mt-4">
            <FieldLabel label="Inspection date" hint="Use YYYY-MM-DD" />
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
              value={record.inspectionDate ?? ''}
              onChangeText={(value) => setTopLevelField('inspectionDate', value)}
              autoCapitalize="none"
              placeholder="2026-04-01"
            />
          </View>

          <View className="mt-4">
            <FieldLabel label="Inspector name" />
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
              value={record.inspectorName ?? ''}
              onChangeText={(value) => setTopLevelField('inspectorName', value)}
              placeholder="Inspector name"
            />
          </View>
        </SectionCard>

        <SectionCard title="Report Summary" icon="clipboard-outline">
          <FieldLabel label="Overall assessment" />
          <View className="flex-row gap-2">
            {assessmentOptions.map((option) => {
              const selected = record.formData.overallAssessment === option;
              return (
                <TouchableOpacity
                  key={option}
                  className={`flex-1 rounded-xl border px-4 py-3 items-center ${selected ? 'bg-brand border-brand' : 'bg-white border-gray-200'}`}
                  onPress={() => setFormField('overallAssessment', option)}
                >
                  <Text className={`font-semibold ${selected ? 'text-white' : 'text-gray-700'}`}>
                    {option === 'SATISFACTORY' ? 'Satisfactory' : 'Unsatisfactory'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="mt-4">
            <FieldLabel label="Reason for report" />
            <MultilineField
              value={record.formData.reasonForReport ?? ''}
              onChangeText={(value) => setFormField('reasonForReport', value)}
              placeholder="Why is this report being issued?"
            />
          </View>

          <View className="mt-4">
            <FieldLabel label="Extent of inspection" />
            <MultilineField
              value={record.formData.extentOfInspection ?? ''}
              onChangeText={(value) => setFormField('extentOfInspection', value)}
              placeholder="Describe the agreed scope of inspection"
            />
          </View>

          <View className="mt-4">
            <FieldLabel label="Agreed limitations" />
            <MultilineField
              value={record.formData.agreedLimitations ?? ''}
              onChangeText={(value) => setFormField('agreedLimitations', value)}
              placeholder="Any agreed limitations"
            />
          </View>

          <View className="mt-4">
            <FieldLabel label="Operational limitations" />
            <MultilineField
              value={record.formData.operationalLimitations ?? ''}
              onChangeText={(value) => setFormField('operationalLimitations', value)}
              placeholder="Any operational constraints"
            />
          </View>

          <View className="mt-4">
            <FieldLabel label="General condition" />
            <MultilineField
              value={record.formData.generalCondition ?? ''}
              onChangeText={(value) => setFormField('generalCondition', value)}
              placeholder="Overall installation condition"
            />
          </View>
        </SectionCard>

        <SectionCard
          title="Observations"
          icon="alert-circle-outline"
          actionLabel="Add observation"
          onAction={addObservation}
        >
          {observations.length === 0 ? (
            <EmptyState text="No observations added yet." />
          ) : (
            observations.map((observation, index) => (
              <View key={observation.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-semibold text-gray-800">Observation {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeObservation(index)}>
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>

                <FieldLabel label="Description" />
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[92px]"
                  value={observation.description}
                  onChangeText={(value) => updateObservation(index, { description: value })}
                  multiline
                  textAlignVertical="top"
                  placeholder="Describe the issue found"
                />

                <FieldLabel label="Code" className="mt-3" />
                <View className="flex-row flex-wrap gap-2">
                  {observationCodeOptions.map((code) => {
                    const selected = observation.code === code;
                    return (
                      <TouchableOpacity
                        key={code}
                        className={`rounded-xl border px-4 py-2 ${selected ? 'bg-brand border-brand' : 'bg-white border-gray-200'}`}
                        onPress={() => updateObservation(index, { code })}
                      >
                        <Text className={`font-semibold ${selected ? 'text-white' : 'text-gray-700'}`}>{code}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Circuits"
          icon="flash-outline"
          actionLabel="Add circuit"
          onAction={addCircuit}
        >
          {circuits.length === 0 ? (
            <EmptyState text="No circuits added yet." />
          ) : (
            circuits.map((circuit, index) => (
              <View key={`circuit-${index}`} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="font-semibold text-gray-800">Circuit {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeCircuit(index)}>
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>

                <FieldLabel label="Designation" />
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  value={circuit.designation ?? ''}
                  onChangeText={(value) => updateCircuit(index, { designation: value })}
                  placeholder="e.g. Ring final"
                />

                <View className="mt-3">
                  <FieldLabel label="Rating" />
                  <TextInput
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                    value={circuit.rating ?? ''}
                    onChangeText={(value) => updateCircuit(index, { rating: value })}
                    placeholder="e.g. 32A"
                  />
                </View>

                <View className="mt-3">
                  <FieldLabel label="Device type" />
                  <TextInput
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                    value={circuit.deviceType ?? ''}
                    onChangeText={(value) => updateCircuit(index, { deviceType: value })}
                    placeholder="e.g. RCBO"
                  />
                </View>

                <View className="mt-3 flex-row gap-3">
                  <View className="flex-1">
                    <FieldLabel label="Measured Zs" />
                    <TextInput
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                      value={circuit.measuredZs ?? ''}
                      onChangeText={(value) => updateCircuit(index, { measuredZs: value })}
                      placeholder="Ω"
                    />
                  </View>
                  <View className="flex-1">
                    <FieldLabel label="Max Zs" />
                    <TextInput
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                      value={circuit.maxZs ?? ''}
                      onChangeText={(value) => updateCircuit(index, { maxZs: value })}
                      placeholder="Ω"
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </SectionCard>

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mt-2 ${isDirty ? 'bg-brand' : 'bg-gray-300'}`}
          onPress={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-bold text-base ${isDirty ? 'text-white' : 'text-gray-500'}`}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SectionCard({
  title,
  icon,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3">
            <Ionicons name={icon} size={18} color="#4b5563" />
          </View>
          <Text className="text-base font-semibold text-gray-900">{title}</Text>
        </View>
        {actionLabel && onAction ? (
          <TouchableOpacity className="rounded-xl bg-brand px-3 py-2" onPress={onAction}>
            <Text className="text-white text-sm font-semibold">{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function FieldLabel({
  label,
  hint,
  className,
}: {
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <View className={className}>
      <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      {hint ? <Text className="text-xs text-gray-400 mb-2 -mt-1">{hint}</Text> : null}
    </View>
  );
}

function MultilineField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[92px]"
      value={value}
      onChangeText={onChangeText}
      multiline
      textAlignVertical="top"
      placeholder={placeholder}
    />
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5">
      <Text className="text-sm text-gray-500">{text}</Text>
    </View>
  );
}
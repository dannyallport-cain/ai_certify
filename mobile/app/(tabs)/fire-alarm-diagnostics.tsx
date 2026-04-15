import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  RuleBasedFireAlarmDiagnosticsAssistant,
  StaticFireAlarmDiagnosticsRepository,
  type FireAlarmDiagnosticAssistantFeedback,
  type FireAlarmDiagnosticFault,
  type FireAlarmDiagnosticObservation,
  type FireAlarmDiagnosticPriority,
  type FireAlarmDiagnosticSuggestion,
} from '@/modules/fire-alarm-diagnostics';

const diagnosticsRepository = new StaticFireAlarmDiagnosticsRepository();
const diagnosticsAssistant = new RuleBasedFireAlarmDiagnosticsAssistant(diagnosticsRepository);

const priorityTintClasses: Record<FireAlarmDiagnosticPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

function PriorityBadge({ priority }: { priority: FireAlarmDiagnosticPriority }) {
  return (
    <View className={`rounded-full px-3 py-1 ${priorityTintClasses[priority].split(' ')[0]}`}>
      <Text className={`text-xs font-semibold ${priorityTintClasses[priority].split(' ')[1]}`}>
        {priority.toUpperCase()} priority
      </Text>
    </View>
  );
}

function BulletList({
  items,
  textClassName,
  bulletClassName,
}: {
  items: string[];
  textClassName: string;
  bulletClassName: string;
}) {
  return (
    <View className="gap-2">
      {items.map((item) => (
        <View key={item} className="flex-row">
          <Text className={`mr-2 ${bulletClassName}`}>•</Text>
          <Text className={`flex-1 text-sm leading-5 ${textClassName}`}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function FaultSection({
  title,
  icon,
  items,
  tintClassName,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: string[];
  tintClassName: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View className="mt-3">
      <View className="flex-row items-center">
        <View className={`mr-2 rounded-full px-2 py-1 ${tintClassName}`}>
          <Ionicons name={icon} size={14} color="#0f172a" />
        </View>
        <Text className="text-sm font-semibold text-slate-900">{title}</Text>
      </View>
      <View className="mt-2">
        <BulletList items={items} textClassName="text-slate-700" bulletClassName="text-slate-500" />
      </View>
    </View>
  );
}

function SuggestionCard({
  suggestion,
  rank,
  onOpenFault,
}: {
  suggestion: FireAlarmDiagnosticSuggestion;
  rank: number;
  onOpenFault: (faultId: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpenFault(suggestion.faultId)}
      className="rounded-xl border border-blue-200 bg-white p-3"
    >
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Match #{rank}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-900">{suggestion.reason}</Text>
        </View>
        {typeof suggestion.score === 'number' ? (
          <View className="rounded-full bg-blue-100 px-2 py-1">
            <Text className="text-xs font-semibold text-blue-700">Score {suggestion.score}</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-2 text-sm leading-5 text-slate-600">{suggestion.nextAction}</Text>
      <View className="mt-3 flex-row items-center">
        <Text className="text-xs font-semibold text-slate-500">Open matching fault card</Text>
        <Ionicons name="arrow-forward-outline" size={14} color="#64748b" style={{ marginLeft: 6 }} />
      </View>
    </Pressable>
  );
}

function FaultCard({
  fault,
  expanded,
  highlighted,
  onToggle,
}: {
  fault: FireAlarmDiagnosticFault;
  expanded: boolean;
  highlighted: boolean;
  onToggle: () => void;
}) {
  return (
    <View
      className={`mb-3 rounded-2xl border bg-white p-4 ${
        highlighted ? 'border-brand' : 'border-slate-200'
      }`}
    >
      <Pressable className="flex-row items-start justify-between" onPress={onToggle}>
        <View className="flex-1 pr-3">
          <View className="flex-row items-center">
            <Text className="text-base font-semibold text-slate-900">{fault.title}</Text>
            {highlighted ? (
              <View className="ml-2 rounded-full bg-red-100 px-2 py-1">
                <Text className="text-[10px] font-semibold uppercase text-red-700">Suggested</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 text-sm text-slate-600">{fault.symptoms[0]}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={20}
          color="#475569"
        />
      </Pressable>

      {!expanded ? null : (
        <View className="mt-1">
          <FaultSection
            title="Typical symptoms"
            icon="alert-circle-outline"
            items={fault.symptoms}
            tintClassName="bg-red-100"
          />
          <FaultSection
            title="Likely causes"
            icon="search-outline"
            items={fault.likelyCauses}
            tintClassName="bg-amber-100"
          />
          <FaultSection
            title="Step-by-step checks"
            icon="build-outline"
            items={fault.testSteps}
            tintClassName="bg-blue-100"
          />
          <FaultSection
            title="What the readings usually mean"
            icon="analytics-outline"
            items={fault.expectedFindings}
            tintClassName="bg-emerald-100"
          />
          <FaultSection
            title="Next actions"
            icon="checkmark-done-outline"
            items={fault.actions}
            tintClassName="bg-violet-100"
          />
          <FaultSection
            title="Escalate when"
            icon="arrow-forward-circle-outline"
            items={fault.escalationNotes}
            tintClassName="bg-slate-200"
          />
        </View>
      )}
    </View>
  );
}

export default function FireAlarmDiagnosticsScreen() {
  const categories = useMemo(() => diagnosticsRepository.getCategories(), []);
  const safetyNotice = useMemo(() => diagnosticsRepository.getSafetyNotice(), []);
  const triageOptions = useMemo(() => diagnosticsAssistant.getTriageOptions(), []);
  const [expandedFaultId, setExpandedFaultId] = useState<string | null>(null);
  const [selectedSignalIds, setSelectedSignalIds] = useState<FireAlarmDiagnosticObservation[]>([]);
  const [assistantFeedback, setAssistantFeedback] =
    useState<FireAlarmDiagnosticAssistantFeedback | null>(null);
  const [assistantState, setAssistantState] = useState<'idle' | 'loading'>('idle');
  const [diagnosticNotes, setDiagnosticNotes] = useState('');
  const [measurements, setMeasurements] = useState<Record<string, string>>({
    loopResistance: '',
    positiveCurrent: '',
    negativeCurrent: '',
    positiveToEarth: '',
    negativeToEarth: '',
    lineVoltage: '',
  });

  const selectedSignals = useMemo(
    () => triageOptions.filter((option) => selectedSignalIds.includes(option.id)),
    [selectedSignalIds, triageOptions],
  );

  const suggestedFaultIds = useMemo(
    () => assistantFeedback?.suggestions.map((suggestion) => suggestion.faultId) ?? [],
    [assistantFeedback],
  );

  const recommendedFaults = useMemo(() => {
    const faultMap = new Map<string, FireAlarmDiagnosticFault>();

    for (const signal of selectedSignals) {
      for (const category of categories) {
        for (const fault of category.faults) {
          if (signal.faultIds.includes(fault.id)) {
            faultMap.set(fault.id, fault);
          }
        }
      }
    }

    for (const suggestion of assistantFeedback?.suggestions ?? []) {
      const match = diagnosticsRepository.findFaultById(suggestion.faultId);

      if (match) {
        faultMap.set(match.fault.id, match.fault);
      }
    }

    return Array.from(faultMap.values());
  }, [assistantFeedback?.suggestions, categories, selectedSignals]);

  const recommendedMeasurementFields = useMemo(() => {
    const highlightedFieldIds = new Set(assistantFeedback?.highlightedMeasurements ?? []);
    const fields = new Map<
      string,
      { id: string; label: string; unit: string; helpText: string; highlighted: boolean }
    >();

    for (const fault of recommendedFaults) {
      for (const field of fault.measurementFocus ?? []) {
        const existing = fields.get(field.id);

        fields.set(field.id, {
          ...field,
          highlighted: existing?.highlighted || highlightedFieldIds.has(field.id),
        });
      }
    }

    return Array.from(fields.values()).sort((left, right) => {
      if (left.highlighted === right.highlighted) {
        return left.label.localeCompare(right.label);
      }

      return left.highlighted ? -1 : 1;
    });
  }, [assistantFeedback?.highlightedMeasurements, recommendedFaults]);

  useEffect(() => {
    let active = true;

    if (selectedSignalIds.length === 0) {
      setAssistantFeedback(null);
      setAssistantState('idle');
      return () => {
        active = false;
      };
    }

    setAssistantState('loading');

    diagnosticsAssistant
      .suggestFromRequest?.({
        observations: selectedSignalIds,
        faultIds: selectedSignals.flatMap((signal) => signal.faultIds),
        notes: diagnosticNotes.trim() || undefined,
        measurements,
      })
      .then((feedback) => {
        if (!active) {
          return;
        }

        setAssistantFeedback(
          feedback ?? diagnosticsAssistant.suggestFromObservations(selectedSignalIds),
        );
        setAssistantState('idle');
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setAssistantFeedback(diagnosticsAssistant.suggestFromObservations(selectedSignalIds));
        setAssistantState('idle');
      });

    return () => {
      active = false;
    };
  }, [diagnosticNotes, measurements, selectedSignalIds, selectedSignals]);

  const toggleSignal = (id: FireAlarmDiagnosticObservation) => {
    setSelectedSignalIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const updateMeasurement = (fieldId: string, value: string) => {
    setMeasurements((current) => ({
      ...current,
      [fieldId]: value,
    }));
  };

  const openFault = (faultId: string) => {
    setExpandedFaultId((current) => (current === faultId ? null : faultId));
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
    >
      <View className="rounded-2xl bg-brand px-5 py-5">
        <View className="flex-row items-start">
          <View className="mr-3 mt-1 h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <Ionicons name="flame-outline" size={24} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Fire Alarm Diagnostics</Text>
            <Text className="mt-2 text-sm leading-5 text-white/90">
              Common fault menus, field test steps, and practical guidance for loop, sounder,
              power, device, and network issues.
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <View className="flex-row items-start">
          <Ionicons name="warning-outline" size={18} color="#b45309" />
          <View className="ml-2 flex-1">
            <Text className="text-sm font-semibold text-amber-900">Safety and scope</Text>
            <Text className="mt-1 text-sm leading-5 text-amber-800">{safetyNotice}</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-slate-900">Quick triage assistant</Text>
          <View
            className={`rounded-full px-3 py-1 ${
              assistantFeedback?.source === 'ai-worker' ? 'bg-emerald-100' : 'bg-blue-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                assistantFeedback?.source === 'ai-worker' ? 'text-emerald-700' : 'text-blue-700'
              }`}
            >
              {assistantState === 'loading'
                ? 'Analysing'
                : assistantFeedback?.source === 'ai-worker'
                  ? 'AI worker'
                  : 'Rule fallback'}
            </Text>
          </View>
        </View>
        <Text className="mt-2 text-sm leading-5 text-slate-600">
          Tap the readings or symptoms you are seeing. Add any meter readings or notes to improve
          the suggested fault path and next checks.
        </Text>

        <View className="mt-4 flex-row flex-wrap">
          {triageOptions.map((option) => {
            const active = selectedSignalIds.includes(option.id);

            return (
              <Pressable
                key={option.id}
                onPress={() => toggleSignal(option.id)}
                className={`mr-2 mt-2 rounded-full border px-3 py-2 ${
                  active ? 'border-brand bg-red-50' : 'border-slate-300 bg-white'
                }`}
              >
                <Text className={`text-sm font-medium ${active ? 'text-brand' : 'text-slate-700'}`}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {recommendedMeasurementFields.length > 0 ? (
          <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-slate-900">Useful readings to capture</Text>
              {assistantFeedback?.highlightedMeasurements?.length ? (
                <View className="rounded-full bg-blue-100 px-2 py-1">
                  <Text className="text-[11px] font-semibold text-blue-700">
                    Assistant-highlighted first
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="mt-3 gap-3">
              {recommendedMeasurementFields.map((field) => (
                <View
                  key={field.id}
                  className={`rounded-xl border p-3 ${
                    field.highlighted ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-slate-800">
                      {field.label} <Text className="text-slate-500">({field.unit})</Text>
                    </Text>
                    {field.highlighted ? (
                      <View className="rounded-full bg-blue-100 px-2 py-1">
                        <Text className="text-[11px] font-semibold text-blue-700">Key reading</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-1 text-xs leading-4 text-slate-500">{field.helpText}</Text>
                  <TextInput
                    value={measurements[field.id] ?? ''}
                    onChangeText={(value) => updateMeasurement(field.id, value)}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Text className="text-sm font-semibold text-slate-900">Engineer notes</Text>
          <Text className="mt-1 text-xs leading-4 text-slate-500">
            Add panel text, address numbers, recent works, or when the issue happens to improve
            diagnosis.
          </Text>
          <TextInput
            value={diagnosticNotes}
            onChangeText={setDiagnosticNotes}
            placeholder="Example: Loop 1 devices 23 onwards missing after decorator removed detector head in stair core."
            multiline
            textAlignVertical="top"
            className="mt-3 min-h-[96px] rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {!assistantFeedback && assistantState === 'idle' ? (
          <View className="mt-4 rounded-xl border border-dashed border-slate-300 p-4">
            <Text className="text-sm text-slate-500">
              No readings selected yet. Start with observed voltage, resistance, current imbalance,
              or missing device clues.
            </Text>
          </View>
        ) : null}

        {assistantState === 'loading' ? (
          <View className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <Text className="text-sm font-semibold text-blue-900">Analysing selected clues</Text>
            <Text className="mt-2 text-sm leading-5 text-blue-800">
              Requesting AI-worker feedback. If unavailable, built-in rules will be used
              automatically.
            </Text>
          </View>
        ) : null}

        {assistantFeedback ? (
          <View className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <View className="flex-row items-start justify-between">
              <Text className="flex-1 text-sm font-semibold text-blue-900">Suggested feedback</Text>
              {assistantFeedback.priority ? <PriorityBadge priority={assistantFeedback.priority} /> : null}
            </View>
            <Text className="mt-2 text-sm leading-5 text-blue-800">{assistantFeedback.summary}</Text>
            <Text className="mt-3 text-sm leading-5 text-blue-800">
              {assistantFeedback.probableCause}
            </Text>

            {assistantFeedback.nextSteps.length > 0 ? (
              <View className="mt-4">
                <Text className="mb-2 text-sm font-semibold text-blue-900">Recommended next steps</Text>
                <BulletList
                  items={assistantFeedback.nextSteps}
                  textClassName="text-blue-800"
                  bulletClassName="text-blue-700"
                />
              </View>
            ) : null}

            {assistantFeedback.followUpQuestions?.length ? (
              <View className="mt-4 rounded-xl border border-blue-200 bg-white/80 p-3">
                <Text className="text-sm font-semibold text-slate-900">Clarify these points next</Text>
                <View className="mt-2">
                  <BulletList
                    items={assistantFeedback.followUpQuestions}
                    textClassName="text-slate-700"
                    bulletClassName="text-slate-500"
                  />
                </View>
              </View>
            ) : null}

            {assistantFeedback.suggestions.length > 0 ? (
              <View className="mt-4 gap-3">
                <Text className="text-sm font-semibold text-blue-900">Ranked fault matches</Text>
                {assistantFeedback.suggestions.slice(0, 3).map((suggestion, index) => (
                  <SuggestionCard
                    key={`${suggestion.faultId}-${index}`}
                    suggestion={suggestion}
                    rank={index + 1}
                    onOpenFault={openFault}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {recommendedFaults.length > 0 ? (
          <View className="mt-4">
            <Text className="text-sm font-semibold text-slate-900">Likely fault types</Text>
            <View className="mt-2 flex-row flex-wrap">
              {recommendedFaults.map((fault) => {
                const isSuggested = suggestedFaultIds.includes(fault.id);

                return (
                  <Pressable
                    key={fault.id}
                    onPress={() => openFault(fault.id)}
                    className={`mr-2 mt-2 rounded-full px-3 py-2 ${
                      isSuggested ? 'bg-brand' : 'bg-slate-900'
                    }`}
                  >
                    <Text className="text-xs font-semibold text-white">{fault.title}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      {categories.map((category) => (
        <View
          key={category.id}
          className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-slate-900">{category.title}</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-600">{category.description}</Text>
            </View>
            <View className="rounded-2xl bg-white px-3 py-2">
              <Text className="text-xs font-semibold text-slate-700">
                {category.faults.length} faults
              </Text>
            </View>
          </View>

          <View className="mt-4">
            {category.faults.map((fault) => (
              <FaultCard
                key={fault.id}
                fault={fault}
                expanded={expandedFaultId === fault.id}
                highlighted={suggestedFaultIds.includes(fault.id)}
                onToggle={() =>
                  setExpandedFaultId((current) => (current === fault.id ? null : fault.id))
                }
              />
            ))}
          </View>
        </View>
      ))}

      <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-semibold text-slate-900">Suggested workflow on site</Text>
        <View className="mt-3">
          <BulletList
            items={[
              'Confirm the exact panel message, address range, and any recent work carried out.',
              'Isolate safely where permitted, then take baseline readings for voltage, current, and resistance before changing multiple things at once.',
              'Divide loops or circuits methodically so each reading narrows the fault location.',
              'After repair, restore the system fully, verify all devices report correctly, and complete a functional test relevant to the affected circuit.',
            ]}
            textClassName="text-slate-700"
            bulletClassName="text-slate-500"
          />
        </View>
      </View>
    </ScrollView>
  );
}
